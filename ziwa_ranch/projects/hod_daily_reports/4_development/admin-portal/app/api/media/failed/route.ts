import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export const GET = withAdminAuth(async () => {
  const supabase = createServerClient()

  const { data: failed, error } = await supabase
    .from('hod_report_media')
    .select(`
      id, storage_path, generated_filename, hod_description, context_category,
      ai_status, ai_error_message, report_date, created_at,
      department:hod_departments!department_id(name)
    `)
    .in('ai_status', ['failed', 'pending'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed media fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  const items = (failed ?? []).map(row => {
    const dept = row.department as unknown as { name: string } | null
    return { ...row, department_name: dept?.name ?? 'Unknown' }
  })

  return NextResponse.json({
    items,
    total: items.length,
  })
}, { capability: 'errors_view' })
