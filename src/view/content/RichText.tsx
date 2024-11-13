'use client'

import './styles.scss'
import React from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { EditorContent, Extensions, JSONContent, Editor, useEditor, Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import FontFamily from '@tiptap/extension-font-family'
import Focus from '@tiptap/extension-focus'
import TextStyle from '@tiptap/extension-text-style'
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
import { debounce } from 'lodash'
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
import { backup, generateUniqueID, renderDate } from '../../utils/utils'
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

lowlight.registerLanguage('js', js)

export type textInformationType =  "string" | "jsonContent" | "yDoc" | "invalid";

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
  WarningExtension
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

  
  const editor = useEditor({
    extensions: [...generatedOfficialExtensions, ...customExtensions, ...agents],
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    content: (informationType === "yDoc") ? null : information,
    // This is deliberately triggered using the selection update because the driver highlight shade needs to update,
    // whenever the user moves their cursor to a new location.
    onSelectionUpdate: ({ editor }) => {
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
      // console.log("JSON Output", editor.getJSON())
      // console.log("HTML Output", editor.getHTML())
      // console.log("editor getText", editor.getText())
      // console.log("active", editor.state.selection)
    },
    onTransaction: ({ editor, transaction }) => {
      // Log every transaction where the document content has changed
      if (transaction.docChanged) {
        console.log('Transaction:', {
          docChanged: transaction.docChanged, // boolean indicating if content changed
          selection: transaction.selection, // current selection state
          steps: transaction.steps.map(step => step.toJSON()), // serialize steps to JSON for better logging
          time: new Date().toISOString(),
        })

      }
    },
  })

  // Watch for content changes from TipTap Collab Cloud
  const unbindWatchContent = watchPreviewContent(provider, (content: Content) => {
    // set your editors content
    if (editor) {
      editor.commands.setContent(content)
    }
  })
  
  // TODO: When to unbind the watchContent?



  // if (editor) {
  //   SetDocAttrStep.register()

  //   editor.commands.updateAttributes('document', defaultDocumentAttributeValues)
  //   console.log("doc", editor.state.doc)
  // }

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

  let editor = MainEditor(content, true)
  // These functions are memoised for performance reasons
  const handleRevert = React.useCallback((version: number, versionData: CollabHistoryVersion) => {
    const versionTitle = versionData ? versionData.name || renderDate(versionData.date) : version

    editor?.commands.revertToVersion(version, `Revert to ${versionTitle}`, `Unsaved changes before revert to ${versionTitle}`)
  }, [editor])
  const reversedVersions = React.useMemo(() => editor?.storage.collabHistory.versions.slice().reverse(), [editor?.storage.collabHistory.versions])
  // console.log("reversed versions", reversedVersions)

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
        editor!.commands.setContent(SalesGuideTemplate);
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
      <div key={props.quanta?.id} style={{ display: "grid", placeItems: "center" }}>
        {/* This menu is always fixed at the very top of the document */}
        <div style={{maxWidth: maxWidth}}>

          <motion.div style={{ display: "grid", placeItems: "center", paddingTop: 15, paddingBottom: 4 }}>
            <DocumentFlowMenu editor={editor} />
          </motion.div>
          <div key={`bubbleMenu${props.quanta?.id}`}>
            {/* This menu floats above selected text or nodes */}
            <FlowMenu editor={editor} />
          </div>
          <div>
            <EditorContent editor={editor} />
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