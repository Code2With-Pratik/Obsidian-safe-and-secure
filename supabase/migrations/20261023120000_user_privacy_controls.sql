-- Account-scoped privacy preferences and a deliberately limited peer profile
-- surface. The matching APPLY_PENDING section is idempotent.

-- A clean migration chain starts from the original profiles table, which did
-- not include created_at. The public view needs this owner/profile field.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  read_receipts BOOLEAN NOT NULL DEFAULT true,
  typing_indicator BOOLEAN NOT NULL DEFAULT true,
  last_seen BOOLEAN NOT NULL DEFAULT false,
  profile_photo BOOLEAN NOT NULL DEFAULT true,
  allow_screenshots BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_privacy_select_own ON public.user_privacy_settings;
CREATE POLICY user_privacy_select_own ON public.user_privacy_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_privacy_insert_own ON public.user_privacy_settings;
CREATE POLICY user_privacy_insert_own ON public.user_privacy_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_privacy_update_own ON public.user_privacy_settings;
CREATE POLICY user_privacy_update_own ON public.user_privacy_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_privacy_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS user_privacy_touch_updated_at ON public.user_privacy_settings;
CREATE TRIGGER user_privacy_touch_updated_at
  BEFORE UPDATE ON public.user_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_privacy_updated_at();

INSERT INTO public.user_privacy_settings (user_id)
SELECT id FROM auth.users ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user_privacy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.user_privacy_settings (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_privacy_created ON auth.users;
CREATE TRIGGER on_auth_user_privacy_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_privacy();

-- Raw profiles are private to their owner (service-role bypasses RLS). Peer
-- discovery uses this limited view, which masks privacy-controlled fields.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_barrier = true, security_invoker = false) AS
SELECT p.id, p.username, p.name,
  CASE WHEN COALESCE(s.profile_photo, true) THEN p.avatar ELSE NULL END AS avatar,
  p.banner, p.status, p.profession, p.bio, p.pronouns, p.location, p.links,
  p.created_at,
  CASE WHEN COALESCE(s.last_seen, false) THEN p.last_seen_at ELSE NULL END AS last_seen_at
FROM public.profiles AS p
LEFT JOIN public.user_privacy_settings AS s ON s.user_id = p.id;

REVOKE ALL ON public.public_profiles FROM PUBLIC;
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO service_role;
