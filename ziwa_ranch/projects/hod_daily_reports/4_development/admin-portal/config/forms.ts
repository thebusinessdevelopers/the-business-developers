import { DepartmentFormConfig } from '@/types'
import { AREAS, ZONES, GATES } from './locations'

export const DEPARTMENT_FORMS: DepartmentFormConfig[] = [
  {
    slug: 'main-gate',
    name: 'Main Gate',
    hods: ['Jjuko'],
    defaultsToYesterday: true,
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
          { name: 'total_guests', label: 'Total guests entered', type: 'number', required: true, placeholder: '0' },
          { name: 'walk_ins', label: 'Walk-ins (no booking)', type: 'number', placeholder: '0' },
        ],
      },
      {
        title: 'Nationalities',
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
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'hq-reception',
    name: 'HQ Reception',
    hods: ['Emilly'],
    substitutes: ['Patience'],
    sections: [
      {
        title: 'Guest Movement',
        fields: [
          { name: 'arrivals', label: 'Arrivals', type: 'number', required: true, placeholder: '0' },
          { name: 'departures', label: 'Departures', type: 'number', required: true, placeholder: '0' },
          { name: 'groups', label: 'Groups', type: 'number', placeholder: '0' },
          { name: 'walk_ins', label: 'Walk-ins', type: 'number', placeholder: '0' },
        ],
      },
      {
        title: 'VIP Arrivals',
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
        fields: [
          { name: 'corporate_ota_count', label: 'Corporate / OTA bookings', type: 'number', placeholder: '0' },
        ],
      },
      {
        title: 'Guest Feedback',
        fields: [
          { name: 'guest_feedback', label: 'Guest feedback received', type: 'textarea', placeholder: 'Any comments, complaints or compliments from guests...' },
        ],
      },
      {
        title: 'Cancellations',
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
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
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
    stockConfig: { stockType: 'bar', stockField: 'bar_stock_count' },
    sections: [
      {
        title: 'Bar Stock Count (Monday)',
        mondayOnly: true,
        fields: [
          {
            name: 'bar_stock_count',
            label: 'Full bar stock count',
            type: 'repeater',
            min_rows: 1,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Tusker Lager, Bell Lager, Nile Special' },
              { name: 'quantity', label: 'Qty', type: 'number' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. bottles, crates' },
            ],
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
        fields: [
          {
            name: 'beverage_sales',
            label: 'Beverages sold today',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'beverage', label: 'Beverage name', type: 'text', placeholder: 'e.g. Tusker, Bell, Nile Special, Soda', autocomplete: { category: 'beverage' } },
              { name: 'quantity_sold', label: 'Qty sold', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'kitchen',
    name: 'Kitchen',
    hods: ['Sensio'],
    substitutes: ['Richard', 'Safari', 'David', 'Felly', 'Lawrence', 'Koffi'],
    stockConfig: { stockType: 'kitchen', stockField: 'kitchen_stock_count' },
    sections: [
      {
        title: 'Kitchen Stock Count (Monday)',
        mondayOnly: true,
        fields: [
          {
            name: 'kitchen_stock_count',
            label: 'Full kitchen stock count',
            type: 'repeater',
            min_rows: 1,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Rice 25kg, Cooking oil 5L, Chicken' },
              { name: 'quantity', label: 'Qty', type: 'number' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. kg, litres, pieces' },
              { name: 'cost_per_unit', label: 'Cost per unit (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Stock Added Today',
        fields: [
          {
            name: 'stock_added',
            label: 'Stock received today',
            type: 'repeater',
            min_rows: 0,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Tomatoes, Onions, Beef' },
              { name: 'quantity', label: 'Qty', type: 'number' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. kg, litres, pieces' },
              { name: 'cost_per_unit', label: 'Cost per unit (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Stock Used Today',
        fields: [
          {
            name: 'stock_used',
            label: 'Stock used during service',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Rice, Cooking oil, Chicken' },
              { name: 'quantity', label: 'Qty', type: 'number' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. kg, litres, pieces' },
              { name: 'cost_per_unit', label: 'Cost per unit (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Near-Expired Items',
        fields: [
          {
            name: 'near_expired_items',
            label: 'Items nearing expiry',
            type: 'repeater',
            min_rows: 0,
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
          { name: 'daily_food_cost', label: 'Total food cost today (UGX)', type: 'number', required: true, placeholder: '0' },
        ],
      },
      {
        title: 'On Duty',
        fields: [
          { name: 'breakfast_on_duty', label: 'Breakfast service', type: 'checkbox_group', options: ['Chef Sensio', 'Chef Richard', 'Chef Safari', 'Chef David', 'Chef Felly', 'Steward Lawrence', 'Steward Koffi', 'Someone else'] },
          { name: 'lunch_on_duty', label: 'Lunch service', type: 'checkbox_group', options: ['Chef Sensio', 'Chef Richard', 'Chef Safari', 'Chef David', 'Chef Felly', 'Steward Lawrence', 'Steward Koffi', 'Someone else'] },
          { name: 'dinner_on_duty', label: 'Dinner service', type: 'checkbox_group', options: ['Chef Sensio', 'Chef Richard', 'Chef Safari', 'Chef David', 'Chef Felly', 'Steward Lawrence', 'Steward Koffi', 'Someone else'] },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'housekeeping',
    name: 'Housekeeping',
    hods: ['Elly'],
    substitutes: ['Anita'],
    defaultsToYesterday: true,
    sections: [
      {
        title: 'Room Status',
        fields: [
          { name: 'rooms', label: 'Room status', type: 'room_grid', required: true },
        ],
      },
      {
        title: 'Laundry',
        fields: [
          { name: 'laundry_notes', label: 'Laundry report', type: 'textarea', placeholder: 'Damaged clothes, incomplete items, any issues...' },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'security',
    name: 'Security',
    hods: ['Salim'],
    substitutes: ['Elia'],
    sections: [
      {
        title: 'Gate Status',
        fields: [
          {
            name: 'gate_checks',
            label: 'Gate checks',
            type: 'repeater',
            min_rows: 1,
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
        fields: [
          {
            name: 'patrols',
            label: 'Patrol entries',
            type: 'repeater',
            min_rows: 0,
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
        title: 'Road Status',
        fields: [
          { name: 'road_status', label: 'Road status', type: 'textarea', placeholder: 'Condition of roads, any obstructions or incidents...' },
        ],
      },
      {
        title: 'Unregistered People',
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
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'store',
    name: 'Store',
    hods: ['Denis'],
    substitutes: ['Emilly'],
    stockConfig: { stockType: 'store', stockField: 'store_stock_count' },
    sections: [
      {
        title: 'Store Stock Count (Monday)',
        mondayOnly: true,
        fields: [
          {
            name: 'store_stock_count',
            label: 'Full store stock count',
            type: 'repeater',
            min_rows: 1,
            sub_fields: [
              { name: 'item', label: 'Item', type: 'text', placeholder: 'e.g. Rice 25kg, Cooking oil 5L, Sugar' },
              { name: 'quantity', label: 'Qty', type: 'number' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'e.g. bags, litres, kg' },
            ],
          },
        ],
      },
      {
        title: 'Goods Added to Store',
        fields: [
          {
            name: 'goods_added',
            label: 'Goods received into store',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'item', label: 'Item name', type: 'text', placeholder: 'e.g. Rice, Sugar, Cooking oil', autocomplete: { category: 'store_goods' } },
              { name: 'supplier', label: 'Supplier', type: 'text', placeholder: 'e.g. Nakumatt, Local market' },
              { name: 'quantity', label: 'Qty', type: 'number' },
              { name: 'price_per_unit', label: 'Price per unit (UGX)', type: 'number' },
            ],
          },
        ],
      },
      {
        title: 'Goods Taken from Store',
        fields: [
          {
            name: 'goods_taken',
            label: 'Goods issued from store',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'item', label: 'Item name', type: 'text', placeholder: 'e.g. Rice, Cooking oil', autocomplete: { category: 'store_goods' } },
              { name: 'quantity', label: 'Qty', type: 'number' },
              { name: 'taken_by', label: 'Taken by / Department', type: 'text', placeholder: 'e.g. Kitchen, Housekeeping' },
            ],
          },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'accounts',
    name: 'Accounts',
    hods: ['Musoni'],
    substitutes: ['Halima'],
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
          { name: 'daily_total_sales', label: 'Total sales today (UGX)', type: 'number', required: true, placeholder: '0' },
          { name: 'daily_total_expenses', label: 'Total expenses today (UGX)', type: 'number', required: true, placeholder: '0' },
          { name: 'running_debtors', label: 'Running debtors (UGX)', type: 'number', placeholder: '0' },
          { name: 'receivables', label: 'Receivables — money received from Chairman, CEO & Directors or other sources (UGX)', type: 'number', placeholder: '0' },
        ],
      },
      {
        title: 'Payments Made Today',
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
            ],
          },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'electrical',
    name: 'Electrical',
    hods: ['Robert'],
    substitutes: ['Sekito'],
    defaultsToYesterday: true,
    sections: [
      {
        title: 'Fence Patrol',
        fields: [
          { name: 'areas_patrolled', label: 'Areas patrolled', type: 'textarea', required: true, placeholder: 'List areas covered today...' },
          { name: 'damage_reports', label: 'Damage reports', type: 'textarea', placeholder: 'Any damage found, location and nature...' },
          { name: 'recent_repairs', label: 'Repairs completed', type: 'textarea', placeholder: 'Repairs done today...' },
          { name: 'cleanliness_report', label: 'Cleanliness report', type: 'textarea', placeholder: 'Vegetation, debris, fence line condition...' },
          { name: 'fence_power_outages', label: 'Fence line power outages', type: 'textarea', placeholder: 'Any power outages on the fence line, duration, affected sections...' },
        ],
      },
      {
        title: 'HQ Power & Generator',
        fields: [
          { name: 'hq_power_status', label: 'HQ power status', type: 'textarea', required: true, placeholder: 'Power status at HQ, any outages, duration...' },
          { name: 'generator_use', label: 'Generator use', type: 'textarea', placeholder: 'Generator runtime, fuel usage, any issues...' },
        ],
      },
      {
        title: 'Work Done Today',
        fields: [
          { name: 'work_done', label: 'Work completed', type: 'textarea', required: true, placeholder: 'Project, what was done, where...' },
        ],
      },
      {
        title: 'Work Planned for Tomorrow',
        fields: [
          { name: 'work_tomorrow', label: 'Planned work', type: 'textarea', required: true, placeholder: 'Project, what will be done, where...' },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'hq-maintenance',
    name: 'HQ Maintenance',
    hods: ['David'],
    substitutes: ['Francis'],
    sections: [
      {
        title: 'Work Done Today',
        fields: [
          {
            name: 'work_done',
            label: 'Work completed',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'project', label: 'Project', type: 'text' },
              { name: 'what_was_done', label: 'What was done', type: 'textarea' },
              { name: 'location', label: 'Where', type: 'text' },
              { name: 'materials_used', label: 'Materials used', type: 'text', autocomplete: { category: 'materials' } },
            ],
          },
        ],
      },
      {
        title: 'Work Planned for Tomorrow',
        fields: [
          { name: 'work_tomorrow', label: 'Planned work', type: 'textarea', required: true, placeholder: 'Project, what will be done, where...' },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'drivers-and-mechanics',
    name: 'Drivers & Mechanics',
    hods: ['Kanja', 'Roger'],
    sections: [
      {
        title: 'Vehicle Usage',
        fields: [
          {
            name: 'vehicle_usage',
            label: 'Vehicle usage today',
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
        fields: [
          {
            name: 'work_done',
            label: 'Repair and maintenance work',
            type: 'repeater',
            required: true,
            min_rows: 1,
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
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    hods: ['Richard'],
    substitutes: ['Jonah'],
    sections: [
      {
        title: 'Work Done Today',
        fields: [
          {
            name: 'work_done',
            label: 'Work completed',
            type: 'repeater',
            required: true,
            min_rows: 1,
            sub_fields: [
              { name: 'project', label: 'Project', type: 'text' },
              { name: 'what_was_done', label: 'What was done', type: 'textarea' },
              { name: 'location', label: 'Where', type: 'text' },
            ],
          },
        ],
      },
      {
        title: 'Work Planned for Tomorrow',
        fields: [
          { name: 'work_tomorrow', label: 'Planned work', type: 'textarea', required: true, placeholder: 'Project, what will be done, where...' },
        ],
      },
      {
        title: 'Notes',
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'it',
    name: 'IT',
    hods: ['Benson'],
    sections: [
      {
        title: 'Job Cards',
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
        fields: [
          { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'wildlife',
    name: 'Wildlife',
    hods: ['Martine'],
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
        fields: [
          { name: 'challenges_successes', label: 'General notes', type: 'textarea', placeholder: 'Any overall issues, highlights or observations from today...' },
        ],
      },
    ],
  },
  {
    slug: 'craft-shop',
    name: 'Craft Shop',
    hods: ['Halima'],
    substitutes: ['Patience'],
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
        fields: [
          { name: 'challenges_successes', label: 'Notes or comments', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
        ],
      },
    ],
  },
]

export const LEGACY_HOUSEKEEPING_CONFIG: DepartmentFormConfig = {
  slug: 'housekeeping',
  name: 'Housekeeping',
  hods: ['Elly'],
  substitutes: ['Anita'],
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
      fields: [
        { name: 'laundry_notes', label: 'Laundry report', type: 'textarea', placeholder: 'Damaged clothes, incomplete items, any issues...' },
      ],
    },
    {
      title: 'Notes',
      fields: [
        { name: 'challenges_successes', label: 'Challenges or successes to note', type: 'textarea', placeholder: 'Any issues, highlights or observations from today...' },
      ],
    },
  ],
}

export function getFormBySlug(slug: string): DepartmentFormConfig | undefined {
  return DEPARTMENT_FORMS.find((f) => f.slug === slug)
}
