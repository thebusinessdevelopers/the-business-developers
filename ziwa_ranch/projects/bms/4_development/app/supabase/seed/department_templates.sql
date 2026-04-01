INSERT INTO department_templates (name, slug, category, description, form_schema) VALUES

('Kitchen', 'kitchen', 'operations', 'Daily kitchen operations including stock counts, prep status, and wastage tracking', '{
  "sections": [
    {
      "key": "morning_stock",
      "title": "Morning Stock Count",
      "na_allowed": true,
      "fields": [
        {"key": "vegetables_kg", "label": "Vegetables (kg)", "type": "number", "required": true, "min": 0, "help_text": "Total weight of all vegetables in the kitchen store"},
        {"key": "meat_kg", "label": "Meat & Poultry (kg)", "type": "number", "required": true, "min": 0},
        {"key": "dry_goods_status", "label": "Dry goods status", "type": "select", "required": true, "options": ["Well stocked", "Adequate", "Running low", "Critical"]},
        {"key": "stock_notes", "label": "Stock notes", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "prep_status",
      "title": "Preparation Status",
      "na_allowed": false,
      "fields": [
        {"key": "breakfast_ready", "label": "Breakfast prep complete", "type": "checkbox_group", "required": true, "options": ["Hot items", "Continental", "Beverages", "Buffet setup"]},
        {"key": "lunch_planned", "label": "Lunch menu confirmed", "type": "select", "required": true, "options": ["Yes", "No", "Partially"]},
        {"key": "special_dietary", "label": "Special dietary requirements today", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "wastage",
      "title": "Wastage & Issues",
      "na_allowed": true,
      "fields": [
        {"key": "food_wastage_kg", "label": "Food wastage (kg)", "type": "number", "required": true, "min": 0},
        {"key": "wastage_reason", "label": "Reason for wastage", "type": "textarea", "required": false},
        {"key": "equipment_issues", "label": "Equipment issues", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "staffing",
      "title": "Staffing",
      "na_allowed": false,
      "fields": [
        {"key": "staff_on_duty", "label": "Staff on duty", "type": "number_stepper", "required": true, "min": 0, "max": 50},
        {"key": "absentees", "label": "Absentees (names and reason)", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Food & Beverage (Bar)', 'fb_bar', 'hospitality', 'Bar operations including opening/closing stock, sales tracking, and wastage', '{
  "sections": [
    {
      "key": "opening_stock",
      "title": "Opening Stock",
      "na_allowed": false,
      "fields": [
        {"key": "spirits_count", "label": "Spirits (bottles)", "type": "number", "required": true, "min": 0},
        {"key": "beers_count", "label": "Beers (units)", "type": "number", "required": true, "min": 0},
        {"key": "wines_count", "label": "Wines (bottles)", "type": "number", "required": true, "min": 0},
        {"key": "soft_drinks_count", "label": "Soft drinks (units)", "type": "number", "required": true, "min": 0},
        {"key": "water_count", "label": "Water (units)", "type": "number", "required": true, "min": 0}
      ]
    },
    {
      "key": "sales",
      "title": "Sales Summary",
      "na_allowed": false,
      "fields": [
        {"key": "total_covers", "label": "Total covers served", "type": "number", "required": true, "min": 0},
        {"key": "revenue_estimate", "label": "Estimated revenue (UGX)", "type": "number", "required": false, "min": 0},
        {"key": "popular_items", "label": "Most popular items today", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "closing_stock",
      "title": "Closing Stock",
      "na_allowed": true,
      "fields": [
        {"key": "spirits_closing", "label": "Spirits (bottles)", "type": "number", "required": true, "min": 0},
        {"key": "beers_closing", "label": "Beers (units)", "type": "number", "required": true, "min": 0},
        {"key": "wines_closing", "label": "Wines (bottles)", "type": "number", "required": true, "min": 0},
        {"key": "soft_drinks_closing", "label": "Soft drinks (units)", "type": "number", "required": true, "min": 0},
        {"key": "discrepancy_notes", "label": "Discrepancy notes", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "wastage",
      "title": "Wastage & Breakage",
      "na_allowed": true,
      "fields": [
        {"key": "breakage_items", "label": "Breakages (describe)", "type": "textarea", "required": false},
        {"key": "expired_items", "label": "Expired items", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Housekeeping', 'housekeeping', 'hospitality', 'Room status, linen management, and maintenance referrals', '{
  "sections": [
    {
      "key": "room_status",
      "title": "Room Status",
      "na_allowed": false,
      "fields": [
        {"key": "rooms_cleaned", "label": "Rooms cleaned", "type": "number_stepper", "required": true, "min": 0},
        {"key": "rooms_pending", "label": "Rooms pending", "type": "number_stepper", "required": true, "min": 0},
        {"key": "rooms_out_of_order", "label": "Rooms out of order", "type": "number_stepper", "required": true, "min": 0},
        {"key": "room_notes", "label": "Room-specific notes", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "linen",
      "title": "Linen Count",
      "na_allowed": true,
      "fields": [
        {"key": "bed_sheets_clean", "label": "Bed sheets (clean)", "type": "number", "required": true, "min": 0},
        {"key": "towels_clean", "label": "Towels (clean)", "type": "number", "required": true, "min": 0},
        {"key": "linen_sent_laundry", "label": "Items sent to laundry", "type": "number", "required": true, "min": 0},
        {"key": "linen_damaged", "label": "Damaged linen (describe)", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "issues",
      "title": "Issues & Referrals",
      "na_allowed": true,
      "fields": [
        {"key": "maintenance_referrals", "label": "Maintenance referrals", "type": "textarea", "required": false, "help_text": "List any room or facility issues that need maintenance attention"},
        {"key": "lost_and_found", "label": "Lost & found items", "type": "textarea", "required": false},
        {"key": "guest_complaints", "label": "Guest complaints or requests", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "staffing",
      "title": "Staffing",
      "na_allowed": false,
      "fields": [
        {"key": "staff_on_duty", "label": "Staff on duty", "type": "number_stepper", "required": true, "min": 0, "max": 50},
        {"key": "absentees", "label": "Absentees", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Security', 'security', 'operations', 'Gate logs, incident reports, patrol notes, and visitor tracking', '{
  "sections": [
    {
      "key": "gate_log",
      "title": "Gate Log",
      "na_allowed": false,
      "fields": [
        {"key": "vehicles_in", "label": "Vehicles entered", "type": "number_stepper", "required": true, "min": 0},
        {"key": "vehicles_out", "label": "Vehicles exited", "type": "number_stepper", "required": true, "min": 0},
        {"key": "visitors_count", "label": "Visitors today", "type": "number_stepper", "required": true, "min": 0},
        {"key": "gate_notes", "label": "Gate notes", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "patrols",
      "title": "Patrol Report",
      "na_allowed": false,
      "fields": [
        {"key": "patrols_completed", "label": "Patrols completed", "type": "number_stepper", "required": true, "min": 0},
        {"key": "patrol_findings", "label": "Patrol findings", "type": "textarea", "required": false, "help_text": "Note anything unusual from patrols — broken fences, wildlife, trespassing, etc."}
      ]
    },
    {
      "key": "incidents",
      "title": "Incidents",
      "na_allowed": true,
      "fields": [
        {"key": "incidents_count", "label": "Number of incidents", "type": "number_stepper", "required": true, "min": 0},
        {"key": "incident_details", "label": "Incident details", "type": "textarea", "required": false, "help_text": "Describe each incident: time, location, nature, action taken"},
        {"key": "incident_severity", "label": "Highest severity", "type": "select", "required": false, "options": ["None", "Minor", "Moderate", "Serious", "Critical"]}
      ]
    },
    {
      "key": "staffing",
      "title": "Staffing",
      "na_allowed": false,
      "fields": [
        {"key": "guards_on_duty", "label": "Guards on duty", "type": "number_stepper", "required": true, "min": 0, "max": 30},
        {"key": "shift_handover", "label": "Shift handover notes", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Maintenance', 'maintenance', 'operations', 'Completed work, pending issues, and parts tracking', '{
  "sections": [
    {
      "key": "completed_work",
      "title": "Completed Work",
      "na_allowed": true,
      "fields": [
        {"key": "jobs_completed", "label": "Jobs completed today", "type": "number_stepper", "required": true, "min": 0},
        {"key": "completed_details", "label": "Work completed (describe)", "type": "textarea", "required": false, "help_text": "List each job: location, description, time taken"}
      ]
    },
    {
      "key": "pending_issues",
      "title": "Pending Issues",
      "na_allowed": true,
      "fields": [
        {"key": "jobs_pending", "label": "Jobs pending", "type": "number_stepper", "required": true, "min": 0},
        {"key": "pending_details", "label": "Pending work (describe)", "type": "textarea", "required": false},
        {"key": "priority_items", "label": "Urgent items", "type": "textarea", "required": false, "help_text": "Any jobs that need immediate attention"}
      ]
    },
    {
      "key": "parts_needed",
      "title": "Parts & Materials Needed",
      "na_allowed": true,
      "fields": [
        {"key": "parts_list", "label": "Parts/materials needed", "type": "textarea", "required": false, "help_text": "List items needed with estimated quantities"},
        {"key": "estimated_cost", "label": "Estimated cost (UGX)", "type": "number", "required": false, "min": 0}
      ]
    },
    {
      "key": "infrastructure",
      "title": "Infrastructure Status",
      "na_allowed": false,
      "fields": [
        {"key": "power_status", "label": "Power status", "type": "select", "required": true, "options": ["Grid stable", "Generator running", "Intermittent", "No power"]},
        {"key": "water_status", "label": "Water status", "type": "select", "required": true, "options": ["Normal", "Low pressure", "Intermittent", "No water"]},
        {"key": "infrastructure_notes", "label": "Infrastructure notes", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Reception / Front Desk', 'reception', 'hospitality', 'Check-ins, check-outs, arrivals, and petty cash', '{
  "sections": [
    {
      "key": "occupancy",
      "title": "Occupancy",
      "na_allowed": false,
      "fields": [
        {"key": "check_ins", "label": "Check-ins today", "type": "number_stepper", "required": true, "min": 0},
        {"key": "check_outs", "label": "Check-outs today", "type": "number_stepper", "required": true, "min": 0},
        {"key": "rooms_occupied", "label": "Rooms currently occupied", "type": "number_stepper", "required": true, "min": 0},
        {"key": "expected_arrivals", "label": "Expected arrivals tomorrow", "type": "number_stepper", "required": true, "min": 0}
      ]
    },
    {
      "key": "guest_feedback",
      "title": "Guest Feedback",
      "na_allowed": true,
      "fields": [
        {"key": "complaints", "label": "Guest complaints", "type": "textarea", "required": false},
        {"key": "compliments", "label": "Guest compliments", "type": "textarea", "required": false},
        {"key": "special_requests", "label": "Special requests for tomorrow", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "petty_cash",
      "title": "Petty Cash",
      "na_allowed": true,
      "fields": [
        {"key": "opening_balance", "label": "Opening balance (UGX)", "type": "number", "required": true, "min": 0},
        {"key": "total_spent", "label": "Total spent (UGX)", "type": "number", "required": true, "min": 0},
        {"key": "closing_balance", "label": "Closing balance (UGX)", "type": "number", "required": true, "min": 0},
        {"key": "petty_cash_notes", "label": "Expenditure details", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Management / Admin', 'management', 'admin', 'Daily management notes, HR observations, and special instructions', '{
  "sections": [
    {
      "key": "daily_brief",
      "title": "Daily Brief",
      "na_allowed": false,
      "fields": [
        {"key": "key_activities", "label": "Key activities today", "type": "textarea", "required": true, "help_text": "Main events, meetings, decisions, or actions taken today"},
        {"key": "guest_vip_notes", "label": "VIP / special guest notes", "type": "textarea", "required": false},
        {"key": "external_meetings", "label": "External meetings or calls", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "hr_observations",
      "title": "HR & Staff Observations",
      "na_allowed": true,
      "fields": [
        {"key": "staff_performance", "label": "Staff performance notes", "type": "textarea", "required": false},
        {"key": "disciplinary", "label": "Disciplinary matters", "type": "textarea", "required": false},
        {"key": "training_needs", "label": "Training needs observed", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "instructions",
      "title": "Instructions for Tomorrow",
      "na_allowed": false,
      "fields": [
        {"key": "special_instructions", "label": "Special instructions", "type": "textarea", "required": false, "help_text": "Any instructions for the next day that departments need to know"},
        {"key": "follow_ups", "label": "Follow-ups needed", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Conservation / Wildlife', 'conservation', 'wildlife', 'Animal sightings, patrol routes, poaching alerts, and veterinary notes', '{
  "sections": [
    {
      "key": "sightings",
      "title": "Animal Sightings",
      "na_allowed": false,
      "fields": [
        {"key": "rhino_count", "label": "Rhinos sighted", "type": "number_stepper", "required": true, "min": 0, "help_text": "Total individual rhinos confirmed today"},
        {"key": "other_wildlife", "label": "Other notable wildlife", "type": "textarea", "required": false},
        {"key": "animal_health", "label": "Animal health observations", "type": "textarea", "required": false, "help_text": "Any signs of illness, injury, or unusual behaviour"}
      ]
    },
    {
      "key": "patrols",
      "title": "Patrol Report",
      "na_allowed": false,
      "fields": [
        {"key": "patrols_completed", "label": "Patrols completed", "type": "number_stepper", "required": true, "min": 0},
        {"key": "patrol_routes", "label": "Routes covered", "type": "textarea", "required": true},
        {"key": "fence_status", "label": "Fence condition", "type": "select", "required": true, "options": ["All clear", "Minor damage", "Major damage", "Breach detected"]}
      ]
    },
    {
      "key": "threats",
      "title": "Threats & Incidents",
      "na_allowed": true,
      "fields": [
        {"key": "poaching_alerts", "label": "Poaching alerts", "type": "textarea", "required": false, "help_text": "Any signs of poaching activity: snares, tracks, suspicious persons"},
        {"key": "encroachment", "label": "Human encroachment", "type": "textarea", "required": false},
        {"key": "threat_severity", "label": "Overall threat level", "type": "select", "required": true, "options": ["None", "Low", "Moderate", "High", "Critical"]}
      ]
    },
    {
      "key": "veterinary",
      "title": "Veterinary Notes",
      "na_allowed": true,
      "fields": [
        {"key": "treatments", "label": "Treatments administered", "type": "textarea", "required": false},
        {"key": "vet_followups", "label": "Veterinary follow-ups needed", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb),

('Store / Procurement', 'store', 'operations', 'Inbound stock, requisition fulfilment, and stock discrepancy tracking', '{
  "sections": [
    {
      "key": "inbound",
      "title": "Inbound Stock Received",
      "na_allowed": true,
      "fields": [
        {"key": "deliveries_count", "label": "Deliveries received", "type": "number_stepper", "required": true, "min": 0},
        {"key": "delivery_details", "label": "Delivery details", "type": "textarea", "required": false, "help_text": "Supplier, items, quantities received"},
        {"key": "delivery_condition", "label": "Overall condition of goods", "type": "select", "required": false, "options": ["Good", "Acceptable", "Poor — noted discrepancies"]}
      ]
    },
    {
      "key": "requisitions",
      "title": "Requisitions Fulfilled",
      "na_allowed": true,
      "fields": [
        {"key": "requisitions_fulfilled", "label": "Requisitions fulfilled", "type": "number_stepper", "required": true, "min": 0},
        {"key": "requisitions_pending", "label": "Requisitions still pending", "type": "number_stepper", "required": true, "min": 0},
        {"key": "requisition_notes", "label": "Requisition notes", "type": "textarea", "required": false}
      ]
    },
    {
      "key": "discrepancies",
      "title": "Stock Discrepancies",
      "na_allowed": true,
      "fields": [
        {"key": "discrepancies_found", "label": "Discrepancies found", "type": "select", "required": true, "options": ["None", "Minor", "Significant"]},
        {"key": "discrepancy_details", "label": "Discrepancy details", "type": "textarea", "required": false, "help_text": "Item, expected vs actual, possible reason"}
      ]
    },
    {
      "key": "low_stock",
      "title": "Low Stock Alerts",
      "na_allowed": true,
      "fields": [
        {"key": "items_below_minimum", "label": "Items below minimum", "type": "textarea", "required": false, "help_text": "List items that need reordering"},
        {"key": "reorder_placed", "label": "Reorders placed today", "type": "textarea", "required": false}
      ]
    }
  ]
}'::jsonb);
