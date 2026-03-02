-- Allow admins to manage branches and departments (RLS was blocking INSERT/UPDATE/DELETE)
-- Run after 003_username_auth.sql

-- branches: admin can insert, update, delete
CREATE POLICY "branches_insert_admin" ON branches FOR INSERT TO authenticated
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "branches_update_admin" ON branches FOR UPDATE TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "branches_delete_admin" ON branches FOR DELETE TO authenticated
  USING (public.user_role() = 'admin');

-- departments: admin can insert, update, delete
CREATE POLICY "departments_insert_admin" ON departments FOR INSERT TO authenticated
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "departments_update_admin" ON departments FOR UPDATE TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');
CREATE POLICY "departments_delete_admin" ON departments FOR DELETE TO authenticated
  USING (public.user_role() = 'admin');
