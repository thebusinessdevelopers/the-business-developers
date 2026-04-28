import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAdminAuth(async ({ admin, request }) => {
  const { flagId, action, notes } = await request.json()

  if (!flagId || !action || !['resolved', 'ignored', 'escalated'].includes(action)) {
    return NextResponse.json({ error: 'flagId and valid action required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('hod_stock_flags')
    .update({
      status: action,
      resolved_by_user_id: admin.id,
      resolution_action: action,
      resolution_notes: notes || null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', flagId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}, { capability: 'stock_manage' })
