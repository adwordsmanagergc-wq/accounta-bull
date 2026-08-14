-- Accounta-Bull — unread tracking for chats. Records when each user last read a
-- conversation, so we can show unread indicators. Additive only.

create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;
drop policy if exists "own reads" on public.conversation_reads;
create policy "own reads" on public.conversation_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Mark a conversation read up to now (for the calling user).
create or replace function public.mark_conversation_read(p_conv uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_conversation_member(p_conv) then return; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
    values (p_conv, auth.uid(), now())
    on conflict (conversation_id, user_id) do update set last_read_at = now();
end; $$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Conversations with messages from someone else since the caller last read them.
create or replace function public.unread_conversations()
returns table (conversation_id uuid) language sql security definer stable set search_path = public as $$
  select c.id from public.conversations c
  where public.is_conversation_member(c.id)
    and exists (
      select 1 from public.messages m
      where m.conversation_id = c.id and m.user_id <> auth.uid()
        and m.created_at > coalesce(
          (select r.last_read_at from public.conversation_reads r
           where r.conversation_id = c.id and r.user_id = auth.uid()),
          'epoch'::timestamptz)
    );
$$;
grant execute on function public.unread_conversations() to authenticated;
