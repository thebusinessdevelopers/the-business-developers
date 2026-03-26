'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { saveDraftLocal, loadDraftLocal, clearDraftLocal } from '@/lib/local-storage'

export interface DraftData {
  values: Record<string, unknown>
  nameSelection: string
  customName: string
  submittedBy: string
}

interface UseDraftManagerOptions {
  departmentId: string
  reportDate: string
  active: boolean
  defaultDraftBy: string
}

export function useDraftManager({
  departmentId,
  reportDate,
  active,
  defaultDraftBy,
}: UseDraftManagerOptions) {
  const [draftData, setDraftData] = useState<DraftData | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false

    async function load() {
      const local = loadDraftLocal(departmentId, reportDate)

      let supabaseDraft: DraftData | null = null
      let supabaseUpdatedAt: string | null = null

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('hod_drafts')
          .select('draft_data, updated_at')
          .eq('department_id', departmentId)
          .eq('report_date', reportDate)
          .maybeSingle()
        if (data) {
          supabaseDraft = data.draft_data as DraftData
          supabaseUpdatedAt = data.updated_at as string
        }
      } catch { /* Supabase unreachable — use local */ }

      if (cancelled) return

      let chosen: DraftData | null = null

      if (supabaseDraft && local) {
        chosen = supabaseUpdatedAt && supabaseUpdatedAt > local.updatedAt
          ? supabaseDraft
          : local.data
      } else {
        chosen = supabaseDraft ?? local?.data ?? null
      }

      if (!chosen) return
      setDraftData(chosen)
      setDraftLoaded(true)
      setTimeout(() => setDraftLoaded(false), 3000)
    }

    load()
    return () => { cancelled = true }
  }, [departmentId, reportDate, active])

  const saveDraft = useCallback(async (data: DraftData) => {
    saveDraftLocal(departmentId, reportDate, data)

    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('hod_drafts').upsert({
        department_id: departmentId,
        draft_by: data.submittedBy || defaultDraftBy,
        report_date: reportDate,
        draft_data: data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'department_id,report_date,draft_by' })
    } catch { /* Supabase unreachable — localStorage has it */ }

    setDraftStatus('saved')
    if (statusTimer.current) clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(() => setDraftStatus('idle'), 3000)
  }, [departmentId, reportDate, defaultDraftBy])

  const scheduleSave = useCallback((data: DraftData) => {
    if (!active) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(data), 30_000)
  }, [active, saveDraft])

  const clearDraft = useCallback(async () => {
    clearDraftLocal(departmentId, reportDate)

    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('hod_drafts')
        .delete()
        .eq('department_id', departmentId)
        .eq('report_date', reportDate)
    } catch { /* ignore */ }
  }, [departmentId, reportDate])

  // Sync localStorage drafts to Supabase when connectivity returns
  useEffect(() => {
    if (!active) return

    const syncToSupabase = async () => {
      const local = loadDraftLocal(departmentId, reportDate)
      if (!local) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: remote } = await supabase
          .from('hod_drafts')
          .select('updated_at')
          .eq('department_id', departmentId)
          .eq('report_date', reportDate)
          .maybeSingle()

        const remoteTime = remote?.updated_at as string | undefined
        if (!remoteTime || local.updatedAt > remoteTime) {
          await supabase.from('hod_drafts').upsert({
            department_id: departmentId,
            draft_by: local.data.submittedBy || defaultDraftBy,
            report_date: reportDate,
            draft_data: local.data,
            updated_at: local.updatedAt,
          }, { onConflict: 'department_id,report_date,draft_by' })
        }
      } catch { /* still offline or error — will try again next reconnect */ }
    }

    window.addEventListener('online', syncToSupabase)
    return () => window.removeEventListener('online', syncToSupabase)
  }, [active, departmentId, reportDate, defaultDraftBy])

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      if (statusTimer.current) clearTimeout(statusTimer.current)
    }
  }, [])

  return { draftData, draftLoaded, draftStatus, saveDraft, scheduleSave, clearDraft }
}
