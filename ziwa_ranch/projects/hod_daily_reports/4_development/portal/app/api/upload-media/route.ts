import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, logActivity } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'

const SESSION_COOKIE = 'hod_session'
const GUEST_COOKIE = 'hod_guest'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80)
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value
    const guestRaw = cookieStore.get(GUEST_COOKIE)?.value

    let userId: string | null = null

    if (sessionToken) {
      const user = await validateSession(sessionToken)
      if (!user) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      userId = user.id
    } else if (guestRaw) {
      try {
        JSON.parse(guestRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid guest cookie' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const hodDescription = formData.get('description') as string | null
    const category = formData.get('category') as string | null
    const departmentSlug = formData.get('department_slug') as string | null
    const departmentId = formData.get('department_id') as string | null
    const reportDate = formData.get('report_date') as string | null

    if (!file || !hodDescription?.trim() || !category || !departmentSlug || !departmentId || !reportDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const supabase = createServerClient()
    const buffer = Buffer.from(await file.arrayBuffer())

    const dateStr = reportDate.replace(/-/g, '_')
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const descriptionSlug = slugify(hodDescription.trim())
    const generatedFilename = `${dateStr}_hod_daily_reports_${slugify(departmentSlug)}_${descriptionSlug}.${ext}`
    const monthFolder = reportDate.slice(0, 7).replace('-', '_')
    const storagePath = `${departmentSlug}/${monthFolder}/${generatedFilename}`

    const { error: uploadError } = await supabase.storage
      .from('hod-report-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    const { data: mediaRow, error: dbError } = await supabase
      .from('hod_report_media')
      .insert({
        department_id: departmentId,
        storage_path: storagePath,
        original_filename: file.name,
        generated_filename: generatedFilename,
        hod_description: hodDescription.trim(),
        ai_description: null,
        ai_tags: null,
        context_category: category,
        report_date: reportDate,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_by_user_id: userId,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Media DB insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 })
    }

    const { data: signedUrlData } = await supabase.storage
      .from('hod-report-media')
      .createSignedUrl(storagePath, 3600)

    logActivity(userId, 'photo_uploaded', {
      media_id: mediaRow?.id,
      department_id: departmentId,
      report_date: reportDate,
      filename: generatedFilename,
      category,
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch(() => {})

    return NextResponse.json({
      id: mediaRow?.id,
      generated_filename: generatedFilename,
      ai_description: null,
      ai_tags: [],
      thumbnail_url: signedUrlData?.signedUrl ?? null,
      storage_path: storagePath,
    })
  } catch (err: unknown) {
    const errObj = err as { message?: string } | null
    console.error('Upload media error:', errObj)
    return NextResponse.json(
      { error: 'Something went wrong during upload.' },
      { status: 500 }
    )
  }
}
