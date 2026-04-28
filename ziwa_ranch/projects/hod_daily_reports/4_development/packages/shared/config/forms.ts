import { DepartmentFormConfig } from '../types'
import { AREAS, ZONES, GATES } from './locations'

export const DEPARTMENT_FORMS: DepartmentFormConfig[] = [
  {
    slug: 'main-gate',
    name: 'Main Gate',
    hods: ['Jjuko'],
    defaultsToYesterday: true,
    sectionMode: 'paged',
    sections: [
      {
        title: 'Guest Entries',
        fields: [
          { name: 'rhino_trekking', label: 'Rhino trekking', type: 'number', required: true, placeholder: '0' },
          { name: 'shoebill', label: 'Shoebill', type: 'number', required: true, placeholder: '0' },
          { name: 'night_walk', label: 'Night walk', type: 'number', required: true, placeholder: '0' },
          { name: 'nature_walk', label: 'Nature walk', type: 'number', required: true, placeholder: '0' },
        ],
      },
      {
        title: 'Guest Summary',
        fields: [
          { name: 'total_guests', label: 'Total guests who entered today', type: 'number', required: true, placeholder: '0' },
          { name: 'walk_ins', label: 'Walk-ins (no prior booking)', type: 'number', placeholder: '0' },
          { name: 'unusual_vehicle', label: 'Any unusual or unregistered vehicle today?', type: 'select', options: ['No', 'Yes'] },
          { name: 'vehicle_anomaly_details', label: 'Describe the vehicle and circumstances', type: 'textarea', placeholder: 'Vehicle description, plate number if noted, time, persons, what happened...', visibleIf: { field: 'unusual_vehicle', operator: 'eq', value: 'Yes' } },
        ],
      },
      {
        title: 'Nationalities',
        allowNA: true,
        fields: [
          { name: 'nat_uganda', label: 'Uganda', type: 'number', stepper: true },
          { name: 'nat_uk', label: 'UK', type: 'number', stepper: true },
          { name: 'nat_usa', label: 'USA', type: 'number', stepper: true },
          { name: 'nat_france', label: 'France', type: 'number', stepper: true },
          { name: 'nat_germany', label: 'Germany', type: 'number', stepper: true },
          { name: 'nat_spain', label: 'Spain', type: 'number', stepper: true },
          { name: 'nat_italy', label: 'Italy', type: 'number', stepper: true },
          {
            name: 'other_nationalities',
            label: 'Other nationalities',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'nationality', label: 'Country', type: 'text', placeholder: 'e.g. Japan' },
              { name: 'count', label: 'Count', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about the gate today?', type: 'textarea', placeholder: 'Staffing issues, equipment problems, guest complaints, notable events...' },
        ],
      },
    ],
  },
  {
    slug: 'hq-reception',
    name: 'HQ Reception',
    hods: ['Emilly'],
    substitutes: ['Patience'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Guest Movement',
        fields: [
          { name: 'arrivals', label: 'How many guests arrived today?', type: 'number', required: true, placeholder: '0' },
          { name: 'departures', label: 'How many guests departed today?', type: 'number', required: true, placeholder: '0' },
          { name: 'groups', label: 'Group arrivals', type: 'number', placeholder: '0' },
          { name: 'walk_ins', label: 'Walk-ins (no booking)', type: 'number', placeholder: '0' },
        ],
      },
      {
        title: 'VIP Arrivals',
        allowNA: true,
        fields: [
          {
            name: 'vip_arrivals',
            label: 'VIP guests',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'name', label: 'Name', type: 'text', placeholder: 'Guest name' },
              { name: 'company', label: 'Company / organisation', type: 'text', placeholder: 'e.g. WWF, Embassy' },
            ],
          },
        ],
      },
      {
        title: 'Return Guests',
        allowNA: true,
        fields: [
          { name: 'return_guests_count', label: 'Number of return guests', type: 'number', placeholder: '0' },
          {
            name: 'return_guests',
            label: 'Return guest details',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'name', label: 'Name', type: 'text' },
              { name: 'company', label: 'Company / organisation', type: 'text' },
            ],
          },
        ],
      },
      {
        title: 'Bookings',
        allowNA: true,
        fields: [
          { name: 'corporate_ota_count', label: 'Corporate / OTA bookings', type: 'number', placeholder: '0' },
        ],
      },
      {
        title: 'Guest Feedback',
        allowNA: true,
        fields: [
          { name: 'guest_feedback', label: 'What feedback did guests share today?', type: 'textarea', placeholder: 'e.g. Guest in Obama room complimented breakfast. Guest in Violet room complained about hot water...', helpText: 'Include compliments, complaints, and suggestions. Note which guest or room if relevant.' },
        ],
      },
      {
        title: 'Cancellations',
        allowNA: true,
        fields: [
          { name: 'cancellations_count', label: 'Number of cancellations', type: 'number', placeholder: '0' },
          {
            name: 'cancellations',
            label: 'Cancellation details',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'name', label: 'Name', type: 'text' },
              { name: 'company', label: 'Company / organisation', type: 'text' },
            ],
          },
        ],
      },
      {
        title: 'No-Shows',
        allowNA: true,
        fields: [
          { name: 'no_shows_count', label: 'Number of no-shows', type: 'number', placeholder: '0' },
          {
            name: 'no_shows',
            label: 'No-show details',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'name', label: 'Name', type: 'text' },
              { name: 'company', label: 'Company / organisation', type: 'text' },
            ],
          },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about reception today?', type: 'textarea', placeholder: 'Booking issues, guest complaints, system problems, things that went well...' },
        ],
      },
    ],
  },
  {
    slug: 'food-and-beverage',
    name: 'Food & Beverage',
    hods: ['Howard'],
    substitutes: ['Oscar'],
    defaultsToYesterday: true,
    sectionMode: 'paged',
    stockConfig: { stockType: 'bar', stockField: 'bar_stock_count' },
    sections: [
      {
        title: 'Bar Stock Count (Monday)',
        mondayOnly: true,
        fields: [
          {
            name: 'bar_stock_count',
            label: 'Full bar stock count',
            type: 'inventory_grid',
            min_rows: 1,
            inventory_grid_config: { category: 'beverage', showCost: false, showPrevious: true },
          },
        ],
      },
      {
        title: 'Breakfast',
        fields: [
          { name: 'breakfast_pax', label: 'Number of pax', type: 'number', required: true, placeholder: '0' },
          {
            name: 'breakfast_dishes',
            label: 'Dishes served',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'dish', label: 'Dish name', type: 'text', placeholder: 'e.g. Eggs Benedict, Pancakes, Fresh fruit platter', autocomplete: { category: 'dish' } },
              { name: 'quantity', label: 'Qty', type: 'number' },
            ],
          },
          { name: 'breakfast_on_duty', label: 'On duty', type: 'checkbox_group', options: ['Howard', 'Oscar', 'Peter', 'Erick', 'Phiona', 'Juliet', 'Khadijah', 'Esther', 'Aidah', 'Belinda', 'Sharon', 'Joanne'] },
        ],
      },
      {
        title: 'Lunch',
        fields: [
          { name: 'lunch_pax', label: 'Number of pax (including a la carte)', type: 'number', required: true, placeholder: '0' },
          {
            name: 'lunch_dishes',
            label: 'Dishes served',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'dish', label: 'Dish name', type: 'text', placeholder: 'e.g. Grilled chicken, Chicken Maryland, Tilapia fillet', autocomplete: { category: 'dish' } },
              { name: 'quantity', label: 'Qty', type: 'number' },
            ],
          },
          { name: 'lunch_on_duty', label: 'On duty', type: 'checkbox_group', options: ['Howard', 'Oscar', 'Peter', 'Erick', 'Phiona', 'Juliet', 'Khadijah', 'Esther', 'Aidah', 'Belinda', 'Sharon', 'Joanne'] },
        ],
      },
      {
        title: 'Dinner',
        fields: [
          { name: 'dinner_pax', label: 'Number of pax', type: 'number', required: true, placeholder: '0' },
          {
            name: 'dinner_dishes',
            label: 'Dishes served',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'dish', label: 'Dish name', type: 'text', placeholder: 'e.g. Beef stew, Grilled tilapia, Vegetable curry', autocomplete: { category: 'dish' } },
              { name: 'quantity', label: 'Qty', type: 'number' },
            ],
          },
          { name: 'dinner_on_duty', label: 'On duty', type: 'checkbox_group', options: ['Howard', 'Oscar', 'Peter', 'Erick', 'Phiona', 'Juliet', 'Khadijah', 'Esther', 'Aidah', 'Belinda', 'Sharon', 'Joanne'] },
        ],
      },
      {
        title: 'Beverage Sales',
        allowNA: true,
        fields: [
          {
            name: 'beverage_sales',
            label: 'Beverages sold today',
            type: 'inventory_grid',
            inventory_grid_config: { category: 'beverage', showCost: false, showPrevious: true },
          },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about F&B today?', type: 'textarea', placeholder: 'Service issues, guest feedback, equipment problems, things that went well...', helpText: 'e.g. Power outage delayed lunch service 30 minutes. Guest complimented cocktail selection.' },
        ],
      },
    ],
  },
  {
    slug: 'kitchen',
    name: 'Kitchen',
    hods: ['Sensio'],
    substitutes: ['Richard', 'Safari', 'David', 'Felly', 'Lawrence', 'Koffi'],
    sectionMode: 'paged',
    stockConfig: { stockType: 'kitchen', stockField: 'kitchen_stock_count' },
    sections: [
      {
        title: 'Kitchen Stock Count (Monday)',
        mondayOnly: true,
        fields: [
          {
            name: 'kitchen_stock_count',
            label: 'Full kitchen stock count',
            type: 'inventory_grid',
            min_rows: 1,
            inventory_grid_config: { category: 'kitchen_stock', showCost: true, showPrevious: true },
          },
        ],
      },
      {
        title: 'Stock Added Today',
        allowNA: true,
        fields: [
          {
            name: 'stock_added',
            label: 'Stock received today',
            type: 'inventory_grid',
            inventory_grid_config: { category: 'kitchen_stock', showCost: true, showPrevious: false },
          },
        ],
      },
      {
        title: 'Stock Used Today',
        fields: [
          {
            name: 'stock_used',
            label: 'Stock used during service',
            type: 'inventory_grid',
            required: true,
            min_rows: 1,
            inventory_grid_config: { category: 'kitchen_stock', showCost: true, showPrevious: true },
          },
        ],
      },
      {
        title: 'Near-Expired Items',
        allowNA: true,
        fields: [
          {
            name: 'near_expired_items',
            label: 'Items nearing expiry',
            type: 'repeater',
            min_rows: 0,
            helpText: 'Include any item expiring within the next 3 days. Suggest how it could be used.',
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Milk, Yoghurt, Bread' },
              { name: 'expiry_date', label: 'Expiry date', type: 'text', placeholder: 'e.g. 28 Mar 2026' },
              { name: 'quantity_remaining', label: 'Qty remaining', type: 'number' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. litres, pieces, kg' },
              { name: 'suggested_use', label: 'Suggested use', type: 'text', placeholder: 'e.g. Use in soup, Staff meal' },
              { name: 'notes', label: 'Notes', type: 'text', placeholder: 'Any additional notes' },
            ],
          },
        ],
      },
      {
        title: 'Daily Food Cost',
        fields: [
          { name: 'daily_food_cost', label: 'What was the total food cost today? (UGX)', type: 'number', required: true, placeholder: '0' },
          {
            name: 'cost_breakdown',
            label: 'Cost breakdown',
            type: 'repeater',
            min_rows: 0,
            helpText: 'Break down the cost — what was purchased, from where, and how much.',
            visibleIf: { field: 'daily_food_cost', operator: 'gt', value: 0 },
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Chicken, Vegetables, Cooking oil' },
              { name: 'supplier', label: 'Supplier', type: 'text', placeholder: 'e.g. Local market, Nakumatt' },
              { name: 'amount', label: 'Amount (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'On Duty',
        fields: [
          { name: 'breakfast_on_duty', label: 'Breakfast service', type: 'checkbox_group', allowCustomEntries: true, options: ['Chef Sensio', 'Chef Richard', 'Chef Safari', 'Chef David', 'Chef Felly', 'Steward Lawrence', 'Steward Koffi', 'Steward Jimmy', 'Steward Edward', 'Someone else'] },
          { name: 'lunch_on_duty', label: 'Lunch service', type: 'checkbox_group', allowCustomEntries: true, options: ['Chef Sensio', 'Chef Richard', 'Chef Safari', 'Chef David', 'Chef Felly', 'Steward Lawrence', 'Steward Koffi', 'Steward Jimmy', 'Steward Edward', 'Someone else'] },
          { name: 'dinner_on_duty', label: 'Dinner service', type: 'checkbox_group', allowCustomEntries: true, options: ['Chef Sensio', 'Chef Richard', 'Chef Safari', 'Chef David', 'Chef Felly', 'Steward Lawrence', 'Steward Koffi', 'Steward Jimmy', 'Steward Edward', 'Someone else'] },
        ],
      },
      {
        title: 'Photos',
        allowNA: true,
        fields: [
          { name: 'photos', label: 'Attach photos', type: 'photo', photo_config: { maxPhotos: 5, categories: ['Equipment issue', 'Damaged item', 'Food waste', 'Maintenance needed', 'Record keeping', 'Other'] } },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What went wrong or nearly wrong? What went well?', type: 'textarea', placeholder: 'e.g. Power outage at 2pm, switched to gas. Lunch service delayed 30 minutes. No food waste today.', helpText: 'Include equipment issues, service delays, food waste, and any wins.' },
        ],
      },
    ],
  },
  {
    slug: 'housekeeping',
    name: 'Housekeeping',
    hods: ['Anita'],
    substitutes: [],
    defaultsToYesterday: true,
    sectionMode: 'paged',
    sections: [
      {
        title: 'Room Status',
        fields: [
          { name: 'rooms', label: 'Room status', type: 'room_grid', required: true },
        ],
      },
      {
        title: 'Room Damage',
        allowNA: true,
        fields: [
          { name: 'has_room_damage', label: 'Were any rooms found damaged today?', type: 'select', options: ['No', 'Yes'] },
          { name: 'damage_description', label: 'Describe the damage — which rooms and what happened', type: 'textarea', required: true, placeholder: 'e.g. Obama room: broken mirror on bathroom door. Violet room: stained bedsheets, cigarette burn.', visibleIf: { field: 'has_room_damage', operator: 'eq', value: 'Yes' } },
          { name: 'maintenance_flagged', label: 'Has maintenance been notified?', type: 'select', options: ['Yes', 'Not yet'], visibleIf: { field: 'has_room_damage', operator: 'eq', value: 'Yes' } },
        ],
      },
      {
        title: 'Laundry',
        allowNA: true,
        fields: [
          { name: 'laundry_notes', label: 'Any laundry issues today?', type: 'textarea', placeholder: 'Damaged clothes, missing items, machine problems...', helpText: 'Note any damaged clothes, missing items, or laundry equipment issues.' },
        ],
      },
      {
        title: 'Photos',
        allowNA: true,
        fields: [
          { name: 'photos', label: 'Attach photos', type: 'photo', photo_config: { maxPhotos: 5, categories: ['Room damage', 'Maintenance needed', 'Cleanliness issue', 'Equipment issue', 'Record keeping', 'Other'] } },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about housekeeping today?', type: 'textarea', placeholder: 'Staffing issues, guest complaints, equipment needs, things that went well...' },
        ],
      },
    ],
  },
  {
    slug: 'security',
    name: 'Security',
    hods: ['Salim'],
    substitutes: ['Elia'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Gate Status',
        allowNA: true,
        fields: [
          {
            name: 'gate_checks',
            label: 'Gate checks',
            type: 'repeater',
            min_rows: 1,
            helpText: 'Record each gate visited. Confirm whether the gate and its record book were checked.',
            sub_fields: [
              { name: 'gate', label: 'Gate name', type: 'select', options: [...GATES] },
              { name: 'checked', label: 'Checked?', type: 'text', placeholder: 'Yes / No' },
              { name: 'book_checked', label: 'Book checked?', type: 'text', placeholder: 'Yes / No' },
            ],
          },
        ],
      },
      {
        title: 'Gate Passes',
        fields: [
          { name: 'gate_passes', label: 'Number of gate passes issued', type: 'number', required: true, placeholder: '0' },
        ],
      },
      {
        title: 'Patrols',
        allowNA: true,
        fields: [
          {
            name: 'patrols',
            label: 'Patrol entries',
            type: 'repeater',
            min_rows: 0,
            helpText: 'One entry per patrol. Include area, zone, time, and any observations.',
            sub_fields: [
              { name: 'area', label: 'Area', type: 'select', options: [...AREAS] },
              { name: 'zone', label: 'Zone', type: 'select', options: [...ZONES] },
              { name: 'start_time', label: 'Start time', type: 'text', placeholder: '06:00' },
              { name: 'end_time', label: 'End time', type: 'text', placeholder: '14:00' },
              { name: 'patrol_notes', label: 'Patrol notes', type: 'textarea', placeholder: 'Observations during patrol...' },
            ],
          },
        ],
      },
      {
        title: 'Security Incidents',
        allowNA: true,
        fields: [
          { name: 'incident_occurred', label: 'Did any security incident occur today?', type: 'select', options: ['No', 'Yes'] },
          { name: 'incident_time', label: 'What time did it happen?', type: 'text', placeholder: 'e.g. 14:30', visibleIf: { field: 'incident_occurred', operator: 'eq', value: 'Yes' } },
          { name: 'incident_type', label: 'Type of incident', type: 'select', options: ['Theft', 'Trespass', 'Poaching', 'Animal breach', 'Vandalism', 'Staff misconduct', 'Other'], visibleIf: { field: 'incident_occurred', operator: 'eq', value: 'Yes' } },
          { name: 'incident_persons', label: 'Persons involved', type: 'textarea', placeholder: 'Names, descriptions, or number of people involved...', visibleIf: { field: 'incident_occurred', operator: 'eq', value: 'Yes' } },
          { name: 'incident_outcome', label: 'What was the outcome?', type: 'textarea', required: true, placeholder: 'What action was taken and what was the result...', visibleIf: { field: 'incident_occurred', operator: 'eq', value: 'Yes' } },
        ],
      },
      {
        title: 'Road Status',
        allowNA: true,
        fields: [
          { name: 'road_status', label: 'What is the condition of the roads today?', type: 'textarea', placeholder: 'Any obstructions, damage, flooding, or incidents...' },
        ],
      },
      {
        title: 'Unregistered People',
        allowNA: true,
        fields: [
          {
            name: 'unregistered_people',
            label: 'Unregistered people observed',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'area', label: 'Area', type: 'select', options: [...AREAS] },
              { name: 'zone', label: 'Zone', type: 'select', options: [...ZONES] },
              { name: 'number', label: 'Number', type: 'number', placeholder: '0' },
              { name: 'gender', label: 'Male / Female / Mixed', type: 'text', placeholder: 'e.g. 2 Male, 1 Female' },
              { name: 'nature', label: 'Suspected nature of business', type: 'text', placeholder: 'e.g. Fishing, passing through' },
              { name: 'conclusion', label: 'Conclusion / outcome', type: 'textarea', placeholder: 'What was the conclusion / outcome...' },
            ],
          },
        ],
      },
      {
        title: 'Photos',
        allowNA: true,
        fields: [
          { name: 'photos', label: 'Attach photos', type: 'photo', photo_config: { maxPhotos: 5, categories: ['Security incident', 'Unregistered person', 'Road condition', 'Gate issue', 'Evidence', 'Record keeping', 'Other'] } },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about security today?', type: 'textarea', placeholder: 'Staffing issues, equipment problems, notable observations, things that went well...' },
        ],
      },
    ],
  },
  {
    slug: 'store',
    name: 'Store',
    hods: ['Denis'],
    substitutes: ['Emilly'],
    sectionMode: 'paged',
    stockConfig: { stockType: 'store', stockField: 'store_stock_count' },
    sections: [
      {
        title: 'Store Stock Count (Monday)',
        mondayOnly: true,
        fields: [
          {
            name: 'store_stock_count',
            label: 'Full store stock count',
            type: 'inventory_grid',
            min_rows: 1,
            inventory_grid_config: { category: 'store_goods', showCost: false, showPrevious: true },
          },
        ],
      },
      {
        title: 'Goods Added to Store',
        allowNA: true,
        fields: [
          {
            name: 'goods_added',
            label: 'Goods received into store',
            type: 'inventory_grid',
            required: true,
            min_rows: 1,
            inventory_grid_config: {
              category: 'store_goods',
              showCost: true,
              showPrevious: false,
              extraFields: [
                { name: 'supplier', label: 'Supplier', type: 'text', placeholder: 'e.g. Nakumatt, Local market' },
              ],
            },
          },
        ],
      },
      {
        title: 'Goods Taken from Store',
        allowNA: true,
        fields: [
          {
            name: 'goods_taken',
            label: 'Goods issued from store',
            type: 'inventory_grid',
            required: true,
            min_rows: 1,
            inventory_grid_config: {
              category: 'store_goods',
              showCost: false,
              showPrevious: false,
              extraFields: [
                { name: 'taken_by', label: 'Taken by / Department', type: 'text', placeholder: 'e.g. Kitchen, Housekeeping' },
              ],
            },
          },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about the store today?', type: 'textarea', placeholder: 'Stock shortages, delivery issues, storage problems, things that went well...' },
        ],
      },
    ],
  },
  {
    slug: 'accounts',
    name: 'Accounts',
    hods: ['Musoni'],
    substitutes: ['Halima'],
    sectionMode: 'paged',
    defaultsToYesterday: true,
    sections: [
      {
        title: 'Balances at Start of Day',
        fields: [
          { name: 'petty_cash_start', label: 'Petty cash (UGX)', type: 'number', required: true, placeholder: '0' },
        ],
      },
      {
        title: 'Balances at End of Day',
        fields: [
          { name: 'petty_cash_end', label: 'Petty cash (UGX)', type: 'number', required: true, placeholder: '0' },
        ],
      },
      {
        title: 'Daily Financial Summary',
        fields: [
          { name: 'daily_total_sales', label: 'Total sales today (UGX)', type: 'number', required: true, placeholder: '0', hiddenFor: ['Halima'] },
          { name: 'daily_total_expenses', label: 'Total expenses today (UGX)', type: 'number', required: true, placeholder: '0' },
          { name: 'running_debtors', label: 'Running debtors (UGX)', type: 'number', placeholder: '0' },
          { name: 'receivables', label: 'Receivables — money received from Chairman, CEO & Directors or other sources (UGX)', type: 'number', placeholder: '0' },
        ],
      },
      {
        title: 'Payments Made Today',
        allowNA: true,
        fields: [
          {
            name: 'payments',
            label: 'Payments',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'to_whom', label: 'To whom', type: 'text' },
              { name: 'for_what', label: 'For what', type: 'text' },
              { name: 'amount', label: 'Amount (UGX)', type: 'number' },
              { name: 'receipt_photo', label: 'Receipt photo', type: 'photo' },
            ],
          },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about accounts today?', type: 'textarea', placeholder: 'Payment issues, cash discrepancies, system problems, debtor updates...' },
        ],
      },
    ],
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    hods: ['Robert'],
    substitutes: ['Sekito'],
    sectionMode: 'paged',
    defaultsToYesterday: true,
    sections: [
      {
        title: 'Fence Patrol',
        allowNA: true,
        fields: [
          { name: 'areas_patrolled', label: 'Which fence sections did you patrol today?', type: 'textarea', required: true, placeholder: 'e.g. Zone A to Zone C, full perimeter...' },
          { name: 'damage_reports', label: 'Any fence damage found?', type: 'textarea', placeholder: 'Location, nature of damage, and severity...' },
          { name: 'recent_repairs', label: 'What fence repairs were completed?', type: 'textarea', placeholder: 'Location, what was fixed, materials used...' },
          { name: 'cleanliness_report', label: 'Fence line condition', type: 'textarea', placeholder: 'Vegetation clearance needed, debris, overgrowth...' },
          { name: 'fence_power_outages', label: 'Any fence power outages?', type: 'textarea', placeholder: 'Which sections, duration, cause if known...' },
        ],
      },
      {
        title: 'HQ Power',
        fields: [
          { name: 'hq_power_status', label: 'What was the power situation at HQ today?', type: 'textarea', required: true, placeholder: 'Stable all day / Outage from 10am-2pm / Generator used...' },
          { name: 'generator_used', label: 'Was the generator used today?', type: 'select', options: ['No', 'Yes'] },
          { name: 'fuel_consumption', label: 'Fuel consumed (litres)', type: 'number', placeholder: '0', visibleIf: { field: 'generator_used', operator: 'eq', value: 'Yes' } },
          { name: 'generator_run_hours', label: 'How long did the generator run?', type: 'text', placeholder: 'e.g. 4 hours', visibleIf: { field: 'generator_used', operator: 'eq', value: 'Yes' } },
        ],
      },
      {
        title: 'Electrical Faults',
        allowNA: true,
        fields: [
          { name: 'fault_occurred', label: 'Were any electrical faults found today?', type: 'select', options: ['No', 'Yes'] },
          { name: 'fault_description', label: 'Describe the fault — location, nature, and action taken', type: 'textarea', required: true, placeholder: 'e.g. Tripped breaker in Chalet 3 — overloaded circuit. Replaced fuse and advised guest.', visibleIf: { field: 'fault_occurred', operator: 'eq', value: 'Yes' } },
          { name: 'fault_resolved', label: 'Was the fault resolved?', type: 'select', options: ['Yes — fully resolved', 'Partially — needs follow-up', 'No — awaiting parts/help'], visibleIf: { field: 'fault_occurred', operator: 'eq', value: 'Yes' } },
        ],
      },
      {
        title: 'Work Done Today',
        fields: [
          { name: 'work_done', label: 'What did you complete today? Include job, location, and outcome.', type: 'textarea', required: true, placeholder: 'e.g. Replaced fence energiser at Zone B. Rewired socket in Obama room.', helpText: 'Describe fault, location, action taken, parts used, and whether resolved.' },
        ],
      },
      {
        title: 'Work Planned for Tomorrow',
        fields: [
          { name: 'work_tomorrow', label: 'Planned work', type: 'textarea', required: true, placeholder: 'Project, what will be done, where...' },
        ],
      },
      {
        title: 'Photos',
        allowNA: true,
        fields: [
          { name: 'photos', label: 'Attach photos', type: 'photo', photo_config: { maxPhotos: 5, categories: ['Fence damage', 'Completed repair', 'Power issue', 'Maintenance needed', 'Evidence', 'Record keeping', 'Other'] } },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'Any problems that need urgent attention?', type: 'textarea', placeholder: 'Equipment failures, safety concerns, parts needed...' },
        ],
      },
    ],
  },
  {
    slug: 'hq-maintenance',
    name: 'HQ Maintenance',
    hods: ['David'],
    substitutes: ['Francis'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Work Done Today',
        fields: [
          {
            name: 'work_done',
            label: 'What did you complete today?',
            type: 'repeater',
            required: true,
            min_rows: 1,
            helpText: 'One entry per job. Include project name, what was done, location, and materials.',
            sub_fields: [
              { name: 'project', label: 'Project', type: 'text', placeholder: 'e.g. Chalet 3 bathroom, Staff quarters roof' },
              { name: 'what_was_done', label: 'What was done', type: 'textarea', placeholder: 'Describe the work completed...' },
              { name: 'location', label: 'Where', type: 'text', placeholder: 'e.g. Guest House 2, Workshop' },
              { name: 'materials_used', label: 'Materials used', type: 'text', autocomplete: { category: 'materials' }, placeholder: 'e.g. 2 bags cement, 4 planks' },
              { name: 'status', label: 'Status', type: 'select', options: ['Completed', 'Ongoing', 'Blocked'] },
            ],
          },
        ],
      },
      {
        title: 'Work Planned for Tomorrow',
        fields: [
          { name: 'work_tomorrow', label: 'What is planned for tomorrow?', type: 'textarea', required: true, placeholder: 'Project name, what will be done, where...' },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'Any problems that need urgent attention?', type: 'textarea', placeholder: 'Materials needed, blocked jobs, safety issues...' },
        ],
      },
    ],
  },
  {
    slug: 'drivers-and-mechanics',
    name: 'Drivers & Mechanics',
    hods: ['Kanja', 'Roger'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Vehicle Usage',
        allowNA: true,
        fields: [
          {
            name: 'vehicle_usage',
            label: 'Which vehicles were used today?',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'plate', label: 'Vehicle plate', type: 'text', placeholder: 'e.g. UAA 123B', autocomplete: { category: 'vehicle' } },
              { name: 'make', label: 'Make', type: 'text', placeholder: 'e.g. Toyota Hilux' },
              { name: 'vehicle_type', label: 'Type', type: 'select', options: ['Pick-up', 'Car', 'Truck', 'Motorcycle'] },
              { name: 'opening_mileage', label: 'Opening mileage (km)', type: 'number' },
              { name: 'closing_mileage', label: 'Closing mileage (km)', type: 'number' },
              { name: 'mileage_to_service', label: 'Mileage to next service (km)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Work Done Today',
        allowNA: true,
        fields: [
          {
            name: 'work_done',
            label: 'What repairs or maintenance did you do today?',
            type: 'repeater',
            required: true,
            min_rows: 1,
            helpText: 'One entry per job. Include vehicle plate, what was done, parts used, and outcome.',
            sub_fields: [
              { name: 'plate', label: 'Vehicle plate', type: 'text', placeholder: 'e.g. UAA 123B' },
              { name: 'what_done', label: 'What was done', type: 'textarea' },
              { name: 'cost', label: 'Cost (UGX)', type: 'number' },
              { name: 'parts_used', label: 'Parts used', type: 'text' },
              { name: 'outcome', label: 'Success or failure', type: 'text', placeholder: 'Resolved / Ongoing / Failed' },
            ],
          },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'Any vehicle problems or urgent needs?', type: 'textarea', placeholder: 'Breakdowns, parts needed, overdue services, safety concerns...' },
        ],
      },
    ],
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    hods: ['Richard'],
    substitutes: ['Jonah'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Work Done Today',
        fields: [
          {
            name: 'work_done',
            label: 'What plumbing work did you complete today?',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'project', label: 'Project', type: 'text', placeholder: 'e.g. Blocked drain, Pipe repair' },
              { name: 'what_was_done', label: 'What was done', type: 'textarea', placeholder: 'Describe the work...' },
              { name: 'location', label: 'Where', type: 'text', placeholder: 'e.g. Guest House 1, Staff quarters' },
              { name: 'status', label: 'Status', type: 'select', options: ['Completed', 'Ongoing', 'Blocked'] },
            ],
          },
        ],
      },
      {
        title: 'Work Planned for Tomorrow',
        fields: [
          { name: 'work_tomorrow', label: 'What is planned for tomorrow?', type: 'textarea', required: true, placeholder: 'Project name, what will be done, where...' },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'Any problems that need urgent attention?', type: 'textarea', placeholder: 'Parts needed, blocked jobs, water supply issues...' },
        ],
      },
    ],
  },
  {
    slug: 'it',
    name: 'IT',
    hods: ['Benson'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Job Cards',
        allowNA: true,
        fields: [
          {
            name: 'job_cards',
            label: 'Job cards',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'name', label: 'Name', type: 'text', placeholder: 'Person requesting' },
              { name: 'department', label: 'Department', type: 'text', placeholder: 'e.g. Accounts, Kitchen' },
              { name: 'reason', label: 'Reason', type: 'textarea', placeholder: 'What was the issue or request...' },
            ],
          },
        ],
      },
      {
        title: 'Network',
        fields: [
          { name: 'network_status', label: 'Network status', type: 'textarea', required: true, placeholder: 'e.g. Stable all day / WiFi down 10am-12pm' },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'Any IT problems that need urgent attention?', type: 'textarea', placeholder: 'Equipment failures, recurring issues, hardware needed, system changes...' },
        ],
      },
    ],
  },
  {
    slug: 'wildlife',
    name: 'Wildlife',
    hods: ['Martine'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Hartebeest',
        fields: [
          { name: 'hartebeest_total', label: 'Total observed', type: 'number', required: true, placeholder: '0' },
          {
            name: 'hartebeest_sightings',
            label: 'Sightings',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'area', label: 'Area', type: 'select', options: [...AREAS] },
              { name: 'zone', label: 'Zone', type: 'select', options: [...ZONES] },
              { name: 'hour', label: 'Time', type: 'text', placeholder: 'e.g. 7:30 AM' },
              { name: 'count', label: 'Count', type: 'number' },
              { name: 'notes', label: 'Notes', type: 'text', placeholder: 'Behaviour, condition...' },
            ],
          },
          { name: 'hartebeest_notes', label: 'Hartebeest notes', type: 'textarea', placeholder: 'General observations about hartebeest today...' },
        ],
      },
      {
        title: 'Zebra',
        fields: [
          { name: 'zebra_total', label: 'Total observed', type: 'number', required: true, placeholder: '0' },
          {
            name: 'zebra_sightings',
            label: 'Sightings',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'area', label: 'Area', type: 'select', options: [...AREAS] },
              { name: 'zone', label: 'Zone', type: 'select', options: [...ZONES] },
              { name: 'hour', label: 'Time', type: 'text', placeholder: 'e.g. 7:30 AM' },
              { name: 'count', label: 'Count', type: 'number' },
              { name: 'notes', label: 'Notes', type: 'text', placeholder: 'Behaviour, condition...' },
            ],
          },
          { name: 'zebra_notes', label: 'Zebra notes', type: 'textarea', placeholder: 'General observations about zebra today...' },
        ],
      },
      {
        title: 'Giraffe',
        fields: [
          { name: 'giraffe_total', label: 'Total observed', type: 'number', required: true, placeholder: '0' },
          {
            name: 'giraffe_sightings',
            label: 'Sightings',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'area', label: 'Area', type: 'select', options: [...AREAS] },
              { name: 'zone', label: 'Zone', type: 'select', options: [...ZONES] },
              { name: 'hour', label: 'Time', type: 'text', placeholder: 'e.g. 7:30 AM' },
              { name: 'count', label: 'Count', type: 'number' },
              { name: 'notes', label: 'Notes', type: 'text', placeholder: 'Behaviour, condition...' },
            ],
          },
          { name: 'giraffe_notes', label: 'Giraffe notes', type: 'textarea', placeholder: 'General observations about giraffe today...' },
        ],
      },
      {
        title: 'Rhino',
        fields: [
          { name: 'rhino_total', label: 'Total observed', type: 'number', placeholder: '0' },
          {
            name: 'rhino_sightings',
            label: 'Sightings',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'rhino_id', label: 'Rhino name / number', type: 'text', placeholder: 'e.g. Uhuru, R-12' },
              { name: 'confidence', label: 'Confidence', type: 'select', options: ['20%', '40%', '60%', '80%', '100%'] },
              { name: 'area', label: 'Area', type: 'select', options: [...AREAS] },
              { name: 'zone', label: 'Zone', type: 'select', options: [...ZONES] },
              { name: 'hour', label: 'Time', type: 'text', placeholder: 'e.g. 7:30 AM' },
              { name: 'count', label: 'Count', type: 'number' },
              { name: 'notes', label: 'Notes', type: 'text', placeholder: 'Behaviour, condition...' },
            ],
          },
          { name: 'rhino_notes', label: 'Rhino notes', type: 'textarea', placeholder: 'General observations about rhino today...' },
        ],
      },
      {
        title: 'General Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about wildlife today?', type: 'textarea', placeholder: 'Health concerns, unusual behaviour, fence breaches, poaching signs, things that went well...' },
        ],
      },
    ],
  },
  {
    slug: 'craft-shop',
    name: 'Craft Shop',
    hods: ['Halima'],
    substitutes: ['Patience'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Cash Sales (UGX)',
        fields: [
          { name: 'cash_total', label: 'Total cash sales (UGX)', type: 'number', required: true, placeholder: '0' },
          {
            name: 'cash_items',
            label: 'Items sold',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item name', type: 'text' },
              { name: 'quantity', label: 'Quantity', type: 'number' },
              { name: 'price', label: 'Price (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'MoMo Pay (UGX)',
        fields: [
          { name: 'momo_total', label: 'Total MoMo sales (UGX)', type: 'number', required: true, placeholder: '0' },
          {
            name: 'momo_items',
            label: 'Items sold',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item name', type: 'text' },
              { name: 'quantity', label: 'Quantity', type: 'number' },
              { name: 'price', label: 'Price (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Card Sales (UGX)',
        fields: [
          { name: 'card_total', label: 'Total card sales (UGX)', type: 'number', required: true, placeholder: '0' },
          {
            name: 'card_items',
            label: 'Items sold',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item name', type: 'text' },
              { name: 'quantity', label: 'Quantity', type: 'number' },
              { name: 'price', label: 'Price (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'USD Sales',
        fields: [
          { name: 'usd_total', label: 'Total USD sales (USD)', type: 'number', required: true, placeholder: '0' },
          {
            name: 'usd_items',
            label: 'Items sold',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item name', type: 'text' },
              { name: 'quantity', label: 'Quantity', type: 'number' },
              { name: 'price', label: 'Price (USD)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Stock',
        allowNA: true,
        fields: [
          {
            name: 'low_stock_items',
            label: 'Low stock items',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Beaded bracelet, Wooden bowl' },
              { name: 'current_quantity', label: 'Current qty', type: 'number' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. pieces, sets' },
            ],
          },
          {
            name: 'popular_items',
            label: 'Popular items today',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Banana leaf basket' },
              { name: 'quantity_sold', label: 'Qty sold', type: 'number' },
            ],
          },
          {
            name: 'restock_needed',
            label: 'Restock needed',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Wooden masks' },
              { name: 'quantity_needed', label: 'Qty needed', type: 'number' },
              { name: 'priority', label: 'Priority', type: 'select', options: ['Urgent', 'Soon', 'When available'] },
            ],
          },
          { name: 'stock_notes', label: 'Stock notes', type: 'textarea', placeholder: 'Any other stock observations...' },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about the craft shop today?', type: 'textarea', placeholder: 'Supply issues, popular trends, customer feedback, things that went well...' },
        ],
      },
    ],
  },
  {
    slug: 'head-office',
    name: 'Head Office',
    hods: ['Florence'],
    substitutes: ['Julie', 'Isaac', 'Faith'],
    sectionMode: 'paged',
    sections: [
      {
        title: 'Confirmed Bookings',
        fields: [
          { name: 'confirmed_portal', label: 'Bookings Portal', type: 'number', stepper: true },
          { name: 'confirmed_whatsapp', label: 'WhatsApp', type: 'number', stepper: true },
          { name: 'confirmed_phone', label: 'Phone', type: 'number', stepper: true },
          { name: 'confirmed_walkins', label: 'Walk-Ins', type: 'number', stepper: true },
        ],
      },
      {
        title: 'Provisional Bookings',
        fields: [
          { name: 'provisional_portal', label: 'Bookings Portal', type: 'number', stepper: true },
          { name: 'provisional_whatsapp', label: 'WhatsApp', type: 'number', stepper: true },
          { name: 'provisional_phone', label: 'Phone', type: 'number', stepper: true },
          { name: 'provisional_walkins', label: 'Walk-Ins', type: 'number', stepper: true },
        ],
      },
      {
        title: 'Cancelled Bookings',
        allowNA: true,
        fields: [
          {
            name: 'cancelled_bookings',
            label: 'Cancelled bookings',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'company_name', label: 'Company / Individual', type: 'text', placeholder: 'e.g. ABC Tours' },
              { name: 'reason', label: 'Reason for cancellation', type: 'text', placeholder: 'e.g. Guests stuck in transit' },
              { name: 'arrival_date', label: 'Arrival date', type: 'text', placeholder: 'e.g. 01 May 2026' },
              { name: 'departure_date', label: 'Departure date', type: 'text', placeholder: 'e.g. 05 May 2026' },
              { name: 'other_info', label: 'Other information (optional)', type: 'textarea', placeholder: 'Room info, group info, activity info...' },
            ],
          },
        ],
      },
      {
        title: 'Activities Booked for Tomorrow',
        fields: [
          { name: 'act_rhino_trekking', label: 'Rhino Trekking', type: 'number', stepper: true },
          { name: 'act_shoebill_trekking', label: 'Shoebill Trekking', type: 'number', stepper: true },
          { name: 'act_night_walk', label: 'Night Walk', type: 'number', stepper: true },
          { name: 'act_nature_walk', label: 'Nature Walk', type: 'number', stepper: true },
          { name: 'act_birding', label: 'Birding', type: 'number', stepper: true },
        ],
      },
      {
        title: 'POPs Received',
        allowNA: true,
        fields: [
          {
            name: 'pops_received',
            label: 'Proof of payments received',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'company_name', label: 'Company / Individual', type: 'text', placeholder: 'e.g. John Doe' },
              { name: 'amount_paid', label: 'Amount paid', type: 'text', placeholder: 'e.g. $900 or 3,000,000 UGX' },
              { name: 'arrival_date', label: 'Date of arrival', type: 'text', placeholder: 'e.g. 05 May 2026' },
              { name: 'departure_date', label: 'Date of departure', type: 'text', placeholder: 'e.g. 08 May 2026' },
              { name: 'other_info', label: 'Other information (optional)', type: 'textarea', placeholder: 'Room info, group info, activity info...' },
            ],
          },
        ],
      },
      {
        title: 'Confirmed Payments',
        allowNA: true,
        fields: [
          {
            name: 'confirmed_payments',
            label: 'Confirmed payments',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'company_name', label: 'Company / Individual', type: 'text', placeholder: 'e.g. Mr. YZ' },
              { name: 'amount_received', label: 'Amount received', type: 'text', placeholder: 'e.g. $10.50 or 50,000 UGX' },
              { name: 'other_info', label: 'Other information (optional)', type: 'textarea', placeholder: 'Payment method, reference...' },
            ],
          },
        ],
      },
      {
        title: 'Special Requests',
        allowNA: true,
        fields: [
          {
            name: 'special_requests',
            label: 'Special requests (FOCs, discounts, late entries, early/late check-in/check-out)',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'company_name', label: 'Company / Individual', type: 'text', placeholder: 'e.g. LMZ Adventures' },
              { name: 'request', label: 'Request explained', type: 'text', placeholder: 'e.g. FAM trip – 4 agents' },
              { name: 'approved_by', label: 'Approved by', type: 'select', options: ['Chairman', 'CEO', 'MD', 'GM'] },
            ],
          },
        ],
      },
      {
        title: 'Notes',
        allowNA: true,
        fields: [
          { name: 'challenges_successes', label: 'What should management know about Head Office today?', type: 'textarea', placeholder: 'Booking issues, payment delays, agent feedback, things that went well...' },
        ],
      },
    ],
  },
]

