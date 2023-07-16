import { EditorView } from '@tiptap/pm/view';
import { Attrs } from 'prosemirror-model';
import { v4 as uuidv4 } from 'uuid';
import { MathsLoupeC } from '../core/Model';

export const generateUniqueID = () => uuidv4()

export const clickElement = (ref: React.RefObject<HTMLDivElement>) => {
  ref.current!.dispatchEvent(
    new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      buttons: 1,
    }),
  );
};

export const getMathsLoupeFromAttributes = (attrs: Attrs) => {
  let mathsLoupe = new MathsLoupeC()
  mathsLoupe.selectedDisplayLens = mathsLoupe.displayLenses.findIndex((lens) => (lens === attrs.lensDisplay))
  mathsLoupe.selectedEvaluationLens = mathsLoupe.evaluationLenses.findIndex((lens) => (lens === attrs.lensEvaluation))
  return mathsLoupe;
}

export const generatePrompt = (text: string) => `You're a wise yet friendly AI guide named Sophia that helps the user complete tasks. Complete the following chat conversation: ${text}`

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