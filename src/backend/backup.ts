import { JSONContent } from "@tiptap/core"

const BACKUP_KEY = 'editor_content_backup'
const MAX_REVISIONS = 4

// Per-quanta backup system
const QUANTA_BACKUP_PREFIX = 'quanta_backup_'
const MAX_QUANTA_REVISIONS = 5  // Reduced from 10 to prevent quota issues

// Auto-backup timing constants (Google Docs-like strategy)
// 
// Google Docs saves in real-time and creates version history snapshots every few minutes.
// For localStorage-based storage, we implement:
// 1. Quick auto-save: 2 seconds after typing stops (debounced) - mimics real-time saving
// 2. Periodic snapshot: Every 5 minutes of active editing - creates a version history entry
// 3. Activity-based: Creates backup after significant idle period following edits
// 
// This approach balances storage efficiency with data safety.
export const AUTO_BACKUP_DEBOUNCE_MS = 2000;  // 2 seconds after last edit (real-time save feel)
export const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes between version snapshots
export const MIN_CHANGES_FOR_SNAPSHOT = 1;  // Minimum edits before creating a snapshot
export const IDLE_SNAPSHOT_THRESHOLD_MS = 30 * 1000;  // 30 seconds of idle after edits triggers snapshot

interface BackupEntry {
  content: JSONContent;
  timestamp: number;
}

export interface QuantaBackupEntry {
  content: JSONContent;
  timestamp: number;
  label: string; // Human-readable label like "v1", "v2", etc.
  isAutoBackup?: boolean; // Whether this was created automatically
}

// ============================================================================
// Storage Quota Management
// ============================================================================

/**
 * Check if an error is a quota exceeded error
 */
function isQuotaExceededError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.code === 22 || // Legacy code for QuotaExceededError
     e.code === 1014 || // Firefox
     e.name === 'QuotaExceededError' ||
     e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

/**
 * Get all localStorage keys related to backups
 */
function getAllBackupKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key === BACKUP_KEY || key.startsWith(QUANTA_BACKUP_PREFIX))) {
      keys.push(key)
    }
  }
  return keys
}

/**
 * Clean up oldest auto-backups across all quantas to free space
 * Prioritizes removing auto-backups over manual named versions
 * Returns true if any cleanup was performed
 */
function cleanupOldBackups(): boolean {
  console.log('[Backup] Quota exceeded, cleaning up old backups...')
  
  let cleanedUp = false
  const keys = getAllBackupKeys()
  
  // First pass: Remove oldest auto-backups from each quanta (keep only 2 auto-backups each)
  for (const key of keys) {
    if (key.startsWith(QUANTA_BACKUP_PREFIX)) {
      try {
        const data = localStorage.getItem(key)
        if (!data) continue
        
        const backups: QuantaBackupEntry[] = JSON.parse(data)
        if (!Array.isArray(backups)) continue
        
        // Separate auto and manual backups
        const autoBackups = backups.filter(b => b.isAutoBackup)
        const manualBackups = backups.filter(b => !b.isAutoBackup)
        
        // Keep only 2 most recent auto-backups
        if (autoBackups.length > 2) {
          const keptAuto = autoBackups.slice(0, 2)
          const newBackups = [...keptAuto, ...manualBackups]
            .sort((a, b) => b.timestamp - a.timestamp)
          
          localStorage.setItem(key, JSON.stringify(newBackups))
          cleanedUp = true
          console.log(`[Backup] Cleaned ${autoBackups.length - 2} old auto-backups from ${key}`)
        }
      } catch (e) {
        console.error(`[Backup] Error cleaning ${key}:`, e)
      }
    }
  }
  
  // Second pass: If still needed, clear the legacy backup entirely
  if (!cleanedUp) {
    try {
      const legacyData = localStorage.getItem(BACKUP_KEY)
      if (legacyData) {
        localStorage.removeItem(BACKUP_KEY)
        cleanedUp = true
        console.log('[Backup] Cleared legacy backup storage')
      }
    } catch (e) {
      console.error('[Backup] Error clearing legacy backup:', e)
    }
  }
  
  // Third pass: If still needed, remove all auto-backups entirely
  if (!cleanedUp) {
    for (const key of keys) {
      if (key.startsWith(QUANTA_BACKUP_PREFIX)) {
        try {
          const data = localStorage.getItem(key)
          if (!data) continue
          
          const backups: QuantaBackupEntry[] = JSON.parse(data)
          if (!Array.isArray(backups)) continue
          
          // Keep only manual backups
          const manualOnly = backups.filter(b => !b.isAutoBackup)
          if (manualOnly.length < backups.length) {
            if (manualOnly.length > 0) {
              localStorage.setItem(key, JSON.stringify(manualOnly))
            } else {
              localStorage.removeItem(key)
            }
            cleanedUp = true
            console.log(`[Backup] Removed all auto-backups from ${key}`)
          }
        } catch (e) {
          console.error(`[Backup] Error removing auto-backups from ${key}:`, e)
        }
      }
    }
  }
  
  return cleanedUp
}

