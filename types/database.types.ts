export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRole = "super_admin" | "manager" | "user";
export type TaskStatus =
  | "pending"
  | "accepted"
  | "submitted"
  | "verified"
  | "rejected"
  | "failed";
export type RecurrenceType = "daily" | "monthly" | "custom";
export type AssignToType = "user" | "branch" | "department";
export type AnswerType = "text" | "number" | "boolean" | "choice" | "file";
export type PointEventType =
  | "completed_on_time"
  | "completed_late"
  | "failed"
  | "not_completed";

export interface Branch {
  id: string;
  name: string;
}

export interface Department {
  id: string;
  branch_id: string;
  name: string;
}

export interface Profile {
  id: string;
  username: string;
  harrison_email: string | null;
  branch_id: string | null;
  department_id: string | null;
  role: ProfileRole;
  status?: "active" | "deactivated";
  must_change_password?: boolean;
  last_sign_in_at?: string | null;
  created_at: string;
  branch?: Branch | null;
  department?: Department | null;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  created_by_profile_id: string | null;
  recurrence_type: RecurrenceType;
  recurrence_value: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  requires_verification: boolean;
  assign_to_type: AssignToType;
  assign_to_id: string | null;
  created_at: string;
  questions?: TaskTemplateQuestion[];
}

export interface TaskTemplateQuestion {
  id: string;
  template_id: string;
  question_text: string;
  answer_type: AnswerType;
  is_required: boolean;
  options_json: string[] | null;
  sort_order: number | null;
}

export interface TaskInstance {
  id: string;
  template_id: string;
  assignee_profile_id: string;
  assignment_date: string;
  due_date: string;
  status: TaskStatus;
  accepted_at: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  rejected_at: string | null;
  pic_comment: string | null;
  is_late: boolean;
  created_at: string;
  template?: TaskTemplate | null;
  assignee?: Profile | null;
  answers?: TaskInstanceAnswer[];
}

export interface TaskInstanceAnswer {
  id: string;
  task_instance_id: string;
  question_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_file_url: string | null;
  question?: TaskTemplateQuestion;
}

export interface TaskUserStats {
  profile_id: string;
  total_completed: number;
  total_late_submissions: number;
  total_failed: number;
  updated_at: string;
}

export interface PointSetting {
  id: string;
  event_type: PointEventType;
  points: number;
  updated_by: string | null;
  updated_at: string;
}

export interface UserPoints {
  id: string;
  profile_id: string;
  task_instance_id: string | null;
  event_type: string | null;
  points_earned: number;
  earned_at: string;
  month: number;
  year: number;
}

// =============================================================================
// NEW TYPES: Projects, Tasks (manual), Attachments, Comments
// =============================================================================

export type TaskStatus2 = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  creator?: Profile | null;
  members?: ProjectMember[];
}

export interface ProjectMember {
  project_id: string;
  profile_id: string;
  added_at: string;
  profile?: Profile | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus2;
  priority: TaskPriority;
  due_date: string | null;
  department_id: string;
  project_id: string | null;
  created_by: string;
  assignee_id: string;
  created_at: string;
  updated_at: string;
  department?: Department | null;
  project?: Project | null;
  creator?: Profile | null;
  assignee?: Profile | null;
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string;
  created_at: string;
  uploader?: Profile | null;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
}
