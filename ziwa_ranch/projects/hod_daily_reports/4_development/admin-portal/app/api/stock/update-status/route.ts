import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const POST = withAdminAuth(async ({ admin, request }) => {
  const { entryId, status, notes } = await request.json() as {
    entryId: string
    status: string
    notes?: string
  }

  if (!entryId || !['approved', 'flagged', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Valid entryId and status required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const updateData: Record<string, unknown> = { status }
  if (notes?.trim()) updateData.admin_notes = notes.trim()

  const { error } = await supabase
    .from('hod_verified_stock')
    .update(updateData)
    .eq('id', entryId)

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  await logAdminActivity(admin.id, 'stock_status_updated', {
    entry_id: entryId,
    new_status: status,
    has_notes: Boolean(notes?.trim()),
  })

  return NextResponse.json({ ok: true, status })
}, { capability: 'stock_manage' })
