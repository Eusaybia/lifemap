import { JSONContent } from "@tiptap/react";
import { v4 as uuidv4 } from 'uuid';

// Generate a fresh Weekly Schedule Template with unique IDs each time
// This function should be called when applying the template, not at import time
export const getWeeklyScheduleTemplate = (): JSONContent => ({
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "28px"
              }
            }
          ],
          "text": "📆 Weekly Schedule"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "🎯 Weekly Goals"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Primary focus for the week"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Secondary objectives"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Habits to maintain"
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
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "📅 Monday"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Week planning session"
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
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "📅 Tuesday"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Deep work block"
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
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "📅 Wednesday"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Mid-week check-in"
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
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "📅 Thursday"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Project progress review"
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
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "📅 Friday"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Wrap up loose ends"
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
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "📅 Weekend"
        }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Rest and recharge"
                }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "attrs": {
            "quantaId": uuidv4()
          },
          "content": [
            {
              "type": "paragraph",
              "attrs": {
                "quantaId": uuidv4(),
                "textAlign": "left",
                "indent": 0
              },
              "content": [
                {
                  "type": "text",
                  "text": "Personal projects"
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
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      },
      "content": [
        {
          "type": "text",
          "marks": [
            {
              "type": "textStyle",
              "attrs": {
                "color": "",
                "fontFamily": "EB Garamond",
                "fontSize": "22px"
              }
            }
          ],
          "text": "📝 Weekly Reflection"
        }
      ]
    },
    {
      "type": "paragraph",
      "attrs": {
        "quantaId": uuidv4(),
        "textAlign": "left",
        "indent": 0
      }
    }
  ]
});

// Keep backward compatibility - export a static version for existing imports
export const WeeklyScheduleTemplate = getWeeklyScheduleTemplate();

export default getWeeklyScheduleTemplate;

