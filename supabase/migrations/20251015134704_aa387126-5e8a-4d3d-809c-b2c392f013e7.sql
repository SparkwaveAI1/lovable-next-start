-- Bootstrap policy: Allow first user to become super admin if no super admin exists yet
CREATE POLICY "Bootstrap first super admin"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    role = 'super_admin'::public.app_role 
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin'::public.app_role)
  );