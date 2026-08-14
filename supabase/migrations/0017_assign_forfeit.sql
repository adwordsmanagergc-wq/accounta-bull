-- Accounta-Bull — let coaches attach a forfeit when assigning a task to a client
-- or the whole team. Adds an optional p_forfeit param to assign_team_task.
-- Run AFTER 0016_stakes.sql.

-- Drop the old 7-arg version so the new 8-arg one is unambiguous. Callers that
-- omit p_forfeit still resolve to it via the default.
drop function if exists public.assign_team_task(uuid, uuid, text, text, text, integer[], integer);

create or replace function public.assign_team_task(
  p_team uuid, p_client uuid, p_title text, p_category text default 'other',
  p_time text default '08:00', p_repeat integer[] default '{}', p_horns integer default 10,
  p_forfeit text default null
) returns integer language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); n integer := 0; r record; f text := nullif(trim(coalesce(p_forfeit, '')), '');
begin
  if not public.is_team_coach(p_team) then raise exception 'Only a coach can assign tasks'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Task needs a title'; end if;
  if p_category not in ('fitness','work','mind','other') then p_category := 'other'; end if;
  if p_client is not null then
    if not exists (select 1 from public.team_members m
                   where m.team_id = p_team and m.user_id = p_client
                     and m.role = 'client' and m.status = 'active') then
      raise exception 'That client is not on this team';
    end if;
    insert into public.goals (user_id, title, category, time_of_day, repeat_days, horn_value, team_id, assigned_by, forfeit)
      values (p_client, trim(p_title), p_category, p_time, p_repeat, greatest(0, p_horns), p_team, me, f);
    n := 1;
  else
    for r in select user_id from public.team_members
             where team_id = p_team and role = 'client' and status = 'active' loop
      insert into public.goals (user_id, title, category, time_of_day, repeat_days, horn_value, team_id, assigned_by, forfeit)
        values (r.user_id, trim(p_title), p_category, p_time, p_repeat, greatest(0, p_horns), p_team, me, f);
      n := n + 1;
    end loop;
  end if;
  return n;
end; $$;
grant execute on function public.assign_team_task(uuid, uuid, text, text, text, integer[], integer, text) to authenticated;
