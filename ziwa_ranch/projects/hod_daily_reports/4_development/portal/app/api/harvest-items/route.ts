import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { isInternalRequest } from '@hod/shared/lib/internal-route-auth'
import { harvestItemsFromReportId } from '@hod/shared/lib/harvest-items'

export async function POST(request: NextRequest) {
  if (!isInternalRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const reportId = body.reportId as string
    if (!reportId) {
      return NextResponse.json({ error: 'reportId required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const result = await harvestItemsFromReportId(supabase, reportId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Harvest items failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
