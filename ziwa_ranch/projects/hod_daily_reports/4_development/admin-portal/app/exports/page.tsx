export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getAdminUser, hasAdminCapability } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import ExportsPanel from './ExportsPanel'

export default async function ExportsPage() {
  const admin = await getAdminUser()
  if (!admin || !hasAdminCapability(admin, 'exports')) {
    redirect('/')
  }

  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Exports</h1>
      <p className="text-sm text-gray-500 mb-6">
        Generate and download reports for sharing. Copy to clipboard for WhatsApp or email.
      </p>
      <ExportsPanel departments={departments ?? []} />
    </div>
  )
}
