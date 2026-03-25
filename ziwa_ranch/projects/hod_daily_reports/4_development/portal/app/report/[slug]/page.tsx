import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getFormBySlug } from '@/config/forms'
import { Department } from '@/types'
import ReportForm from './ReportForm'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getDepartmentBySlug(slug: string): Promise<Department | null> {
  const { data, error } = await supabase
    .from('hod_departments')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params
  const [department, formConfig] = await Promise.all([
    getDepartmentBySlug(slug),
    Promise.resolve(getFormBySlug(slug)),
  ])

  if (!department || !formConfig) {
    notFound()
  }

  if (!department.is_active) {
    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">&larr; Back</Link>
          </div>
        </header>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500">This department&apos;s report form is coming soon.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-ziwa-600 hover:underline">Back to departments</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <span>&larr;</span> Departments
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Ziwa Rhino And Wildlife Ranch" width={28} height={28} className="rounded-full" />
            <span className="text-sm font-semibold text-gray-900">Daily Report</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{department.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in today&apos;s report and submit when complete.</p>
        </div>

        <ReportForm
          config={formConfig}
          departmentId={department.id}
          departmentSlug={slug}
        />
      </div>
    </main>
  )
}
