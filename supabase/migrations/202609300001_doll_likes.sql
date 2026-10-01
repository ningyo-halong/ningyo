-- IDs are the ORIGINAL page filenames: 16.html = doll_id 16 (display No.1).
-- Display order may change without moving or losing any likes.
begin;

create schema if not exists ningyo_private;
revoke all on schema ningyo_private from public, anon, authenticated;

create table if not exists ningyo_private.doll_like_counts (
  doll_id integer primary key check (doll_id between 1 and 43),
  like_count bigint not null default 0 check (like_count >= 0)
);
create table if not exists ningyo_private.doll_like_votes (
  doll_id integer not null references ningyo_private.doll_like_counts(doll_id),
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (doll_id, visitor_id)
);
alter table ningyo_private.doll_like_counts enable row level security;
alter table ningyo_private.doll_like_votes enable row level security;
revoke all on ningyo_private.doll_like_counts from public, anon, authenticated;
revoke all on ningyo_private.doll_like_votes from public, anon, authenticated;

insert into ningyo_private.doll_like_counts (doll_id)
select generate_series(1, 43)
on conflict (doll_id) do nothing;

-- Only the aggregate and this visitor's own liked state are exposed.
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
    where v.doll_id = p_doll_id and v.visitor_id = p_visitor_id
  ) into has_liked;
  return jsonb_build_object('count', total, 'liked', has_liked);
end;
$$;

create or replace function public.ningyo_add_like(p_doll_id integer, p_visitor_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  total bigint;
begin
  if p_doll_id is null or p_doll_id < 1 or p_doll_id > 43 or p_visitor_id is null then
    raise exception 'Invalid like request' using errcode = '22023';
  end if;
  -- Serialize writes to this doll so different visitors cannot lose increments.
  perform 1 from ningyo_private.doll_like_counts c
  where c.doll_id = p_doll_id for update;
  insert into ningyo_private.doll_like_votes (doll_id, visitor_id)
  values (p_doll_id, p_visitor_id)
  on conflict (doll_id, visitor_id) do nothing;
  if found then
    update ningyo_private.doll_like_counts c
    set like_count = c.like_count + 1 where c.doll_id = p_doll_id;
  end if;
  select c.like_count into total
  from ningyo_private.doll_like_counts c where c.doll_id = p_doll_id;
  return jsonb_build_object('count', total, 'liked', true);
end;
$$;

revoke all on function public.ningyo_get_likes(integer, uuid) from public, anon, authenticated;
revoke all on function public.ningyo_add_like(integer, uuid) from public, anon, authenticated;
grant execute on function public.ningyo_get_likes(integer, uuid) to anon, authenticated;
grant execute on function public.ningyo_add_like(integer, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
