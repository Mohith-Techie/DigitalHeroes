-- ---------------------------------------------------------------------------
-- Admin access policies (PRD §11)
--
-- REFERENCE SCRIPT — run only if the admin dashboard reports "permission
-- denied". Your schema may already grant these; inspect what exists first:
--
--   select tablename, policyname, cmd, roles
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;
--
-- The admin area needs privileges an ordinary member does not have, because
-- running a draw reads EVERY member's profile and scores and then inserts
-- winner rows belonging to other people. Ordinary "own row only" policies
-- refuse all of that.
--
-- These use the schema's existing `public.is_admin()` helper and are additive:
-- a permissive policy ORs with the others, so members keep their own access.
-- Policy names are prefixed `admin:` so they cannot collide with yours.
-- ---------------------------------------------------------------------------

-- ── users ──────────────────────────────────────────────────────────────────
-- Read every profile (draw eligibility, payout screens, user management).
drop policy if exists "admin: read all users" on public.users;
create policy "admin: read all users"
  on public.users for select to authenticated
  using (public.is_admin());

-- Edit any profile (PRD §11.01 "view and edit user profiles").
drop policy if exists "admin: update all users" on public.users;
create policy "admin: update all users"
  on public.users for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── scores ─────────────────────────────────────────────────────────────────
-- Rank every eligible player, and edit scores (PRD §11.01).
drop policy if exists "admin: read all scores" on public.scores;
create policy "admin: read all scores"
  on public.scores for select to authenticated
  using (public.is_admin());

drop policy if exists "admin: update all scores" on public.scores;
create policy "admin: update all scores"
  on public.scores for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── draws ──────────────────────────────────────────────────────────────────
drop policy if exists "admin: manage draws" on public.draws;
create policy "admin: manage draws"
  on public.draws for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Members need to see published draws on their dashboard.
drop policy if exists "members read published draws" on public.draws;
create policy "members read published draws"
  on public.draws for select to authenticated
  using (status in ('open', 'closed', 'drawn', 'settled'));

-- ── winners ────────────────────────────────────────────────────────────────
-- The draw inserts rows for OTHER users, so this is the policy most likely to
-- be missing.
drop policy if exists "admin: manage winners" on public.winners;
create policy "admin: manage winners"
  on public.winners for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── charities ──────────────────────────────────────────────────────────────
drop policy if exists "admin: manage charities" on public.charities;
create policy "admin: manage charities"
  on public.charities for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Policies only filter rows — the role must also hold the table GRANT. If
-- reads still fail with 42501 after the above, the grant is what is missing:
--
--   grant select, insert, update, delete on public.winners to authenticated;
--   grant select, insert, update, delete on public.draws   to authenticated;
--   grant select, update                on public.users    to authenticated;
--   grant select, insert, update, delete on public.scores  to authenticated;
-- ---------------------------------------------------------------------------
