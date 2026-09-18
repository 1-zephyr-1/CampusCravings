-- Migration: 010_message_attachments
-- Photo attachments on order messages (Phase 5)
--
-- Design notes:
-- - One row in `messages` can have zero or more `message_attachments`.
-- - Images are stored in a private bucket `message-attachments`. The bucket is
--   NOT public; the client requests a signed URL per attachment at view time.
-- - Path layout: `<order_id>/<message_id>/`. The first path segment
--   (order_id) is what the storage RLS policies check.
-- - We relax the `messages.body` NOT NULL check to allow image-only messages.
--   At least one of {body, attachment} must be present — enforced at the
--   application layer (the composer requires text if no files are attached,
--   and requires files if text is empty).

alter table public.messages
  alter column body drop not null,
  alter column body drop constraint if exists messages_body_check;

alter table public.messages
  add constraint if not exists messages_body_or_attachment_check
  check (char_length(coalesce(body, '')) between 0 and 2000);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5 * 1024 * 1024),
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_message_id_idx
  on public.message_attachments (message_id);
create index if not exists message_attachments_order_id_idx
  on public.message_attachments (order_id);

alter table public.message_attachments enable row level security;

-- Read: only the two parties on the order.
drop policy if exists "Attachments: select participants" on public.message_attachments;
create policy "Attachments: select participants"
  on public.message_attachments for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = message_attachments.order_id
        and (o.customer_id = auth.uid() or s.user_id = auth.uid())
    )
  );

-- Insert: must be the sender of the parent message, and only at create time
-- (we don't currently allow editing message attachments post-send).
-- We check `sender_id` via a join to the parent messages row.
drop policy if exists "Attachments: insert by sender" on public.message_attachments;
create policy "Attachments: insert by sender"
  on public.message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
    )
  );

-- No update / delete policies; attachments are append-only from the app's
-- perspective. Editing message attachments would muddy the receipt model.

-- Realtime: attachments live behind the parent message; clients refetch the
-- message via the realtime INSERT they already subscribe to. We don't need
-- realtime on the attachments table itself.

-- ── Storage bucket + RLS ────────────────────────────────────────────────
-- Private bucket. Clients must mint a signed URL via the supabase client to
-- read; uploads use the standard authenticated path under `messages/{order_id}/`.
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Read: only the two parties on the order. Path layout:
--   <order_id>/<message_id>/
-- We extract the order_id segment and verify the caller is a participant.
drop policy if exists "Attachments: participants read" on storage.objects;
create policy "Attachments: participants read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1
      from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id::text = (storage.foldername(name))[1]
        and (o.customer_id = auth.uid() or s.user_id = auth.uid())
    )
  );

-- Write: only the two parties on the order can upload to their order's folder.
drop policy if exists "Attachments: participants write" on storage.objects;
create policy "Attachments: participants write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and exists (
      select 1
      from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id::text = (storage.foldername(name))[1]
        and (o.customer_id = auth.uid() or s.user_id = auth.uid())
    )
  );

-- Delete: sender only — they can recall an attachment by removing the
-- storage object alongside the message row. (For now, we don't expose this
-- in the UI; it's here so the cleanup path exists for the sender.)
drop policy if exists "Attachments: sender delete" on storage.objects;
create policy "Attachments: sender delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and auth.uid()::text = (
      select m.sender_id::text
      from public.messages m
      where m.id::text = (storage.foldername(name))[2]
      limit 1
    )
  );
