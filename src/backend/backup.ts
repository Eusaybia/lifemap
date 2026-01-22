import { JSONContent } from "@tiptap/core"

const BACKUP_KEY = 'editor_content_backup'
const MAX_REVISIONS = 4

// Per-quanta backup system
const QUANTA_BACKUP_PREFIX = 'quanta_backup_'
const MAX_QUANTA_REVISIONS = 10

interface BackupEntry {
  content: JSONContent;
  timestamp: number;
}

export interface QuantaBackupEntry {
  content: JSONContent;
  timestamp: number;
  label: string; // Human-readable label like "v1", "v2", etc.
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

      localStorage.setItem(BACKUP_KEY, JSON.stringify(updatedBackups))
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
    try {
      const existingBackups = this.getBackups(quantaId)
      
      // Generate version label (v1, v2, etc.)
      const versionNumber = existingBackups.length + 1
      
      const newBackup: QuantaBackupEntry = {
        content,
        timestamp: Date.now(),
        label: `v${versionNumber}`
      }

      // Add new backup at the beginning (most recent first)
      // But we want to display oldest to newest (bottom to top), so we'll reverse when displaying
      const updatedBackups = [newBackup, ...existingBackups].slice(0, MAX_QUANTA_REVISIONS)

      localStorage.setItem(this.getStorageKey(quantaId), JSON.stringify(updatedBackups))
      
      return newBackup
    } catch (e) {
      console.error(`[QuantaBackup] Failed to create backup for ${quantaId}:`, e)
      throw e
    }
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
      
      localStorage.setItem(this.getStorageKey(quantaId), JSON.stringify(filtered))
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
  }
} 