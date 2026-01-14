import { JSONContent } from "@tiptap/react";
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// DAILY SCHEDULE TEMPLATE
// ============================================================================
// 
// This template is used as the fallback when creating new daily schedules.
// It's applied when:
//   1. A new daily schedule is created (e.g., daily-2026-01-14)
//   2. The editable template at /q/daily-schedule-template is empty or not found
//
// CUSTOMIZATION:
// - Replace the TEMPLATE_SCHEMA below with your own JSONContent schema
// - Each node should have a unique `quantaId` - use uuidv4() for fresh IDs
// - The schema must be a valid TipTap JSONContent document with type: "doc"
//
// ============================================================================

// TODO: Replace this with your custom JSONContent schema
const TEMPLATE_SCHEMA: JSONContent = {
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "049f5a92-038f-43f3-bd32-9fc1c2d0aae7",
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "1dc6260a-4f79-4aba-a957-61dcae12a9e3",
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "dayHeader",
      "attrs": {
        "title": "Today",
        "subtitle": "",
        "showBadge": true,
        "badgeText": "Repeats Daily",
        "backgroundImage": null
      },
      "content": [
        {
          "type": "group",
          "attrs": {
            "quantaId": "3833ff60-68d2-4fab-b669-ce48417474c9",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "e74acdff-df5f-46ae-a412-aeee83c9a5b1",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "underline"
                    }
                  ],
                  "text": "Things for Consideration"
                },
                {
                  "type": "hardBreak"
                },
                {
                  "type": "hardBreak"
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "8f898594-c52a-465b-9fca-f110953ddebe",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "611bf5fb-1a07-4b23-b4a1-0876423603a8",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "cea953ec-f263-47b7-bc46-1444b18f2750",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "2e22e1f2-2177-44ec-84d3-7edbfd923d0a",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "underline"
                    }
                  ],
                  "text": "Misc Tasks"
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "445a478a-e7be-42af-85db-6aa0d7e6b179",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "0d1b3f88-2d83-4a28-8cc4-1ad7395e86ae",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "e32dba8a-2c7a-4147-bc47-a8bb70045b7e",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "78655c88-0f40-474e-bd33-6dd99708d3e3",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "f0d3749c-9e50-4499-9aa4-7b23329fa02c",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "underline"
                    }
                  ],
                  "text": "Thoughts and feelings"
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
                },
                {
                  "type": "hardBreak"
                },
                {
                  "type": "text",
                  "marks": [
                    {
                      "type": "underline"
                    }
                  ],
                  "text": "Observations and happenings"
                },
                {
                  "type": "hardBreak"
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "5a021028-9382-4d39-845b-8831c91fc2de",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "7f023300-be9e-4a6c-87d4-d7bdcbe413a2",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "hardBreak"
                }
              ]
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
            "quantaId": "ea492a5a-0d4e-4638-a8e6-459fc2da4ab4",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-5-0",
                "label": "🕐 5 AM",
                "data-date": "2026-01-07T18:00:00.000Z",
                "data-formatted": "5 AM",
                "data-relative-label": "5 AM"
              }
            },
            {
              "type": "text",
              "text": " - "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-7-0",
                "label": "🕐 7 AM",
                "data-date": "2026-01-07T20:00:00.000Z",
                "data-formatted": "7 AM",
                "data-relative-label": "7 AM"
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
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:sunrise",
                "label": "🌄 Sunrise (05:54)",
                "data-date": "2026-01-07T18:54:00.000Z",
                "data-formatted": "Sunrise (05:54) (~5:54 AM)",
                "data-relative-label": "Sunrise (05:54)"
              }
            },
            {
              "type": "text",
              "text": " "
            },
            {
              "type": "hardBreak"
            }
          ]
        },
        {
          "type": "group",
          "attrs": {
            "quantaId": "828708bc-300c-451e-8e26-dca9bc760ba7",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "1edee9be-3f3e-4ebd-8b9f-382bd4ff1db1",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Try and recall any dreams and their significance "
                },
                {
                  "type": "hashtag",
                  "attrs": {
                    "id": "tag:user-dream-journalling",
                    "label": "#dream-journalling",
                    "data-tag": "dream-journalling",
                    "data-color": "#ef4444"
                  }
                },
                {
                  "type": "text",
                  "text": " "
                },
                {
                  "type": "hardBreak"
                }
              ]
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "af127bb4-beb2-4275-8cda-3001327b3adb",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "hardBreak"
            },
            {
              "type": "hardBreak"
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
            "quantaId": "93690cbc-15af-4871-9054-df1fee1432ea",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-7-0",
                "label": "🕐 7 AM",
                "data-date": "2026-01-07T20:00:00.000Z",
                "data-formatted": "7 AM",
                "data-relative-label": "7 AM"
              }
            },
            {
              "type": "text",
              "text": "-"
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-9-0",
                "label": "🕐 9 AM",
                "data-date": "2026-01-07T22:00:00.000Z",
                "data-formatted": "9 AM",
                "data-relative-label": "9 AM"
              }
            },
            {
              "type": "hardBreak"
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "37e3f381-4381-46d5-bc7b-44d848f5a2a5",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "350804fa-247b-4bc4-8feb-2e540c0c667c",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "89021a71-0044-43c5-9d29-3e55f044f2ac",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "hardBreak"
            },
            {
              "type": "text",
              "text": " "
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
            "quantaId": "76ab17cc-18c4-4240-b6c4-aa49d217b2df",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-9-0",
                "label": "🕐 9 AM",
                "data-date": "2026-01-07T22:00:00.000Z",
                "data-formatted": "9 AM",
                "data-relative-label": "9 AM"
              }
            },
            {
              "type": "text",
              "text": " - "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-11-0",
                "label": "🕐 11 AM",
                "data-date": "2026-01-08T00:00:00.000Z",
                "data-formatted": "11 AM",
                "data-relative-label": "11 AM"
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
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "a4c0b469-2a16-4078-805d-5403a2e3f985",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "hardBreak"
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
            "quantaId": "43395ada-29bc-4c4b-a296-f9e3c0e6deac",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-11-0",
                "label": "🕐 11 AM",
                "data-date": "2026-01-08T00:00:00.000Z",
                "data-formatted": "11 AM",
                "data-relative-label": "11 AM"
              }
            },
            {
              "type": "text",
              "text": " - "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-13-0",
                "label": "🕐 1 PM",
                "data-date": "2026-01-08T02:00:00.000Z",
                "data-formatted": "1 PM",
                "data-relative-label": "1 PM"
              }
            },
            {
              "type": "text",
              "text": " "
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "906c29e3-b25e-45f6-a610-79164767d212",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "hardBreak"
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:solar-noon",
                "label": "☀️ Local Solar Noon (13:02)",
                "data-date": "2026-01-08T02:02:00.000Z",
                "data-formatted": "Local Solar Noon (13:02) (~1:02 PM)",
                "data-relative-label": "Local Solar Noon (13:02)"
              }
            },
            {
              "type": "hardBreak"
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "a81226ba-d23d-4037-bf7b-03e04705f03f",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "hardBreak"
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
            "quantaId": "e83afa8a-0df3-49f0-88b8-4470baa3d259",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-13-0",
                "label": "🕐 1 PM",
                "data-date": "2026-01-08T02:00:00.000Z",
                "data-formatted": "1 PM",
                "data-relative-label": "1 PM"
              }
            },
            {
              "type": "text",
              "text": " - "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-15-0",
                "label": "🕐 3 PM",
                "data-date": "2026-01-08T04:00:00.000Z",
                "data-formatted": "3 PM",
                "data-relative-label": "3 PM"
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
              "type": "hardBreak"
            },
            {
              "type": "hardBreak"
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
            "quantaId": "2ad81da7-be3d-4aaf-85a9-60185d67a8d6",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-15-0",
                "label": "🕐 3 PM",
                "data-date": "2026-01-08T04:00:00.000Z",
                "data-formatted": "3 PM",
                "data-relative-label": "3 PM"
              }
            },
            {
              "type": "text",
              "text": " - "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-17-0",
                "label": "🕐 5 PM",
                "data-date": "2026-01-08T06:00:00.000Z",
                "data-formatted": "5 PM",
                "data-relative-label": "5 PM"
              }
            },
            {
              "type": "text",
              "text": " "
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "34d82948-24b5-4d78-a739-db36276b74f0",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "hardBreak"
            },
            {
              "type": "hardBreak"
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "5fd2ec17-24b4-47e9-802e-2b676236d311",
            "textAlign": "left",
            "indent": 0
          }
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
            "quantaId": "414c7b2b-020f-4152-ad8b-afc60ea6e017",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-17-0",
                "label": "🕐 5 PM",
                "data-date": "2026-01-08T06:00:00.000Z",
                "data-formatted": "5 PM",
                "data-relative-label": "5 PM"
              }
            },
            {
              "type": "text",
              "text": " - "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-19-0",
                "label": "🕐 7 PM",
                "data-date": "2026-01-08T08:00:00.000Z",
                "data-formatted": "7 PM",
                "data-relative-label": "7 PM"
              }
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "9153c0a5-3d8d-4424-bac4-da16bc388f06",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "hardBreak"
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "612a6a7d-83a1-4d67-86c0-08c6aa3b2447",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "d627f840-54aa-414c-a104-1f9ceb8ae6fa",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "cc0b29b0-084e-4d45-be02-394e064e4b13",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "982cff36-875e-456c-899d-33de4422a352",
            "textAlign": "left",
            "indent": 0
          }
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
            "quantaId": "4ab97f84-e064-41ba-8908-8f66cc4be06b",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-19-0",
                "label": "🕐 7 PM",
                "data-date": "2026-01-08T08:00:00.000Z",
                "data-formatted": "7 PM",
                "data-relative-label": "7 PM"
              }
            },
            {
              "type": "text",
              "text": " - "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-21-0",
                "label": "🕐 9 PM",
                "data-date": "2026-01-08T10:00:00.000Z",
                "data-formatted": "9 PM",
                "data-relative-label": "9 PM"
              }
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
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "7bc38d18-aac1-4f9a-99f1-62d7ed204691",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:sunset",
                "label": "🌇 Sunset (20:10)",
                "data-date": "2026-01-08T09:10:00.000Z",
                "data-formatted": "Sunset (20:10) (~8:10 PM)",
                "data-relative-label": "Sunset (20:10)"
              }
            },
            {
              "type": "text",
              "text": " "
            }
          ]
        },
        {
          "type": "group",
          "attrs": {
            "quantaId": "faa92d17-4e31-4aa1-8399-bc9b8376807d",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "af4c68af-74c2-4dc6-a6f3-65b1cc85e1d4",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "In a calm and collected state review the happenings of the day "
                },
                {
                  "type": "hashtag",
                  "attrs": {
                    "id": "tag:user-daily-dying",
                    "label": "#daily-dying",
                    "data-tag": "daily-dying",
                    "data-color": "#10b981"
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
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "420228dc-3737-4221-abdb-3ae937633071",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "d0b6d9f7-b12b-4430-bba4-72bd9d565ff3",
                "textAlign": "left",
                "indent": 0
              }
            }
          ]
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
