import { EditorView } from '@tiptap/pm/view';
import { Attrs } from 'prosemirror-model';
import { v4 as uuidv4 } from 'uuid';
import { MathsLoupeC } from '../core/Model';
import { JSONContent } from '@tiptap/core';

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

export const isWordEmotionRelated = (word: string) => {
  const similarityOfWordToEmotions = stringSimilarity.compareTwoStrings(word, "emotional")
  console.log("Similarity of Words to Emotions", similarityOfWordToEmotions)
  const similarityThreshold = 0.75
  if (similarityOfWordToEmotions > similarityThreshold) return true
  else return false
}