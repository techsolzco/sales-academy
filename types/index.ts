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

// ─── Phase 3 Knowledge Base Types ──────────────────────────────────────────

export interface FAQ {
  id: string
  question: string
  short_answer: string
  detailed_answer: string | null
  customer_ready_answer: string | null
  category: string
  tags: string[]
  priority: number
  status: Status
  created_at: string
  updated_at: string
}

export type ScriptType =
  | 'greeting'
  | 'whatsapp'
  | 'voice_note_script'
  | 'follow_up'
  | 'closing'
  | 'payment'
  | 'objection_response'
  | 'upsell'
  | 'cross_sell'
  | 'after_sales'
  | 'review_request'
  | 'warranty_explanation'

export interface SalesScript {
  id: string
  title: string
  script_type: ScriptType
  language: string
  content: string
  when_to_use: string | null
  related_product: string | null
  related_objection: string | null
  tags: string[]
  status: Status
  created_at: string
  updated_at: string
}

export interface ScriptCopy {
  id: string
  user_id: string
  script_id: string
  copied_at: string
}

export interface VoiceNote {
  id: string
  title: string
  audio_url: string
  transcript: string | null
  purpose: string | null
  when_to_send: string | null
  related_lesson_id: string | null
  language: string
  duration_seconds: number | null
  key_points: string[]
  status: Status
  created_at: string
  updated_at: string
}

export interface Objection {
  id: string
  objection_text: string
  meaning: string | null
  recommended_response: string
  alternative_response: string | null
  do_not_say: string | null
  related_product: string | null
  related_lesson_id: string | null
  difficulty: Difficulty | null
  status: Status
  created_at: string
  updated_at: string
}

export type ToolCategory =
  | 'AI Tools'
  | 'Design Tools'
  | 'Video Tools'
  | 'Marketing Tools'
  | 'Research Tools'
  | 'Productivity'
  | 'Sales'
  | 'Automation'

export interface Tool {
  id: string
  name: string
  logo_url: string | null
  description: string | null
  website_url: string | null
  category: ToolCategory
  pricing: string | null
  best_for: string | null
  features: string[]
  tutorial_link: string | null
  youtube_tutorial_link: string | null
  tags: string[]
  status: Status
  created_at: string
  updated_at: string
}

// ─── Global Search Types ───────────────────────────────────────────────────

export interface SearchResultItem {
  id: string
  type: 'faq' | 'script' | 'voice_note' | 'objection' | 'tool' | 'lesson'
  title: string
  description: string | null
  url: string
  category?: string
  tags?: string[]
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

// ─── Phase 4 Types ─────────────────────────────────────────────────────────

export interface EnrollmentApplication {
  id: string
  full_name: string
  email: string
  phone: string | null
  knowledge_level: 'beginner' | 'intermediate' | 'advanced' | null
  desired_course: string | null
  reason: string | null
  prior_experience: string | null
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface AppNotification {
  id: string
  user_id: string | null
  title: string
  body: string | null
  type: 'info' | 'enrollment' | 'badge' | 'community' | 'system'
  link: string | null
  read: boolean
  created_at: string
}

export interface Badge {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string
  criteria_description: string | null
  created_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
}

export interface CommunityPost {
  id: string
  user_id: string
  content: string
  post_type: 'general' | 'assignment_update' | 'announcement'
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>
  replies?: CommunityReply[]
}

export interface CommunityReply {
  id: string
  post_id: string
  user_id: string
  content: string
  is_deleted: boolean
  created_at: string
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>
}

export interface UserPreferences {
  user_id: string
  language: 'en' | 'ur'
  updated_at: string
}

