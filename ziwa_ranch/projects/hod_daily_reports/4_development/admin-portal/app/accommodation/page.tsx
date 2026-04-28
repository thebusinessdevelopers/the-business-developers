export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getAdminUser, hasAdminCapability } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import AccommodationClient from './AccommodationClient'

export default async function AccommodationPage() {
  const admin = await getAdminUser()
  if (!admin || !hasAdminCapability(admin, 'accommodation_manage')) redirect('/')

  const supabase = createServerClient()

  const [{ data: units }, { data: rates }] = await Promise.all([
    supabase.from('accommodation_units').select('*').order('sort_order'),
    supabase.from('accommodation_rates').select('*').order('rate_category'),
  ])

  return (
    <AccommodationClient
      adminId={admin.id}
      units={units ?? []}
      rates={rates ?? []}
    />
  )
}
