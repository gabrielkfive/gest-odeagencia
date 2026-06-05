REVOKE ALL ON FUNCTION public.workflowark_is_admin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflowark_is_admin(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.workflowark_is_admin(uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.workflowark_is_active_member(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workflowark_is_active_member(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.workflowark_is_active_member(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.workflowark_is_admin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.workflowark_is_active_member(uuid, text) TO service_role;