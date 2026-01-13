import { JSONContent } from "@tiptap/react";
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// KONGWEI'S BASIC TEMPLATE
// ============================================================================
// 
// A clean, minimal template for everyday note-taking and task management.
// 
// ============================================================================

const TEMPLATE_SCHEMA: JSONContent = {
  "type": "doc",
  "content": [
    {
      "type": "dayHeader",
      "attrs": {
        "title": "Today",
        "subtitle": "",
        "showBadge": false,
        "badgeText": "",
        "backgroundImage": null
      },
      "content": [
        {
          "type": "group",
          "attrs": {
            "quantaId": "basic-morning-tasks",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "basic-morning-title",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "bold"
                    }
                  ],
                  "text": "🌅 Morning"
                }
              ]
            },
            {
              "type": "taskList",
              "content": [
                {
                  "type": "taskItem",
                  "attrs": {
                    "checked": false
                  },
                  "content": [
                    {
                      "type": "paragraph",
                      "attrs": {
                        "quantaId": "basic-task-1",
                        "textAlign": "left",
                        "indent": 0
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "basic-morning-spacer",
                "textAlign": "left",
                "indent": 0
              }
            }
          ]
        },
        {
          "type": "group",
          "attrs": {
            "quantaId": "basic-afternoon-tasks",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "basic-afternoon-title",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "bold"
                    }
                  ],
                  "text": "☀️ Afternoon"
                }
              ]
            },
            {
              "type": "taskList",
              "content": [
                {
                  "type": "taskItem",
                  "attrs": {
                    "checked": false
                  },
                  "content": [
                    {
                      "type": "paragraph",
                      "attrs": {
                        "quantaId": "basic-task-2",
                        "textAlign": "left",
                        "indent": 0
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "basic-afternoon-spacer",
                "textAlign": "left",
                "indent": 0
              }
            }
          ]
        },
        {
          "type": "group",
          "attrs": {
            "quantaId": "basic-evening-tasks",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "basic-evening-title",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "bold"
                    }
                  ],
                  "text": "🌙 Evening"
                }
              ]
            },
            {
              "type": "taskList",
              "content": [
                {
                  "type": "taskItem",
                  "attrs": {
                    "checked": false
                  },
                  "content": [
                    {
                      "type": "paragraph",
                      "attrs": {
                        "quantaId": "basic-task-3",
                        "textAlign": "left",
                        "indent": 0
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "basic-evening-spacer",
                "textAlign": "left",
                "indent": 0
              }
            }
          ]
        }
      ]
    },
    {
      "type": "group",
      "attrs": {
        "quantaId": "basic-notes-section",
        "pathos": 0,
        "backgroundColor": "#F5F5DC",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "basic-notes-title",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "text",
              "marks": [
                {
                  "type": "bold"
                }
              ],
              "text": "📝 Notes"
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "basic-notes-content",
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
 * Generate a fresh Kongwei's Basic Template with unique IDs each time
 * This function should be called when applying the template, not at import time
 */
export const getKongweisBasicTemplate = (): JSONContent => {
  return regenerateQuantaIds(TEMPLATE_SCHEMA);
};

// Keep backward compatibility - export a static version for existing imports
export const KongweisBasicTemplate = getKongweisBasicTemplate();

export default getKongweisBasicTemplate;