export function findFormBySlug(slug: string): DepartmentFormConfig | undefined {
  return DEPARTMENT_FORMS.find((f) => f.slug === slug)
}

export const LEGACY_HOUSEKEEPING_CONFIG: DepartmentFormConfig = {
  slug: 'housekeeping',
  name: 'Housekeeping',
  hods: ['Anita'],
  substitutes: [],
  defaultsToYesterday: true,
  sections: [
    {
      title: 'Room Status',
      fields: [
        {
          name: 'room_status',
          label: 'Room status',
          type: 'repeater',
          min_rows: 1,
          sub_fields: [
            { name: 'room', label: 'Room', type: 'text', placeholder: 'e.g. Cottage 1' },
            { name: 'condition', label: 'Condition', type: 'text', placeholder: 'e.g. Good / Needs attention' },
            { name: 'damages', label: 'Damages or missing items', type: 'text', placeholder: 'e.g. Towel missing, lamp broken' },
          ],
        },
      ],
    },
    {
      title: 'Occupancy',
      fields: [
        { name: 'guest_arrivals', label: 'Guest arrivals', type: 'number', required: true, placeholder: '0' },
        { name: 'guest_departures', label: 'Guest departures', type: 'number', required: true, placeholder: '0' },
        { name: 'rooms_occupied', label: 'Rooms occupied', type: 'number', required: true, placeholder: '0' },
        { name: 'vacant_rooms', label: 'Vacant rooms', type: 'number', required: true, placeholder: '0' },
      ],
    },
    {
      title: 'Laundry',
      allowNA: true,
      fields: [
        { name: 'laundry_notes', label: 'Laundry report', type: 'textarea', placeholder: 'Damaged clothes, incomplete items, any issues...' },
      ],
    },
    {
      title: 'Notes',
      allowNA: true,
      fields: [
        { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
      ],
    },
  ],
}
