import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-admin-auth'
import { createServerClient } from '@/lib/supabase-server'
import { getHfClient } from '@/lib/hf'

async function processMedia(supabase: ReturnType<typeof createServerClient>, mediaId: string): Promise<{ success: boolean; error?: string }> {
  const { data: media } = await supabase
    .from('hod_report_media')
    .select('id, storage_path, hod_description, context_category, mime_type')
    .eq('id', mediaId)
    .single()

  if (!media) return { success: false, error: 'Media not found' }

  await supabase
    .from('hod_report_media')
    .update({ ai_status: 'processing', ai_error_message: null })
    .eq('id', mediaId)

  const { data: fileData } = await supabase.storage
    .from('hod-report-media')
    .download(media.storage_path)

  if (!fileData) {
    await supabase
      .from('hod_report_media')
      .update({ ai_status: 'failed', ai_error_message: 'Could not download image from storage' })
      .eq('id', mediaId)
    return { success: false, error: 'Download failed' }
  }

  const hf = getHfClient()
  if (!hf) {
    await supabase
      .from('hod_report_media')
      .update({ ai_status: 'skipped', ai_error_message: 'HF token not configured' })
      .eq('id', mediaId)
    return { success: false, error: 'HF not configured' }
  }

  try {
    const imageBlob = new Blob([fileData], { type: media.mime_type || 'image/jpeg' })

    const [captionResult, objectResult] = await Promise.allSettled([
      hf.imageToText({ model: 'Salesforce/blip-image-captioning-large', data: imageBlob }),
      hf.objectDetection({ model: 'facebook/detr-resnet-50', data: imageBlob }),
    ])

    const caption = captionResult.status === 'fulfilled'
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

    const tags = [...new Set([...detectedObjects.slice(0, 5), media.context_category ?? ''])]
    const aiDescription = caption || media.hod_description || ''

    await supabase
      .from('hod_report_media')
      .update({
        ai_description: aiDescription || null,
        ai_tags: tags.length > 0 ? tags : null,
        ai_status: 'complete',
        ai_error_message: null,
      })
      .eq('id', mediaId)

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await supabase
      .from('hod_report_media')
      .update({ ai_status: 'failed', ai_error_message: msg.slice(0, 500) })
      .eq('id', mediaId)
    return { success: false, error: msg }
  }
}

export const POST = withAdminAuth(async ({ request }) => {
  const body = await request.json()
  const { media_ids } = body as { media_ids?: string[] }

  const supabase = createServerClient()

  let ids = media_ids
  if (!ids || ids.length === 0) {
    const { data } = await supabase
      .from('hod_report_media')
      .select('id')
      .in('ai_status', ['failed', 'pending'])
      .limit(20)
    ids = (data ?? []).map(r => r.id)
  }

  if (ids.length === 0) {
    return NextResponse.json({ retried: 0, succeeded: 0, failed: 0 })
  }

  const results = await Promise.allSettled(
    ids.map(id => processMedia(supabase, id))
  )

  let succeeded = 0
  let failed = 0
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.success) succeeded++
    else failed++
  }

  return NextResponse.json({ retried: ids.length, succeeded, failed })
}, { capability: 'report_manage' })
