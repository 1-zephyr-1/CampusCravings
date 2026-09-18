-- ============================================================================
-- 005_jwt_claims.sql — populate JWT app_metadata on profile changes
-- ============================================================================
-- Problem: middleware currently runs SELECT on profiles for every protected
-- request, just to read `role`, `is_approved`, `is_banned`. That adds 1-2 DB
-- hops per request — slow on hot paths like the feed and seller dashboard.
--
-- Solution: copy those three fields into `auth.users.raw_app_meta_data`,
-- which Supabase signs into the user's JWT. The middleware can then read
-- role/approval/ban status from the token alone — no DB hit.
--
-- The DB stays the source of truth. This trigger mirrors profile → claims.
-- Downstream consumers can call `public.get_jwt_claims()` to inspect what's
-- in the token.
--
-- Safe to run on a live database: AFTER triggers don't block writes.

CREATE OR REPLACE FUNCTION public.sync_profile_claims()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  claims jsonb;
BEGIN
  claims := COALESCE(
    (SELECT raw_app_meta_data FROM auth.users WHERE id = NEW.id),
    '{}'::jsonb
  );

  claims := jsonb_set(
    claims,
    '{role}',
    to_jsonb(COALESCE(NEW.role, 'customer'::text))
  );
  claims := jsonb_set(claims, '{is_approved}', to_jsonb(COALESCE(NEW.is_approved, false)));
  claims := jsonb_set(claims, '{is_banned}', to_jsonb(COALESCE(NEW.is_banned, false)));

  UPDATE auth.users
     SET raw_app_meta_data = claims
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_claims ON public.profiles;
CREATE TRIGGER trg_sync_profile_claims
AFTER INSERT OR UPDATE OF role, is_approved, is_banned
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_claims();

-- Backfill: sync claims for any existing profiles right now so the JWTs
-- issued on next sign-in are correct from the start.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id, role, is_approved, is_banned FROM public.profiles LOOP
    UPDATE auth.users
       SET raw_app_meta_data = jsonb_set(
             jsonb_set(
               jsonb_set(
                 COALESCE(raw_app_meta_data, '{}'::jsonb),
                 '{role}', to_jsonb(COALESCE(r.role, 'customer'::text))
               ),
               '{is_approved}', to_jsonb(COALESCE(r.is_approved, false))
             ),
             '{is_banned}', to_jsonb(COALESCE(r.is_banned, false))
           )
     WHERE id = r.id;
  END LOOP;
END $$;
