import { JSONContent } from "@tiptap/react";
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// LIFE MAPPING MARGIN TEMPLATE
// ============================================================================
// 
// This template contains all the sections for the life-mapping-old page margin.
// Each section has a heading and a group for content.
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-lifetime-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-lifetime-content",
            "textAlign": "left",
            "indent": 0
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "margin-spacer-1",
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-every-7-years-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-every-7-years-content",
            "textAlign": "left",
            "indent": 0
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "margin-spacer-2",
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-yearly-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-yearly-content",
            "textAlign": "left",
            "indent": 0
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "margin-spacer-3",
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-seasonally-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-seasonally-content",
            "textAlign": "left",
            "indent": 0
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "margin-spacer-4",
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-monthly-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-monthly-content",
            "textAlign": "left",
            "indent": 0
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "margin-spacer-5",
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-weekly-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-weekly-content",
            "textAlign": "left",
            "indent": 0
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "margin-spacer-6",
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-daily-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-daily-content",
            "textAlign": "left",
            "indent": 0
          }
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "margin-spacer-7",
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
        "level": 2
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
      "type": "group",
      "attrs": {
        "quantaId": "margin-past-group",
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "margin-past-content",
            "textAlign": "left",
            "indent": 0
          }
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
 * Generate a fresh Life Mapping Margin Template with unique IDs each time
 */
export const getLifeMappingMarginTemplate = (): JSONContent => {
  return regenerateQuantaIds(TEMPLATE_SCHEMA);
};

export const LifeMappingMarginTemplate = getLifeMappingMarginTemplate();

export default getLifeMappingMarginTemplate;
