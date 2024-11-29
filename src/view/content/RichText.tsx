'use client'

import './styles.scss'
import React from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { EditorContent, Extensions, JSONContent, Editor, useEditor, Content, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import FontFamily from '@tiptap/extension-font-family'
import Focus from '@tiptap/extension-focus'
import TextStyle from '@tiptap/extension-text-style'
import Gapcursor from '@tiptap/extension-gapcursor'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Heading from '@tiptap/extension-heading'
import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
import CollaborationHistory, { CollabHistoryVersion } from '@tiptap-pro/extension-collaboration-history'
import { watchPreviewContent } from '@tiptap-pro/extension-collaboration-history'
import Details from '@tiptap-pro/extension-details'
import DetailsSummary from '@tiptap-pro/extension-details-summary'
import DetailsContent from '@tiptap-pro/extension-details-content'
import UniqueID from '@tiptap-pro/extension-unique-id'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import js from 'highlight.js/lib/languages/javascript'
import { throttle } from 'lodash'
import { QuantaClass, QuantaType, TextSectionLens, RichTextT } from '../../core/Model'
import { lowlight } from 'lowlight'
import { GroupExtension } from '../structure/GroupTipTapExtension'
import { MathExtension } from './MathTipTapExtension'
import { Indent } from '../../utils/Indent'
import TextAlign from '@tiptap/extension-text-align'
import { DocumentFlowMenu, FlowMenu } from '../structure/FlowMenu'
import { observer } from 'mobx-react-lite'
import { QuantaStoreContext } from '../../backend/QuantaStore'
import { FontSize } from './FontSizeTipTapExtension'
import { mentionSuggestionOptions } from './TagTipTapExtension'
import BubbleMenu from '@tiptap/extension-bubble-menu'
import { CalculationExtension } from './CalculationTipTapExtension'
import { FadeIn } from './FadeInExtension'
import { CustomMention } from './Mention'
import { CustomLink } from './Link'
import { KeyValuePairExtension } from '../structure/KeyValuePairTipTapExtensions'
import { QuoteExtension } from '../structure/QuoteTipTapExtension'
import { MessageExtension } from './MessageExtension'
import { SophiaAI } from '../../agents/Sophia'
import { ConversationExtension } from '../structure/ConversationExtension'
import { LocationExtension } from './LocationTipTapExtension'
import { CommentExtension } from '../structure/CommentTipTapExtension'
import { PortalExtension } from '../structure/PortalExtension'
import { generateUniqueID, renderDate } from '../../utils/utils'
import { issue123DocumentState } from '../../../bugs/issue-123'
import { ExperimentalPortalExtension } from '../structure/ExperimentalPortalExtension'
import { WarningExtension } from '../structure/WarningTipTapExtension'
import { driver } from 'driver.js'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { FocusModePlugin } from '../plugins/FocusModePlugin'
import { DocumentAttributeExtension } from '../structure/DocumentAttributesExtension'
import { motion } from 'framer-motion'
import { SalesGuideTemplate } from './SalesGuideTemplate'
import { Plugin, Transaction } from 'prosemirror-state'
import { EmptyNodeCleanupExtension } from '../../extensions/EmptyNodeCleanupExtension'
import { backup } from '../../backend/backup'

lowlight.registerLanguage('js', js)

export type textInformationType =  "string" | "jsonContent" | "yDoc" | "invalid";

const handleTransaction = (transaction: Transaction) => {
  const transactionMeta = {
    isYjsSync: !!transaction.getMeta('y-sync$'),
    isLocalChange: !transaction.getMeta('y-sync$')?.isChangeOrigin,
    isUndoRedo: !!transaction.getMeta('y-sync$')?.isUndoRedoOperation,
    addToHistory: transaction.getMeta('addToHistory'),
  };

  // Log transaction info
  if (transactionMeta.isYjsSync) {
    // console.log('Remote sync transaction:', transactionMeta);
  } else {
    // console.log('Local change transaction:', transactionMeta);
  }

  // Only process transactions if we have an active connection or it's a local change
  if (transactionMeta.isLocalChange) {
    return true;
  }

  // Block remote transactions that replace the entire document
  if (transactionMeta.isYjsSync && !transactionMeta.isLocalChange) {
    const hasFullDocReplace = transaction.steps.some(step => {
      const json = step.toJSON();
      return json.stepType === 'replace' && json.from === 0;
    });

    if (hasFullDocReplace) {
      console.warn('Blocking full document replace from remote sync');
      return false;
    }
  }

  return true;
}

export const officialExtensions = (quantaId: string) => {return [
  // Add official extensions
  BubbleMenu.configure({
    pluginKey: `bubbleMenu${quantaId}`,
    updateDelay: 100,
  }),
  CodeBlockLowlight.configure({
    lowlight,
  }),
  Color.configure({
    types: ['textStyle'],
  }),
  Details.configure({
    persist: true,
    HTMLAttributes: {
      class: 'details',
    },
  }),
  DetailsContent,
  DetailsSummary,
  FontFamily.configure({
    types: ['textStyle'],
  }),
  Focus.configure({
    className: 'attention-highlight',
    mode: 'shallowest',
  }),
  FontSize,
  Heading.configure({
    levels: [1, 2, 3, 4],
  }),
  Highlight.configure({
    multicolor: true,
  }),
  Image,
  Placeholder.configure({
    includeChildren: true,
    showOnlyCurrent: true,
    showOnlyWhenEditable: false,
    // Use different placeholders depending on the node type:
    placeholder: ({ node }) => {
      // TODO: This doesn't work because the group renders quanta, which is a paragraph
      if (node.type.name === "paragraph") {
        return 'Write something...'
      } else {
        return ''
      }
    },
  }),
  Gapcursor,
  // @ts-ignore
  StarterKit.configure({
    // Here undefined is the equivalent of true
    // TODO: Problem, it looks like when setting this to false
    // collaboration history doesn't take over...
    // history: isYDoc ? false : undefined
    history: false,
    // Disable provided extensions so they don't load twice
    heading: false,
    codeBlock: false,
    gapcursor: false,
  }),
  Table.configure({
    resizable: true,
    cellMinWidth: 300
  }),
  TableRow,
  TableHeader,
  TableCell,
  TaskItem.configure({
    nested: true,
  }),
  TaskList,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle,
  Underline,
  UniqueID.configure({
    // TODO: Add more nodes
    types: ['paragraph', 'mention', 'group'],
    filterTransaction: transaction => !isChangeOrigin(transaction),
    generateID: generateUniqueID,
    attributeName: 'quantaId',
  }),
  Extension.create({
    name: 'transactionHandler',
    
    addProseMirrorPlugins() {
      return [
        new Plugin({
          appendTransaction: (transactions, oldState, newState) => {
            // Process each transaction
            const shouldProcess = transactions.every(handleTransaction);
            
            if (!shouldProcess) {
              return null;
            }
            
            // Continue with normal transaction processing
            return null;
          }
        })
      ];
    }
  }),
] as Extensions}

export const customExtensions: Extensions = [
  CalculationExtension,
  CommentExtension,
  ConversationExtension,
  CustomLink.configure({
    openOnClick: true,
  }),
  CustomMention.configure(
    {
      HTMLAttributes: {
        class: 'mention',
      },
      suggestion: mentionSuggestionOptions,
    }
  ),
  DocumentAttributeExtension,
  FadeIn,
  FocusModePlugin,
  GroupExtension,
  Indent,
  KeyValuePairExtension,
  LocationExtension,
  MathExtension,
  MessageExtension,
  PortalExtension,
  ExperimentalPortalExtension,
  QuoteExtension,
  WarningExtension,
  // EmptyNodeCleanupExtension,
]

export const agents: Extensions = [
  SophiaAI,
  // Finesse,
]

// This TransclusionEditor merely needs to display a copy of the node being synced in the main editor
// Therefore it needs no syncing capabilities.
// If editing is enabled on the transcluded node, then edits should be propagated back to the main editor for syncing
export const TransclusionEditor = (information: RichTextT, isQuanta: boolean, readOnly?: boolean) => {
  const { quanta, provider } = React.useContext(QuantaStoreContext)

  const informationType = isQuanta ? "yDoc" : typeof information === "string" ? "string" : typeof information === "object" ? "object" : "invalid"

  let generatedOfficialExtensions = officialExtensions(quanta.id)

  const editor = new Editor({
    extensions: [...generatedOfficialExtensions, ...customExtensions, ...agents],
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    content: (informationType === "yDoc") ? null : information,
    onUpdate: ({ editor }) => {

    }
  })

  return editor
}

export const MainEditor = (information: RichTextT, isQuanta: boolean, readOnly?: boolean) => {
  const { quanta, provider } = React.useContext(QuantaStoreContext)
  const [contentError, setContentError] = React.useState<Error | null>(null)

  const informationType = isQuanta ? "yDoc" : typeof information === "string" ? "string" : typeof information === "object" ? "object" : "invalid"

  let generatedOfficialExtensions = officialExtensions(quanta.id)

  if (informationType === "yDoc") {
    generatedOfficialExtensions.push(
      Collaboration.configure({
        document: quanta.information,
        field: 'default',
      }),
      CollaborationHistory.configure({
        provider,
      })
    )
  } 

  // Create memoized throttled backup function (3 minutes = 180000ms)
  const throttledBackup = React.useMemo(
    () => throttle((content: any) => {
      backup.storeValidContent(content)
    }, 180000, { leading: true, trailing: true }),
    []
  );

  // Cleanup throttle on unmount
  React.useEffect(() => {
    return () => {
      throttledBackup.cancel()
    }
  }, [throttledBackup])

  const editor = useEditor({
    extensions: [...generatedOfficialExtensions, ...customExtensions, ...agents],
    editable: !readOnly, // Only enable when mounted
    enableContentCheck: true, // Enable content validation
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    content: (informationType === "yDoc") ? null : information,
    shouldRerenderOnTransaction: false,
    
    // Add error handling for invalid content
    onContentError: ({ editor, error, disableCollaboration }) => {
      console.error('Editor content error:', error)
      setContentError(error)
      // If there is an error on this client, isolate the client from others, to prevent
      // it from "infecting" other clients with its invalid content

      // If using collaboration, disable it to prevent syncing invalid content
      if (disableCollaboration && provider) {
        disableCollaboration()
      }

      // Prevent emitting updates
      const emitUpdate = false

      // Disable further user input
      editor.setEditable(false, emitUpdate)

      // Try to recover by loading backup content
      try {
        const backupContent = backup.getLastValidContent()
        if (backupContent) {
          editor.commands.setContent(backupContent)
          editor.setEditable(true)
          setContentError(null)
        }
      } catch (recoveryError) {
        console.error('Failed to recover editor content:', recoveryError)
      }
    },
    
    onSelectionUpdate: ({ editor }: { editor: Editor }) => {
      // Retrieve document attributes using the custom command
      // @ts-ignore - TODO: this actually does work, not sure why it's not recognised
      const documentAttributes = editor.commands.getDocumentAttributes()

      // Attributes for the Document root node are defined in DocumentAttributesExtension.tsx
      if (documentAttributes.selectedFocusLens === "editing") {
        editor.setEditable(true)
      } else if (documentAttributes.selectedFocusLens === "focus") {
        editor.setEditable(true)
        // Highlight the focused node
        const driverObj = driver({
          animate: true,
          disableActiveInteraction: false,
          stageRadius: 15,
          allowClose: true,
        })

        // Document here refers to the HTML document, not the document node of TipTap
        const elements = document.querySelectorAll('.attention-highlight');
        elements.forEach((element) => {
          driverObj.highlight({
            element: element,
          });
        });
      } else if (documentAttributes.selectedFocusLens === "read-only") {
        editor.setEditable(false)
      }
    },
    onUpdate: ({ editor }) => {
      if (!contentError) {
        throttledBackup(editor.getJSON())
      }
      
      // console.log("JSON Output", editor.getJSON())
    },
    onTransaction: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        const transactionMeta = {
          isYjsSync: !!transaction.getMeta('y-sync$'),
          isLocalChange: !transaction.getMeta('y-sync$')?.isChangeOrigin,
          isUndoRedo: !!transaction.getMeta('y-sync$')?.isUndoRedoOperation,
          addToHistory: transaction.getMeta('addToHistory'),
        };

        // Case 1: Yjs Sync Transaction
        if (transactionMeta.isYjsSync && !transactionMeta.isLocalChange) {
          console.log('Remote sync transaction:', transactionMeta);
          // Handle remote changes from other users
          // These should probably be allowed to proceed
        }

        // Case 2: Local Change
        if (!transactionMeta.isYjsSync) {
          console.log('Local change transaction:', transactionMeta);
          // These are direct user edits
          // You might want to add your own metadata here
          transaction.setMeta('source', 'user-edit');
        }
        // Optional: Block certain types of transactions
        // Temporarily disabled transaction blocking until shouldBlockTransaction is implemented
        // if (shouldBlockTransaction(transaction, transactionMeta)) {
        //   return false;
        // }
      }
    },
  })

  // Show error state if needed
  if (contentError) {
    return (
      <div className="editor-error">
        <h3>Editor Content Error</h3>
        <p>There was an issue with the document content. Please refresh the page or contact support if this persists.</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    )
  }

  return editor
}
// TODO: Maybe merge this RichText and the editor component above, since they have virtually the same props
export const RichText = observer((props: { quanta?: QuantaType, text: RichTextT, lenses: [TextSectionLens], onChange?: (change: string | JSONContent) => void }) => {
  let content = props.text

  

  switch (props.lenses[0]) {
    case "code":
      // TODO: Reactivate code lens
      // content = `<pre><code class="language-javascript">${props.text}</code></pre>`

      break;
    case "text":
      // Do nothing

      break;
    default:
      break;
  }

  let editor = MainEditor(content, true, false)
  // These functions are memoised for performance reasons
  const handleRevert = React.useCallback((version: number, versionData: CollabHistoryVersion) => {
    const versionTitle = versionData ? versionData.name || renderDate(versionData.date) : version

    // @ts-ignore
    editor?.commands.revertToVersion(version, `Revert to ${versionTitle}`, `Unsaved changes before revert to ${versionTitle}`)
  }, [editor])
  // @ts-ignore
  const reversedVersions = React.useMemo(() => editor?.storage.collabHistory.versions.slice().reverse(), [editor?.storage.collabHistory.versions])
  // console.log("reversed versions", reversedVersions)

  // @ts-ignore
  const autoversioningEnabled = editor?.storage.collabHistory.autoVersioning

  // Add a ref to track template application
  const templateApplied = React.useRef(false);

  // Check for new sales guide template flag
  React.useEffect(() => {
    if (!props.quanta?.id || !editor || templateApplied.current) return;
    
    const newSalesGuideId = sessionStorage.getItem('newSalesGuide');
    const urlId = window.location.pathname.split('/').pop();

    // Only apply template if URL ID matches stored ID
    if (newSalesGuideId === urlId && editor) {
      setTimeout(() => {
        (editor as Editor)!.commands.setContent(SalesGuideTemplate);
        console.log("Applied sales guide template to", urlId);
        
        // Mark template as applied
        templateApplied.current = true;
        
        // Now safe to remove from sessionStorage
        sessionStorage.removeItem('newSalesGuide');
      }, 300);
    }
  }, [props.quanta?.id, editor]);

  // TODO: Change this to proper responsiveness for each screen size
  const maxWidth = 1300

  if (editor) {
    if (process.env.NODE_ENV === 'development') {
      // console.debug(editor.schema)
    }

    return (
      <div key={props.quanta?.id} style={{width: '100%'}}>
        {/* This menu is always fixed at the very top of the document */}
        <div style={{ width: '100%'}}>
          <div key={`bubbleMenu${props.quanta?.id}`}>
            {/* This menu floats above selected text or nodes */}
            <FlowMenu editor={editor as Editor} />
          </div>
          <div>
            <EditorContent editor={editor as Editor} />
          </div>
        </div>
      </div>
    )
  } else {
    return <></>
  }
  
})

export const issue123Example = () => {
  return (
    <RichText 
      text={issue123DocumentState} 
      lenses={["text"]} 
    />
  )
}

export const RichTextCodeExample = () => {
  const content = `
  <p>
    That’s a boring paragraph followed by a fenced code block:
  </p>
  <span data-type="mention" data-id="🧱 blocked"></span><span data-type="mention" data-id="⭐️ important"></span>
  <p>
    Some more text is right here
  </p>
  <pre><code class="language-javascript">for (var i=1; i <= 20; i++)
  {
    if (i % 15 == 0)
      console.log("FizzBuzz");
    else if (i % 3 == 0)
      console.log("Fizz");
    else if (i % 5 == 0)
      console.log("Buzz");
    else
      console.log(i);
  }</code></pre>
  <group>
  <math lensDisplay="natural" lensevaluation="identity">
    \\frac{1}{2
  </math>
  </group>
  <group>
  <div>
  <math>
  10 + 30
  </math>
  </div>
  <div>
  <math>
  40
  </math>
  </div>
  </group>
`
  return (<RichText quanta={new QuantaClass()} text={content} lenses={["code"]} onChange={() => {
  }} />)
}

export default RichText