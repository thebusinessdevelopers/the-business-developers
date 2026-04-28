import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { isDriveConfigured, uploadToDriveFromUrl } from '@hod/shared/lib/google-drive'

const BATCH_SIZE = 10

export const GET = withAdminAuth(async ({ admin }) => {
  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: 'Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_FOLDER_ID.' },
      { status: 503 }
    )
  }

  const supabase = createServerClient()

  const { data: unsynced, error } = await supabase
    .from('hod_report_media')
    .select('id, storage_path, generated_filename, mime_type')
    .is('google_drive_file_id', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    console.error('Sync sweep query error:', error)
    return NextResponse.json({ error: 'Failed to query unsynced media' }, { status: 500 })
  }

  if (!unsynced || unsynced.length === 0) {
    return NextResponse.json({ synced: 0, message: 'All media already synced' })
  }

  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (const item of unsynced) {
    try {
      const pathParts = item.storage_path.split('/')
      const departmentSlug = pathParts[0]
      const monthFolder = pathParts[1]

      const { data: urlData } = await supabase.storage
        .from('hod-report-media')
        .createSignedUrl(item.storage_path, 600)

      if (!urlData?.signedUrl) {
        errors.push(`${item.id}: could not generate signed URL`)
        failed++
        continue
      }

      const result = await uploadToDriveFromUrl(
        urlData.signedUrl,
        item.generated_filename,
        item.mime_type,
        departmentSlug,
        monthFolder
      )

      await supabase
        .from('hod_report_media')
        .update({
          google_drive_file_id: result.fileId,
          google_drive_url: result.webViewLink,
          google_drive_synced_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      synced++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`${item.id}: ${msg}`)
      failed++
    }
  }

  console.log(`Drive sync sweep by ${admin.hod_name}: ${synced} synced, ${failed} failed`)

  return NextResponse.json({
    synced,
    failed,
    remaining: Math.max(0, (unsynced.length === BATCH_SIZE ? BATCH_SIZE : 0)),
    errors: errors.length > 0 ? errors : undefined,
  })
}, { capability: 'report_manage' })
