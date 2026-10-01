-- Preserve existing votes, and keep cancelled votes as inactive records.
begin;
alter table ningyo_private.doll_like_votes
  add column if not exists active boolean not null default true;

create or replace function public.ningyo_get_likes(p_doll_id integer, p_visitor_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  total bigint;
  has_liked boolean;
begin
  if p_doll_id is null or p_doll_id < 1 or p_doll_id > 43 or p_visitor_id is null then
    raise exception 'Invalid like request' using errcode = '22023';
  end if;
  select c.like_count into total
  from ningyo_private.doll_like_counts c where c.doll_id = p_doll_id;
  select exists (
    select 1 from ningyo_private.doll_like_votes v
    where v.doll_id = p_doll_id and v.visitor_id = p_visitor_id and v.active
  ) into has_liked;
  return jsonb_build_object('count', total, 'liked', has_liked);
end;
$$;

-- Setting the desired state is idempotent, including retries after a lost reply.
create or replace function public.ningyo_set_like(p_doll_id integer, p_visitor_id uuid, p_liked boolean)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  total bigint;
  previously_liked boolean;
begin
  if p_doll_id is null or p_doll_id < 1 or p_doll_id > 43
      or p_visitor_id is null or p_liked is null then
    raise exception 'Invalid like request' using errcode = '22023';
  end if;
  select c.like_count into total
  from ningyo_private.doll_like_counts c where c.doll_id = p_doll_id for update;
  select v.active into previously_liked
  from ningyo_private.doll_like_votes v
  where v.doll_id = p_doll_id and v.visitor_id = p_visitor_id;
  previously_liked := coalesce(previously_liked, false);

  if p_liked and not previously_liked then
    insert into ningyo_private.doll_like_votes (doll_id, visitor_id, active)
    values (p_doll_id, p_visitor_id, true)
    on conflict (doll_id, visitor_id) do update set active = true;
    update ningyo_private.doll_like_counts c
    set like_count = c.like_count + 1 where c.doll_id = p_doll_id
    returning c.like_count into total;
  elsif not p_liked and previously_liked then
    update ningyo_private.doll_like_votes v set active = false
    where v.doll_id = p_doll_id and v.visitor_id = p_visitor_id;
    update ningyo_private.doll_like_counts c
    set like_count = c.like_count - 1 where c.doll_id = p_doll_id
    returning c.like_count into total;
  end if;
  return jsonb_build_object('count', total, 'liked', p_liked);
end;
$$;

-- Older cached pages can still add one vote safely.
create or replace function public.ningyo_add_like(p_doll_id integer, p_visitor_id uuid)
returns jsonb
language sql security definer set search_path = ''
as $$ select public.ningyo_set_like(p_doll_id, p_visitor_id, true); $$;

revoke all on function public.ningyo_get_likes(integer, uuid) from public, anon, authenticated;
revoke all on function public.ningyo_set_like(integer, uuid, boolean) from public, anon, authenticated;
revoke all on function public.ningyo_add_like(integer, uuid) from public, anon, authenticated;
grant execute on function public.ningyo_get_likes(integer, uuid) to anon, authenticated;
grant execute on function public.ningyo_set_like(integer, uuid, boolean) to anon, authenticated;
grant execute on function public.ningyo_add_like(integer, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
