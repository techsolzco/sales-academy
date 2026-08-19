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
  qualifying_for_reseller?: boolean
  tool_id?: string | null
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
  question_translated?: string | null
  short_answer: string
  short_answer_translated?: string | null
  detailed_answer: string | null
  customer_ready_answer: string | null
  customer_ready_answer_translated?: string | null
  question_hinglish?: string | null
  short_answer_hinglish?: string | null
  customer_ready_answer_hinglish?: string | null
  category: string
  tags: string[]
  priority: number
  status: Status
  tool_id?: string | null
  course_id?: string | null
  created_by: string
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
  content_hinglish?: string | null
  content_translated?: string | null
  when_to_use: string | null
  related_product: string | null
  related_objection: string | null
  tags: string[]
  status: Status
  tool_id?: string | null
  course_id?: string | null
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
  transcript_translated?: string | null
  purpose: string | null
  when_to_send: string | null
  related_lesson_id: string | null
  language: string
  duration_seconds: number | null
  key_points: string[]
  status: Status
  tool_id?: string | null
  created_at: string
  updated_at: string
}

export interface Objection {
  id: string
  objection_text: string
  meaning: string | null
  recommended_response: string
  recommended_response_hinglish?: string | null
  recommended_response_translated?: string | null
  alternative_response: string | null
  do_not_say: string | null
  related_product: string | null
  related_lesson_id: string | null
  difficulty: Difficulty | null
  status: Status
  tool_id?: string | null
  course_id?: string | null
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
  knowledge_summary: string | null
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

export interface ResellerApplication {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string | null
  rejection_reason: string | null
  requested_at: string
  reviewed_at: string | null
  profile?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export interface Commission {
  id: string
  reseller_id: string
  amount: number
  description: string
  status: 'pending' | 'paid'
  created_at: string
  paid_at: string | null
}

export interface ResellerProfile extends Profile {
  commission_count?: number
  total_paid?: number
  total_pending?: number
}

export interface LeaderboardEntry {
  user_id: string
  full_name: string
  avatar_url: string | null
  courses_completed: number
  lessons_completed: number
  scripts_copied: number
  score: number
  rank: number
}

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  description: string
  category: string
  status: 'open' | 'in-progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  profile?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
  messages?: TicketMessage[]
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>
}

export interface Conversation {
  id: string
  participant_a: string
  participant_b: string
  last_message_at: string
  created_at: string
  profile_a?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  profile_b?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
  sender?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface Assignment {
  id: string
  title: string
  instructions: string
  due_date: string | null
  course_id: string | null
  lesson_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  course?: { id: string; name: string } | null
  lesson?: { id: string; title: string } | null
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  user_id: string
  response_text: string | null
  file_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  feedback: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  assignment?: Pick<Assignment, 'id' | 'title'>
  profile?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export interface Quiz {
  id: string
  lesson_id: string | null
  title: string
  description: string | null
  pass_score: number
  created_by: string
  created_at: string
  updated_at: string
  questions?: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  points: number
  order_index: number
  created_at: string
  options?: QuizOption[]
}

export interface QuizOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  score: number
  max_score: number
  percentage: number
  passed: boolean
  completed_at: string
}

export interface QuizAttemptAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option_id: string | null
  is_correct: boolean
  question?: QuizQuestion
  selected_option?: QuizOption | null
}

export interface QuizAttemptResult {
  attemptId: string
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  correctCount: number
  totalCount: number
}

export interface Meeting {
  id: string
  title: string
  description: string | null
  scheduled_at: string
  room_name: string
  jitsi_url: string
  course_id: string | null
  visibility: 'public' | 'invited'
  created_by: string
  created_at: string
  updated_at: string
  course?: { id: string; title: string } | null
  invitee_count?: number
}

export interface MeetingInvitee {
  id: string
  meeting_id: string
  user_id: string
  invited_at: string
  profile?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export interface ThemeSettings {
  id: string
  portal: 'admin' | 'salesman'
  primary_color: string
  accent_color: string
  theme_mode: 'system' | 'light' | 'dark'
  updated_at: string
}

export interface AiTrainingSettings {
  id: string
  persona_instructions: string
  sales_style_rules: string
  locked_facts: string
  tone_examples: string
  updated_at: string
  updated_by: string | null
}

export interface AiUsageLog {
  id: string
  user_id: string
  feature: 'ai_assist' | 'quick_create' | 'ask_ai' | 'test_ai'
  content_type: string | null
  instruction: string | null
  created_at: string
}

export type AiContentType = 'tool' | 'faq' | 'script' | 'objection' | 'voice_note'

// ─── Tool Onboarding Wizard Types ──────────────────────────────────────────

export interface OnboardWizardData {
  name: string
  category?: ToolCategory
  pricing?: string
  features?: string[]
  targetAudience?: string
  sellingPoints?: string
  warrantyNotes?: string
  brief: string
}

export interface GeneratedFAQ {
  question: string
  question_hinglish?: string
  short_answer: string
  short_answer_hinglish?: string
  detailed_answer: string
  customer_ready_answer: string
  customer_ready_answer_hinglish?: string
  category: string
  tags: string[]
  _removed?: boolean
}

export interface GeneratedObjection {
  objection_text: string
  meaning: string
  recommended_response: string
  recommended_response_hinglish?: string
  alternative_response: string
  do_not_say: string
  difficulty: Difficulty
  _removed?: boolean
}

export interface GeneratedScript {
  title: string
  script_type: string
  content: string
  content_hinglish?: string
  when_to_use: string
  tags: string[]
  _removed?: boolean
}

export interface GeneratedContentBlock {
  type: 'heading' | 'text'
  content: Record<string, unknown>
  order_index: number
}

export interface GeneratedLesson {
  title: string
  description: string
  content_blocks: GeneratedContentBlock[]
  _removed?: boolean
}

export interface GeneratedModule {
  title: string
  description: string
  lessons: GeneratedLesson[]
  _removed?: boolean
}

export interface GeneratedCourse {
  title: string
  description: string
  modules: GeneratedModule[]
}

export interface GeneratedToolPackage {
  knowledge_summary: string
  course: GeneratedCourse
  faqs: GeneratedFAQ[]
  objections: GeneratedObjection[]
  scripts: GeneratedScript[]
}

export interface ToolTreeData {
  tool: Tool
  course: (Course & { modules: (Module & { lessons: (Lesson & { content_blocks: ContentBlock[] })[] })[] }) | null
  faqs: FAQ[]
  objections: Objection[]
  scripts: SalesScript[]
}

export interface KbReview {
  id: string
  user_id: string
  content_type: 'faq' | 'objection' | 'voice_note' | 'script'
  content_id: string
  reviewed_at: string
}