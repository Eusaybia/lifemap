import { EditorView } from '@tiptap/pm/view';
import { Attrs } from 'prosemirror-model';
import { v4 as uuidv4 } from 'uuid';
import { MathsLoupeC } from '../core/Model';
import { Editor, isNodeSelection, isTextSelection } from '@tiptap/core';
import { useEffect } from 'react';
import { DocumentAttributes } from '../view/structure/DocumentAttributesExtension';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

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

export function getActiveMarkCodes(view: EditorView) {
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

// Determine whether this node is irrelevant for the given event type, which is selected at the document level
// For example, if the node contains a mention tag of "corporate" but the selected event type is "wedding", then the node is irrelevant
// This is used to hide nodes that are irrelevant for the current event type
export const determineIrrelevance = (groupNode: ProseMirrorNode, selectedEventType: string) => {
  let isIrrelevant = false;

  console.log("Selected event type from perspective of group: ", selectedEventType)

  type EventTypes = DocumentAttributes['selectedEventLens'];
  const eventTypes: EventTypes[] = ['wedding', 'birthday', 'corporate'];
  const irrelevantEventTypes = eventTypes.filter((eventType) => eventType !== selectedEventType);

  groupNode.forEach((childNode) => {
    if (childNode.type.name === 'paragraph') {
      childNode.forEach((grandChildNode) => {
        if (grandChildNode.type.name === 'mention') {
          const label = grandChildNode.attrs.label as string;
          // TODO: Technically this label detection could be more robust, but this is hard coded for now
          // Should handle mentions with just a string rather than an emoji + string
          const parts = label.split(' ');
          // Only process if we have at least 2 parts (emoji + event type)
          if (parts.length >= 2) {
            const mentionEventType = parts[1].toLowerCase();
            if (irrelevantEventTypes.includes(mentionEventType as EventTypes)) {
              isIrrelevant = true;
            }
          }
        }
      })
    }
  });
  return isIrrelevant;
};

export const useScrollEnd = (callback: () => void, delay: number) => {
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

export const logCurrentLens = (editor: Editor) => {
  const selectedNode = getSelectedNode(editor);
  if (selectedNode) {
    const currentLens = selectedNode.attrs.lens;
    console.log("Current Lens:", currentLens);
  } else {
    console.log("Current Lens: No node is selected.");
  }
}

export const copySelectedNodeToClipboard = (editor: Editor) => {
  const selectedNode: ProseMirrorNode = getSelectedNode(editor)

  if (selectedNode) {
      navigator.clipboard.writeText(JSON.stringify(selectedNode.toJSON())).then(() => {
          console.log('Copying to clipboard was successful!');
          return true
      }, (err) => {
          console.error('Could not copy text: ', err);
          return false
      });
  } else {
      console.error('Attempted to invoke copy node to clipboard action when a node was not selected.');
      return false
  }
  return false
}

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
      case "portal":
        return "portal"
      default:
        console.error(`Unsupported node type was selected. Developer needs to add support for node type ${selection.node.type.name}`)
        return "invalid"
    }
  } else {
    console.error("Selected a node that is neither text nor a node.")
    return "invalid"
  }
}
