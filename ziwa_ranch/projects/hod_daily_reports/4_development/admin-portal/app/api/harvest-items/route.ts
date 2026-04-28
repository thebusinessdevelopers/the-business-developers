import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { harvestItemsFromReportId } from '@hod/shared/lib/harvest-items'

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth('report_manage')
    if (authError) return authError

    const body = await request.json()
    const reportId = body.reportId as string
    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const result = await harvestItemsFromReportId(supabase, reportId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Admin harvest items failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
