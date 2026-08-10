// ─── Database Role Type ────────────────────────────────────────────────────
// Using a string union instead of a Postgres enum so new roles ('manager',
// 'trainer', etc.) can be added without a schema migration — just extend here.
export type UserRole = 'admin' | 'salesman'

// ─── Core Domain Types ─────────────────────────────────────────────────────

export interface Profile {
  id: string                  // UUID — matches auth.users.id
  full_name: string
  email: string
  role: UserRole
  status: 'active' | 'inactive' | 'suspended'
  avatar_url: string | null
  department: string | null
  joining_date: string | null // ISO date string
  created_at: string          // ISO timestamp
}

export interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  is_published: boolean
  created_by: string          // profiles.id
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  description: string | null
  order_index: number
  duration_minutes: number | null
  created_at: string
}

export type ContentBlockType = 'text' | 'video' | 'image' | 'file' | 'quiz'

export interface ContentBlock {
  id: string
  lesson_id: string
  type: ContentBlockType
  content: Record<string, unknown>  // JSONB — flexible per block type
  order_index: number
  created_at: string
}

export interface CourseAssignment {
  id: string
  course_id: string
  user_id: string
  assigned_by: string         // profiles.id of the admin who assigned
  assigned_at: string
  due_date: string | null
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  completed_at: string | null
  updated_at: string
}

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.deactivated'
  | 'course.created'
  | 'course.published'
  | 'assignment.created'
  | 'lesson.completed'

export interface AuditLog {
  id: string
  actor_id: string            // profiles.id of who performed the action
  action: AuditAction
  target_type: string         // e.g. 'profile', 'course', 'lesson'
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ─── Supabase Auth Session ─────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}
