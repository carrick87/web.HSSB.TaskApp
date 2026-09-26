--
-- PostgreSQL database dump
--

\restrict S6zE5dg7RIIfeVTs2uCMmSbPEcGLfG08e6PsUpeDbOJ3RY3oIgF0HQz7VT5EXpX

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: cron; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cron;


--
-- Name: net; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA net;


--
-- Name: private; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA private;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: task_app; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA task_app;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;


--
-- Name: can_access_task_file(text); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.can_access_task_file(file_path text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_task_id UUID;
BEGIN
  BEGIN
    v_task_id := (storage.foldername(file_path))[1]::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;
  
  RETURN private.can_view_task(v_task_id);
END;
$$;


--
-- Name: can_edit_task(uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.can_edit_task(p_task_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_task RECORD;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  SELECT created_by, assignee_id INTO v_task FROM public.tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_task.created_by = v_user_id OR v_task.assignee_id = v_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


--
-- Name: can_view_task(uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.can_view_task(p_task_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_user_dept UUID;
  v_task RECORD;
BEGIN
  v_user_id := (SELECT auth.uid());
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role, department_id INTO v_user_role, v_user_dept
  FROM public.profiles WHERE id = v_user_id;

  IF v_user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  SELECT project_id, created_by, assignee_id, department_id
  INTO v_task
  FROM public.tasks WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Manager can see all tasks in their department
  IF v_user_role = 'pic' AND v_task.department_id = v_user_dept THEN
    RETURN TRUE;
  END IF;

  -- Manager can see private task if assignee is in their department
  IF v_user_role = 'pic' AND v_task.project_id IS NULL THEN
    IF (SELECT department_id FROM public.profiles WHERE id = v_task.assignee_id) = v_user_dept THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Project task: only project members (NOT assignee/creator alone)
  IF v_task.project_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = v_task.project_id AND profile_id = v_user_id
    );
  END IF;

  -- Private task: user is assignee or creator
  IF v_task.assignee_id = v_user_id OR v_task.created_by = v_user_id THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


--
-- Name: get_profile_department_id(uuid); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.get_profile_department_id(p_profile_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT department_id FROM public.profiles WHERE id = p_profile_id
$$;


--
-- Name: get_user_department_id(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.get_user_department_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT department_id FROM public.profiles WHERE id = (SELECT auth.uid())
$$;


--
-- Name: get_user_project_ids(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.get_user_project_ids() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT project_id FROM public.project_members WHERE profile_id = (SELECT auth.uid())
$$;


--
-- Name: get_user_role(); Type: FUNCTION; Schema: private; Owner: -
--

CREATE FUNCTION private.get_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_branch_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_branch_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT branch_id FROM public.profiles WHERE id = auth.uid()
$$;


--
-- Name: user_department_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_department_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid()
$$;


--
-- Name: user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT string_to_array(name, '/');
$$;


--
-- Name: apply_task_points_and_stats(); Type: FUNCTION; Schema: task_app; Owner: -
--

CREATE FUNCTION task_app.apply_task_points_and_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: generate_daily_tasks(); Type: FUNCTION; Schema: task_app; Owner: -
--

CREATE FUNCTION task_app.generate_daily_tasks() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: set_user_points_month_year(); Type: FUNCTION; Schema: task_app; Owner: -
--

CREATE FUNCTION task_app.set_user_points_month_year() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.month := EXTRACT(MONTH FROM NEW.earned_at)::INT;
  NEW.year := EXTRACT(YEAR FROM NEW.earned_at)::INT;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid NOT NULL,
    email text,
    encrypted_password text,
    email_confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    name text NOT NULL
);


--
-- Name: point_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.point_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    points integer NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT point_settings_event_type_check CHECK ((event_type = ANY (ARRAY['completed_on_time'::text, 'completed_late'::text, 'failed'::text, 'not_completed'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    harrison_email text,
    branch_id uuid,
    department_id uuid,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    auth_email text NOT NULL,
    CONSTRAINT harrison_email_domain CHECK (((harrison_email IS NULL) OR (harrison_email ~~ '%@harrisons.com.my'::text))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'pic'::text, 'staff'::text])))
);


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    project_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    department_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    content_type text,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    author_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_instance_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_instance_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_instance_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_text text,
    answer_number numeric,
    answer_boolean boolean,
    answer_file_url text
);


--
-- Name: task_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    assignee_profile_id uuid NOT NULL,
    assignment_date date NOT NULL,
    due_date timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    accepted_at timestamp with time zone,
    submitted_at timestamp with time zone,
    verified_at timestamp with time zone,
    rejected_at timestamp with time zone,
    pic_comment text,
    is_late boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_instances_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'submitted'::text, 'verified'::text, 'rejected'::text, 'failed'::text])))
);


