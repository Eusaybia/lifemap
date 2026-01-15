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
      "type": "paragraph",
      "attrs": {
        "quantaId": "2057ffbb-da0f-4dd0-8b63-2eb5eb598912",
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
          "text": "Lifetime"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "adbc20d9-2e61-48ba-9be6-5398fb7302c2",
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
        "quantaId": "1a93090b-5d80-4a5b-b959-d8c14eea5ef2",
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
        "quantaId": "a876e0c2-847e-48df-9c1a-ba283d699356",
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
        "quantaId": "d76fad8f-1e69-442b-9d47-e939b31281c2",
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
      "type": "temporalSpace",
      "attrs": {
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "1dfe1537-759e-44a7-a10f-367e5185d025",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "lunar:abstract:new-moons",
                "label": "🌑 New Moons",
                "data-date": "",
                "data-formatted": "New Moons",
                "data-relative-label": "New Moons"
              }
            },
            {
              "type": "text",
              "text": " "
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "text",
              "text": "Rest, don't do much, plan for rest of the month"
            }
          ]
        }
      ]
    },
    {
      "type": "temporalSpace",
      "attrs": {
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "86ddfba3-e6dc-411a-9a7d-3e4967da455a",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "lunar:abstract:first-quarters",
                "label": "🌗 First Quarters",
                "data-date": "",
                "data-formatted": "First Quarters",
                "data-relative-label": "First Quarters"
              }
            },
            {
              "type": "text",
              "text": " "
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "text",
              "text": "Catch up with friends, do some activities"
            }
          ]
        }
      ]
    },
    {
      "type": "temporalSpace",
      "attrs": {
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "585601ed-33ff-4777-962e-304bc83a4e67",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "lunar:abstract:full-moons",
                "label": "🌕 Full Moons",
                "data-date": "",
                "data-formatted": "Full Moons",
                "data-relative-label": "Full Moons"
              }
            },
            {
              "type": "text",
              "text": "  "
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "text",
              "text": "Don't do any activity, just rest"
            }
          ]
        }
      ]
    },
    {
      "type": "temporalSpace",
      "attrs": {
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity",
        "collapsed": false
      },
      "content": [
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "16232b55-5287-41ba-913d-883b3313de56",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "lunar:abstract:last-quarters",
                "label": "🌓 Last Quarters",
                "data-date": "",
                "data-formatted": "Last Quarters",
                "data-relative-label": "Last Quarters"
              }
            },
            {
              "type": "text",
              "text": " "
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
              "type": "text",
              "text": "Do some activities"
            }
          ]
        }
      ]
    },
    {
      "type": "lunarMonth"
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "f181a0a9-4eb0-4351-b247-9a11921a3cba",
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
        "quantaId": "2a718df8-e6e7-4479-a3d8-6b95fda5d0a4",
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
        "quantaId": "43d287df-2348-4337-9259-e99920a1cb59",
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "daily",
      "attrs": {
        "quantaId": "8c441c3e-187c-4c79-b0cc-eb1172f9eac5"
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "56625020-9c22-4c14-b8b3-71cb68c96157",
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
