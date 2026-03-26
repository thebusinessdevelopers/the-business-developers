import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getHfClient } from '@/lib/hf'

async function analyseImage(
  imageBlob: Blob,
  hodDescription: string,
  category: string
): Promise<{ ai_description: string; tags: string[] }> {
  const hf = getHfClient()
  if (!hf) return { ai_description: '', tags: [category] }

  const [captionResult, objectResult] = await Promise.allSettled([
    hf.imageToText({
      model: 'Salesforce/blip-image-captioning-large',
      data: imageBlob,
    }),
    hf.objectDetection({
      model: 'facebook/detr-resnet-50',
      data: imageBlob,
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

  const tags = [...new Set([...detectedObjects.slice(0, 5), category])]

  return {
    ai_description: caption || hodDescription,
    tags,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { media_id } = body as { media_id: string }
    if (!media_id) {
      return NextResponse.json({ error: 'media_id required' }, { status: 400 })
    }

    const supabase = createServerClient()

    const { data: media } = await supabase
      .from('hod_report_media')
      .select('id, storage_path, hod_description, context_category, mime_type')
      .eq('id', media_id)
      .single()

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    const { data: fileData } = await supabase.storage
      .from('hod-report-media')
      .download(media.storage_path)

    if (!fileData) {
      return NextResponse.json({ error: 'Could not download image' }, { status: 500 })
    }

    const imageBlob = new Blob([fileData], { type: media.mime_type || 'image/jpeg' })

    const result = await analyseImage(
      imageBlob,
      media.hod_description ?? '',
      media.context_category ?? ''
    )

    await supabase
      .from('hod_report_media')
      .update({
        ai_description: result.ai_description || null,
        ai_tags: result.tags.length > 0 ? result.tags : null,
      })
      .eq('id', media_id)

    return NextResponse.json({ processed: true, media_id })
  } catch (err) {
    console.error('Process media error (non-blocking):', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
