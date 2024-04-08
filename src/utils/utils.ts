import { EditorView } from '@tiptap/pm/view';
import { Attrs } from 'prosemirror-model';
import { v4 as uuidv4 } from 'uuid';
import { MathsLoupeC } from '../core/Model';
import { Editor, JSONContent, isNodeSelection, isTextSelection } from '@tiptap/core';
import { useEffect } from 'react';

var stringSimilarity = require("string-similarity");

export const generateUniqueID = () => uuidv4()

export const getMathsLoupeFromAttributes = (attrs: Attrs) => {
  let mathsLoupe = new MathsLoupeC()
  mathsLoupe.selectedDisplayLens = mathsLoupe.displayLenses.findIndex((lens) => (lens === attrs.lensDisplay))
  mathsLoupe.selectedEvaluationLens = mathsLoupe.evaluationLenses.findIndex((lens) => (lens === attrs.lensEvaluation))
  return mathsLoupe;
}

export const renderDate = (date: number) => {
  const d = new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const year = d.getFullYear()

  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return `${day}.${month}.${year} ${hours}:${minutes}`
}

export const generatePrompt = (text: string, mode?: 'localise' | 'guide' | 'translate') => {
  switch (mode) {
    case 'guide':
      return `You're a wise yet friendly AI guide named Sophia that helps the user complete tasks. Complete the following chat conversation, but only show your response: ${text}.`
    case 'translate':
      return `You're a wise yet friendly AI tutor guide named Sophia that helps the user by translating the phrase into Mandarin but in a formal way, such that the professionals would say something similar. Translate the following message: ${text}`
    case 'localise':
      return `You're a wise yet friendly AI tutor guide named Sophia that helps the user by translating the phrase into Mandarin but in a colloquial way, such that the locals would say something similar. Translate the following message: ${text}`
    default:
      return `You're a wise yet friendly AI guide named Sophia that helps the user complete tasks. Complete the following chat conversation, but only show your response: ${text}`
  }
}

export function getActiveMarkCodes (view: EditorView) {
    const isEmpty = view.state.selection.empty;
    const state = view.state;
  
    if (isEmpty) {
      const $from = view.state.selection.$from;
      const storedMarks = state.storedMarks;
  
      // Return either the stored marks, or the marks at the cursor position.
      // Stored marks are the marks that are going to be applied to the next input
      // if you dispatched a mark toggle with an empty cursor.
      if (storedMarks) {
        return storedMarks.map((mark) => mark.type.name);
      } else {
        return $from.marks().map((mark) => mark.type.name);
      }
    } else {
      const $head = view.state.selection.$head;
      const $anchor = view.state.selection.$anchor;
  
      // We're using a Set to not get duplicate values
      const activeMarks = new Set();
  
      // Here we're getting the marks at the head and anchor of the selection
      $head.marks().forEach((mark) => activeMarks.add(mark.type.name));
      $anchor.marks().forEach((mark) => activeMarks.add(mark.type.name));
  
      return Array.from(activeMarks);
    }
  }

export const backup = (content: JSONContent) => {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[-:.]/g, '');
  const filename = `lifemap+${timestamp}.json`;

  const jsonData = JSON.stringify(content);
  const blob = new Blob([jsonData], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const similarityBetweenWordEmbeddings = (word1: string, word2: string) => {
  return stringSimilarity.compareTwoStrings(word1, word2)
}

// Used like so:
// {isActualUrl(item.mentionLabel) ? 
//   <>
//       {item.mentionLabel}
//   </> : <>
//           <a href={item.mentionLabel} target="_blank" rel="noopener noreferrer">
//               {item.mentionLabel}
//           </a>
//       </>

export const isActualUrl = (url: string) => {
    try {
      new URL(url)
      return true
    }
    catch (_) {
      return false
    }
    return false
}

export const useScrollEnd = (callback: () => void, delay: number ) => {
  useEffect(() => {
      let timer: NodeJS.Timeout | null = null;

      const handleScrollEnd = () => {
          if (timer) {
              clearTimeout(timer);
          }
          timer = setTimeout(() => {
              callback();
          }, delay);
      };

      window.addEventListener('scroll', handleScrollEnd);

      return () => {
          window.removeEventListener('scroll', handleScrollEnd);
          if (timer) {
              clearTimeout(timer);
          }
      };
  }, [callback, delay]);
};

export const getSelectedNode = (editor: Editor) => {
    const selection = editor.view.state.selection

    if (selection) {
      // @ts-ignore - Node does exist on Selection
      return selection.node
    } else {
      return null
    }
}

// Written by examining the selection object when clicking on various node types
export const getSelectedNodeType = (editor: Editor) => {
    const selection = editor.view.state.selection

    if (isTextSelection(selection)) {
        return "text"
    } else if (isNodeSelection(selection)) {
        switch (selection.node.type.name) {
            case "group":
                return "group"
            default:
                console.error(`Unsupported node type was selected. Developer needs to add support for node type ${selection.node.type.name}`)
                return "invalid"
        }
    } else {
        console.error("Selected a node that is neither text nor a node.")
        return "invalid"
    }
}

// This forces attributes in the root document to be updated
export const updateDocumentAttributes = (editor: Editor, newAttributes: Attrs) => {
  const state = editor.state;
  const tr = state.tr; 

  tr.setMeta('doc', newAttributes);
  editor.view.dispatch(tr); 
}

export const isWordEmotionRelated = (word: string) => {
  const similarityOfWordToEmotions = stringSimilarity.compareTwoStrings(word, "emotional")
  console.log("Similarity of Words to Emotions", similarityOfWordToEmotions)
  const similarityThreshold = 0.75
  if (similarityOfWordToEmotions > similarityThreshold) return true
  else return false
}