--
-- Name: task_template_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_template_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    question_text text NOT NULL,
    answer_type text NOT NULL,
    is_required boolean DEFAULT true,
    options_json jsonb,
    sort_order integer DEFAULT 0,
    CONSTRAINT task_template_questions_answer_type_check CHECK ((answer_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'choice'::text, 'file'::text])))
);


--
-- Name: task_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    created_by_profile_id uuid,
    recurrence_type text NOT NULL,
    recurrence_value integer,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    requires_verification boolean DEFAULT true,
    assign_to_type text NOT NULL,
    assign_to_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT task_templates_assign_to_type_check CHECK ((assign_to_type = ANY (ARRAY['user'::text, 'branch'::text, 'department'::text]))),
    CONSTRAINT task_templates_recurrence_type_check CHECK ((recurrence_type = ANY (ARRAY['daily'::text, 'monthly'::text, 'custom'::text])))
);


--
-- Name: task_user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_user_stats (
    profile_id uuid NOT NULL,
    total_completed integer DEFAULT 0,
    total_late_submissions integer DEFAULT 0,
    total_failed integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    due_date date,
    department_id uuid NOT NULL,
    project_id uuid,
    created_by uuid NOT NULL,
    assignee_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text])))
);


--
-- Name: user_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    task_instance_id uuid,
    event_type text,
    points_earned integer NOT NULL,
    earned_at timestamp with time zone DEFAULT now(),
    month integer,
    year integer
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    public boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[]
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    owner_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: point_settings point_settings_event_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_settings
    ADD CONSTRAINT point_settings_event_type_key UNIQUE (event_type);


