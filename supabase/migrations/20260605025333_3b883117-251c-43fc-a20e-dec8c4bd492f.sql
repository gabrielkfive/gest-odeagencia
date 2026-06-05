DROP POLICY IF EXISTS "Active members can view members" ON public.workflowark_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.workflowark_members;
DROP POLICY IF EXISTS "Admins can edit members" ON public.workflowark_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.workflowark_members;
DROP POLICY IF EXISTS "Active members can view workflow state" ON public.workflowark_state;
DROP POLICY IF EXISTS "Active members can create workflow state" ON public.workflowark_state;
DROP POLICY IF EXISTS "Active members can edit workflow state" ON public.workflowark_state;
DROP POLICY IF EXISTS "Admins can remove workflow state" ON public.workflowark_state;

CREATE POLICY "No direct member access"
ON public.workflowark_members
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct workflow state access"
ON public.workflowark_state
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP FUNCTION IF EXISTS public.workflowark_is_admin(uuid, text);
DROP FUNCTION IF EXISTS public.workflowark_is_active_member(uuid, text);