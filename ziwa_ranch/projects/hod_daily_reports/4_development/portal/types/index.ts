export interface HodUser {
  id: string
  username: string
  department_id: string | null
  hod_name: string
  role: 'hod' | 'admin'
  auto_logout_enabled: boolean
  logout_time: string
  idle_timeout_minutes: number
}

export interface HodSession {
  id: string
  user_id: string
  token: string
  device_info: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  last_active_at: string
  expires_at: string
  user?: HodUser
}

export type FieldType = 'text' | 'textarea' | 'number' | 'repeater' | 'checkbox_group' | 'select' | 'room_grid' | 'photo' | 'inventory_grid'

export interface SubField {
  name: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select'
  placeholder?: string
  options?: string[]
  autocomplete?: { category: string }
}

export interface PhotoConfig {
  maxPhotos: number
  categories: string[]
}

export interface InventoryGridConfig {
  category: string
  showCost: boolean
  showPrevious: boolean
  extraFields?: { name: string; label: string; type: 'text' | 'number'; placeholder?: string }[]
}

export interface FormField {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: string[]
  sub_fields?: SubField[]
  min_rows?: number
  stepper?: boolean
  photo_config?: PhotoConfig
  inventory_grid_config?: InventoryGridConfig
}

export interface FormSection {
  title: string
  fields: FormField[]
  mondayOnly?: boolean
}

export interface StockConfig {
  stockType: 'bar' | 'store' | 'kitchen'
  stockField: string
}

export interface DepartmentFormConfig {
  slug: string
  name: string
  hods: string[]
  substitutes?: string[]
  defaultsToYesterday?: boolean
  sections: FormSection[]
  stockConfig?: StockConfig
}

export interface Department {
  id: string
  name: string
  slug: string
  hods: string[]
  sort_order: number
  is_active: boolean
}

export interface EditHistoryEntry {
  edited_by: string
  edited_at: string
  changes: { field: string; old_value: unknown; new_value: unknown }[]
}

export interface ReportMedia {
  id: string
  report_id: string | null
  department_id: string
  storage_path: string
  original_filename: string
  generated_filename: string
  hod_description: string
  ai_description: string | null
  ai_tags: string[] | null
  context_category: string
  report_date: string
  file_size_bytes: number | null
  mime_type: string | null
  uploaded_by_user_id: string | null
  created_at: string
}

export interface DailyReport {
  id: string
  department_id: string
  submitted_by: string
  report_date: string
  submitted_at: string
  report_data: Record<string, unknown>
  edited_at?: string | null
  last_edited_by?: string | null
  edit_history?: EditHistoryEntry[]
  acknowledged_at?: string | null
  acknowledged_by?: string | null
  review_comments?: string | null
}