--
-- Name: point_settings point_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_settings
    ADD CONSTRAINT point_settings_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_auth_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_auth_email_key UNIQUE (auth_email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (project_id, profile_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: task_attachments task_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_instance_answers task_instance_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_instance_answers
    ADD CONSTRAINT task_instance_answers_pkey PRIMARY KEY (id);


--
-- Name: task_instances task_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_instances
    ADD CONSTRAINT task_instances_pkey PRIMARY KEY (id);


--
-- Name: task_template_questions task_template_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_template_questions
    ADD CONSTRAINT task_template_questions_pkey PRIMARY KEY (id);


--
-- Name: task_templates task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_pkey PRIMARY KEY (id);


--
-- Name: task_user_stats task_user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_user_stats
    ADD CONSTRAINT task_user_stats_pkey PRIMARY KEY (profile_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: user_points user_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_points
    ADD CONSTRAINT user_points_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: idx_profiles_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_branch ON public.profiles USING btree (branch_id);


--
-- Name: idx_profiles_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_department ON public.profiles USING btree (department_id);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_project_members_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_members_profile ON public.project_members USING btree (profile_id);


--
-- Name: idx_projects_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_created_by ON public.projects USING btree (created_by);


--
-- Name: idx_projects_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_department ON public.projects USING btree (department_id);


--
-- Name: idx_task_attachments_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_task ON public.task_attachments USING btree (task_id);


--
-- Name: idx_task_attachments_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_attachments_uploaded_by ON public.task_attachments USING btree (uploaded_by);


--
-- Name: idx_task_comments_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comments_author ON public.task_comments USING btree (author_id);


--
-- Name: idx_task_comments_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comments_task ON public.task_comments USING btree (task_id);


--
-- Name: idx_task_instances_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_instances_assignee ON public.task_instances USING btree (assignee_profile_id);


--
-- Name: idx_task_instances_assignment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_instances_assignment_date ON public.task_instances USING btree (assignment_date);


--
-- Name: idx_task_instances_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_instances_due_date ON public.task_instances USING btree (due_date);


--
-- Name: idx_task_instances_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_instances_status ON public.task_instances USING btree (status);


--
-- Name: idx_task_instances_unique_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_task_instances_unique_assignment ON public.task_instances USING btree (template_id, assignee_profile_id, assignment_date);


--
-- Name: idx_tasks_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignee ON public.tasks USING btree (assignee_id);


--
-- Name: idx_tasks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_by ON public.tasks USING btree (created_by);


--
-- Name: idx_tasks_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_department ON public.tasks USING btree (department_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_user_points_month_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_points_month_year ON public.user_points USING btree (month, year);


--
-- Name: idx_user_points_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_points_profile ON public.user_points USING btree (profile_id);


--
-- Name: projects projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_comments task_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_comments_updated_at BEFORE UPDATE ON public.task_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: task_instances task_instances_points_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER task_instances_points_trigger AFTER UPDATE OF status ON public.task_instances FOR EACH ROW EXECUTE FUNCTION task_app.apply_task_points_and_stats();


--
-- Name: tasks tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_points user_points_set_month_year; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER user_points_set_month_year BEFORE INSERT OR UPDATE OF earned_at ON public.user_points FOR EACH ROW EXECUTE FUNCTION task_app.set_user_points_month_year();


--
-- Name: departments departments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: point_settings point_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.point_settings
    ADD CONSTRAINT point_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: projects projects_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_attachments task_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_attachments
    ADD CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_instance_answers task_instance_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_instance_answers
    ADD CONSTRAINT task_instance_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.task_template_questions(id);


--
-- Name: task_instance_answers task_instance_answers_task_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_instance_answers
    ADD CONSTRAINT task_instance_answers_task_instance_id_fkey FOREIGN KEY (task_instance_id) REFERENCES public.task_instances(id) ON DELETE CASCADE;


--
-- Name: task_instances task_instances_assignee_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_instances
    ADD CONSTRAINT task_instances_assignee_profile_id_fkey FOREIGN KEY (assignee_profile_id) REFERENCES public.profiles(id);


--
-- Name: task_instances task_instances_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_instances
    ADD CONSTRAINT task_instances_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.task_templates(id);


--
-- Name: task_template_questions task_template_questions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_template_questions
    ADD CONSTRAINT task_template_questions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.task_templates(id) ON DELETE CASCADE;


--
-- Name: task_templates task_templates_created_by_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_templates
    ADD CONSTRAINT task_templates_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id);


--
-- Name: task_user_stats task_user_stats_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_user_stats
    ADD CONSTRAINT task_user_stats_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: user_points user_points_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_points
    ADD CONSTRAINT user_points_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id);


--
-- Name: user_points user_points_task_instance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_points
    ADD CONSTRAINT user_points_task_instance_id_fkey FOREIGN KEY (task_instance_id) REFERENCES public.task_instances(id);


--
-- Name: objects objects_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: branches branches_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branches_delete_admin ON public.branches FOR DELETE TO authenticated USING ((public.user_role() = 'admin'::text));


--
-- Name: branches branches_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branches_insert_admin ON public.branches FOR INSERT TO authenticated WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: branches branches_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branches_select ON public.branches FOR SELECT TO authenticated USING (true);


--
-- Name: branches branches_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branches_update_admin ON public.branches FOR UPDATE TO authenticated USING ((public.user_role() = 'admin'::text)) WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: departments departments_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_delete_admin ON public.departments FOR DELETE TO authenticated USING ((public.user_role() = 'admin'::text));


--
-- Name: departments departments_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_insert_admin ON public.departments FOR INSERT TO authenticated WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: departments departments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_select ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: departments departments_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_update_admin ON public.departments FOR UPDATE TO authenticated USING ((public.user_role() = 'admin'::text)) WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: point_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: point_settings point_settings_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY point_settings_admin ON public.point_settings TO authenticated USING ((public.user_role() = 'admin'::text)) WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: point_settings point_settings_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY point_settings_select ON public.point_settings FOR SELECT TO authenticated USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_admin_all ON public.profiles TO authenticated USING ((public.user_role() = 'admin'::text)) WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: profiles profiles_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_all ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members project_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_delete ON public.project_members FOR DELETE TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_members.project_id) AND (p.created_by = ( SELECT auth.uid() AS uid)))))));


--
-- Name: project_members project_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_insert ON public.project_members FOR INSERT TO authenticated WITH CHECK (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_members.project_id) AND (p.created_by = ( SELECT auth.uid() AS uid)))))));


