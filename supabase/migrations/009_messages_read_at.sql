-- Migration: Read receipts on messages (Phase 5)
--
-- Adds a nullable `read_at` timestamp to each message. Set by the recipient
-- when they have the thread open. Optimistic UI in the client can mark
-- locally first; this column is the durable source of truth.
--
-- No new RLS — the existing `Messages: select participants` policy already
-- allows the two parties on the order to read rows, which is the only
-- surface that needs read receipts.

alter table public.messages
  add column if not exists read_at timestamptz;

create index if not exists messages_order_id_unread_idx
  on public.messages (order_id, created_at desc)
  where read_at is null;

-- Realtime: keep the existing publication entry; this migration is additive
-- and the postgres_changes channel already broadcasts `UPDATE` events by
-- default, so read_at changes will flow to the open thread automatically.
