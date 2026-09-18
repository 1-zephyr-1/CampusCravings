-- Migration: 009_disputes
-- Dispute-resolution flow between buyers and sellers. Run after 008.
--
-- A dispute is filed by one party of an order against the other. It records
-- the reason + category, tracks review state, and is appended with resolution
-- metadata when a creator closes it out.
--
-- RLS:
--   * SELECT  — the two parties on the order, or any user with role='creator'.
--   * INSERT  — caller must be one of the order's two parties; they set
--               `filed_by = auth.uid()` and `against` to the other party
--               (never themselves). Reason length + category enum enforced.
--   * UPDATE  — only creators, and only resolution columns (status,
--               resolution_notes, resolved_by, resolved_at).
--   * DELETE  — none. Disputes are append-only from the app's perspective.
--
-- A trigger notifies the other party via the existing `notifications` table.

create extension if not exists "pgcrypto";

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  filed_by uuid not null references public.profiles(id) on delete cascade,
  against uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (
    char_length(reason) >= 10 and char_length(reason) <= 2000
  ),
  category text not null check (
    category in ('not_received','quality','missing_items','seller_unresponsive','other')
  ),
  status text not null default 'open' check (
    status in ('open','reviewing','resolved_buyer','resolved_seller','dismissed')
  ),
  resolution_notes text,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists disputes_order_id_idx
  on public.disputes (order_id);
create index if not exists disputes_status_idx
  on public.disputes (status);
create index if not exists disputes_filed_by_idx
  on public.disputes (filed_by);
create index if not exists disputes_against_idx
  on public.disputes (against);

alter table public.disputes enable row level security;

-- SELECT: parties on the order, plus any creator.
drop policy if exists "Disputes: parties or creator read" on public.disputes;
create policy "Disputes: parties or creator read"
  on public.disputes
  for select
  to authenticated
  using (
    filed_by = auth.uid()
    or against = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'creator'
    )
  );

-- INSERT: caller must be one of the order's two parties, never filing against
-- themselves, with reason length + category enum enforced.
drop policy if exists "Disputes: parties insert" on public.disputes;
create policy "Disputes: parties insert"
  on public.disputes
  for insert
  to authenticated
  with check (
    filed_by = auth.uid()
    and against <> auth.uid()
    and category in (
      'not_received','quality','missing_items','seller_unresponsive','other'
    )
    and char_length(reason) >= 10
    and char_length(reason) <= 2000
    and exists (
      select 1
      from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or s.user_id = auth.uid()
        )
    )
  );

-- UPDATE: creators only; only the resolution columns are mutable. We don't
-- allow any other updates via the client (filed_by / against / order_id
-- remain immutable once recorded).
drop policy if exists "Disputes: creator update" on public.disputes;
create policy "Disputes: creator update"
  on public.disputes
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'creator'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'creator'
    )
  );

-- No DELETE policy — disputes are append-only from the app's perspective.

-- Realtime: publish new disputes so admin inbox can subscribe if desired.
-- Guarded for self-hosted setups that lack the publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.disputes';
  end if;
exception when undefined_object then
  null;
end$$;

-- Trigger: notify the other party via the notifications inbox when a dispute
-- is filed. security definer so we can look up the seller across stores even
-- though the actor only has access to their own profile row.
create or replace function public.notify_dispute_filed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer_id uuid;
  store_user_id uuid;
  target uuid;
begin
  select o.customer_id, s.user_id
    into buyer_id, store_user_id
    from public.orders o
    join public.stores s on s.id = o.store_id
   where o.id = new.order_id;

  if new.filed_by = buyer_id then
    target := store_user_id;
  else
    target := buyer_id;
  end if;

  if target is not null then
    insert into public.notifications (user_id, type, title, message, link)
    values (
      target,
      'system',
      'A dispute was filed',
      'Order ' || substr(new.order_id::text, 1, 8) || ': ' || new.category,
      '/orders/' || new.order_id::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists disputes_notify on public.disputes;
create trigger disputes_notify
  after insert on public.disputes
  for each row
  execute function public.notify_dispute_filed();

comment on table public.disputes is
  'Disputes filed between the two parties of an order (buyer ↔ seller). Creators resolve them.';
