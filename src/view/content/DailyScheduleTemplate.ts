import { JSONContent } from "@tiptap/react";
import { v4 as uuidv4 } from 'uuid';

// Generate a fresh Daily Schedule Template with unique IDs each time
// This function should be called when applying the template, not at import time
export const getDailyScheduleTemplate = (): JSONContent => ({
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
          "text": "📋 Daily Schedule"
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
          "text": "🌅 Morning"
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
                  "text": "Wake up routine"
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
                  "text": "Morning exercise"
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
                  "text": "Breakfast"
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
          "text": "☀️ Afternoon"
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
                  "text": "Focused work block"
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
                  "text": "Lunch break"
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
                  "text": "Meetings / Collaboration"
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
          "text": "🌙 Evening"
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
                  "text": "Wind down"
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
                  "text": "Dinner"
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
                  "text": "Review day / Plan tomorrow"
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
          "text": "📝 Notes"
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
export const DailyScheduleTemplate = getDailyScheduleTemplate();

export default getDailyScheduleTemplate;
