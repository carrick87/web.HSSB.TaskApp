-- TaskApp — Harrison Sabah Sdn Bhd
-- Initial schema: tables, RLS, triggers, seed data, pg_cron

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =============================================================================
-- TABLES (order respects FK dependencies)
-- =============================================================================

-- 1. branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

-- 2. departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 3. profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  harrison_email TEXT UNIQUE,
  branch_id UUID REFERENCES branches(id),
  department_id UUID REFERENCES departments(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'pic', 'staff')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT harrison_email_domain CHECK (
    harrison_email IS NULL OR harrison_email LIKE '%@harrisons.com.my'
  )
);

-- 4. task_templates
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by_profile_id UUID REFERENCES profiles(id),
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'monthly', 'custom')),
  recurrence_value INT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  requires_verification BOOLEAN DEFAULT true,
  assign_to_type TEXT NOT NULL CHECK (assign_to_type IN ('user', 'branch', 'department')),
  assign_to_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. task_template_questions
CREATE TABLE task_template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_type TEXT NOT NULL CHECK (answer_type IN ('text', 'number', 'boolean', 'choice', 'file')),
  is_required BOOLEAN DEFAULT true,
  options_json JSONB,
  sort_order INT DEFAULT 0
);

-- 6. task_instances
CREATE TABLE task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_templates(id),
  assignee_profile_id UUID NOT NULL REFERENCES profiles(id),
  assignment_date DATE NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'submitted', 'verified', 'rejected', 'failed')),
  accepted_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  pic_comment TEXT,
  is_late BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. task_instance_answers
CREATE TABLE task_instance_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id UUID NOT NULL REFERENCES task_instances(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES task_template_questions(id),
  answer_text TEXT,
  answer_number NUMERIC,
  answer_boolean BOOLEAN,
  answer_file_url TEXT
);

-- 8. task_user_stats
CREATE TABLE task_user_stats (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_completed INT DEFAULT 0,
  total_late_submissions INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. point_settings
CREATE TABLE point_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT UNIQUE NOT NULL CHECK (event_type IN ('completed_on_time', 'completed_late', 'failed', 'not_completed')),
  points INT NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. user_points
CREATE TABLE user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  task_instance_id UUID REFERENCES task_instances(id),
  event_type TEXT,
  points_earned INT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  month INT,
  year INT
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_branch ON profiles(branch_id);
CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_task_instances_assignee ON task_instances(assignee_profile_id);
CREATE INDEX idx_task_instances_status ON task_instances(status);
CREATE INDEX idx_task_instances_assignment_date ON task_instances(assignment_date);
CREATE INDEX idx_task_instances_due_date ON task_instances(due_date);
CREATE INDEX idx_user_points_profile ON user_points(profile_id);
CREATE INDEX idx_user_points_month_year ON user_points(month, year);

CREATE SCHEMA IF NOT EXISTS task_app;

-- Trigger to set month/year on user_points (generated columns would require immutable expr)
CREATE OR REPLACE FUNCTION task_app.set_user_points_month_year()
RETURNS TRIGGER AS $$
BEGIN
  NEW.month := EXTRACT(MONTH FROM NEW.earned_at)::INT;
  NEW.year := EXTRACT(YEAR FROM NEW.earned_at)::INT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER user_points_set_month_year
  BEFORE INSERT OR UPDATE OF earned_at ON user_points
  FOR EACH ROW
  EXECUTE PROCEDURE task_app.set_user_points_month_year();

-- Unique constraint to avoid duplicate task instances per assignee per day per template
CREATE UNIQUE INDEX idx_task_instances_unique_assignment
  ON task_instances (template_id, assignee_profile_id, assignment_date);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instance_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's profile role (in public schema; auth schema is not writable)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's branch_id
CREATE OR REPLACE FUNCTION public.user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get current user's department_id
CREATE OR REPLACE FUNCTION public.user_department_id()
RETURNS UUID AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- branches: all authenticated can read
CREATE POLICY "branches_select" ON branches FOR SELECT TO authenticated USING (true);

-- departments: all authenticated can read
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);

-- profiles: admin full; others can read limited (for leaderboard, assignees)
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- task_templates: admin full; pic can CRUD; staff can read
CREATE POLICY "task_templates_select" ON task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_templates_insert" ON task_templates FOR INSERT TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_templates_update" ON task_templates FOR UPDATE TO authenticated
  USING (public.user_role() IN ('admin', 'pic'))
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_templates_delete" ON task_templates FOR DELETE TO authenticated
  USING (public.user_role() = 'admin');