--
-- Name: project_members project_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY project_members_select ON public.project_members FOR SELECT TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (project_id IN ( SELECT private.get_user_project_ids() AS get_user_project_ids)) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_members.project_id) AND (p.department_id = ( SELECT private.get_user_department_id() AS get_user_department_id)) AND (( SELECT private.get_user_role() AS get_user_role) = 'pic'::text))))));


--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_admin_select ON public.projects FOR SELECT TO authenticated USING ((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text));


--
-- Name: projects projects_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_delete ON public.projects FOR DELETE TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (((( SELECT private.get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'pic'::text])) AND ((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (department_id = ( SELECT private.get_user_department_id() AS get_user_department_id)))));


--
-- Name: projects projects_manager_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_manager_select ON public.projects FOR SELECT TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'pic'::text) AND (department_id = ( SELECT private.get_user_department_id() AS get_user_department_id))));


--
-- Name: projects projects_member_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_member_select ON public.projects FOR SELECT TO authenticated USING ((id IN ( SELECT private.get_user_project_ids() AS get_user_project_ids)));


--
-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (created_by = ( SELECT auth.uid() AS uid)))) WITH CHECK (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: task_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_attachments task_attachments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_delete ON public.task_attachments FOR DELETE TO authenticated USING (((uploaded_by = ( SELECT auth.uid() AS uid)) OR (( SELECT private.get_user_role() AS get_user_role) = 'admin'::text)));


--
-- Name: task_attachments task_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_insert ON public.task_attachments FOR INSERT TO authenticated WITH CHECK ((( SELECT private.can_view_task(task_attachments.task_id) AS can_view_task) AND (uploaded_by = ( SELECT auth.uid() AS uid))));


--
-- Name: task_attachments task_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_attachments_select ON public.task_attachments FOR SELECT TO authenticated USING (( SELECT private.can_view_task(task_attachments.task_id) AS can_view_task));


--
-- Name: task_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_comments task_comments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_delete ON public.task_comments FOR DELETE TO authenticated USING (((author_id = ( SELECT auth.uid() AS uid)) OR (( SELECT private.get_user_role() AS get_user_role) = 'admin'::text)));


--
-- Name: task_comments task_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT TO authenticated WITH CHECK ((( SELECT private.can_view_task(task_comments.task_id) AS can_view_task) AND (author_id = ( SELECT auth.uid() AS uid))));


--
-- Name: task_comments task_comments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_select ON public.task_comments FOR SELECT TO authenticated USING (( SELECT private.can_view_task(task_comments.task_id) AS can_view_task));


--
-- Name: task_comments task_comments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_comments_update ON public.task_comments FOR UPDATE TO authenticated USING ((author_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((author_id = ( SELECT auth.uid() AS uid)));


--
-- Name: task_instance_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_instance_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: task_instance_answers task_instance_answers_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instance_answers_insert ON public.task_instance_answers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.task_instances ti
  WHERE ((ti.id = task_instance_answers.task_instance_id) AND (ti.assignee_profile_id = auth.uid())))));


--
-- Name: task_instance_answers task_instance_answers_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instance_answers_select ON public.task_instance_answers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.task_instances ti
  WHERE ((ti.id = task_instance_answers.task_instance_id) AND ((ti.assignee_profile_id = auth.uid()) OR (public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text])))))));


--
-- Name: task_instance_answers task_instance_answers_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instance_answers_update ON public.task_instance_answers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.task_instances ti
  WHERE ((ti.id = task_instance_answers.task_instance_id) AND (ti.assignee_profile_id = auth.uid())))));


--
-- Name: task_instances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;

--
-- Name: task_instances task_instances_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instances_insert ON public.task_instances FOR INSERT TO authenticated WITH CHECK ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text])));


--
-- Name: task_instances task_instances_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instances_select_admin ON public.task_instances FOR SELECT TO authenticated USING ((public.user_role() = 'admin'::text));


--
-- Name: task_instances task_instances_select_pic; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instances_select_pic ON public.task_instances FOR SELECT TO authenticated USING (((public.user_role() = 'pic'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = task_instances.assignee_profile_id) AND ((p.branch_id = public.user_branch_id()) OR (p.department_id = public.user_department_id())))))));


--
-- Name: task_instances task_instances_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instances_select_staff ON public.task_instances FOR SELECT TO authenticated USING ((assignee_profile_id = auth.uid()));


