-- Migration: 006_messages
-- Add realtime order messaging thread (Phase 3)
-- Run in Supabase SQL Editor after 005.
--
-- A "message" is a short text note attached to a single order. Only the
-- two parties on that order (the customer who placed it, or the seller
-- whose store fulfills it) may read or write its messages. Messages are
-- append-only from the app's perspective (no UPDATE/DELETE policies).

create extension if not exists "pgcrypto";

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_order_id_created_at_idx
  on public.messages (order_id, created_at desc);

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

alter table public.messages enable row level security;

-- A message may only be inserted by its own sender.
drop policy if exists "Messages: insert own" on public.messages;
create policy "Messages: insert own"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- A message may be read only by the two parties on its order:
-- either the order's customer, or the seller who owns the store.
drop policy if exists "Messages: select participants" on public.messages;
create policy "Messages: select participants"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = messages.order_id
        and (
          o.customer_id = auth.uid()
          or s.user_id = auth.uid()
        )
    )
  );

-- Realtime: ensure the messages table is published to the
-- `supabase_realtime` publication so postgres_changes events fire.
-- Guarded so it's a no-op on self-hosted setups that lack the publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
exception when undefined_object then
  null;
end$$;
