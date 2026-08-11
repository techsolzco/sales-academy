// ─── Database Role Type ────────────────────────────────────────────────────
export type UserRole = 'admin' | 'salesman'

export type Status = 'draft' | 'published' | 'archived'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type Visibility = 'all' | 'selected' | 'team'

// ─── Action Result helper ──────────────────────────────────────────────────
export type ActionResult<T = void> =
  | { error: string; data?: never }
  | { error?: never; data: T }

// ─── Core Domain Types ─────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: 'active' | 'inactive' | 'suspended'
  avatar_url: string | null
  department: string | null
  joining_date: string | null
  created_at: string
}

export interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  category: string | null
  difficulty: Difficulty | null
  estimated_duration_minutes: number | null
  status: Status
  visibility: Visibility
  created_by: string
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  order_index: number
  duration_minutes: number | null
  status: Status
  created_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  subtitle: string | null
  description: string | null
  thumbnail_url: string | null
  order_index: number
  duration_minutes: number | null
  difficulty: Difficulty | null
  is_required: boolean
  status: Status
  created_at: string
}

export type ContentBlockType =
  | 'text'
  | 'heading'
  | 'image'
  | 'youtube'
  | 'pdf'
  | 'link'
  | 'quote'
  | 'callout'

export interface ContentBlock {
  id: string
  lesson_id: string
  type: ContentBlockType
  content: Record<string, unknown>
  order_index: number
  created_at: string
}

// ─── Block content shapes (for type-safe content access) ──────────────────
export interface TextBlockContent { body: string }
export interface HeadingBlockContent { text: string; level: 1 | 2 | 3 }
export interface ImageBlockContent { url: string; alt: string; caption: string }
export interface YoutubeBlockContent { videoId: string; title: string }
export interface PdfBlockContent { url: string; filename: string }
export interface LinkBlockContent { url: string; label: string; description: string }
export interface QuoteBlockContent { text: string; author: string }
export interface CalloutBlockContent {
  variant: 'info' | 'warning' | 'tip' | 'danger'
  title: string
  body: string
}

export interface CourseAssignment {
  id: string
  course_id: string
  user_id: string
  assigned_by: string
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
  actor_id: string
  action: AuditAction
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile
}

// ─── Enriched types for UI ─────────────────────────────────────────────────

export interface CourseWithStats extends Course {
  module_count: number
  lesson_count: number
  assignment_count: number
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[]
}

export interface AssignmentWithProfile extends CourseAssignment {
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'department'>
  completed_lessons: number
  total_lessons: number
}

export interface TrainingCourse extends Course {
  assigned_at: string
  due_date: string | null
  completed_lessons: number
  total_lessons: number
}
