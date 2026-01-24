/**
 * useAutoBackup - Google Docs-like auto-backup hook for TipTap editors
 * 
 * This implements a backup strategy that mimics Google Docs:
 * 
 * 1. DEBOUNCED SAVE (Real-time feel):
 *    - Saves 2 seconds after the user stops typing
 *    - Only saves if content has actually changed
 *    - This gives users the "auto-saved" feeling
 * 
 * 2. PERIODIC SNAPSHOTS (Version history):
 *    - Creates a backup every 5 minutes of active editing
 *    - Only creates if there are actual changes
 *    - Labeled with timestamp for easy identification
 * 
 * 3. IDLE SNAPSHOTS:
 *    - After 30 seconds of inactivity following edits, creates a snapshot
 *    - Ensures work is backed up when user takes a break
 * 
 * 4. PAGE LIFECYCLE EVENTS:
 *    - Saves on page visibility change (user switches tabs)
 *    - Saves on beforeunload (user closes page)
 *    - Saves on blur (window loses focus)
 * 
 * This approach balances storage efficiency (localStorage limits) with data safety.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Editor } from '@tiptap/core'
import { 
  quantaBackup, 
  AUTO_BACKUP_DEBOUNCE_MS, 
  SNAPSHOT_INTERVAL_MS,
  IDLE_SNAPSHOT_THRESHOLD_MS 
} from './backup'

export type AutoBackupStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoBackupState {
  status: AutoBackupStatus
  lastSavedAt: number | null
  error: string | null
}

interface UseAutoBackupOptions {
  enabled?: boolean
  debounceMs?: number
  snapshotIntervalMs?: number
  idleThresholdMs?: number
  onBackupCreated?: (timestamp: number) => void
  onError?: (error: Error) => void
}

export function useAutoBackup(
  editor: Editor | null,
  quantaId: string | null,
  options: UseAutoBackupOptions = {}
) {
  const {
    enabled = true,
    debounceMs = AUTO_BACKUP_DEBOUNCE_MS,
    snapshotIntervalMs = SNAPSHOT_INTERVAL_MS,
    idleThresholdMs = IDLE_SNAPSHOT_THRESHOLD_MS,
    onBackupCreated,
    onError
  } = options

  // State for UI feedback
  const [state, setState] = useState<AutoBackupState>({
    status: 'idle',
    lastSavedAt: null,
    error: null
  })

  // Refs for timers and tracking
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const snapshotTimerRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentHashRef = useRef<string | null>(null)
  const hasUnsavedChangesRef = useRef(false)
  const lastEditTimeRef = useRef<number | null>(null)

  /**
   * Create a backup and update state
   */
  const createBackup = useCallback(async () => {
    if (!editor || !quantaId || !enabled) return

    try {
      const content = editor.getJSON()
      
      // Check if content has actually changed
      const currentHash = quantaBackup.getContentHash(content)
      if (currentHash === lastContentHashRef.current) {
        // No changes, just mark as saved
        setState(prev => ({ ...prev, status: 'saved' }))
        return
      }

      setState(prev => ({ ...prev, status: 'saving' }))

      // Create the auto-backup
      const backup = quantaBackup.createAutoBackup(quantaId, content)
      
      // Update tracking state
      lastContentHashRef.current = currentHash
      hasUnsavedChangesRef.current = false
      
      setState({
        status: 'saved',
        lastSavedAt: backup.timestamp,
        error: null
      })

      onBackupCreated?.(backup.timestamp)
      
      console.log(`[useAutoBackup] Backup created for ${quantaId}`)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message
      }))
      onError?.(err)
      console.error('[useAutoBackup] Backup failed:', error)
    }
  }, [editor, quantaId, enabled, onBackupCreated, onError])

  /**
   * Schedule a debounced backup (called after each edit)
   */
  const scheduleDebounceBackup = useCallback(() => {
    if (!enabled) return

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Clear idle timer (user is active)
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    hasUnsavedChangesRef.current = true
    lastEditTimeRef.current = Date.now()

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      createBackup()
      
      // After debounced save, start idle timer for snapshot
      idleTimerRef.current = setTimeout(() => {
        if (hasUnsavedChangesRef.current && quantaId) {
          // Check if we should create a snapshot (time-based)
          if (quantaBackup.shouldCreateSnapshot(quantaId, snapshotIntervalMs)) {
            console.log('[useAutoBackup] Creating idle snapshot')
            createBackup()
          }
        }
      }, idleThresholdMs)
    }, debounceMs)
  }, [enabled, debounceMs, idleThresholdMs, snapshotIntervalMs, quantaId, createBackup])

  /**
   * Handle editor content changes
   */
  useEffect(() => {
    if (!editor || !enabled) return

    const handleUpdate = () => {
      scheduleDebounceBackup()
    }

    // Listen to editor updates
    editor.on('update', handleUpdate)

    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, enabled, scheduleDebounceBackup])

  /**
   * Set up periodic snapshot interval
   */
  useEffect(() => {
    if (!enabled || !quantaId) return

    // Periodic check for creating snapshots
    snapshotTimerRef.current = setInterval(() => {
      if (hasUnsavedChangesRef.current && quantaBackup.shouldCreateSnapshot(quantaId, snapshotIntervalMs)) {
        console.log('[useAutoBackup] Creating periodic snapshot')
        createBackup()
      }
    }, snapshotIntervalMs)

    return () => {
      if (snapshotTimerRef.current) {
        clearInterval(snapshotTimerRef.current)
      }
    }
  }, [enabled, quantaId, snapshotIntervalMs, createBackup])

  /**
   * Handle page lifecycle events (visibility change, beforeunload, blur)
   */
  useEffect(() => {
    if (!editor || !quantaId || !enabled) return

    // Save when page visibility changes (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChangesRef.current) {
        console.log('[useAutoBackup] Saving on visibility change (tab hidden)')
        createBackup()
      }
    }

    // Save before page unload (user closes/refreshes page)
    const handleBeforeUnload = () => {
      if (hasUnsavedChangesRef.current && editor && quantaId) {
        console.log('[useAutoBackup] Saving on beforeunload')
        // Use synchronous localStorage write for beforeunload
        try {
          const content = editor.getJSON()
          quantaBackup.createAutoBackup(quantaId, content)
        } catch (e) {
          console.error('[useAutoBackup] Failed to save on beforeunload:', e)
        }
      }
    }

    // Save when window loses focus
    const handleBlur = () => {
      if (hasUnsavedChangesRef.current) {
        console.log('[useAutoBackup] Saving on window blur')
        createBackup()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('blur', handleBlur)
    }
  }, [editor, quantaId, enabled, createBackup])

  /**
   * Initialize with existing backup hash
   */
  useEffect(() => {
    if (!quantaId) return

    const latestBackup = quantaBackup.getLatestBackup(quantaId)
    if (latestBackup) {
      lastContentHashRef.current = quantaBackup.getContentHash(latestBackup.content)
      setState(prev => ({
        ...prev,
        lastSavedAt: latestBackup.timestamp
      }))
    }
  }, [quantaId])

  /**
   * Cleanup timers on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  /**
   * Manual backup trigger (for UI button if needed)
   */
  const triggerBackup = useCallback(() => {
    hasUnsavedChangesRef.current = true // Force backup even if no changes detected
    createBackup()
  }, [createBackup])

  return {
    status: state.status,
    lastSavedAt: state.lastSavedAt,
    error: state.error,
    triggerBackup,
    hasUnsavedChanges: hasUnsavedChangesRef.current
  }
}

export default useAutoBackup
