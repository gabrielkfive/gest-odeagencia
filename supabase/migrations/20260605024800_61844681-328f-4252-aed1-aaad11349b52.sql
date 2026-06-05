DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflowark_role') THEN
    CREATE TYPE public.workflowark_role AS ENUM ('admin', 'gestor', 'financeiro', 'operacao', 'comercial', 'marketing', 'viewer');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.workflowark_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  user_id uuid UNIQUE,
  role public.workflowark_role NOT NULL DEFAULT 'viewer',
  active boolean NOT NULL DEFAULT true,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflowark_members TO authenticated;
GRANT ALL ON public.workflowark_members TO service_role;

ALTER TABLE public.workflowark_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.workflowark_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workflowark_members_updated_at ON public.workflowark_members;
CREATE TRIGGER workflowark_members_updated_at
BEFORE UPDATE ON public.workflowark_members
FOR EACH ROW
EXECUTE FUNCTION public.workflowark_touch_updated_at();

CREATE OR REPLACE FUNCTION public.workflowark_is_admin(_user_id uuid, _email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workflowark_members
    WHERE active = true
      AND role = 'admin'
      AND (
        user_id = _user_id
        OR (lower(email) = lower(coalesce(_email, '')))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.workflowark_is_active_member(_user_id uuid, _email text DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM public.workflowark_members)
    OR EXISTS (
      SELECT 1
      FROM public.workflowark_members
      WHERE active = true
        AND (
          user_id = _user_id
          OR lower(email) = lower(coalesce(_email, ''))
        )
    )
$$;

DROP POLICY IF EXISTS "Active members can view members" ON public.workflowark_members;
CREATE POLICY "Active members can view members"
ON public.workflowark_members
FOR SELECT
TO authenticated
USING (public.workflowark_is_active_member(auth.uid(), auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Admins can add members" ON public.workflowark_members;
CREATE POLICY "Admins can add members"
ON public.workflowark_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.workflowark_is_admin(auth.uid(), auth.jwt() ->> 'email')
  OR NOT EXISTS (SELECT 1 FROM public.workflowark_members)
);

DROP POLICY IF EXISTS "Admins can edit members" ON public.workflowark_members;
CREATE POLICY "Admins can edit members"
ON public.workflowark_members
FOR UPDATE
TO authenticated
USING (public.workflowark_is_admin(auth.uid(), auth.jwt() ->> 'email'))
WITH CHECK (public.workflowark_is_admin(auth.uid(), auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Admins can remove members" ON public.workflowark_members;
CREATE POLICY "Admins can remove members"
ON public.workflowark_members
FOR DELETE
TO authenticated
USING (public.workflowark_is_admin(auth.uid(), auth.jwt() ->> 'email'));

CREATE TABLE IF NOT EXISTS public.workflowark_state (
  key text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT 'null'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflowark_state TO authenticated;
GRANT ALL ON public.workflowark_state TO service_role;

ALTER TABLE public.workflowark_state ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS workflowark_state_updated_at ON public.workflowark_state;
CREATE TRIGGER workflowark_state_updated_at
BEFORE UPDATE ON public.workflowark_state
FOR EACH ROW
EXECUTE FUNCTION public.workflowark_touch_updated_at();

DROP POLICY IF EXISTS "Active members can view workflow state" ON public.workflowark_state;
CREATE POLICY "Active members can view workflow state"
ON public.workflowark_state
FOR SELECT
TO authenticated
USING (public.workflowark_is_active_member(auth.uid(), auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Active members can create workflow state" ON public.workflowark_state;
CREATE POLICY "Active members can create workflow state"
ON public.workflowark_state
FOR INSERT
TO authenticated
WITH CHECK (public.workflowark_is_active_member(auth.uid(), auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Active members can edit workflow state" ON public.workflowark_state;
CREATE POLICY "Active members can edit workflow state"
ON public.workflowark_state
FOR UPDATE
TO authenticated
USING (public.workflowark_is_active_member(auth.uid(), auth.jwt() ->> 'email'))
WITH CHECK (public.workflowark_is_active_member(auth.uid(), auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Admins can remove workflow state" ON public.workflowark_state;
CREATE POLICY "Admins can remove workflow state"
ON public.workflowark_state
FOR DELETE
TO authenticated
USING (public.workflowark_is_admin(auth.uid(), auth.jwt() ->> 'email'));
