
-- 1) Server-side site kill switch + image path constraint on recruitment_applications
DROP POLICY IF EXISTS "Users manage own application" ON public.recruitment_applications;

CREATE POLICY "View own or admin"
ON public.recruitment_applications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Insert own when site enabled"
ON public.recruitment_applications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin')
    OR NOT COALESCE((SELECT site_disabled FROM public.site_settings LIMIT 1), false)
  )
);

CREATE POLICY "Update own or admin"
ON public.recruitment_applications FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (
  (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  AND (
    public.has_role(auth.uid(), 'admin')
    OR NOT COALESCE((SELECT site_disabled FROM public.site_settings LIMIT 1), false)
  )
);

CREATE POLICY "Delete own or admin"
ON public.recruitment_applications FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2) Restrict profile_image_url to storage paths only (no external URLs)
-- Strip any pre-existing signed URLs down to the storage path
UPDATE public.recruitment_applications
SET profile_image_url = regexp_replace(
  split_part(profile_image_url, '?', 1),
  '^.*/storage/v1/object/(?:sign|public)/esports-profiles/', ''
)
WHERE profile_image_url IS NOT NULL
  AND profile_image_url LIKE 'http%';

ALTER TABLE public.recruitment_applications
ADD CONSTRAINT profile_image_url_is_path
CHECK (
  profile_image_url IS NULL
  OR profile_image_url !~ '^(https?:|data:|//)'
);

-- 3) Revoke direct EXECUTE on has_role from API roles (still callable inside RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
