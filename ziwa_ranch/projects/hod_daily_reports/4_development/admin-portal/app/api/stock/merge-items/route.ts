import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAdminAuth(async ({ admin, request }) => {
  const { flagId, canonicalName, duplicateNames } = await request.json()

  if (!flagId || !canonicalName || !Array.isArray(duplicateNames) || duplicateNames.length === 0) {
    return NextResponse.json({ error: 'flagId, canonicalName, and duplicateNames required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: flag } = await supabase
    .from('hod_stock_flags')
    .select('*')
    .eq('id', flagId)
    .single()

  if (!flag) {
    return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
  }

  const oldNames = duplicateNames.filter((n: string) => n !== canonicalName)

  for (const oldName of oldNames) {
    await supabase
      .from('hod_item_library')
      .delete()
      .eq('department_id', flag.department_id)
      .eq('item_name', oldName)
  }

  await supabase
    .from('hod_item_library')
    .update({ item_name: canonicalName })
    .eq('department_id', flag.department_id)
    .in('item_name', duplicateNames)

  await supabase
    .from('hod_stock_flags')
    .update({
      status: 'resolved',
      resolved_by_user_id: admin.id,
      resolution_action: 'merge',
      resolution_notes: `Merged ${duplicateNames.join(', ')} → ${canonicalName}`,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', flagId)

  await logAdminActivity(admin.id, 'stock_items_merged', {
    flag_id: flagId,
    canonical: canonicalName,
    merged: oldNames,
    admin_title: admin.admin_title,
  }).catch(() => {})

  return NextResponse.json({ ok: true, merged: oldNames.length })
}, { capability: 'stock_manage' })
