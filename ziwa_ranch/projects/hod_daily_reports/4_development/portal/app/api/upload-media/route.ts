import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/auth'
import { withAuth } from '@/lib/with-auth'
import { createServerClient } from '@/lib/supabase-server'
import { isDriveConfigured, uploadToDrive } from '@hod/shared/lib/google-drive'
import { createErrorNotification } from '@hod/shared/lib/error-notifications'
import sharp from 'sharp'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const THUMB_WIDTH = 300
const THUMB_QUALITY = 60
const MEDIUM_WIDTH = 800
const MEDIUM_QUALITY = 75

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80)
}

export const POST = withAuth(async ({ user, userId, guest, request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const hodDescription = formData.get('description') as string | null
    const category = formData.get('category') as string | null
    const departmentSlug = formData.get('department_slug') as string | null
    const departmentId = formData.get('department_id') as string | null
    const reportDate = formData.get('report_date') as string | null
    const entryKey = formData.get('entry_key') as string | null

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
    const { data: department } = await supabase
      .from('hod_departments')
      .select('id, slug')
      .eq('id', departmentId)
      .single()

    if (!department || department.slug !== departmentSlug) {
      return NextResponse.json({ error: 'Invalid department context' }, { status: 400 })
    }

    if (user) {
      if (user.role !== 'hod' || user.department_id !== departmentId || user.department_slug !== departmentSlug) {
        return NextResponse.json({ error: 'You are not allowed to upload for this department' }, { status: 403 })
      }
    } else if (guest) {
      if (guest.slug !== departmentSlug) {
        return NextResponse.json({ error: 'You are not allowed to upload for this department' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

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
      if (userId) {
        createErrorNotification(supabase, {
          recipientUserId: userId,
          type: 'media_upload_failed',
          bodyPreview: 'Your photo could not be uploaded. Please try again.',
          batchKey: `error:media:${departmentId}:${reportDate}`,
        }).catch(() => {})
      }
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    let thumbnailPath: string | null = null
    try {
      const thumbBuffer = await sharp(buffer)
        .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY })
        .toBuffer()
      thumbnailPath = `${storagePath}_thumb.jpg`
      const { error: thumbErr } = await supabase.storage
        .from('hod-report-media')
        .upload(thumbnailPath, thumbBuffer, { contentType: 'image/jpeg', upsert: false })
      if (thumbErr) {
        console.error('Thumbnail upload error:', thumbErr)
        thumbnailPath = null
      }
    } catch (thumbErr) {
      console.error('Thumbnail generation error:', thumbErr)
    }

    let mediumPath: string | null = null
    try {
      const mediumBuffer = await sharp(buffer)
        .resize(MEDIUM_WIDTH, undefined, { withoutEnlargement: true })
        .jpeg({ quality: MEDIUM_QUALITY })
        .toBuffer()
      mediumPath = `${storagePath}_medium.jpg`
      const { error: medErr } = await supabase.storage
        .from('hod-report-media')
        .upload(mediumPath, mediumBuffer, { contentType: 'image/jpeg', upsert: false })
      if (medErr) {
        console.error('Medium variant upload error:', medErr)
        mediumPath = null
      }
    } catch (medErr) {
      console.error('Medium variant generation error:', medErr)
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
        thumbnail_path: thumbnailPath,
        medium_path: mediumPath,
        entry_key: entryKey || null,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Media DB insert error:', dbError)
      await supabase.storage.from('hod-report-media').remove(
        [storagePath, thumbnailPath, mediumPath].filter(Boolean) as string[]
      ).catch(() => {})
      if (userId) {
        createErrorNotification(supabase, {
          recipientUserId: userId,
          type: 'media_upload_failed',
          bodyPreview: 'Your photo could not be saved. Please try again.',
          batchKey: `error:media:${departmentId}:${reportDate}`,
        }).catch(() => {})
      }
      return NextResponse.json({ error: 'Failed to save media record' }, { status: 500 })
    }

    const urlToSign = thumbnailPath ?? storagePath
    const { data: signedUrlData } = await supabase.storage
      .from('hod-report-media')
      .createSignedUrl(urlToSign, 3600)

    logActivity(userId, 'photo_uploaded', {
      media_id: mediaRow?.id,
      department_id: departmentId,
      report_date: reportDate,
      filename: generatedFilename,
      category,
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    }).catch(() => {})

    if (isDriveConfigured() && mediaRow?.id) {
      syncToDriveBackground(
        supabase, mediaRow.id, buffer, generatedFilename, file.type, departmentSlug, monthFolder
      )
    }

    return NextResponse.json({
      id: mediaRow?.id,
      generated_filename: generatedFilename,
      ai_description: null,
      ai_tags: [],
      thumbnail_url: signedUrlData?.signedUrl ?? null,
      storage_path: storagePath,
      entry_key: entryKey || null,
    })
}, { allowGuest: true })

function syncToDriveBackground(
  supabase: ReturnType<typeof createServerClient>,
  mediaId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  departmentSlug: string,
  monthFolder: string
) {
  uploadToDrive(fileBuffer, filename, mimeType, departmentSlug, monthFolder)
    .then(async (result) => {
      await supabase
        .from('hod_report_media')
        .update({
          google_drive_file_id: result.fileId,
          google_drive_url: result.webViewLink,
          google_drive_synced_at: new Date().toISOString(),
        })
        .eq('id', mediaId)
    })
    .catch((err) => {
      console.error('Google Drive sync failed for media', mediaId, err)
    })
}
