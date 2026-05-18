export interface HodUser {
  id: string
  username: string
  department_id: string | null
  hod_name: string
  role: 'hod' | 'admin'
  auto_logout_enabled: boolean
  logout_time: string
  idle_timeout_minutes: number
  admin_tier?: 'senior' | 'standard' | 'md' | null
  admin_title?: string | null
}

export interface AdminUser {
  id: string
  username: string
  hod_name: string
  admin_tier: 'senior' | 'standard' | 'md'
  admin_title: string
  access_level: 'full' | 'viewer'
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
  type: 'text' | 'number' | 'textarea' | 'select' | 'photo'
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
  unitOptions?: string[]
  extraFields?: { name: string; label: string; type: 'text' | 'number'; placeholder?: string }[]
}

export interface VisibleIfCondition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'truthy' | 'falsy' | 'includes'
  value?: unknown
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
  helpText?: string
  visibleIf?: VisibleIfCondition
  hiddenFor?: string[]
  allowCustomEntries?: boolean
}

export interface FormSection {
  title: string
  fields: FormField[]
  mondayOnly?: boolean
  allowNA?: boolean
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
  sectionMode?: 'paged' | 'scroll'
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
  entry_key: string | null
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

export interface MentionData {
  type: 'user' | 'group' | 'department'
  user_id?: string
  department_id?: string
  group?: 'everyone' | 'admins'
  display: string
}

export interface ThreadMessage {
  id: string
  report_id: string
  parent_id: string | null
  author_user_id: string
  body: string
  mentions: MentionData[]
  is_admin_note: boolean
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  author?: {
    id: string
    hod_name: string
    username: string
    role: 'hod' | 'admin'
    admin_title?: string | null
    department_name?: string | null
  }
}

export type NotificationType =
  | 'mention' | 'review_comment' | 'reply' | 'global_message' | 'announcement_broadcast'
  | 'meeting_approved' | 'action_item_assigned' | 'action_item_submitted'
  | 'action_item_verified' | 'action_item_rejected' | 'action_item_completed' | 'secretary_invited'
  | 'booking_submitted' | 'booking_approved' | 'booking_denied'
  | 'report_submit_failed' | 'media_upload_failed' | 'booking_save_failed'

export type NotificationCategory = 'message' | 'meeting' | 'booking' | 'error'

export interface Notification {
  id: string
  recipient_user_id: string
  type: NotificationType
  category: NotificationCategory
  source_thread_id: string | null
  source_report_id: string | null
  triggered_by_user_id: string | null
  body_preview: string | null
  batch_key?: string | null
  is_read: boolean
  created_at: string
  triggered_by?: {
    hod_name: string
    role: 'hod' | 'admin'
  }
  report?: {
    department_id: string
    report_date: string
  }
}

// --- Meeting types ---

export type MeetingType = 'regular' | 'emergency' | 'special'
export type MeetingStatus = 'draft' | 'submitted' | 'approved'
export type ActionItemStatus = 'open' | 'submitted' | 'verified' | 'rejected' | 'cancelled'
export type ActionItemPriority = 'high' | 'medium' | 'low'
export type AttendanceStatus = 'present' | 'apology' | 'absent'
export type ActionItemAssigneeType = 'department' | 'sub_department' | 'individual'

export interface MeetingAttendee {
  user_id: string
  hod_name: string
  department_slug: string
  status: AttendanceStatus
  attendance_mode?: 'phone' | 'in_person'
}

export interface AdditionalAttendee {
  name: string
  department: string
  reason: string
}

export interface PerHodNote {
  user_id: string
  hod_name: string
  department_slug: string
  notes: string
  did_not_speak: boolean
}

export interface Meeting {
  id: string
  meeting_type: MeetingType
  special_title: string | null
  date: string
  start_time: string | null
  end_time: string | null
  secretary_user_id: string | null
  secretary_custom_name: string | null
  attendance: MeetingAttendee[]
  additional_attendees: AdditionalAttendee[]
  agenda: { title: string }[]
  general_notes: string | null
  per_hod_notes: Record<string, PerHodNote>
  decisions: { text: string }[]
  suggested_next_date: string | null
  closing_notes: string | null
  media_ids: string[]
  status: MeetingStatus
  approved_by: string | null
  approved_at: string | null
  submitted_at: string | null
  created_by: string | null
  created_at: string
}

export interface MeetingActionItem {
  id: string
  meeting_id: string
  description: string
  assignee_type: ActionItemAssigneeType
  assigned_dept_id: string | null
  assigned_sub_dept: string | null
  assigned_user_id: string | null
  deadline: string | null
  priority: ActionItemPriority
  status: ActionItemStatus
  completion_explanation: string | null
  completion_date: string | null
  completion_media_id: string | null
  completion_submitted_at: string | null
  completion_submitted_by: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  assigned_dept?: { name: string; slug: string }
  assigned_user?: { hod_name: string }
  meeting?: { date: string; meeting_type: MeetingType }
}

export interface MeetingListItem {
  id: string
  meeting_type: MeetingType
  special_title: string | null
  date: string
  status: MeetingStatus
  submitted_at: string | null
  approved_at: string | null
  attendance: MeetingAttendee[]
  action_item_count?: number
}

export interface MentionUserGroup {
  label: string
  type: 'management' | 'department'
  department_id?: string
  users: {
    id: string
    hod_name: string
    username: string
    role: 'hod' | 'admin'
    admin_title?: string | null
  }[]
}

// --- Accommodation types ---

export type UnitStatus = 'active' | 'inactive' | 'maintenance'
export type BuildingType = 'guest_house_1' | 'guest_house_2' | 'chalets' | 'tents' | 'a_frames' | 'campsite'
export type MealPlan = 'fb' | 'hb' | 'bb' | 'none'
export type RateType = 'rack' | 'sto'
export type BookingSource = 'direct' | 'whatsapp' | 'email' | 'agent' | 'booking_com' | 'other' | 'phone' | 'walk_in'
export type PaymentStatus = 'unpaid' | 'deposit_received' | 'paid_in_full' | 'complimentary' | 'staff'
export type BookingStatus = 'tentative' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'hod_pending'
export type ChangeRequestStatus = 'pending' | 'approved' | 'denied'

export interface PaxBed {
  type: 'double' | 'single' | 'bunk'
  count: number
}

export interface StayConfigurationOption {
  code: string
  label: string
}

export interface PaxConfig {
  max_adults: number
  max_children: number
  max_total: number
  cot_eligible: boolean
  beds: PaxBed[]
  stay_configurations?: StayConfigurationOption[]
}

export type PricingType = 'flat' | 'per_person'

export interface AccommodationUnit {
  id: string
  name: string
  building: BuildingType
  category: string
  capacity: number
  max_concurrent_bookings?: number | null
  rate_category: string
  description: string | null
  pax_config: PaxConfig | null
  pricing_type: PricingType
  status: UnitStatus
  sort_order: number
  created_at: string
}

export interface AccommodationRate {
  id: string
  rate_category: string
  meal_plan: MealPlan
  rate_type: RateType
  year: number
  adult_rate: number | null
  child_rate: number | null
  notes: string | null
}

export interface Booking {
  id: string
  guest_name: string
  company_name: string | null
  is_private: boolean
  check_in: string
  check_out: string
  meal_plan: MealPlan
  adults: number
  children: number
  booking_source: BookingSource
  agent_name: string | null
  rate_type: RateType
  year: number
  agreed_rate_per_night: number | null
  special_notes: string | null
  payment_status: PaymentStatus
  status: BookingStatus
  guest_email: string | null
  guest_phone: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  rooms?: BookingRoom[]
  units?: AccommodationUnit[]
}

export interface BookingPayment {
  id: string
  booking_id: string
  amount: number
  currency: 'USD' | 'UGX'
  payment_date: string
  payment_method: string | null
  recorded_by: string | null
  notes: string | null
  created_at: string
}

export interface RoomBasketItem {
  unit_id: string
  unit_name: string
  rate_category: string
  adults: number
  children: number
  meal_plan: MealPlan
  rate_per_night: number | null
  notes: string
  pricing_type: PricingType
  isComplimentary: boolean
  compReason?: string
  room_configuration_code?: string | null
  room_configuration_label?: string | null
}

export interface BookingRoom {
  id: string
  booking_id: string
  unit_id: string
  room_config?: RoomBasketItem | null
  unit?: AccommodationUnit
}

export interface RequestedChanges {
  action?: 'delete'
  check_in?: string
  check_out?: string
  adults?: number
  children?: number
  meal_plan?: MealPlan
  special_notes?: string
  guest_email?: string
  guest_phone?: string
  unit_ids?: string[]
}

export interface BookingChangeRequest {
  id: string
  booking_id: string
  unit_id: string | null
  requesting_dept_id: string | null
  requesting_user_id: string | null
  reason: string
  requested_changes: RequestedChanges | null
  status: ChangeRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  booking?: Booking
  requesting_dept?: { name: string; slug: string }
  requesting_user?: { hod_name: string }
  reviewer?: { hod_name: string }
}

export interface BookingWithUnits extends Booking {
  booking_rooms: { unit_id: string; room_config?: RoomBasketItem | null; accommodation_units: AccommodationUnit }[]
}

export type GuestCategory = 'foreign_non_resident' | 'foreign_resident' | 'resident'

export interface ActivityBasketItem {
  activity_name: string
  guest_category: GuestCategory
  activity_date: string
  adults: number
  children: number
  adult_rate: number
  child_rate: number
  currency_code: 'USD' | 'UGX'
  notes: string
}

export interface BookingActivity {
  id: string
  booking_id: string
  activity_name: string
  guest_category: GuestCategory
  activity_date: string
  adults: number
  children: number
  adult_rate: number
  child_rate: number
  currency_code: 'USD' | 'UGX'
  notes: string | null
  created_at: string
}

export interface BookingActivityEntry {
  id: string
  booking_id: string
  action: string
  actor_user_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  actor?: { hod_name: string }
}
