import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { validateSession, logActivity } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase-server'
import { getHfClient } from '@/lib/hf'

const SESSION_COOKIE = 'hod_session'
const GUEST_COOKIE = 'hod_guest'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80)
}

async function analyseImage(
  imageBlob: Blob,
  hodDescription: string,
  category: string,
  categories: string[]
): Promise<{ filename_slug: string; ai_description: string; tags: string[] }> {
  const hf = getHfClient()

  const [captionResult, objectResult, classifyResult] = await Promise.allSettled([
    hf.imageToText({
      model: 'Salesforce/blip-image-captioning-large',
      data: imageBlob,
    }),
    hf.objectDetection({
      model: 'facebook/detr-resnet-50',
      data: imageBlob,
    }),
    hf.zeroShotClassification({
      model: 'facebook/bart-large-mnli',
      inputs: hodDescription,
      parameters: { candidate_labels: categories },
    }),
  ])

  const caption =
    captionResult.status === 'fulfilled'
      ? (captionResult.value as { generated_text?: string }).generated_text ?? ''
      : ''

  const detectedObjects: string[] = []
  if (objectResult.status === 'fulfilled' && Array.isArray(objectResult.value)) {
    for (const obj of objectResult.value as { label: string; score: number }[]) {
      if (obj.score > 0.7 && !detectedObjects.includes(obj.label)) {
        detectedObjects.push(obj.label)
      }
    }
  }

  let verifiedCategory = category
  if (classifyResult.status === 'fulfilled' && Array.isArray(classifyResult.value)) {
    const top = classifyResult.value[0] as { labels?: string[]; scores?: number[] } | undefined
    if (top?.labels?.[0] && top?.scores?.[0] && top.scores[0] > 0.5) {
      verifiedCategory = top.labels[0]
    }
  }

  // Build tags from detected objects + verified category
  const tags = [...new Set([...detectedObjects.slice(0, 5), verifiedCategory])]

  // Build filename slug from caption, falling back to HOD description
  const slugSource = caption || hodDescription
  const captionWords = slugSource.split(/\s+/).slice(0, 6).join(' ')
  const filename_slug = slugify(captionWords)

  return {
    filename_slug: filename_slug || slugify(hodDescription),
    ai_description: caption,
    tags,
  }
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

    const { data: dept } = await supabase
      .from('hod_departments')
      .select('name')
      .eq('id', departmentId)
      .single()

    const buffer = Buffer.from(await file.arrayBuffer())
    const imageBlob = new Blob([buffer], { type: file.type })

    // Resolve the category list for zero-shot verification from the form data
    const categoriesRaw = formData.get('categories') as string | null
    const categories = categoriesRaw
      ? categoriesRaw.split(',').map((c) => c.trim()).filter(Boolean)
      : [category]

    let aiResult: { filename_slug: string; ai_description: string; tags: string[] }
    try {
      aiResult = await analyseImage(imageBlob, hodDescription.trim(), category, categories)
    } catch {
      aiResult = {
        filename_slug: slugify(hodDescription.trim()),
        ai_description: '',
        tags: [],
      }
    }

    const dateStr = reportDate.replace(/-/g, '_')
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const generatedFilename = `${dateStr}_hod_daily_reports_${slugify(departmentSlug)}_${aiResult.filename_slug}.${ext}`
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
        ai_description: aiResult.ai_description || null,
        ai_tags: aiResult.tags.length > 0 ? aiResult.tags : null,
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
      ai_description: aiResult.ai_description,
      ai_tags: aiResult.tags,
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
