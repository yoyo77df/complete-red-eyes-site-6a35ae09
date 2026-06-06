-- Deduplicate any existing rows (keep oldest per user) before adding unique constraint
DELETE FROM public.recruitment_applications a
USING public.recruitment_applications b
WHERE a.user_id = b.user_id AND a.created_at > b.created_at;

ALTER TABLE public.recruitment_applications
  ADD CONSTRAINT recruitment_applications_user_id_key UNIQUE (user_id);