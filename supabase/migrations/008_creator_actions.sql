-- Admin activity log. Stores every mutation made from the creator panel
-- (bans, approvals, listing deletions, etc.) so creators have an audit trail.

create table if not exists public.creator_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action_type text not null,
  target_type text,
  target_id uuid,
  target_label text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_creator_actions_created_at
  on public.creator_actions (created_at desc);

create index if not exists idx_creator_actions_actor_id
  on public.creator_actions (actor_id);

create index if not exists idx_creator_actions_action_type
  on public.creator_actions (action_type);

-- RLS: only creators can read; the service role writes via server-side code.
alter table public.creator_actions enable row level security;

-- Creators may read all entries; nobody else may read or write via the client.
drop policy if exists "Creators can read creator actions" on public.creator_actions;
create policy "Creators can read creator actions"
  on public.creator_actions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'creator'
    )
  );

comment on table public.creator_actions is
  'Audit log for administrative actions taken in the creator panel.';