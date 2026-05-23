-- Web Push subscriptions for reminder notifications.
-- One row per (user, browser-issued endpoint). A user may have multiple devices
-- (phone PWA, laptop Chrome, work laptop, etc.) and each gets its own endpoint.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint),
  constraint push_subscriptions_endpoint_nonempty check (char_length(endpoint) >= 1),
  constraint push_subscriptions_p256dh_nonempty check (char_length(p256dh) >= 1),
  constraint push_subscriptions_auth_nonempty check (char_length(auth) >= 1)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Users own their subscriptions. service_role bypasses RLS, which is what the
-- /api/cron/reminders handler relies on for fan-out.
create policy "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (
    public.is_allowlisted_session()
    and user_id = auth.uid()
  );

create policy "push_subscriptions_update_own"
  on public.push_subscriptions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());
