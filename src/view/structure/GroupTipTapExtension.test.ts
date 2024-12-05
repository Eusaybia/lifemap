import { expect, describe, test } from 'vitest'
import { determineIrrelevance } from './GroupTipTapExtension';
import { JSONContent } from '@tiptap/core';

// The reason why we test irrelevance rather than relevance is because of the neutral case of nodes which are neither relevant nor irrelevant to the selected event type
// If we test for relevance, we would be unable to distinguish between irrelevant and neutral nodes
// If we test for irrelevance, we can distinguish between irrelevant and neutral nodes
// We want to darken irrelevant nodes and ignore neutral nodes
describe('determineIrrelevance', () => {
  test('that relevant nodes are identified as not irrelevant', () => {
    const salesTemplateNodeWithWeddingEventTypeMention = {
      "type": "group",
      "attrs": {
        "quantaId": "eda11276-abe6-4682-a3af-60b7a5a506ab",
        "attention": 52004,
        "refinement": 0,
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity"
      },
      "content": [{
        "type": "paragraph",
        "attrs": {
          "quantaId": "8699c9cb-f771-4091-b15b-d5f2881a0daa",
          "textAlign": "left",
          "indent": 0
        },
        "content": [{
          "type": "mention",
          "attrs": {
            "quantaId": "2f25595d-b3c9-4075-8108-463e29601c3a",
            "id": "000000",
            "label": "👰‍♀️ Wedding"
          }
        }, {
          "type": "text",
          "text": " Do you have a wedding planner or are you doing everything yourself? "
        }]
      }]
    }
    expect(determineIrrelevance(salesTemplateNodeWithWeddingEventTypeMention, "wedding")).toBe(false);

  })

  test('that irrelevant nodes are identified as irrelevant', () => {
    const salesTemplateNodeWithCorporateEventTypeMention: JSONContent = {
      "type": "group",
      "attrs": {
        "quantaId": "a2cb14a3-9117-42a9-a59c-2b9df0836386",
        "attention": 56069,
        "refinement": 0,
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity"
      },
      "content": [{
        "type": "paragraph",
        "attrs": {
          "quantaId": "c8a387cb-5820-4654-a185-2c160fd4b4e9",
          "textAlign": "left",
          "indent": 0
        },
        "content": [{
          "type": "mention",
          "attrs": {
            "quantaId": "2d0a150c-67c5-4d46-ba21-25e243244165",
            "id": "000000",
            "label": "🏢 Corporate"
          }
        }, {
          "type": "text",
          "text": " "
        }]
      }]
    }

    expect(determineIrrelevance(salesTemplateNodeWithCorporateEventTypeMention, "wedding")).toBe(true);
  })

  test('that neutral nodes are identified as not irrelevant', () => {
    const salesTemplateNodeWithNoEventTypeMention: JSONContent = {
      "type": "group",
      "attrs": {
        "quantaId": "5cfe2b74-1cf2-4ae0-9287-6aec44fb554a",
        "attention": 16511,
        "refinement": 0,
        "pathos": 0,
        "backgroundColor": "#EFEFEF",
        "lens": "identity"
      },
      "content": [{
        "type": "paragraph",
        "attrs": {
          "quantaId": "e0930243-e7c9-4e40-a3ad-fd84ea8b92dc",
          "textAlign": "left",
          "indent": 0
        },
        "content": [{
          "type": "text",
          "text": "Q3a. [What cultural background are they from?] [Are they friends or family?] [Do you think they are more "
        }, {
          "type": "text",
          "marks": [{
            "type": "underline"
          }],
          "text": "excitable"
        }, {
          "type": "text",
          "text": ", or more "
        }, {
          "type": "text",
          "marks": [{
            "type": "underline"
          }],
          "text": "conservative"
        }, {
          "type": "text",
          "text": "?] "
        }]
      }]
    }

    expect(determineIrrelevance(salesTemplateNodeWithNoEventTypeMention, "wedding")).toBe(false);
  })

  test('that nodes with both irrelevant and relevant mentions are identified as relevant, not irrelevant', () => {
    // e.g. A nodes has both "🏢 Corporate" and "👰‍♀️ Wedding" mentioned and the selected event type is "wedding"
    const salesTemplateNodeWithBothMentions: JSONContent = { "type": "group", "attrs": { "quantaId": "bf198362-be54-42b8-9120-1c30afa569e1", "attention": 550153, "refinement": 59.5, "pathos": 0, "backgroundColor": "#ffedd520", "lens": "identity" }, "content": [{ "type": "image", "attrs": { "src": "https://i.postimg.cc/xd8Rvvbz/Carouselcover4x.png", "alt": null, "title": null } }, { "type": "paragraph", "attrs": { "quantaId": "87b82361-ed4a-4cf0-81db-b4e45218f909", "textAlign": "left", "indent": 0 }, "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "", "fontFamily": "EB Garamond", "fontSize": "36px" } }], "text": "Pre-Call Checklist" }] }, { "type": "paragraph", "attrs": { "quantaId": "5326a052-9d2e-4b9e-b553-1c26541ea81a", "textAlign": "left", "indent": 0 }, "content": [{ "type": "hardBreak" }, { "type": "text", "text": "At Black Tie Magicians we:" }] }, { "type": "orderedList", "attrs": { "start": 1 }, "content": [{ "type": "listItem", "content": [{ "type": "paragraph", "attrs": { "quantaId": "77f87dfd-c606-47ab-9a24-f5cb3a3e2f64", "textAlign": "left", "indent": 0 }, "content": [{ "type": "text", "text": "We generate social interaction" }] }] }, { "type": "listItem", "content": [{ "type": "paragraph", "attrs": { "quantaId": "5abfb515-70fc-4f10-b1fe-3d3b41679815", "textAlign": "left", "indent": 0 }, "content": [{ "type": "text", "text": "We make your event stand out" }] }] }, { "type": "listItem", "content": [{ "type": "paragraph", "attrs": { "quantaId": "f1f17b55-8226-471e-a99d-a9ade0b86129", "textAlign": "left", "indent": 0 }, "content": [{ "type": "text", "text": "We cement everlasting memories ⭐️ important " }] }] }] }, { "type": "paragraph", "attrs": { "quantaId": "044a1df3-567d-40c9-803a-9d6c1db1789f", "textAlign": "left", "indent": 0 }, "content": [{ "type": "hardBreak" }, { "type": "mention", "attrs": { "quantaId": "6bd484d8-7bb1-4efd-9272-aef3558b3efb", "id": "000000", "label": "🎭 Possible Events" } }, { "type": "text", "text": " : " }, { "type": "mention", "attrs": { "quantaId": "24b73392-0dce-4f1d-a757-7844a7da2151", "id": "000000", "label": "👰‍♀️ Wedding" } }, { "type": "text", "text": " | " }, { "type": "mention", "attrs": { "quantaId": "01d85343-2364-4ef8-825c-85dc08a1686f", "id": "000000", "label": "🏢 Corporate" } }, { "type": "text", "text": " | " }, { "type": "mention", "attrs": { "quantaId": "8191aafe-9ba1-4219-97f2-cd9022a17497", "id": "000000", "label": "🎂 Birthday " } }, { "type": "text", "text": " " }] }, { "type": "paragraph", "attrs": { "quantaId": "8c8403cc-c5d8-4e20-a5eb-f788c44f65af", "textAlign": "left", "indent": 0 }, "content": [{ "type": "mention", "attrs": { "quantaId": "e3b6d94e-10e3-4566-a2ec-59257132ba10", "id": "000000", "label": "🎉 Event" } }, { "type": "text", "text": "  : " }, { "type": "mention", "attrs": { "quantaId": "e451ba0d-c75c-4b59-9c15-bbdb5f9016c5", "id": "000000", "label": "👰‍♀️ Wedding" } }, { "type": "text", "text": " " }] }, { "type": "paragraph", "attrs": { "quantaId": "25e8be71-e0f3-477f-bceb-930dc1c394d8", "textAlign": "left", "indent": 0 }, "content": [{ "type": "mention", "attrs": { "quantaId": "d57b62f3-3693-4483-81d8-2dec5b7c7686", "id": "000000", "label": "👰‍♀️ Prospect" } }, { "type": "text", "text": " : Jane Levaster " }] }, { "type": "paragraph", "attrs": { "quantaId": "4d36972e-9c29-477d-9e28-cb3693b8846e", "textAlign": "left", "indent": 0 } }, { "type": "taskList", "content": [{ "type": "taskItem", "attrs": { "checked": true }, "content": [{ "type": "paragraph", "attrs": { "quantaId": "5c80958a-8d6d-4ec2-825a-b3f742508d0d", "textAlign": "left", "indent": 0 }, "content": [{ "type": "text", "text": "Have sales wiki notes open " }, { "type": "text", "marks": [{ "type": "link", "attrs": { "href": "www.google.com", "target": "_blank", "rel": "noopener noreferrer nofollow", "class": null } }], "text": "Sales Wiki Notes" }] }] }, { "type": "taskItem", "attrs": { "checked": true }, "content": [{ "type": "paragraph", "attrs": { "quantaId": "b19e329c-f928-4b3d-b7c0-b01a2b09947e", "textAlign": "left", "indent": 0 }, "content": [{ "type": "text", "text": "Have intro script open, ready to read " }, { "type": "text", "marks": [{ "type": "link", "attrs": { "href": "www.google.com", "target": "_blank", "rel": "noopener noreferrer nofollow", "class": null } }], "text": "Intro Notes" }] }] }, { "type": "taskItem", "attrs": { "checked": true }, "content": [{ "type": "paragraph", "attrs": { "quantaId": "36dc9cc4-4513-422c-8d2a-c61e792487d2", "textAlign": "left", "indent": 0 }, "content": [{ "type": "text", "text": "Have D.I.S.C sheet ready to search " }, { "type": "text", "marks": [{ "type": "link", "attrs": { "href": "www.google.com", "target": "_blank", "rel": "noopener noreferrer nofollow", "class": null } }], "text": "D.I.S.C Sheet" }] }] }] }] }

    expect(determineIrrelevance(salesTemplateNodeWithBothMentions, "wedding")).toBe(false);
  })
})