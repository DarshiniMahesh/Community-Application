ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_country_code character varying NOT NULL DEFAULT '+91';

ALTER TABLE public.sanghas
  ADD COLUMN IF NOT EXISTS sangha_phone_country_code text NOT NULL DEFAULT '+91';

ALTER TABLE public.sangha_members
  ADD COLUMN IF NOT EXISTS phone_country_code character varying NOT NULL DEFAULT '+91';

ALTER TABLE public.company_auth
  ADD COLUMN IF NOT EXISTS phone_country_code character varying NOT NULL DEFAULT '+91';

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS contact_phone_country_code text NOT NULL DEFAULT '+91';