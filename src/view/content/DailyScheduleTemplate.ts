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
        "quantaId": "43761642-9727-4550-8ee0-2a3ba9ad0712",
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": "4040aa69-2e03-46df-b66b-caece120701c",
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
            "quantaId": "c4468f18-8927-40f3-bb3a-d3a7d00e9aef",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "aca1d22f-635f-462c-bb88-1593cbd6b65b",
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
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "d4f30bff-cec6-4bb5-ab4e-dd2150a07a69",
                "textAlign": "left",
                "indent": 0
              }
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
                        "quantaId": "6a603398-3fba-40d7-b87e-ebdf8818db84",
                        "textAlign": "left",
                        "indent": 0
                      },
                      "content": [
                        {
                          "type": "text",
                          "text": "Make sure to work on Kairos Lifemap for at least 5 deep hours"
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "3aca25a6-389c-46af-ab54-3928aff29859",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "a78ed0db-154f-48d1-9abe-369b62dc98c6",
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
                "quantaId": "d465de51-47e1-4d59-8ce0-fe766365a7d8",
                "textAlign": "left",
                "indent": 0
              }
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
                        "quantaId": "bc59511c-1073-4a73-b0ae-d1c7a844af05",
                        "textAlign": "left",
                        "indent": 0
                      },
                      "content": [
                        {
                          "type": "text",
                          "text": "Post a a build update on Arrayah WhatsApp chat at around "
                        },
                        {
                          "type": "timepoint",
                          "attrs": {
                            "id": "timepoint:time-16-0",
                            "label": "🕐 4 PM",
                            "data-date": "2026-01-14T05:00:00.000Z",
                            "data-formatted": "4 PM",
                            "data-relative-label": "4 PM"
                          }
                        },
                        {
                          "type": "text",
                          "text": " "
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "7219eabd-8bd9-4e01-b338-ea27d05bad81",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "3b92400e-d0cd-4c84-824b-e0c98bb63596",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "94fc622d-d724-45ae-a00a-71606da033c0",
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
                "quantaId": "243341ae-4c20-4715-80f9-c8d597a4712f",
                "textAlign": "left",
                "indent": 0
              }
            },
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "3a27d72c-c93a-4f2f-b6b0-1a9a123ffdca",
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
            "quantaId": "dece9fb4-9f18-4fcb-95f1-b90324c04fb0",
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
            "quantaId": "ff7cafe8-6ec1-4554-9c7e-4c82f1565938",
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
            "quantaId": "df58c640-ba23-412a-bb1e-fb9cc3bab454",
            "textAlign": "left",
            "indent": 0
          }
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
                    "quantaId": "01299e28-06a0-47ff-bb22-f06c7db0e6cd",
                    "textAlign": "left",
                    "indent": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "Eat lunch before 7.30am "
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "f1da7753-e5a5-4e95-970c-82cdd605b857",
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
            "quantaId": "847fdc52-fa25-4d8c-b585-954c120fd046",
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
            "quantaId": "cd6733d0-21c5-4474-840a-bb63fdd15469",
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
            "quantaId": "1232226b-18d8-448d-aff1-d862ffdc4310",
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
            "quantaId": "9a56b9e8-a06b-40c6-827a-e8a0abf989db",
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
                    "quantaId": "930930b6-f0e7-4fb8-8ff3-6af97f00da2f",
                    "textAlign": "left",
                    "indent": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "Eat lunch before 11am"
                    },
                    {
                      "type": "hardBreak"
                    },
                    {
                      "type": "hardBreak"
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
                    }
                  ]
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
            "quantaId": "42bdb88e-df86-435b-924a-81f61de45e7a",
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
            "quantaId": "91393b9e-c4f3-40b0-8e68-2e796243a8e4",
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
            "quantaId": "bb917a0e-e525-4370-a495-389097b81cd4",
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
            "quantaId": "70652ddb-0d4d-4b66-9198-4b3eb9536d06",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "text",
              "text": "Learn Mandarin for "
            },
            {
              "type": "pomodoro",
              "attrs": {
                "duration": 3600,
                "label": "1 hour",
                "emoji": "⏳",
                "status": "unrealized",
                "startTime": null,
                "endTime": null,
                "id": "pomodoro:1767926123244"
              }
            },
            {
              "type": "text",
              "text": " at "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-16-0",
                "label": "🕐 4 PM",
                "data-date": "2026-01-14T05:00:00.000Z",
                "data-formatted": "4 PM",
                "data-relative-label": "4 PM"
              }
            },
            {
              "type": "text",
              "text": " "
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
                    "quantaId": "79d74a27-9e51-49e6-9336-d0af77b6dc9a",
                    "textAlign": "left",
                    "indent": 0
                  },
                  "content": [
                    {
                      "type": "text",
                      "text": "Eat supper before 5pm"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "c4d872e5-8360-43fc-b5cc-a689f231927d",
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
            "quantaId": "58da83d4-f075-419b-bc4b-ebeec7d3268f",
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
            "quantaId": "1e4b7d8e-c54a-45b4-8604-00c25087d1d2",
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
            "quantaId": "e489423f-127e-49f3-bfd4-60fa2bd2ce70",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "bad358d3-fa8c-4ae7-916b-38c2c54cd507",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "54ed27ee-a4ea-4bf4-bcb1-e41779d6ca8d",
            "textAlign": "left",
            "indent": 0
          }
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "a914560c-b73f-4048-ade2-c537baca6dcd",
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
            "quantaId": "342303a1-6bd4-4dcc-8ef9-e71e17642c7a",
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
              "type": "text",
              "text": "Call Mum around "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-19-0",
                "label": "🕐 7 PM",
                "data-date": "2026-01-09T08:00:00.000Z",
                "data-formatted": "7 PM",
                "data-relative-label": "7 PM"
              }
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "hardBreak"
            },
            {
              "type": "text",
              "text": "Practice 太极和冥想 for about "
            },
            {
              "type": "pomodoro",
              "attrs": {
                "duration": 3600,
                "label": "1 hour",
                "emoji": "⏳",
                "status": "unrealized",
                "startTime": null,
                "endTime": null,
                "id": "pomodoro:1767851677558"
              }
            },
            {
              "type": "text",
              "text": " before "
            },
            {
              "type": "timepoint",
              "attrs": {
                "id": "timepoint:time-19-30",
                "label": "🕐 7:30 PM",
                "data-date": "2026-01-08T08:30:00.000Z",
                "data-formatted": "7:30 PM",
                "data-relative-label": "7:30 PM"
              }
            },
            {
              "type": "text",
              "text": " , give myself ample time."
            },
            {
              "type": "hardBreak"
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "f0949221-98cb-4987-b189-5f4c6611bf30",
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
            "quantaId": "8dcdc427-9bfd-4fb2-b528-268346d72d32",
            "pathos": 0,
            "backgroundColor": "#EFEFEF",
            "lens": "identity",
            "collapsed": false
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": "df68be02-d92d-432c-bf67-eac8ca4968fc",
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Spend "
                },
                {
                  "type": "pomodoro",
                  "attrs": {
                    "duration": 900,
                    "label": "15 minutes",
                    "emoji": "⏳",
                    "status": "unrealized",
                    "startTime": null,
                    "endTime": null,
                    "id": "pomodoro:1768203178106"
                  }
                },
                {
                  "type": "text",
                  "text": "on Deep Mind meditation. Write down insights afterwards.  "
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
          "type": "paragraph",
          "attrs": {
            "quantaId": "733533c2-5429-4e9e-b2ba-d15ab091779a",
            "textAlign": "left",
            "indent": 0
          },
          "content": [
            {
              "type": "text",
              "text": " "
            }
          ]
        },
        {
          "type": "paragraph",
          "attrs": {
            "quantaId": "4666fda5-dc62-4794-8a4e-dd1ebfa4d2b6",
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
 * Generate a fresh Daily Schedule Template with unique IDs each time
 * This function should be called when applying the template, not at import time
 */
export const getDailyScheduleTemplate = (): JSONContent => {
  return regenerateQuantaIds(TEMPLATE_SCHEMA);
};

// Keep backward compatibility - export a static version for existing imports
export const DailyScheduleTemplate = getDailyScheduleTemplate();

export default getDailyScheduleTemplate;
