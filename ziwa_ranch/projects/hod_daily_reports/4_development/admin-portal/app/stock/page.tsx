export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase-server'
import StockActions from './StockActions'

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

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    timeZone: 'Africa/Kampala',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function StockPage() {
  const supabase = createServerClient()

  const { data: departments } = await supabase
    .from('hod_departments')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order')

  const stockDeptSlugs = ['food-and-beverage', 'store']
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Reconciliation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve Monday stock counts from F&B and Store.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No stock counts submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{entry.hod_departments.name}</h2>
                  <p className="text-sm text-gray-500">
                    {formatDate(entry.entry_date)} — {entry.stock_type} stock — by {entry.entered_by}
                  </p>
                </div>
                <div>
                  {entry.status === 'pending' && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">Pending review</span>
                  )}
                  {entry.status === 'approved' && (
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">Approved</span>
                  )}
                  {entry.status === 'flagged' && (
                    <span className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">Flagged</span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="pb-2 text-gray-600 font-medium">Item</th>
                      <th className="pb-2 text-gray-600 font-medium text-right">Qty</th>
                      <th className="pb-2 text-gray-600 font-medium text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entry.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-gray-900">{item.item}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{item.quantity}</td>
                        <td className="py-2 text-right text-gray-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {entry.admin_notes && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 mb-4">
                  <span className="font-medium">Admin note:</span> {entry.admin_notes}
                </p>
              )}

              <StockActions entryId={entry.id} currentStatus={entry.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
