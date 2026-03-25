interface StockProjectionItem {
  item: string
  quantity: number
  unit: string
}

interface StockProjectionDisplayProps {
  items: StockProjectionItem[]
  stockType: 'bar' | 'store' | 'kitchen'
}

export default function StockProjectionDisplay({ items, stockType }: StockProjectionDisplayProps) {
  const title = stockType === 'bar' ? 'Projected Bar Stock'
    : stockType === 'kitchen' ? 'Projected Kitchen Stock'
    : 'Projected Store Stock'
  const description = stockType === 'bar'
    ? 'Based on Monday\'s stock count minus beverage sales this week.'
    : stockType === 'kitchen'
    ? 'Based on Monday\'s stock count plus stock added, minus stock used this week.'
    : 'Based on Monday\'s stock count plus goods added, minus goods taken this week.'

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
      <h2 className="text-base font-semibold text-blue-900 mb-1">{title}</h2>
      <p className="text-xs text-blue-600 mb-4">{description}</p>

      {items.length === 0 ? (
        <p className="text-sm text-blue-700">No stock data available yet. Submit a Monday stock count to begin.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-blue-200">
                <th className="pb-2 text-blue-800 font-medium">Item</th>
                <th className="pb-2 text-blue-800 font-medium text-right">Projected Qty</th>
                <th className="pb-2 text-blue-800 font-medium text-right">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 text-blue-900">{item.item}</td>
                  <td className={`py-2 text-right font-medium ${item.quantity < 0 ? 'text-red-600' : 'text-blue-900'}`}>
                    {item.quantity}
                  </td>
                  <td className="py-2 text-right text-blue-700">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-blue-500 mt-3 italic">
        This is a projection only — not a verified count. Negative values indicate sales exceeded recorded stock.
      </p>
    </div>
  )
}
