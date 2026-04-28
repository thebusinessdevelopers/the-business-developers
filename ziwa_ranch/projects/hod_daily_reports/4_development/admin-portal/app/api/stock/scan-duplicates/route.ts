import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { findDuplicateGroups, toTitleCase } from '@hod/shared/lib/fuzzy-search'

export const POST = withAdminAuth(async ({ admin }) => {
  const supabase = createServerClient()

  const [{ data: departments }, { data: allItems }, { data: openFlags }] = await Promise.all([
    supabase.from('hod_departments').select('id, name').eq('is_active', true),
    supabase.from('hod_item_library').select('item_name, department_id'),
    supabase.from('hod_stock_flags').select('department_id, item_names').eq('flag_type', 'duplicate').eq('status', 'open'),
  ])

  if (!departments || departments.length === 0 || !allItems) {
    return NextResponse.json({ flagsCreated: 0 })
  }

  const itemsByDept = new Map<string, string[]>()
  for (const item of allItems) {
    const deptId = item.department_id as string
    if (!itemsByDept.has(deptId)) itemsByDept.set(deptId, [])
    itemsByDept.get(deptId)!.push(item.item_name)
  }

  const existingFlagKeys = new Set(
    (openFlags ?? []).map((f) => {
      const names = (f.item_names as string[]).slice().sort().join('|')
      return `${f.department_id}::${names}`
    })
  )

  let flagsCreated = 0
  const inserts: { department_id: string; flag_type: string; item_names: string[]; suggested_canonical: string }[] = []

  for (const dept of departments) {
    const names = itemsByDept.get(dept.id)
    if (!names || names.length < 2) continue

    const groups = findDuplicateGroups(names, 0.85)

    for (const group of groups) {
      const key = `${dept.id}::${group.slice().sort().join('|')}`
      if (existingFlagKeys.has(key)) continue

      const canonical = toTitleCase(group.sort((a, b) => b.length - a.length)[0])
      inserts.push({
        department_id: dept.id,
        flag_type: 'duplicate',
        item_names: group,
        suggested_canonical: canonical,
      })
    }
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('hod_stock_flags').insert(inserts)
    if (!error) flagsCreated = inserts.length
  }

  await logAdminActivity(admin.id, 'stock_duplicate_scan', {
    flags_created: flagsCreated,
    admin_title: admin.admin_title,
  }).catch(() => {})

  return NextResponse.json({ flagsCreated })
}, { capability: 'stock_manage' })
