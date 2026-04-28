-- HOD Meeting Tool: meetings table + action items table.

CREATE TABLE hod_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('regular', 'emergency', 'special')),
  special_title TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  secretary_user_id UUID REFERENCES hod_users(id),
  secretary_custom_name TEXT,
  attendance JSONB NOT NULL DEFAULT '[]'::jsonb,
  additional_attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
  agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  general_notes TEXT,
  per_hod_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_next_date DATE,
  closing_notes TEXT,
  media_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  approved_by UUID REFERENCES hod_users(id),
  approved_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_by UUID REFERENCES hod_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meetings_date ON hod_meetings (date DESC);
CREATE INDEX idx_meetings_status ON hod_meetings (status);

CREATE TABLE hod_meeting_action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES hod_meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('department', 'sub_department', 'individual')),
  assigned_dept_id UUID REFERENCES hod_departments(id),
  assigned_sub_dept TEXT,
  assigned_user_id UUID REFERENCES hod_users(id),
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'submitted', 'verified', 'rejected', 'cancelled')),
  completion_explanation TEXT,
  completion_date DATE,
  completion_media_id UUID,
  completion_submitted_at TIMESTAMPTZ,
  completion_submitted_by UUID REFERENCES hod_users(id),
  reviewed_by UUID REFERENCES hod_users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_items_meeting ON hod_meeting_action_items (meeting_id);
CREATE INDEX idx_action_items_status ON hod_meeting_action_items (status) WHERE status IN ('open', 'submitted');
CREATE INDEX idx_action_items_dept ON hod_meeting_action_items (assigned_dept_id) WHERE assigned_dept_id IS NOT NULL;
CREATE INDEX idx_action_items_user ON hod_meeting_action_items (assigned_user_id) WHERE assigned_user_id IS NOT NULL;
