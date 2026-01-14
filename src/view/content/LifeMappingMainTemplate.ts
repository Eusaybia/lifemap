import { JSONContent } from "@tiptap/react";
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// LIFE MAPPING MAIN TEMPLATE
// ============================================================================
// 
// This template uses External Portals to embed each life mapping section.
// The External Portal extension loads content from other quantas via iframe.
//
// Sections embedded:
// - Lifetime (/q/lifetime)
// - Every 7 Years (/q/every-7-years)
// - Yearly (/q/yearly)
// - Seasonally (/q/seasonally)
// - Monthly (/q/past)
// - Weekly (/q/relationships)
// - Daily (/q/present-day-tasks)
// - Past (/q/past-history)
//
// ============================================================================

const TEMPLATE_SCHEMA: JSONContent = {
  "type": "doc",
  "content": [
    // Lifetime Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Lifetime"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "lifetime",
        "height": 400
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "main-spacer-1",
        "textAlign": "left",
        "indent": 0
      }
    },

    // Every 7 Years Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Every 7 Years"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "every-7-years",
        "height": 400
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "main-spacer-2",
        "textAlign": "left",
        "indent": 0
      }
    },

    // Yearly Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Yearly"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "yearly",
        "height": 400
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "main-spacer-3",
        "textAlign": "left",
        "indent": 0
      }
    },

    // Seasonally Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Seasonally"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "seasonally",
        "height": 400
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "main-spacer-4",
        "textAlign": "left",
        "indent": 0
      }
    },

    // Monthly Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Monthly"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "past",
        "height": 400
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "main-spacer-5",
        "textAlign": "left",
        "indent": 0
      }
    },

    // Weekly Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Weekly"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "relationships",
        "height": 400
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "main-spacer-6",
        "textAlign": "left",
        "indent": 0
      }
    },

    // Daily Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Daily"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "present-day-tasks",
        "height": 600
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "main-spacer-7",
        "textAlign": "left",
        "indent": 0
      }
    },

    // Past Section
    {
      "type": "heading",
      "attrs": {
        "textAlign": "left",
        "indent": 0,
        "level": 1
      },
      "content": [
        {
          "type": "text",
          "marks": [{ "type": "bold" }],
          "text": "Past"
        }
      ]
    },
    {
      "type": "externalPortal",
      "attrs": {
        "externalQuantaId": "past-history",
        "height": 400
      }
    }
  ]
};

// ============================================================================
// TEMPLATE PROCESSING
// ============================================================================

/**
 * Recursively regenerates all quantaId attributes with fresh UUIDs
 * This ensures each instantiated template has unique IDs
 */
const regenerateQuantaIds = (node: JSONContent): JSONContent => {
  const newNode = { ...node };
  
  // Regenerate quantaId if present (but NOT externalQuantaId - that's a reference)
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
 * Generate a fresh Life Mapping Main Template with unique IDs each time
 */
export const getLifeMappingMainTemplate = (): JSONContent => {
  return regenerateQuantaIds(TEMPLATE_SCHEMA);
};

export const LifeMappingMainTemplate = getLifeMappingMainTemplate();

export default getLifeMappingMainTemplate;
