import { JSONContent } from "@tiptap/react";
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// DAILY SCHEDULE TEMPLATE - FALLBACK
// ============================================================================
// 
// This is the FALLBACK template used when creating new daily schedules.
// It's only applied when the editable template at /q/daily-schedule-template 
// is empty or not found.
//
// To customize your daily schedule template, edit /q/daily-schedule-template
//
// ============================================================================

const TEMPLATE_SCHEMA: JSONContent = {
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": {
        "level": 1,
        "textAlign": "left"
      },
      "content": [
        {
          "type": "text",
          "text": "Daily"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "fallback-empty-paragraph",
        "textAlign": "left",
        "indent": 0
      }
    }
  ]
}

// ============================================================================
// TEMPLATE PROCESSING
// ============================================================================

/**
 * Recursively regenerates all quantaId attributes with fresh UUIDs
 * This ensures each instantiated template has unique IDs
 */
const regenerateQuantaIds = (node: JSONContent): JSONContent => {
  const newNode = { ...node };
  
  // Regenerate quantaId if present
  if (newNode.attrs?.quantaId) {
    newNode.attrs = {
      ...newNode.attrs,
      quantaId: uuidv4()
    };
  }
  
  // Recursively process content array
  if (newNode.content && Array.isArray(newNode.content)) {
    newNode.content = newNode.content.map(child => regenerateQuantaIds(child));
  }
  
  return newNode;
};

/**
 * Generate a fresh Daily Schedule Template with unique IDs each time
 * This function should be called when applying the template, not at import time
 */
export const getDailyScheduleTemplate = (): JSONContent => {
  return regenerateQuantaIds(TEMPLATE_SCHEMA);
};

// Keep backward compatibility - export a static version for existing imports
export const DailyScheduleTemplate = getDailyScheduleTemplate();

export default getDailyScheduleTemplate;
