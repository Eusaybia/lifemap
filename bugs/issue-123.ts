import { JSONContent } from "@tiptap/core";

// issue-123
// If I delete the paragraph node between the two maths node and the beach bbq group, the beach bbq group gets deleted

export const issue123DocumentState: JSONContent = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "d25373ec-21a6-4b47-bc7f-c1a589c2bd5e",
                "textAlign": "left",
                "indent": 0
            },
            "content": [
                {
                    "type": "text",
                    "marks": [
                        {
                            "type": "highlight",
                            "attrs": {
                                "color": "#ffea00"
                            }
                        },
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": null,
                                "fontFamily": "EB Garamond",
                                "fontSize": "36px"
                            }
                        }
                    ],
                    "text": "​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​Eusaybia Lifemap​​​​​​​​"
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "fc124e3e-bec0-43fd-9977-a6e227ca5f87",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "d910c901-ce22-48ea-8341-a22a4c2dcfc6",
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
                                "color": null,
                                "fontFamily": "Inter",
                                "fontSize": "16px"
                            }
                        }
                    ],
                    "text": "Lifemap is a next-generation collaborative life organisation tool. It's based off data types and ways to view them called lenses. Both types and lenses are user customisable, so in a sense, this software contains functionality that makes it clos"
                },
                {
                    "type": "text",
                    "marks": [
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": null,
                                "fontFamily": null,
                                "fontSize": "16px"
                            }
                        }
                    ],
                    "text": "er to a programming language rather than a traditional note taking tool. Feel free to play around with the example below."
                },
                {
                    "type": "text",
                    "marks": [
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": null,
                                "fontFamily": "Arial",
                                "fontSize": "16px"
                            }
                        }
                    ],
                    "text": " "
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "fc67fa5e-c1c2-43d4-b83a-1640e244c333",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "location",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "98ff6cbc-6a9e-497d-abf0-2195fcb86951",
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
            "type": "paragraph",
            "attrs": {
                "qiId": "bbaafff2-d7ad-4245-b021-7a0a55468b38",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "4fe9b087-4215-4040-8822-120b973cdbda",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "threeD",
            "attrs": {
                "src": "https://sketchfab.com/models/2aaa2d57cd99430abed9d35b2fee97a0/embed?autostart=1&preload=1&transparent=1"
            },
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "e34ddb8d-c8bf-4035-be60-1acb97946a12",
                        "textAlign": "left",
                        "indent": 0
                    }
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "0aaad5ee-2aff-47fe-8f89-70a7211725ea",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "03143349-0ef9-4727-9915-c76c05c28e91",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "group",
            "attrs": {
                "qiId": "d1a87fff-eaee-4b94-b357-41a424e92fe9"
            },
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "0e1364cb-fc75-49ba-95f4-09bf5f025f5e",
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
                            "text": "Scratchpad"
                        }
                    ]
                },
                {
                    "type": "bulletList",
                    "attrs": {
                        "tight": true
                    },
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "attrs": {
                                        "qiId": "edbee940-681e-4c23-960a-d5ff86c4faf9",
                                        "textAlign": "left",
                                        "indent": 0
                                    },
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": "When you insert a component, you actually can see the React Preview. When you actually insert it, it smoothly transitions onto the page using a view transition."
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
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
                            "text": "​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​"
                        }
                    ]
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "bb83a271-6621-42f6-8aa2-2bb275e35e49",
                "textAlign": "left",
                "indent": 0
            },
            "content": [
                {
                    "type": "text",
                    "marks": [
                        {
                            "type": "highlight",
                            "attrs": {
                                "color": null
                            }
                        },
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": "",
                                "fontFamily": "EB Garamond",
                                "fontSize": "36px"
                            }
                        }
                    ],
                    "text": "​​​​​​​​​​​​​​​​​​​​​​​​"
                },
                {
                    "type": "text",
                    "marks": [
                        {
                            "type": "highlight",
                            "attrs": {
                                "color": null
                            }
                        },
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": "",
                                "fontFamily": "Inter",
                                "fontSize": "36px"
                            }
                        }
                    ],
                    "text": "​​​​​​​​"
                },
                {
                    "type": "text",
                    "marks": [
                        {
                            "type": "highlight",
                            "attrs": {
                                "color": null
                            }
                        },
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": "",
                                "fontFamily": "EB Garamond",
                                "fontSize": "36px"
                            }
                        }
                    ],
                    "text": "​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​"
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "541aad96-5ac1-4c2a-b61b-cf38b78b41c8",
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
                                "fontSize": "36px"
                            }
                        }
                    ],
                    "text": "Lifemap Things for Consideration"
                }
            ]
        },
        {
            "type": "bulletList",
            "attrs": {
                "tight": true
            },
            "content": [
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "3b1fba5e-5446-4622-ae5b-80eb4fb47d7b",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Get noticed by Apple"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "8a27501a-925a-4f8e-9aa1-472b3539ef90",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Get invited to WWDC 2024"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "25a97041-6f7f-4e1b-95df-5bcb6dda0283",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Build a version of Lifemap for the Vision Pro"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "056fa54b-2bf9-47cb-926e-87b1fd9b83cd",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "General components"
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
                                                "qiId": "3fb70054-9dbf-48a4-aeee-e686019e1bb0",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Add a handle for all components"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "b63cd1e1-6095-459f-b285-6e7bde837ffb",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Fix all wrapping input rules such that they capture the text being matched, refer here: "
                                                },
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "link",
                                                            "attrs": {
                                                                "href": "https://github.com/ueberdosis/tiptap/blob/main/packages/extension-code-block/src/code-block.ts",
                                                                "target": "_blank",
                                                                "class": null
                                                            }
                                                        }
                                                    ],
                                                    "text": "https://github.com/ueberdosis/tiptap/blob/main/packages/extension-code-block/src/code-block.ts"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "ad247191-70e5-4b39-98c9-6fa15bbb6d7d",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Change borderRadius from hard coded values to use Theme value"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "fd024893-adc8-4d33-b690-900c0ef4c299",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Rich Text"
                                }
                            ]
                        },
                        {
                            "type": "taskList",
                            "content": [
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": true
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "f3a41081-41ad-4c8b-9099-446a350294cd",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Make sure clicking bold unbolds text"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": true
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "c7bbce86-5791-4550-a0ec-0b847abff610",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Update list handling to latest version"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": true
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "d38dcbaa-5798-46f2-b0cc-ca2476ecff83",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Is it possible to have bullet list items and check list items with the same indentation?"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "357aad80-a08f-4b5b-8c4e-e8d8fef8eff0",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Make sure that text styles are overridden in certain components like Messages. This way, embedding a Message inside a Comment, won't cause text to have the wrong text styles"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "0b65767d-b9aa-4f3a-abf3-32699f6bfd1a",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Fix highlight not wrapping height"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "cfc1d826-fbbe-428e-9f54-5c5e3576b4cb",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Fix this bug: Yjs was already imported. This breaks constructor checks and will lead to issues! - "
                                                },
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "link",
                                                            "attrs": {
                                                                "href": "https://github.com/yjs/yjs/issues/438",
                                                                "target": "_blank",
                                                                "class": null
                                                            }
                                                        }
                                                    ],
                                                    "text": "https://github.com/yjs/yjs/issues/438"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "8a608a36-816f-4cbd-b490-6e2d7294097b",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Groups"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "97cdb6d3-c10d-4fcc-94d0-28ba506c7be2",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Add drag handle to other components like messages"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "61211c36-7aaa-43af-863f-93ad9b344c46",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Also ensure that when a group is selected, it always shows the selection styling"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "241292e9-e125-4ce7-a0f9-4e69659d762b",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Flow Menu"
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
                                                "qiId": "2bba0e8f-5245-437f-859a-afa71018e28a",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Decide on a design for qi insertions"
                                                }
                                            ]
                                        }
                                    ]
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
                                                "qiId": "020fd932-8526-445a-aedf-866565b0b3e3",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Decide on a design for actions"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "6bf6b501-e7c1-4211-9705-08b01fae342d",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Fix backdrop-filter blur not working on Safari mobile"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "4cea348d-5db6-423c-a124-4880d9e66059",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Design an interface that replaces the bottom tab bar and its functionality in an extra compact and understandable way"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "b77253f9-b7f3-4f19-b86e-ff6439603173",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Convert the text colour and highlight colour to a flow switch with different pre-selected colours"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "91c13da5-2e60-45ac-86fb-2a01e5910c7b",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Fix sound bug"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "ade93158-5a34-473c-8479-e2ec6d49d24a",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Change to an AI generated click"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "b5badb64-84e6-4a1c-8fef-a2cf7f9cba3c",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Mobile responsiveness"
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "b572f709-ec72-475d-9eba-0d138f9ae993",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Authentication"
                                }
                            ]
                        }
                    ]
                },
                {
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "042fc9b2-f054-4a27-903c-155ea9d0d6c3",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Syncing, Reliability "
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "1b42f855-7b58-4754-904b-fc6202968467",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Whenever a bug shows up, save the JSON output, and describe the bug "
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "52b2e3b5-82c6-4720-88fe-0139da5142eb",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "If I delete the paragraph node between the two maths node and the beach bbq group, the beach bbq group gets deleted - "
                                                },
                                                {
                                                    "type": "mention",
                                                    "attrs": {
                                                        "qiId": "d165f42b-3493-4280-ab52-df847f5d4fe4",
                                                        "id": "25",
                                                        "label": " ⚠️ issue-123"
                                                    }
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
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "e0348109-c262-4694-882c-3bd6641be676",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Update JWT auth token generator "
                                                },
                                                {
                                                    "type": "mention",
                                                    "attrs": {
                                                        "qiId": "1b0b1c29-b607-4798-b2da-c133f6b84bcb",
                                                        "id": "25",
                                                        "label": "🚧 in progress"
                                                    }
                                                }
                                            ]
                                        },
                                        {
                                            "type": "bulletList",
                                            "attrs": {
                                                "tight": true
                                            },
                                            "content": [
                                                {
                                                    "type": "listItem",
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "7f05c3ef-98fd-4791-99c9-2772cd911055",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "marks": [
                                                                        {
                                                                            "type": "link",
                                                                            "attrs": {
                                                                                "href": "https://discord.com/channels/818568566479257641/841708462500085810/1139075770698956810",
                                                                                "target": "_blank",
                                                                                "class": null
                                                                            }
                                                                        }
                                                                    ],
                                                                    "text": "https://discord.com/channels/818568566479257641/841708462500085810/1139075770698956810"
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
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "545a8a33-4aa5-4e63-aa46-bb21661d6042",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Seems like if an older version of a client syncs with a newer one, then the extensions in the newer one are parsed away by the older client."
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "aa50594d-11f4-4ce4-b392-9e7832d75766",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Buttons and logic"
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
                                                "qiId": "4fb14f7b-0947-4e66-8829-af9e13e7cd45",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Simple solution to have buttons "
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "d4f31298-f8d6-4b46-ae92-9415d1df5b73",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Kairos"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "0165ae23-a0c7-4e52-8152-fb0e8745829c",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "How to model constructs like, this depends on that? These constructs are also directly applicable to programming language constructs."
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "f22e7923-7ddf-4f1a-9c23-2c8d300006b8",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Fi"
                                },
                                {
                                    "type": "text",
                                    "marks": [
                                        {
                                            "type": "calculation"
                                        }
                                    ],
                                    "text": "nesse"
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
                                                "qiId": "ebd901c8-296f-4ad0-93a9-5c3b9919d6ac",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "calculation"
                                                        }
                                                    ],
                                                    "text": "Decide on design"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "db73b1a7-b177-4a10-b197-83d7d9681332",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "calculation"
                                                        }
                                                    ],
                                                    "text": "Have finesse for emotion (in tags) too"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "f2e23ed8-e2e7-4b74-9230-8cffeec9370f",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "marks": [
                                        {
                                            "type": "calculation"
                                        }
                                    ],
                                    "text": "Thura"
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
                                                "qiId": "5938067c-a6e8-4584-a890-4e453061553e",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "calculation"
                                                        }
                                                    ],
                                                    "text": "Allow for transclusion of tags, for usage replacing this syntax { event }"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": false
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "41a68c51-d754-4b48-9d3b-bf4af794eca1",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "calculation"
                                                        }
                                                    ],
                                                    "text": "Allow for transclusion of other docs e.g. Such that I can see the progress of Lifemap sub apps in this consideration view"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "2044da3d-02e1-411c-88d3-15640a99007c",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "marks": [
                                        {
                                            "type": "calculation"
                                        }
                                    ],
                                    "text": "靈"
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
                                                "qiId": "0a2ffb3f-25b4-469b-bc94-026ec2ac4d94",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "calculation"
                                                        }
                                                    ],
                                                    "text": "Allow for tags to be edited without recreating them"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "16d94cef-3b7a-4d71-95d9-0b7a7fd4f0d6",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "marks": [
                                        {
                                            "type": "calculation"
                                        }
                                    ],
                                    "text": "Natural Scientific Calculator "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "f94eec01-b571-4fab-a316-1ed0ca0dd5ea",
                                        "id": "25",
                                        "label": " ‼️ priority 1"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": " "
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "09194314-3960-4cf5-bf3c-f6939178698c",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "calculation"
                                                        }
                                                    ],
                                                    "text": "Release pre-beta of NSC 2.0 to existing beta testers and closed community"
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
                                                                "qiId": "be85eb80-9c73-42a3-9530-a2aa272c5b3c",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "marks": [
                                                                        {
                                                                            "type": "calculation"
                                                                        }
                                                                    ],
                                                                    "text": "Consider, how do you handle existing formula library? Could just start fresh..."
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "6c5a7e7b-0cf0-40a3-818a-e3ed5f99d226",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "text": "Identify what's causing the corner FlowMenu rendering bug "
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "72024536-feba-426d-9cda-9e27a1652e21",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "text": "Disable the FlowMenu when dragging "
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "649e0e03-29c3-4309-b259-b2f89f471eee",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "text": "Get the maths component automatically updating after I've changed the lens, rather than having to refresh the page "
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "36ad7531-af8a-481d-a1e6-71a5143ef0cc",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "text": "Fix up transclusion such that I can transclude another node and then change the lens"
                                                                }
                                                            ]
                                                        }
                                                    ]
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "e41b46d5-f41b-4e0d-9710-b56fe0e3030c",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "marks": [
                                        {
                                            "type": "calculation"
                                        }
                                    ],
                                    "text": "Sales Guide"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "4ef90173-77aa-481e-80be-e3098172b221",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "marks": [
                                                        {
                                                            "type": "calculation"
                                                        }
                                                    ],
                                                    "text": "Get something in the hands of Fung as soon as possible"
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
                                                                "qiId": "4d429868-888b-4d2b-b7ef-71c26be3162d",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "marks": [
                                                                        {
                                                                            "type": "calculation"
                                                                        }
                                                                    ],
                                                                    "text": "Adhere to design as closely as possible  "
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "da372d7d-5a8f-4cf7-acd6-a77c6ee458f3",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "marks": [
                                                                        {
                                                                            "type": "calculation"
                                                                        }
                                                                    ],
                                                                    "text": "Change key value to simply insert a component that has the key and a tag with the value. "
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "94ae1460-fdd1-47f8-9500-f7c6402a726d",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "marks": [
                                                                        {
                                                                            "type": "calculation"
                                                                        }
                                                                    ],
                                                                    "text": "Add logging in and authentication"
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "722f7b33-a424-41bc-adc3-4481d2983494",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "marks": [
                                                                        {
                                                                            "type": "calculation"
                                                                        }
                                                                    ],
                                                                    "text": "Add buttons"
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "taskItem",
                                                    "attrs": {
                                                        "checked": false
                                                    },
                                                    "content": [
                                                        {
                                                            "type": "paragraph",
                                                            "attrs": {
                                                                "qiId": "f421554e-a1ef-4317-833b-94cf4f71ffd6",
                                                                "textAlign": "left",
                                                                "indent": 0
                                                            },
                                                            "content": [
                                                                {
                                                                    "type": "text",
                                                                    "marks": [
                                                                        {
                                                                            "type": "calculation"
                                                                        }
                                                                    ],
                                                                    "text": "Add Thura"
                                                                }
                                                            ]
                                                        }
                                                    ]
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "4cdcc75d-c27a-4bc8-b4b8-8cf794905446",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Finesse"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "cc671f1e-33be-4f54-8ebd-40f004711687",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Create basic version where if a node contains an energetic node, then it gets a glow"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "4c8b4fa7-8474-4b7f-973b-d7c83b3ef27d",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Atlas"
                                }
                            ]
                        },
                        {
                            "type": "taskList",
                            "content": [
                                {
                                    "type": "taskItem",
                                    "attrs": {
                                        "checked": true
                                    },
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "d748d104-a74b-46b2-aa7f-52e6f6859dd2",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Change it to react mapbox"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "9a9fdd49-fccc-4d49-9111-7fde02fb04ff",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Kairos"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "97ffe2c3-21bd-491a-a485-7d9884218b93",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Get something that Bobby, Morgan and I can use to track time and do pomodoro sessions together"
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "7ff7e49a-b8a8-41e0-981d-304759acae50",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Get something that can replace Google Scheduling "
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "94ae1460-fdd1-47f8-9500-f7c6402a726d",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Koinia"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "263970a3-d6f4-420e-878a-212f9a4e28fe",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Get something that Jeffrey, Maxine, Ehssan and I can use as soon as possible. I want to organise my next work from nature session with this."
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "cca76199-588c-4594-81e3-b5e4dfaa3249",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Elysion"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "b7f490a0-4300-4e89-af1f-0ec4c2ec2051",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Get something that Ryan and I could use"
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
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "3cf3667a-38ec-42ab-a59b-0a5218e33859",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Lifemap"
                                }
                            ]
                        },
                        {
                            "type": "bulletList",
                            "attrs": {
                                "tight": true
                            },
                            "content": [
                                {
                                    "type": "listItem",
                                    "content": [
                                        {
                                            "type": "paragraph",
                                            "attrs": {
                                                "qiId": "7a6797c7-6f39-40b5-ba6b-bb763f210e30",
                                                "textAlign": "left",
                                                "indent": 0
                                            },
                                            "content": [
                                                {
                                                    "type": "text",
                                                    "text": "Get something that can replace Google Docs for my agendas with Rizky and Soham"
                                                }
                                            ]
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
            "type": "paragraph",
            "attrs": {
                "qiId": "a3cb52da-c7c5-4e09-a30a-a9ee76f05567",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "math",
            "attrs": {
                "lensDisplay": "natural",
                "lensEvaluation": "evaluate",
                "equationValue": "12"
            },
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "8aa3cbe1-5480-4e87-a64e-0008bd92039d",
                        "textAlign": "left",
                        "indent": 0
                    }
                }
            ]
        },
        {
            "type": "math",
            "attrs": {
                "lensDisplay": "natural",
                "lensEvaluation": "evaluate",
                "equationValue": "1"
            },
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "1edef4e1-a0f6-4086-b4d9-d1144444a229",
                        "textAlign": "left",
                        "indent": 0
                    }
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "e88a21b0-1f91-4269-a2bd-466622e1d5ac",
                "textAlign": "left",
                "indent": 0
            },
            "content": [
                {
                    "type": "text",
                    "text": "dsdsdsds"
                }
            ]
        },
        {
            "type": "group",
            "attrs": {
                "qiId": "3324988b-7242-4b0d-8f1f-2a0a1f7c8e35"
            },
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "c9ff76c0-a44a-40f7-90bf-fbed9937b9cc",
                        "textAlign": "left",
                        "indent": 0
                    },
                    "content": [
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "highlight",
                                    "attrs": {
                                        "color": null
                                    }
                                },
                                {
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "EB Garamond",
                                        "fontSize": "36px"
                                    }
                                }
                            ],
                            "text": "Beach BBQ 🏖️"
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "8170f7f3-1a0e-49d3-87d5-0985607b65b7",
                        "textAlign": "left",
                        "indent": 0
                    },
                    "content": [
                        {
                            "type": "hardBreak"
                        },
                        {
                            "type": "text",
                            "text": "Get to "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "99227f39-1f07-4b3c-80b6-a6c45c8b8a40",
                                "id": "25",
                                "label": "📍Coogee Beach"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "89636d59-0514-4f52-bb4f-fcfc4a41ae76",
                                "id": "25",
                                "label": "🕕 some time in the next couple of weeks"
                            }
                        },
                        {
                            "type": "text",
                            "text": " for a picnic"
                        },
                        {
                            "type": "hardBreak"
                        },
                        {
                            "type": "hardBreak"
                        },
                        {
                            "type": "text",
                            "text": "Peeps: "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "1a253561-d71f-4c02-8890-b85bf264bb86",
                                "id": "25",
                                "label": "👩🏼 Amy"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "ac665cf9-7d39-41e0-92b1-d1aef93d06a2",
                                "id": "25",
                                "label": "🧑🏽‍🦱 Rafael"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "e5dffa0e-d15b-492e-85af-6948c0883151",
                                "id": "25",
                                "label": "👩🏻 Sophia"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "43558c28-e385-404d-b19a-0028cf42c303",
                                "id": "25",
                                "label": "🧔🏻‍♂️ Paul"
                            }
                        },
                        {
                            "type": "text",
                            "text": "  "
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "1b802b34-5b52-4dc6-86f4-91856ae1240c",
                        "textAlign": "left",
                        "indent": 0
                    },
                    "content": [
                        {
                            "type": "hardBreak"
                        },
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": "Grab snags, bread, salad, snack platter and drinks from Woolies or Coles "
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "9072775c-0527-4d0d-bf61-adc23a704e67",
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
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": "Drinks, my shout, but split the rest"
                        },
                        {
                            "type": "hardBreak"
                        },
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": "Bring picnic mat, beach umbrella, towels, tongs, plates and esky"
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
                    "type": "conversation",
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "fe104570-4f2f-4560-ab80-922621b7e8be",
                                "textAlign": "left",
                                "indent": 0
                            }
                        },
                        {
                            "type": "message",
                            "attrs": {
                                "backgroundColor": "#2196f3"
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "I'm free on Saturday night but not Sunday morning"
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "296d1b7d-e6a8-4319-a210-2e6856cef7cb",
                                        "id": null,
                                        "label": "replied"
                                    }
                                }
                            ]
                        },
                        {
                            "type": "message",
                            "attrs": {
                                "backgroundColor": "#00E676"
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "That works perfectly. Let's plan for Saturday night then!"
                                }
                            ]
                        },
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "0f3697da-e660-4340-b316-3774932d427b",
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
                    "type": "group",
                    "attrs": {
                        "qiId": "284c0fa0-4f07-4e5a-b732-0c3290d613b2"
                    },
                    "content": [
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "234f766c-4cf0-4d0a-b787-68c860201e83",
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
                                                "fontSize": "30px"
                                            }
                                        }
                                    ],
                                    "text": "Directions 🧭"
                                }
                            ]
                        },
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "f19718e2-7aae-4688-b9c2-07caade37643",
                                "textAlign": "left",
                                "indent": 0
                            }
                        },
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "a3040370-45e3-4efa-82ab-ae666291717f",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Leaving "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "577d6598-6574-4675-bb05-65bbc5c6057b",
                                        "id": "25",
                                        "label": "📍My home"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": " at "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "bdf0aaea-e5f3-4b15-a266-f91427e57f0b",
                                        "id": "25",
                                        "label": "🕐 11:20"
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
                                "qiId": "bdaf3672-562a-4a71-b5ee-5ad913db46e0",
                                "textAlign": "left",
                                "indent": 0
                            }
                        },
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "15fb28b9-107b-4252-80b3-40a55f5db780",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "4deebff8-f741-478e-aa9b-30baf9d818fc",
                                        "id": "25",
                                        "label": "📍Paul's House"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": " "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "3a307ade-66a8-4ccf-8a4b-0df0e76525fe",
                                        "id": "25",
                                        "label": "📍Rafael's House"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": " "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "3b2f0a1d-e11b-40aa-ae11-df0590d69c69",
                                        "id": "25",
                                        "label": "📍Amy's House"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": " "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "85af0fb2-ca22-44ed-aa10-0c47f3494363",
                                        "id": "25",
                                        "label": "📍Sophia's House"
                                    }
                                }
                            ]
                        },
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "d56c86ac-19ed-422b-8e7e-0d10ebe526f5",
                                "textAlign": "left",
                                "indent": 0
                            },
                            "content": [
                                {
                                    "type": "hardBreak"
                                },
                                {
                                    "type": "text",
                                    "text": "Arriving at "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "414a72af-9055-40ee-8571-fa3e61f004e7",
                                        "id": "25",
                                        "label": "📍 Coogee Beach Picnic Area"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": " at "
                                },
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "qiId": "775b8299-56fa-414d-aa80-624a2812624b",
                                        "id": "25",
                                        "label": "🕐 12:15"
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
                            "type": "location",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "attrs": {
                                        "qiId": "61f848bd-464a-487d-94d2-f6d34a607b10",
                                        "textAlign": "left",
                                        "indent": 0
                                    }
                                }
                            ]
                        },
                        {
                            "type": "paragraph",
                            "attrs": {
                                "qiId": "1cbfe94e-9826-41ca-a675-c6f8ddd81d22",
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
                "qiId": null,
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "953fb392-200b-40e7-9f00-5b643224e880",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "group",
            "attrs": {
                "qiId": "5aae2426-b777-458a-a1bd-aaf5de3de5c5"
            },
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "38891f6e-89f3-4c11-8c9e-109514ad37fd",
                        "textAlign": "left",
                        "indent": 0
                    },
                    "content": [
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "highlight",
                                    "attrs": {
                                        "color": ""
                                    }
                                },
                                {
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "EB Garamond",
                                        "fontSize": "36px"
                                    }
                                }
                            ],
                            "text": "Co-working 👨‍👩‍👧‍👦💪"
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "b21dfb00-479d-449b-bdc3-949b96a2b2f6",
                        "textAlign": "left",
                        "indent": 0
                    },
                    "content": [
                        {
                            "type": "hardBreak"
                        },
                        {
                            "type": "text",
                            "text": "Crew: "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "51cad8f4-db0c-41b4-869c-2980d3feba25",
                                "id": "25",
                                "label": "👩🏼 Amy"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "6845cfb8-63f7-410c-a8d9-e919ad4a740b",
                                "id": "25",
                                "label": "🧑🏽‍🦱 Rafael"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "173cebc3-571e-496f-b98e-8419ba6a67a9",
                                "id": "25",
                                "label": "👩🏻 Sophia"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "327a8a8b-9c18-4636-9a1a-32cf9d372ea8",
                                "id": "25",
                                "label": "🧔🏻‍♂️ Paul"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "c745eb0e-92bd-4988-8581-6015fefdd57f",
                                "id": "25",
                                "label": "🧔 David"
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
                        "qiId": "9c2f688f-814a-410b-b8dc-506c5df05f3e",
                        "textAlign": "left",
                        "indent": 0
                    }
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "f7a9e61b-4a35-4c76-a093-cc9e651eef71",
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
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": "Welcome! We typically co-work together at night or during afternoons using the video call below."
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
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": "Every "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "b1247d1f-a251-42eb-94b8-6dc0b91a9f21",
                                "id": "25",
                                "label": "🕕 25 minutes"
                            }
                        },
                        {
                            "type": "text",
                            "text": " "
                        },
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": "or "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "19fa4249-9f89-4123-98a0-fd2452e8a304",
                                "id": "25",
                                "label": "🕕 50 minutes"
                            }
                        },
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": ", we complete a single "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "6ab61827-1cb9-4030-a6f0-1cb1ba9f8f11",
                                "id": "25",
                                "label": " 🍅 pomodoro"
                            }
                        },
                        {
                            "type": "text",
                            "marks": [
                                {
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": ", and it gets added to our individual tallies over time. We then check in on each other, share our goals for the next pomodoro, take a short break and then begin the next one. "
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
                                    "type": "textStyle",
                                    "attrs": {
                                        "color": "",
                                        "fontFamily": "",
                                        "fontSize": ""
                                    }
                                }
                            ],
                            "text": "You can start a new pomodoro for the entire group by using the "
                        },
                        {
                            "type": "mention",
                            "attrs": {
                                "qiId": "8c3affbb-fd92-4877-9974-7c220adf6f17",
                                "id": "25",
                                "label": "🔗 Group Daily Calendar"
                            }
                        },
                        {
                            "type": "text",
                            "text": " below."
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": null,
                        "textAlign": "left",
                        "indent": 0
                    }
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "ebb6b37a-8dc9-49b0-9a0c-55d56ac5d1cb",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "17d60e54-da0b-4f4a-86ef-d77ae2f3ab6a",
                "textAlign": "left",
                "indent": 0
            }
        },
        {
            "type": "group",
            "attrs": {
                "qiId": "4a2f2375-0370-42e7-acc6-d7737148604e"
            },
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": "bb509dd6-7c4f-449e-9c91-b22d188e9117",
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
                                        "fontSize": "30px"
                                    }
                                }
                            ],
                            "text": "Literate Programming"
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "attrs": {
                        "qiId": null,
                        "textAlign": "left",
                        "indent": 0
                    }
                },
                {
                    "type": "comment",
                    "content": [
                        {
                            "type": "math",
                            "attrs": {
                                "lensDisplay": "natural",
                                "lensEvaluation": "simplify",
                                "equationValue": "1+1"
                            },
                            "content": [
                                {
                                    "type": "paragraph",
                                    "attrs": {
                                        "qiId": "683b76aa-276b-4789-9e42-2d2662fb8cdf",
                                        "textAlign": "left",
                                        "indent": 0
                                    },
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": "Why does this disappear? "
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
                },
                {
                    "type": "codeBlock",
                    "attrs": {
                        "language": "javascript"
                    },
                    "content": [
                        {
                            "type": "text",
                            "text": "for (var i=1; i <= 20; i++)\n{\n  if (i % 15 == 0)\n    console.log(\"FizzBuzz\");\n  else if (i % 3 == 0)\n    console.log(\"Fizz\");\n  else if (i % 5 == 0)\n    console.log(\"Buzz\");\n  else\n    console.log(i);"
                        }
                    ]
                }
            ]
        },
        {
            "type": "paragraph",
            "attrs": {
                "qiId": "7d3d5d5e-e906-404d-9b8f-11f65a6f0aaa",
                "textAlign": "left",
                "indent": 0
            }
        }
    ]
}