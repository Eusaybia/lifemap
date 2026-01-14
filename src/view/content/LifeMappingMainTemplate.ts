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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Lifetime"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "8ab425f9-fc58-4bdb-b82c-1e2ff344b3f7",
        "textAlign": "left",
        "indent": 0
      }
    },
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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Every 7 Years"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "750d4bbf-7a6b-440d-b5dd-3c294001cd40",
        "textAlign": "left",
        "indent": 0
      }
    },
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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Yearly"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "bde9dd50-e4cb-4995-9bed-d0d0c03d7ab5",
        "textAlign": "left",
        "indent": 0
      }
    },
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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Seasonally"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "e7440807-a40c-44d9-b038-9db25d650f34",
        "textAlign": "left",
        "indent": 0
      }
    },
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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Monthly"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "5b0732cf-fc0d-4ae5-afb1-6976918dffe8",
        "textAlign": "left",
        "indent": 0
      }
    },
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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Weekly"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "ba3f100f-adee-49eb-a8cf-b685f64ae1e4",
        "textAlign": "left",
        "indent": 0
      }
    },
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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Daily"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "402f94de-ba8f-4439-97d9-1d00c0fc4121",
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "daily",
      "attrs": {
        "quantaId": "737ba931-bc0a-4c66-a750-1e20f1333eae"
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "657cfa33-798c-4671-84ec-1e80f317e4e7",
        "textAlign": "left",
        "indent": 0
      }
    },
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
          "marks": [
            {
              "type": "bold"
            }
          ],
          "text": "Past"
        },
        {
          "type": "hardBreak"
        },
        {
          "type": "hardBreak"
        },
        {
          "type": "hardBreak"
        },
        {
          "type": "hardBreak"
        }
      ]
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