--
-- Name: task_instances task_instances_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instances_update_admin ON public.task_instances FOR UPDATE TO authenticated USING ((public.user_role() = 'admin'::text)) WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: task_instances task_instances_update_pic; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instances_update_pic ON public.task_instances FOR UPDATE TO authenticated USING ((public.user_role() = 'pic'::text)) WITH CHECK ((public.user_role() = 'pic'::text));


--
-- Name: task_instances task_instances_update_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_instances_update_staff ON public.task_instances FOR UPDATE TO authenticated USING ((assignee_profile_id = auth.uid())) WITH CHECK ((assignee_profile_id = auth.uid()));


--
-- Name: task_template_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_template_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: task_template_questions task_template_questions_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_template_questions_delete ON public.task_template_questions FOR DELETE TO authenticated USING ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text])));


--
-- Name: task_template_questions task_template_questions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_template_questions_insert ON public.task_template_questions FOR INSERT TO authenticated WITH CHECK ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text])));


--
-- Name: task_template_questions task_template_questions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_template_questions_select ON public.task_template_questions FOR SELECT TO authenticated USING (true);


--
-- Name: task_template_questions task_template_questions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_template_questions_update ON public.task_template_questions FOR UPDATE TO authenticated USING ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text]))) WITH CHECK ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text])));


--
-- Name: task_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: task_templates task_templates_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_delete ON public.task_templates FOR DELETE TO authenticated USING ((public.user_role() = 'admin'::text));


--
-- Name: task_templates task_templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_insert ON public.task_templates FOR INSERT TO authenticated WITH CHECK ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text])));


--
-- Name: task_templates task_templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_select ON public.task_templates FOR SELECT TO authenticated USING (true);


--
-- Name: task_templates task_templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_templates_update ON public.task_templates FOR UPDATE TO authenticated USING ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text]))) WITH CHECK ((public.user_role() = ANY (ARRAY['admin'::text, 'pic'::text])));


--
-- Name: task_user_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_user_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: task_user_stats task_user_stats_all_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_user_stats_all_admin ON public.task_user_stats TO authenticated USING ((public.user_role() = 'admin'::text)) WITH CHECK ((public.user_role() = 'admin'::text));


--
-- Name: task_user_stats task_user_stats_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_user_stats_select_admin ON public.task_user_stats FOR SELECT TO authenticated USING ((public.user_role() = 'admin'::text));


--
-- Name: task_user_stats task_user_stats_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY task_user_stats_select_own ON public.task_user_stats FOR SELECT TO authenticated USING ((profile_id = auth.uid()));


--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_delete ON public.tasks FOR DELETE TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: tasks tasks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK (((( SELECT private.get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'pic'::text])) AND ((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (department_id = ( SELECT private.get_user_department_id() AS get_user_department_id))) AND (created_by = ( SELECT auth.uid() AS uid))));


--
-- Name: tasks tasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_select ON public.tasks FOR SELECT TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR ((( SELECT private.get_user_role() AS get_user_role) = 'pic'::text) AND (department_id = ( SELECT private.get_user_department_id() AS get_user_department_id))) OR ((( SELECT private.get_user_role() AS get_user_role) = 'pic'::text) AND (project_id IS NULL) AND (( SELECT private.get_profile_department_id(tasks.assignee_id) AS get_profile_department_id) = ( SELECT private.get_user_department_id() AS get_user_department_id))) OR ((project_id IS NOT NULL) AND (project_id IN ( SELECT private.get_user_project_ids() AS get_user_project_ids))) OR ((project_id IS NULL) AND ((assignee_id = ( SELECT auth.uid() AS uid)) OR (created_by = ( SELECT auth.uid() AS uid))))));


--
-- Name: tasks tasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tasks_update ON public.tasks FOR UPDATE TO authenticated USING (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (created_by = ( SELECT auth.uid() AS uid)) OR (assignee_id = ( SELECT auth.uid() AS uid)))) WITH CHECK (((( SELECT private.get_user_role() AS get_user_role) = 'admin'::text) OR (created_by = ( SELECT auth.uid() AS uid)) OR (assignee_id = ( SELECT auth.uid() AS uid))));


--
-- Name: user_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

--
-- Name: user_points user_points_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_points_select ON public.user_points FOR SELECT TO authenticated USING (true);


