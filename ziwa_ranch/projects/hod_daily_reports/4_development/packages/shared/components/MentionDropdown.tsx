'use client'

import type { MentionData, MentionUserGroup } from '../types'

interface MentionDropdownProps {
  groups: MentionUserGroup[]
  query: string
  onSelect: (mention: MentionData) => void
  onClose: () => void
}

const SPECIAL_TARGETS: { label: string; mention: MentionData }[] = [
  { label: 'Everyone', mention: { type: 'group', group: 'everyone', display: 'Everyone' } },
  { label: 'Admins', mention: { type: 'group', group: 'admins', display: 'Admins' } },
]

function buildDisplay(user: MentionUserGroup['users'][number], group: MentionUserGroup): string {
  return `${user.hod_name} (${user.admin_title || group.label})`
}

export default function MentionDropdown({ groups, query, onSelect, onClose }: MentionDropdownProps) {
  const q = query.toLowerCase().trim()

  const specials = SPECIAL_TARGETS.filter(s => !q || s.label.toLowerCase().includes(q))

  const filteredGroups = groups
    .map(g => ({
      ...g,
      users: g.users.filter(
        u =>
          !q ||
          u.hod_name.toLowerCase().includes(q) ||
          (u.admin_title && u.admin_title.toLowerCase().includes(q)) ||
          g.label.toLowerCase().includes(q)
      ),
    }))
    .filter(g => g.users.length > 0)

  const departmentGroups = filteredGroups.filter(
    g => g.type === 'department' && g.department_id && (!q || g.label.toLowerCase().includes(q))
  )

  const hasResults = specials.length > 0 || filteredGroups.length > 0

  if (!hasResults) {
    return (
      <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
        <p className="text-xs text-gray-400">No matches</p>
      </div>
    )
  }

  return (
    <div
      className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
      onMouseDown={e => e.preventDefault()}
    >
      {specials.length > 0 && (
        <div className="px-2 pt-2 pb-1 border-b border-gray-100">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 mb-1">Broadcast</p>
          {specials.map(s => (
            <button
              key={s.label}
              type="button"
              onClick={() => onSelect(s.mention)}
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-ziwa-50 transition-colors"
            >
              <span className="font-medium text-ziwa-700">@{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {departmentGroups.length > 0 && (
        <div className="px-2 py-1 border-b border-gray-100">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 mb-1">Teams</p>
          {departmentGroups.map(g => (
            <button
              key={`dept-${g.department_id}`}
              type="button"
              onClick={() =>
                onSelect({
                  type: 'department',
                  department_id: g.department_id,
                  display: `${g.label} Team`,
                })
              }
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-ziwa-50 transition-colors"
            >
              <span className="font-medium text-ziwa-700">@{g.label} Team</span>
            </button>
          ))}
        </div>
      )}

      {filteredGroups.map(g => (
        <div key={g.label} className="px-2 py-1">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 mb-1">{g.label}</p>
          {g.users.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() =>
                onSelect({ type: 'user', user_id: u.id, display: buildDisplay(u, g) })
              }
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-ziwa-50 transition-colors flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-medium shrink-0">
                {u.hod_name[0]}
              </span>
              <span className="min-w-0">
                <span className="font-medium text-gray-800">{u.hod_name}</span>
                {u.admin_title && (
                  <span className="text-gray-400 text-xs ml-1">· {u.admin_title}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
