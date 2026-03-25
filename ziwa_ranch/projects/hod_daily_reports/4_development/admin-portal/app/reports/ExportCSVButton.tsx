'use client'

interface CSVRow {
  date: string
  department: string
  submitted_by: string
  time: string
  status: string
  reviewed: string
}

interface ExportCSVButtonProps {
  data: CSVRow[]
}

export default function ExportCSVButton({ data }: ExportCSVButtonProps) {
  function handleExport() {
    if (data.length === 0) return

    const headers = ['Date', 'Department', 'Submitted By', 'Time', 'Status', 'Reviewed']
    const rows = data.map((r) => [r.date, r.department, r.submitted_by, r.time, r.status, r.reviewed])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hod-reports-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="text-xs text-gray-600 hover:text-gray-900 font-medium border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
    >
      Export CSV
    </button>
  )
}
