import { JSONContent } from "@tiptap/core"

const BACKUP_KEY = 'editor_content_backup'
const MAX_REVISIONS = 4

interface BackupEntry {
  content: JSONContent;
  timestamp: number;
}

export const backup = {
  storeValidContent(content: JSONContent) {
    try {
      // Get existing backups
      const existingBackups = this.getAllBackups()
      
      // Create new backup entry
      const newBackup: BackupEntry = {
        content,
        timestamp: Date.now()
      }

      // Add new backup and limit to MAX_REVISIONS
      const updatedBackups = [newBackup, ...existingBackups]
        .slice(0, MAX_REVISIONS)

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
      return backup ? JSON.parse(backup) : []
    } catch (e) {
      console.error('Failed to retrieve backups:', e)
      return []
    }
  }
} 