-- Admin: add or update an invite (email + display name from first/last name).

create or replace function public.admin_add_allowlist_user(
  p_email text,
  p_first_name text,
  p_last_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_first text := trim(coalesce(p_first_name, ''));
  v_last text := trim(coalesce(p_last_name, ''));
  v_display_name text;
  v_existed boolean;
begin
  if auth.uid() is null or not public.is_organizer_session() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid_email');
  end if;

  v_display_name := trim(concat_ws(' ', v_first, v_last));
  if v_display_name = '' then
    v_display_name := null;
  end if;

  select exists(select 1 from public.allowed_emails ae where ae.email = v_email)
    into v_existed;

  insert into public.allowed_emails (email, display_name, is_organizer)
  values (v_email, v_display_name, false)
  on conflict (email) do update
    set display_name = coalesce(excluded.display_name, public.allowed_emails.display_name);

  if v_display_name is not null then
    update public.profiles p
    set display_name = v_display_name,
        updated_at = now()
    where lower(trim(p.email)) = v_email
      and (p.display_name is null or trim(p.display_name) = '');
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', case when v_existed then 'updated' else 'created' end,
    'email', v_email
  );
end;
$$;

revoke all on function public.admin_add_allowlist_user(text, text, text) from public;
grant execute on function public.admin_add_allowlist_user(text, text, text) to authenticated;
