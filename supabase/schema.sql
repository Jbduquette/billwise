-- Billwise sync: one row per person holding their whole ledger.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.

create table if not exists public.ledgers (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null,
  -- Bumped on every save. A save names the revision it started from, so two devices can't silently overwrite each other.
  revision   bigint not null default 1,
  updated_at timestamptz not null default now(),
  -- A real ledger is a few hundred KB at most; this stops the table being used as free storage.
  constraint ledger_size check (pg_column_size(data) < 2000000)
);

-- Row-level security: a signed-in person can reach their own row and nothing else.
alter table public.ledgers enable row level security;

drop policy if exists "Read own ledger" on public.ledgers;
drop policy if exists "Create own ledger" on public.ledgers;
drop policy if exists "Update own ledger" on public.ledgers;
drop policy if exists "Delete own ledger" on public.ledgers;

create policy "Read own ledger" on public.ledgers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own ledger" on public.ledgers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own ledger" on public.ledgers
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own ledger" on public.ledgers
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Signed-out visitors get no access at all; signed-in people get exactly what the policies allow.
revoke all on public.ledgers from anon;
grant select, insert, update, delete on public.ledgers to authenticated;