--
-- Name: objects task_attachments_storage_delete; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY task_attachments_storage_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'task-attachments'::text) AND ((owner_id = (( SELECT auth.uid() AS uid))::text) OR (( SELECT private.get_user_role() AS get_user_role) = 'admin'::text))));


--
-- Name: objects task_attachments_storage_insert; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY task_attachments_storage_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'task-attachments'::text) AND ( SELECT private.can_access_task_file(objects.name) AS can_access_task_file)));


--
-- Name: objects task_attachments_storage_select; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY task_attachments_storage_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'task-attachments'::text) AND ( SELECT private.can_access_task_file(objects.name) AS can_access_task_file)));


--
-- Name: objects task_files_delete_own; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY task_files_delete_own ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'task-files'::text) AND (owner = auth.uid())));


--
-- Name: objects task_files_select_own; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY task_files_select_own ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'task-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));


--
-- Name: objects task_files_update_own; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY task_files_update_own ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'task-files'::text) AND (owner = auth.uid()))) WITH CHECK (((bucket_id = 'task-files'::text) AND (owner = auth.uid())));


--
-- Name: objects task_files_upload; Type: POLICY; Schema: storage; Owner: -
--

CREATE POLICY task_files_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'task-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));


--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;


--
-- Name: SCHEMA private; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA private TO authenticated;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO postgres;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;


--
-- Name: SCHEMA task_app; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA task_app TO anon;
GRANT USAGE ON SCHEMA task_app TO authenticated;
GRANT USAGE ON SCHEMA task_app TO service_role;


--
-- Name: FUNCTION can_access_task_file(file_path text); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.can_access_task_file(file_path text) FROM PUBLIC;
GRANT ALL ON FUNCTION private.can_access_task_file(file_path text) TO authenticated;


--
-- Name: FUNCTION can_edit_task(p_task_id uuid); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.can_edit_task(p_task_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.can_edit_task(p_task_id uuid) TO authenticated;


--
-- Name: FUNCTION can_view_task(p_task_id uuid); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.can_view_task(p_task_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.can_view_task(p_task_id uuid) TO authenticated;


--
-- Name: FUNCTION get_profile_department_id(p_profile_id uuid); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.get_profile_department_id(p_profile_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION private.get_profile_department_id(p_profile_id uuid) TO authenticated;


--
-- Name: FUNCTION get_user_department_id(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.get_user_department_id() FROM PUBLIC;
GRANT ALL ON FUNCTION private.get_user_department_id() TO authenticated;


--
-- Name: FUNCTION get_user_project_ids(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.get_user_project_ids() FROM PUBLIC;
GRANT ALL ON FUNCTION private.get_user_project_ids() TO authenticated;


--
-- Name: FUNCTION get_user_role(); Type: ACL; Schema: private; Owner: -
--

REVOKE ALL ON FUNCTION private.get_user_role() FROM PUBLIC;
GRANT ALL ON FUNCTION private.get_user_role() TO authenticated;


--
-- Name: TABLE branches; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.branches TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.branches TO service_role;


--
-- Name: TABLE departments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.departments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.departments TO service_role;


--
-- Name: TABLE point_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.point_settings TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.point_settings TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.profiles TO service_role;


--
-- Name: TABLE project_members; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.project_members TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.project_members TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.projects TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.projects TO service_role;


--
-- Name: TABLE task_attachments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_attachments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_attachments TO service_role;


--
-- Name: TABLE task_comments; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_comments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_comments TO service_role;


--
-- Name: TABLE task_instance_answers; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_instance_answers TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_instance_answers TO service_role;


--
-- Name: TABLE task_instances; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_instances TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_instances TO service_role;


--
-- Name: TABLE task_template_questions; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_template_questions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_template_questions TO service_role;


--
-- Name: TABLE task_templates; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_templates TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_templates TO service_role;


--
-- Name: TABLE task_user_stats; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_user_stats TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.task_user_stats TO service_role;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tasks TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tasks TO service_role;


--
-- Name: TABLE user_points; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_points TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_points TO service_role;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.buckets TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.buckets TO service_role;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.objects TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE storage.objects TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict S6zE5dg7RIIfeVTs2uCMmSbPEcGLfG08e6PsUpeDbOJ3RY3oIgF0HQz7VT5EXpX