/**
 * Safely set an item in localStorage with quota handling
 * Automatically cleans up old backups if quota is exceeded
 */
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (isQuotaExceededError(e)) {
      // Try to clean up and retry
      if (cleanupOldBackups()) {
        try {
          localStorage.setItem(key, value)
          return true
        } catch (retryError) {
          console.error('[Backup] Still exceeded quota after cleanup:', retryError)
          return false
        }
      }
    }
    console.error('[Backup] localStorage error:', e)
    return false
  }
}

// ============================================================================
// Global Backup System (legacy - for error recovery)
// ============================================================================

export const backup = {
  storeValidContent(content: JSONContent) {
    try {
      // Get existing backups
      const existingBackups = this.getAllBackups()
      // Ensure existingBackups is always an array
      const backupsArray = Array.isArray(existingBackups) ? existingBackups : [];
      
      // Create new backup entry
      const newBackup: BackupEntry = {
        content,
        timestamp: Date.now()
      }

      // Add new backup and limit to MAX_REVISIONS
      const updatedBackups = [newBackup, ...backupsArray].slice(0, MAX_REVISIONS)

      // Use safe storage with quota handling
      if (!safeLocalStorageSet(BACKUP_KEY, JSON.stringify(updatedBackups))) {
        console.warn('[Backup] Could not store backup due to quota limits')
      }
    } catch (e) {
      console.error('Failed to store backup content:', e)
    }
  },

  getLastValidContent() {
    try {
      const backups = this.getAllBackups()
      return backups.length > 0 ? backups[0].content : null
    } catch (e) {
      console.error('Failed to retrieve backup content:', e)
      return null
    }
  },

  getAllBackups(): BackupEntry[] {
    try {
      const backup = localStorage.getItem(BACKUP_KEY)
      // Ensure we return an array even if parsing fails
      if (!backup) return [];
      const parsed = JSON.parse(backup);
      // Verify that parsed data is an array
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to retrieve backups:', e)
      return []
    }
  }
}

// ============================================================================
// Per-Quanta Backup System (manual backups per /q/[slug] page)
// ============================================================================

