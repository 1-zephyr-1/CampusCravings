-- Migration: 007_order_events
-- Append-only event log for orders (timeline feature)

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('placed', 'accepted', 'declined', 'ready', 'completed', 'cancelled', 'note_added', 'message_sent')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_id_idx on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;

-- Order participants can read events for their orders
drop policy if exists "Order events: select participants" on public.order_events;
create policy "Order events: select participants"
  on public.order_events for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_events.order_id
        and (o.customer_id = auth.uid() or s.user_id = auth.uid())
    )
  );

-- Server-side only inserts (no client policies). Application triggers / Edge Functions
-- or service role can insert. Clients will only see events that already exist.

-- Realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.order_events';
  end if;
exception when undefined_object then null;
end$$;
