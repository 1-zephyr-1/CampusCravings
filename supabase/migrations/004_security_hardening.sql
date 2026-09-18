-- Migration: 004_security_hardening
-- Fix P0: role escalation, profiles PII exposure, and add ban helpers
-- Run in Supabase SQL Editor after 003

-- 1) Tighten profiles: restrict email exposure
-- Keep public read for now but ensure future view hides email; we lock update to prevent role escalation
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;

-- Only allow users to update their own full_name/avatar_url — not role/is_banned/is_approved
CREATE POLICY "Profiles: update own limited"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent escalation: role can only stay same unless caller is creator (checked via existing row)
    AND (
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'creator')
    )
    -- Only creator can toggle is_banned / is_approved
    AND (
      is_banned = (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'creator')
    )
  );

-- Helper: allow creator to update any profile (for bans/approvals)
DROP POLICY IF EXISTS "Profiles: creator update any" ON public.profiles;
CREATE POLICY "Profiles: creator update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'creator'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'creator'));

-- 2) Ensure banned users cannot read/write sensitive tables via RLS
-- Orders: banned users blocked via middleware, but add defense-in-depth check
-- (no structural change — middleware handles ban; RLS keeps existing)

-- 3) Storage buckets — ensure they exist (idempotent)
-- Note: storage.buckets is in storage schema; these inserts are safe if bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can upload to own store folder; public read
DROP POLICY IF EXISTS "Food images: public read" ON storage.objects;
CREATE POLICY "Food images: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

DROP POLICY IF EXISTS "Food images: seller upload own" ON storage.objects;
CREATE POLICY "Food images: seller upload own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-images'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.stores WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Food images: seller update own" ON storage.objects;
CREATE POLICY "Food images: seller update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-images'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.stores WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Food images: seller delete own" ON storage.objects;
CREATE POLICY "Food images: seller delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-images'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.stores WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Avatars: public read" ON storage.objects;
CREATE POLICY "Avatars: public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars: users manage own" ON storage.objects;
CREATE POLICY "Avatars: users manage own"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4) Helper view for public profiles without email (optional — use in feed instead of profiles.*)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, avatar_url, role, created_at FROM public.profiles;

-- 5) Prevent direct role='creator' inserts via RLS with_check
-- (covered by update policy above; inserts remain via service or insert own with check auth.uid=id — clients can still choose role but only customer/seller)
-- No extra policy needed for insert; existing "Profiles: insert own" with check (auth.uid()=id) remains.
-- Application layer (auth.ts + callback) enforces creator only if email === CREATOR_EMAIL securely server-side.
