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
        "type": "paragraph",
        "attrs": {
          "quantaId": "e604cffa-358e-4c43-8c61-c7d226637042",
          "textAlign": "left",
          "indent": 0
        }
      },
      {
        "type": "paragraph",
        "attrs": {
          "quantaId": "6cb988c9-9622-4611-9e43-76b5c0c30fbe",
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
              "quantaId": "b17544cd-6e44-49d0-a9e8-24d8d66bbf93",
              "pathos": 0,
              "backgroundColor": "#EFEFEF",
              "lens": "identity",
              "collapsed": false
            },
            "content": [
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "0d380485-fcd8-4ddb-8cca-534a6e3e86ab",
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
                  "quantaId": "c5563450-255a-4b7f-9845-48ebe425f1e5",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "8c642167-3fa6-49bc-9e8b-0683ab48eb60",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "442d610e-43bc-49ad-aec0-93a0d82bd6ee",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "5cb92d88-0050-48a3-95fc-2dcaa47a3899",
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
                  "quantaId": "75285be4-ec80-43ec-8897-e575bff72133",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "3463bdfb-ddf4-417b-80b5-0ceda3c60eb4",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "0250f7b8-f511-4a37-89c3-1f592b04d531",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "f75e06de-9cc1-4377-8128-8d99a756f9ab",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "74292ad8-cee5-4b67-9dd7-d4a7fa235a26",
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
                  "quantaId": "52da6249-813e-4091-aaa0-dafbbea2dff2",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "21d6a478-39aa-46b7-9034-6282fb62c014",
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
              "quantaId": "770948a2-3a01-4a7d-99d7-66b11916bb23",
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
              "quantaId": "7b444179-3da0-4527-a666-63cdd2aaa7a4",
              "pathos": 0,
              "backgroundColor": "#EFEFEF",
              "lens": "identity",
              "collapsed": false
            },
            "content": [
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "e8070cb1-64f0-4ebe-bbb8-37227ec3a998",
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
              "quantaId": "88464204-cdfb-4066-9e2b-5e7cd09f1518",
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
              "quantaId": "b4cbe285-8a41-4e8f-84aa-e513dded3bec",
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
              "quantaId": "11a7ecf4-fd9b-4507-8d8e-775fb91a7343",
              "textAlign": "left",
              "indent": 0
            }
          },
          {
            "type": "paragraph",
            "attrs": {
              "quantaId": "bfd54c0e-f2a2-45d3-b95b-6731dec397a0",
              "textAlign": "left",
              "indent": 0
            }
          },
          {
            "type": "paragraph",
            "attrs": {
              "quantaId": "cb3e3499-e1d4-430b-90a5-1c81ddfc56b0",
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
              "quantaId": "2e7cec58-a63a-4260-9660-f24cbf898ef8",
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
              "quantaId": "75d43d56-5edc-41d2-99a0-3874095572d8",
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
              "quantaId": "f1ea5bec-b573-4896-bd20-e5133cedfa2f",
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
              "quantaId": "1ee9892b-0f2c-416e-ad1a-a38c422e74e7",
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
              "quantaId": "be6d4910-bb31-44da-a2e6-c990ece0f0a4",
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
              "quantaId": "8a9427e8-0994-4ccf-a567-3a02be7abd25",
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
              "quantaId": "6aafe0e4-5b54-40b5-89b5-2b5a54005ade",
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
              "quantaId": "64da84a1-adae-4dcc-ae3c-39dc8037532a",
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
              "quantaId": "d91a12e9-1cb4-45d5-b2a3-32882b54652c",
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
              "quantaId": "5e1a2360-2740-44eb-a5f9-5bd4766b9f20",
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
              "quantaId": "f9b425ce-ce00-45da-a66a-7528093ed099",
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
              "quantaId": "150fa6bb-fb17-4bc6-8642-5ba648f39c16",
              "textAlign": "left",
              "indent": 0
            }
          },
          {
            "type": "paragraph",
            "attrs": {
              "quantaId": "d788e120-15c0-45a8-811d-ebf179cf2049",
              "textAlign": "left",
              "indent": 0
            }
          },
          {
            "type": "paragraph",
            "attrs": {
              "quantaId": "da1af1e4-989e-44a5-8721-6df7626f3d56",
              "textAlign": "left",
              "indent": 0
            }
          },
          {
            "type": "paragraph",
            "attrs": {
              "quantaId": "c93ddd23-c7ed-4980-9398-aa524c75ed55",
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
              "quantaId": "02d6eb84-bbb4-419c-bc3c-d0bddf02eabf",
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
              "quantaId": "c2e306ab-3b7b-42b9-8e1a-5ef974c38e99",
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
              "quantaId": "e86397a6-1cd5-4c00-8377-e41c5763e70a",
              "pathos": 0,
              "backgroundColor": "#EFEFEF",
              "lens": "identity",
              "collapsed": false
            },
            "content": [
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "4b095da1-6992-4cb9-aa89-aaf9a23cbdfc",
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
                  "quantaId": "73de41e0-8267-4ebb-ac21-f8d679f9fd88",
                  "textAlign": "left",
                  "indent": 0
                }
              },
              {
                "type": "paragraph",
                "attrs": {
                  "quantaId": "d3c08a57-2762-4a9d-8d2e-67f8e3b0c829",
                  "textAlign": "left",
                  "indent": 0
                }
              }
            ]
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

