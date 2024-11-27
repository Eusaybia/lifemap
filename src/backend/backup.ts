import { JSONContent } from "@tiptap/core"

const BACKUP_KEY = 'editor_content_backup'

export const backup = {
  storeValidContent(content: JSONContent) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(content))
    } catch (e) {
      console.error('Failed to store backup content:', e)
    }
  },

  getLastValidContent() {
    try {
      const backup = localStorage.getItem(BACKUP_KEY)
      return backup ? JSON.parse(backup) : null
    } catch (e) {
      console.error('Failed to retrieve backup content:', e)
      return null
    }
  }
} 