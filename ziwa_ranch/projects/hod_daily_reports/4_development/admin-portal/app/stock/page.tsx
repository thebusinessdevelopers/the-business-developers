export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import { getAdminUser, hasAdminCapability } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import StockFlags from './StockFlags'
import StockCard from './StockCard'

interface StockEntry {
  id: string
  department_id: string
  stock_type: string
  entry_date: string
  items: { item: string; quantity: number; unit: string }[]
  entered_by: string
  created_at: string
  status: string
  admin_notes: string | null
  hod_departments: { name: string; slug: string }
}

export default async function StockPage() {
  const admin = await getAdminUser()
  if (!admin || !hasAdminCapability(admin, 'stock_manage')) {
    redirect('/')
  }

  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order')

  const stockDeptSlugs = ['food-and-beverage', 'store', 'kitchen']
  const stockDeptIds = (departments ?? [])
    .filter((d) => stockDeptSlugs.includes(d.slug))
    .map((d) => d.id)

  const { data: stockEntries } = await supabase
    .from('hod_verified_stock')
    .select('id, department_id, stock_type, entry_date, items, entered_by, created_at, status, admin_notes, hod_departments(name, slug)')
    .in('department_id', stockDeptIds)
    .order('entry_date', { ascending: false })
    .limit(20)

  const entries = (stockEntries ?? []) as unknown as StockEntry[]

  const { data: stockFlags } = await supabase
    .from('hod_stock_flags')
    .select('id, flag_type, item_names, suggested_canonical, status, created_at, department_id, hod_departments(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const flags = (stockFlags ?? []).map((f) => {
    const dept = f.hod_departments as unknown as { name: string } | { name: string }[] | null
    return {
      id: f.id as string,
      flag_type: f.flag_type as string,
      item_names: f.item_names as string[],
      suggested_canonical: f.suggested_canonical as string | null,
      status: f.status as string,
      department_name: (Array.isArray(dept) ? dept[0]?.name : dept?.name) ?? 'Unknown',
      created_at: f.created_at as string,
    }
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Reconciliation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve Monday stock counts from F&B, Kitchen, and Store.
        </p>
      </div>

      <div className="mb-8">
        <StockFlags flags={flags} />
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No stock counts submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <StockCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
