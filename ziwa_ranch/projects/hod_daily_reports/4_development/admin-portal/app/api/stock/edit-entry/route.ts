import { NextResponse } from 'next/server'
import { withAdminAuth, logAdminActivity } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { correctItemName, normaliseUnit } from '@hod/shared/config/stock'
import { toTitleCase } from '@hod/shared/lib/fuzzy-search'

interface StockItem {
  item: string
  quantity: number
  unit: string
}

export const POST = withAdminAuth(async ({ admin, request }) => {
  const { entryId, items: rawItems } = await request.json() as { entryId: string; items: StockItem[] }

  if (!entryId || !Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: 'entryId and items array required' }, { status: 400 })
  }

  for (const item of rawItems) {
    if (!item.item || typeof item.quantity !== 'number' || !item.unit) {
      return NextResponse.json({ error: 'Each item must have item, quantity, and unit' }, { status: 400 })
    }
  }

  const items = rawItems.map((i) => ({
    ...i,
    item: toTitleCase(correctItemName(i.item)),
    unit: normaliseUnit(i.unit),
  }))

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from('hod_verified_stock')
    .select('id, items')
    .eq('id', entryId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Stock entry not found' }, { status: 404 })
  }

  const oldItems = existing.items as StockItem[]

  const { error } = await supabase
    .from('hod_verified_stock')
    .update({ items })
    .eq('id', entryId)

  if (error) {
    return NextResponse.json({ error: 'Failed to update stock entry' }, { status: 500 })
  }

  await logAdminActivity(admin.id, 'stock_entry_edited', {
    entry_id: entryId,
    old_items: oldItems,
    new_items: items,
    admin_title: admin.admin_title,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}, { capability: 'stock_manage' })
