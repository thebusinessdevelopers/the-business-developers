'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { saveDraftLocal, loadDraftLocal, clearDraftLocal } from '@/lib/local-storage'

export interface DraftData {
  values: Record<string, unknown>
  nameSelection: string
  customName: string
  submittedBy: string
}

interface RemoteDraftRow {
  draft_data: DraftData
  updated_at: string
}

interface UseDraftManagerOptions {
  departmentId: string
  reportDate: string
  active: boolean
  defaultDraftBy: string
  draftScope?: string
}

function hashDraft(data: DraftData): string {
  return JSON.stringify(data)
}

function chooseRemoteDraft(
  rows: RemoteDraftRow[] | null,
  localDraft: DraftData | null,
  defaultDraftBy: string
): RemoteDraftRow | null {
  if (!rows || rows.length === 0) return null

  const preferredSubmittedBy = localDraft?.submittedBy?.trim() || defaultDraftBy
  return rows.find((row) => {
    const submittedBy = row.draft_data?.submittedBy?.trim() || defaultDraftBy
    return submittedBy === preferredSubmittedBy
  }) ?? rows[0]
}

export function useDraftManager({
  departmentId,
  reportDate,
  active,
  defaultDraftBy,
  draftScope,
}: UseDraftManagerOptions) {
  const [draftData, setDraftData] = useState<DraftData | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved'>('idle')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedHash = useRef<string>('')

  useEffect(() => {
    if (!active) return
    let cancelled = false

    async function load() {
      const local = loadDraftLocal(departmentId, reportDate, draftScope)

      let supabaseDraft: DraftData | null = null
      let supabaseUpdatedAt: string | null = null

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = await supabase
          .from('hod_drafts')
          .select('draft_data, updated_at')
          .eq('department_id', departmentId)
          .eq('report_date', reportDate)
          .order('updated_at', { ascending: false })
        const preferredRemote = chooseRemoteDraft(
          (data ?? null) as RemoteDraftRow[] | null,
          local?.data ?? null,
          defaultDraftBy
        )
        if (preferredRemote) {
          supabaseDraft = preferredRemote.draft_data
          supabaseUpdatedAt = preferredRemote.updated_at
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
  }, [departmentId, reportDate, active, defaultDraftBy, draftScope])

  const saveDraft = useCallback(async (data: DraftData) => {
    saveDraftLocal(departmentId, reportDate, data, draftScope)

    const currentHash = hashDraft(data)
    if (currentHash !== lastSavedHash.current) {
      try {
        const { supabase } = await import('@/lib/supabase')
        await supabase.from('hod_drafts').upsert({
          department_id: departmentId,
          draft_by: data.submittedBy || defaultDraftBy,
          report_date: reportDate,
          draft_data: data,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'department_id,report_date,draft_by' })
        lastSavedHash.current = currentHash
      } catch { /* Supabase unreachable — localStorage has it */ }
    }

    setDraftStatus('saved')
    if (statusTimer.current) clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(() => setDraftStatus('idle'), 3000)
  }, [departmentId, reportDate, defaultDraftBy, draftScope])

  const scheduleSave = useCallback((data: DraftData) => {
    if (!active) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveDraft(data), 30_000)
  }, [active, saveDraft])

  const clearDraft = useCallback(async (draftBy?: string) => {
    clearDraftLocal(departmentId, reportDate, draftScope)
    const resolvedDraftBy = draftBy?.trim() || defaultDraftBy

    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('hod_drafts')
        .delete()
        .eq('department_id', departmentId)
        .eq('report_date', reportDate)
        .eq('draft_by', resolvedDraftBy)
    } catch { /* ignore */ }
  }, [defaultDraftBy, departmentId, reportDate, draftScope])

  // Sync localStorage drafts to Supabase when connectivity returns
  useEffect(() => {
    if (!active) return

    const syncToSupabase = async () => {
      const local = loadDraftLocal(departmentId, reportDate, draftScope)
      if (!local) return

      try {
        const { supabase } = await import('@/lib/supabase')
        const draftBy = local.data.submittedBy || defaultDraftBy
        const { data: remote } = await supabase
          .from('hod_drafts')
          .select('updated_at')
          .eq('department_id', departmentId)
          .eq('report_date', reportDate)
          .eq('draft_by', draftBy)
          .maybeSingle()

        const remoteTime = remote?.updated_at as string | undefined
        if (!remoteTime || local.updatedAt > remoteTime) {
          await supabase.from('hod_drafts').upsert({
            department_id: departmentId,
            draft_by: draftBy,
            report_date: reportDate,
            draft_data: local.data,
            updated_at: local.updatedAt,
          }, { onConflict: 'department_id,report_date,draft_by' })
        }
      } catch { /* still offline or error — will try again next reconnect */ }
    }

    window.addEventListener('online', syncToSupabase)
    return () => window.removeEventListener('online', syncToSupabase)
  }, [active, departmentId, reportDate, defaultDraftBy, draftScope])

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      if (statusTimer.current) clearTimeout(statusTimer.current)
    }
  }, [])

  return { draftData, draftLoaded, draftStatus, saveDraft, scheduleSave, clearDraft }
}