export const quantaBackup = {
  /**
   * Get the localStorage key for a specific quanta
   */
  getStorageKey(quantaId: string): string {
    return `${QUANTA_BACKUP_PREFIX}${quantaId}`
  },

  /**
   * Create a manual backup for a specific quanta
   */
  createBackup(quantaId: string, content: JSONContent): QuantaBackupEntry {
    const existingBackups = this.getBackups(quantaId)
    
    // Generate version label (v1, v2, etc.)
    // Count only manual backups for version numbering
    const manualBackupCount = existingBackups.filter(b => !b.isAutoBackup).length
    const versionNumber = manualBackupCount + 1
    
    const newBackup: QuantaBackupEntry = {
      content,
      timestamp: Date.now(),
      label: `v${versionNumber}`,
      isAutoBackup: false
    }

    // Add new backup at the beginning (most recent first)
    const updatedBackups = [newBackup, ...existingBackups].slice(0, MAX_QUANTA_REVISIONS)

    // Use safe storage with quota handling
    if (!safeLocalStorageSet(this.getStorageKey(quantaId), JSON.stringify(updatedBackups))) {
      console.error(`[QuantaBackup] Failed to create backup for ${quantaId}: quota exceeded`)
      throw new Error('Storage quota exceeded')
    }
    
    return newBackup
  },

  /**
   * Get all backups for a specific quanta (most recent first)
   */
  getBackups(quantaId: string): QuantaBackupEntry[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(quantaId))
      if (!data) return []
      
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.error(`[QuantaBackup] Failed to get backups for ${quantaId}:`, e)
      return []
    }
  },

  /**
   * Get backups sorted for display (newest to oldest, top to bottom)
   */
  getBackupsForDisplay(quantaId: string): QuantaBackupEntry[] {
    return this.getBackups(quantaId) // Already stored newest first
  },

  /**
   * Get a specific backup by timestamp
   */
  getBackupByTimestamp(quantaId: string, timestamp: number): QuantaBackupEntry | null {
    const backups = this.getBackups(quantaId)
    return backups.find(b => b.timestamp === timestamp) || null
  },

  /**
   * Get the most recent backup
   */
  getLatestBackup(quantaId: string): QuantaBackupEntry | null {
    const backups = this.getBackups(quantaId)
    return backups.length > 0 ? backups[0] : null
  },

  /**
   * Delete a specific backup
   */
  deleteBackup(quantaId: string, timestamp: number): boolean {
    try {
      const backups = this.getBackups(quantaId)
      const filtered = backups.filter(b => b.timestamp !== timestamp)
      
      if (filtered.length === backups.length) {
        return false // Nothing was deleted
      }
      
      if (filtered.length === 0) {
        localStorage.removeItem(this.getStorageKey(quantaId))
      } else {
        localStorage.setItem(this.getStorageKey(quantaId), JSON.stringify(filtered))
      }
      return true
    } catch (e) {
      console.error(`[QuantaBackup] Failed to delete backup for ${quantaId}:`, e)
      return false
    }
  },

  /**
   * Clear all backups for a specific quanta
   */
  clearAllBackups(quantaId: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(quantaId))
    } catch (e) {
      console.error(`[QuantaBackup] Failed to clear backups for ${quantaId}:`, e)
    }
  },

  /**
   * Get the current quanta ID from the URL
   */
  getCurrentQuantaId(): string | null {
    if (typeof window === 'undefined') return null
    const pathParts = window.location.pathname.split('/')
    // URL format: /q/[slug]
    const qIndex = pathParts.indexOf('q')
    if (qIndex !== -1 && pathParts[qIndex + 1]) {
      return pathParts[qIndex + 1]
    }
    return null
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    })
  },

  /**
   * Create an automatic backup (used by auto-save system)
   * Auto-backups are labeled differently from manual backups
   * 
   * Auto-backups are more aggressively cleaned up when quota is exceeded,
   * prioritizing preservation of manual named versions.
   */
  createAutoBackup(quantaId: string, content: JSONContent): QuantaBackupEntry {
    const existingBackups = this.getBackups(quantaId)
    
    // Generate auto-backup label with timestamp
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    
    const newBackup: QuantaBackupEntry = {
      content,
      timestamp: Date.now(),
      label: `Auto ${timeStr}`,
      isAutoBackup: true
    }

    // For auto-backups, be more aggressive with cleanup:
    // Keep only the latest auto-backup + any manual backups
    const manualBackups = existingBackups.filter(b => !b.isAutoBackup)
    const recentAutoBackups = existingBackups
      .filter(b => b.isAutoBackup)
      .slice(0, 2) // Keep at most 2 previous auto-backups
    
    const updatedBackups = [newBackup, ...recentAutoBackups, ...manualBackups]
      .slice(0, MAX_QUANTA_REVISIONS)

    // Use safe storage with quota handling
    if (!safeLocalStorageSet(this.getStorageKey(quantaId), JSON.stringify(updatedBackups))) {
      // If still failing, try with just the new backup and manual backups
      const minimalBackups = [newBackup, ...manualBackups].slice(0, MAX_QUANTA_REVISIONS)
      if (!safeLocalStorageSet(this.getStorageKey(quantaId), JSON.stringify(minimalBackups))) {
        console.error(`[QuantaBackup] Failed to create auto-backup for ${quantaId}: quota exceeded`)
        throw new Error('Storage quota exceeded')
      }
    }
    
    console.log(`[QuantaBackup] Auto-backup created for ${quantaId} at ${timeStr}`)
    return newBackup
  },

  /**
   * Get the last auto-backup timestamp for a quanta
   */
  getLastAutoBackupTimestamp(quantaId: string): number | null {
    const backups = this.getBackups(quantaId)
    const lastAutoBackup = backups.find(b => b.isAutoBackup)
    return lastAutoBackup ? lastAutoBackup.timestamp : null
  },

  /**
   * Check if enough time has passed since last backup for a new snapshot
   */
  shouldCreateSnapshot(quantaId: string, minIntervalMs: number = SNAPSHOT_INTERVAL_MS): boolean {
    const lastTimestamp = this.getLastAutoBackupTimestamp(quantaId)
    if (!lastTimestamp) return true // No backups exist, should create one
    
    const timeSinceLastBackup = Date.now() - lastTimestamp
    return timeSinceLastBackup >= minIntervalMs
  },

  /**
   * Simple content hash for change detection
   * Uses JSON stringify to compare content
   */
  getContentHash(content: JSONContent): string {
    return JSON.stringify(content)
  },

  /**
   * Check if content has changed compared to the last backup
   */
  hasContentChanged(quantaId: string, currentContent: JSONContent): boolean {
    const latestBackup = this.getLatestBackup(quantaId)
    if (!latestBackup) return true // No backup exists, content has "changed"
    
    const currentHash = this.getContentHash(currentContent)
    const backupHash = this.getContentHash(latestBackup.content)
    
    return currentHash !== backupHash
  }
} 