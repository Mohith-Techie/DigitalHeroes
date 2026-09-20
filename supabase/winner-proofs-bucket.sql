-- ---------------------------------------------------------------------------
-- Winner proof uploads (PRD §09)
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The bucket is PRIVATE: a score screenshot is personal, and a public bucket
-- would let anyone who guessed an object path read another member's upload.
-- `public.winners.proof_url` therefore stores the object PATH, and the app
-- mints a short-lived signed URL when it needs to display the image.
--
-- Object layout:  winner-proofs/<auth.uid()>/<winner_id>-<timestamp>.<ext>
-- The leading folder is what every policy below matches on.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'winner-proofs',
  'winner-proofs',
  false,
  5242880, -- 5 MB, mirrors MAX_PROOF_BYTES in src/lib/storage.ts
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policies are dropped first so this script is idempotent.
drop policy if exists "winner proofs: members upload own" on storage.objects;
drop policy if exists "winner proofs: members read own"   on storage.objects;
drop policy if exists "winner proofs: members replace own" on storage.objects;
drop policy if exists "winner proofs: members delete own" on storage.objects;
drop policy if exists "winner proofs: admins read all"    on storage.objects;

-- A member may write only inside their own folder.
create policy "winner proofs: members upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'winner-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "winner proofs: members read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'winner-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Needed for re-uploading a rejected screenshot.
create policy "winner proofs: members replace own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'winner-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'winner-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Lets the app clean up an object whose winners row turned out not to be theirs.
create policy "winner proofs: members delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'winner-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Admins review every submission (PRD §09: "ADMIN REVIEW — approve or reject").
create policy "winner proofs: admins read all"
  on storage.objects for select to authenticated
  using (bucket_id = 'winner-proofs' and public.is_admin());
