export interface Course {
  id: string
  title: string
  slug: string
  description?: string
  emoji?: string
  color?: string
  type: 'foundation' | 'skillbank'
  order_index: number
  created_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description?: string
  order_index: number
  created_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  description?: string
  video_url?: string
  loom_id?: string
  youtube_id?: string
  order_index: number
  created_at: string
}

export interface Checkpoint {
  id: string
  course_id: string
  after_module_id?: string
  after_lesson_id?: string
  requirement_text: string
  ai_review_enabled: boolean
  order_index: number
}

export interface UserCheckpoint {
  id: string
  user_id: string
  checkpoint_id: string
  submission_text: string
  status: 'pending' | 'approved' | 'rejected'
  completed_at?: string
}

export interface Attachment {
  id: string
  lesson_id: string
  title: string
  url: string
  type: 'file' | 'link'
}

