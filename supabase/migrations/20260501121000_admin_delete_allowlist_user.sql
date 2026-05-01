-- Admin: remove a user from allowlist so they lose access immediately.
-- Uses security definer + organizer guard to bypass table RLS safely.

create or replace function public.admin_delete_allowlist_user(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_actor_email text;
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_uid is null or not public.is_organizer_session() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_email = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_email');
  end if;

  select lower(coalesce(u.email, ''))
    into v_actor_email
  from auth.users u
  where u.id = v_uid;

  if v_actor_email = v_email then
    return jsonb_build_object('ok', false, 'code', 'cannot_delete_self');
  end if;

  -- Keep at least one organizer account on the allowlist.
  if exists (
    select 1
    from public.allowed_emails ae
    where ae.email = v_email
      and ae.is_organizer = true
  ) then
    if (
      select count(*)
      from public.allowed_emails ae
      where ae.is_organizer = true
    ) <= 1 then
      return jsonb_build_object('ok', false, 'code', 'last_organizer');
    end if;
  end if;

  delete from public.allowed_emails ae
  where ae.email = v_email;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_delete_allowlist_user(text) from public;
grant execute on function public.admin_delete_allowlist_user(text) to authenticated;