-- task_template_questions: same as template (via template ownership for pic)
CREATE POLICY "task_template_questions_select" ON task_template_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_template_questions_insert" ON task_template_questions FOR INSERT TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_template_questions_update" ON task_template_questions FOR UPDATE TO authenticated
  USING (public.user_role() IN ('admin', 'pic'))
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_template_questions_delete" ON task_template_questions FOR DELETE TO authenticated
  USING (public.user_role() IN ('admin', 'pic'));

-- task_instances: staff own; pic branch/department; admin all
CREATE POLICY "task_instances_select_staff" ON task_instances FOR SELECT TO authenticated
  USING (assignee_profile_id = auth.uid());
CREATE POLICY "task_instances_select_pic" ON task_instances FOR SELECT TO authenticated
  USING (
    public.user_role() = 'pic' AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = task_instances.assignee_profile_id
          AND (p.branch_id = public.user_branch_id() OR p.department_id = public.user_department_id())
      )
    )
  );
CREATE POLICY "task_instances_select_admin" ON task_instances FOR SELECT TO authenticated
  USING (public.user_role() = 'admin');
CREATE POLICY "task_instances_insert" ON task_instances FOR INSERT TO authenticated
  WITH CHECK (public.user_role() IN ('admin', 'pic'));
CREATE POLICY "task_instances_update_staff" ON task_instances FOR UPDATE TO authenticated
  USING (assignee_profile_id = auth.uid())
  WITH CHECK (assignee_profile_id = auth.uid());
CREATE POLICY "task_instances_update_pic" ON task_instances FOR UPDATE TO authenticated
  USING (public.user_role() = 'pic')
  WITH CHECK (public.user_role() = 'pic');
CREATE POLICY "task_instances_update_admin" ON task_instances FOR UPDATE TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- task_instance_answers: follow task_instance access
CREATE POLICY "task_instance_answers_select" ON task_instance_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_instances ti
      WHERE ti.id = task_instance_answers.task_instance_id
        AND (
          ti.assignee_profile_id = auth.uid()
          OR public.user_role() IN ('admin', 'pic')
        )
    )
  );
CREATE POLICY "task_instance_answers_insert" ON task_instance_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_instances ti
      WHERE ti.id = task_instance_answers.task_instance_id AND ti.assignee_profile_id = auth.uid()
    )
  );
CREATE POLICY "task_instance_answers_update" ON task_instance_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_instances ti
      WHERE ti.id = task_instance_answers.task_instance_id AND ti.assignee_profile_id = auth.uid()
    )
  );

-- task_user_stats: users read own; admin read all
CREATE POLICY "task_user_stats_select_own" ON task_user_stats FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "task_user_stats_select_admin" ON task_user_stats FOR SELECT TO authenticated
  USING (public.user_role() = 'admin');
CREATE POLICY "task_user_stats_all_admin" ON task_user_stats FOR ALL TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- point_settings: all read; admin write
CREATE POLICY "point_settings_select" ON point_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "point_settings_admin" ON point_settings FOR ALL TO authenticated
  USING (public.user_role() = 'admin')
  WITH CHECK (public.user_role() = 'admin');

-- user_points: read own or admin/leaderboard (all for leaderboard)
CREATE POLICY "user_points_select" ON user_points FOR SELECT TO authenticated USING (true);
-- Inserts into user_points are done by the SECURITY DEFINER trigger (runs as table owner), so no INSERT policy needed for users.

-- =============================================================================
-- SEED DATA: point_settings
-- =============================================================================
INSERT INTO point_settings (event_type, points) VALUES
  ('completed_on_time', 10),
  ('completed_late', 5),
  ('failed', -3),
  ('not_completed', 0);

-- =============================================================================
-- TRIGGER: Points and stats on task_instances status change
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS task_app;

