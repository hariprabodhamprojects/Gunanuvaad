-- Pre-login invite check (anon can call — small private group; avoids service role in the app)
create or replace function public.is_email_invited(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.allowed_emails
    where email = lower(trim(candidate))
  );
$$;

revoke all on function public.is_email_invited(text) from public;
grant execute on function public.is_email_invited(text) to anon, authenticated;

-- Public avatars bucket + RLS (path: {user_id}/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_select_public"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );
