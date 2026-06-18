import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { Json } from '@/integrations/supabase/types'

type Updater<T> = T | ((prev: T) => T)

interface UseToolStateResult<T> {
  state: T
  setState: (updater: Updater<T>) => void
  loading: boolean
  saving: boolean
}

export function useToolState<T extends object>(
  toolId: string,
  projectId: string | null,
  defaultState: T
): UseToolStateResult<T> {
  const { profile } = useAuth()
  const [state, setLocalState] = useState<T>(defaultState)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstLoad = useRef(true)

  const orgId = profile?.organization_id ?? null

  // Load from Supabase when projectId changes
  useEffect(() => {
    if (!orgId || !projectId) {
      setLocalState(defaultState)
      isFirstLoad.current = true
      return
    }
    setLoading(true)
    isFirstLoad.current = true
    supabase
      .from('tool_data')
      .select('data')
      .eq('organization_id', orgId)
      .eq('project_id', projectId)
      .eq('tool_id', toolId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.data) {
          setLocalState(row.data as T)
        } else {
          setLocalState(defaultState)
        }
        setLoading(false)
        isFirstLoad.current = false
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, projectId, toolId])

  const saveToDb = useCallback(
    (value: T) => {
      if (!orgId || !projectId) return
      setSaving(true)
      supabase
        .from('tool_data')
        .upsert(
          { organization_id: orgId, project_id: projectId, tool_id: toolId, data: value as unknown as Json },
          { onConflict: 'organization_id,project_id,tool_id' }
        )
        .then(() => setSaving(false))
    },
    [orgId, projectId, toolId]
  )

  const setState = useCallback(
    (updater: Updater<T>) => {
      setLocalState(prev => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
        if (!isFirstLoad.current && projectId) {
          if (saveTimer.current) clearTimeout(saveTimer.current)
          saveTimer.current = setTimeout(() => saveToDb(next), 800)
        }
        return next
      })
    },
    [projectId, saveToDb]
  )

  return { state, setState, loading, saving }
}