CREATE OR REPLACE FUNCTION task_app.apply_task_points_and_stats()
RETURNS TRIGGER AS $$
DECLARE
  pts INT;
  evt TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'verified' THEN
    evt := CASE WHEN NEW.is_late THEN 'completed_late' ELSE 'completed_on_time' END;
    SELECT points INTO pts FROM point_settings WHERE event_type = evt LIMIT 1;
    IF pts IS NULL THEN pts := 0; END IF;

    INSERT INTO user_points (profile_id, task_instance_id, event_type, points_earned)
    VALUES (NEW.assignee_profile_id, NEW.id, evt, pts);

    INSERT INTO task_user_stats (profile_id, total_completed, total_late_submissions, updated_at)
    VALUES (
      NEW.assignee_profile_id,
      1,
      CASE WHEN NEW.is_late THEN 1 ELSE 0 END,
      now()
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      total_completed = task_user_stats.total_completed + 1,
      total_late_submissions = task_user_stats.total_late_submissions + CASE WHEN NEW.is_late THEN 1 ELSE 0 END,
      updated_at = now();
  ELSIF NEW.status = 'failed' THEN
    SELECT points INTO pts FROM point_settings WHERE event_type = 'failed' LIMIT 1;
    IF pts IS NULL THEN pts := 0; END IF;

    INSERT INTO user_points (profile_id, task_instance_id, event_type, points_earned)
    VALUES (NEW.assignee_profile_id, NEW.id, 'failed', pts);

    INSERT INTO task_user_stats (profile_id, total_failed, updated_at)
    VALUES (NEW.assignee_profile_id, 1, now())
    ON CONFLICT (profile_id) DO UPDATE SET
      total_failed = task_user_stats.total_failed + 1,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER task_instances_points_trigger
  AFTER UPDATE OF status ON task_instances
  FOR EACH ROW
  EXECUTE PROCEDURE task_app.apply_task_points_and_stats();

-- =============================================================================
-- STORAGE: task-files bucket (run in Dashboard or via API; policy below)
-- =============================================================================
-- Bucket creation is typically done in Dashboard. Policy for RLS:
-- INSERT: authenticated users
-- SELECT: authenticated, own folder only (storage.foldername() or path prefix)

-- =============================================================================
-- PG_CRON: Daily task generation at midnight
-- =============================================================================
CREATE OR REPLACE FUNCTION task_app.generate_daily_tasks()
RETURNS void AS $$
DECLARE
  t RECORD;
  assignee_ids UUID[];
  aid UUID;
  due_ts TIMESTAMPTZ;
  today_date DATE := CURRENT_DATE;
BEGIN
  due_ts := (today_date + INTERVAL '1 day')::date::timestamp - INTERVAL '1 second';

  FOR t IN
    SELECT tt.id AS template_id, tt.assign_to_type, tt.assign_to_id
    FROM task_templates tt
    WHERE tt.is_active = true
      AND (tt.start_date IS NULL OR tt.start_date <= today_date)
      AND (tt.end_date IS NULL OR tt.end_date >= today_date)
      AND (
        (tt.recurrence_type = 'daily')
        OR (tt.recurrence_type = 'monthly' AND EXTRACT(DAY FROM today_date) = 1)
        OR (tt.recurrence_type = 'custom' AND tt.recurrence_value > 0 AND tt.start_date IS NOT NULL
            AND ((today_date - tt.start_date) % tt.recurrence_value = 0))
      )
  LOOP
    assignee_ids := ARRAY[]::UUID[];

    IF t.assign_to_type = 'user' AND t.assign_to_id IS NOT NULL THEN
      assignee_ids := array_append(assignee_ids, t.assign_to_id);
    ELSIF t.assign_to_type = 'branch' AND t.assign_to_id IS NOT NULL THEN
      SELECT array_agg(id) INTO assignee_ids FROM profiles WHERE branch_id = t.assign_to_id AND role = 'staff';
    ELSIF t.assign_to_type = 'department' AND t.assign_to_id IS NOT NULL THEN
      SELECT array_agg(id) INTO assignee_ids FROM profiles WHERE department_id = t.assign_to_id AND role = 'staff';
    END IF;

    IF assignee_ids IS NULL THEN assignee_ids := ARRAY[]::UUID[]; END IF;

    FOREACH aid IN ARRAY assignee_ids
    LOOP
      INSERT INTO task_instances (template_id, assignee_profile_id, assignment_date, due_date, status)
      VALUES (t.template_id, aid, today_date, due_ts, 'pending')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron (run at 00:01 daily). Note: pg_cron may require superuser / Supabase dashboard.
-- SELECT cron.schedule('generate-daily-tasks', '1 0 * * *', 'SELECT task_app.generate_daily_tasks()');
