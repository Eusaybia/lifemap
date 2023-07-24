import React, { useEffect, useRef } from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { Color } from '@tiptap/extension-color'
import { Highlight } from '@tiptap/extension-highlight'
import { EditorContent, Extensions, JSONContent, Editor, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { Markdown } from 'tiptap-markdown';
import FontFamily from '@tiptap/extension-font-family'
import Link from '@tiptap/extension-link'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Gapcursor from '@tiptap/extension-gapcursor'
import Heading from '@tiptap/extension-heading'
import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
import Mention from '@tiptap/extension-mention'
import Details from '@tiptap-pro/extension-details'
import DetailsSummary from '@tiptap-pro/extension-details-summary'
import DetailsContent from '@tiptap-pro/extension-details-content'
import UniqueID from '@tiptap-pro/extension-unique-id'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import js from 'highlight.js/lib/languages/javascript'
import { debounce } from 'lodash'
import { QiC, QiT, TextSectionLens, RichTextT } from '../../core/Model'
import { lowlight } from 'lowlight'
import { GroupExtension } from '../structure/GroupTipTapExtension'
import { MathExtension } from './MathTipTapExtension'
import { Indent } from '../../utils/Indent'
import TextAlign from '@tiptap/extension-text-align'
import { FlowMenu } from '../structure/FlowMenu'
import './styles.scss'
import { observer } from 'mobx-react-lite'
import { QiStoreContext } from '../../backend/QiStore'
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
import { Conversation } from '../structure/Conversation'
import { LocationExtension } from './LocationTipTapExtension'
import { CommentExtension } from '../structure/CommentTipTapExtension'
import { PortalExtension } from '../structure/PortalExtension'
import { backup } from '../../utils/utils'

lowlight.registerLanguage('js', js)

export const CustomisedEditor = (information: RichTextT, readOnly?: boolean) => {
  let qi = React.useContext(QiStoreContext)
  console.log("qiId", qi.id)


  const isYDoc = typeof information !== "string";

  const officalExtensions: Extensions = [
    // Add official extensions
    BubbleMenu.configure({
      pluginKey: `bubbleMenu${qi.id}`,
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
    FontSize,
    Gapcursor,
    Heading.configure({
      levels: [1, 2, 3, 4],
    }),
    Highlight,
    Image,
    Placeholder.configure({
      includeChildren: true,
      showOnlyCurrent: true,
      showOnlyWhenEditable: false,
      // Use different placeholders depending on the node type:
      placeholder: ({ node }) => {
        // TODO: This doesn't work because the group renders qi, which is a paragraph
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
       attributeName: 'qiId',
     }),
  ]
  console.log("isPortalEditor")
  
  const customExtensions: Extensions = [
   CalculationExtension,
   CommentExtension,
   Conversation,
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
   FadeIn,
   GroupExtension,
   Indent,
   KeyValuePairExtension,
   LocationExtension,
   Markdown,
   MathExtension,
   MessageExtension,
   PortalExtension,
   QuoteExtension,
  ]

  const agents: Extensions = [
    SophiaAI,
  ]

  if (isYDoc) {
    officalExtensions.push(
      Collaboration.configure({
        document: qi.information,
        field: 'default',
      }),
    )
  }

  const [editor, setEditor] = React.useState(new Editor({
    extensions: [...officalExtensions, ...customExtensions, ...agents],
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    content: isYDoc ? null : information,
    onUpdate: ({ editor }) => {
      // console.log("JSON Output", editor.getJSON())
      // console.log("HTML Output", editor.getHTML())
      // console.log("editor getText", editor.getText())
      
      // Backup every minute
      const performBackup = () => {
        backup(editor.getJSON())
      }

      debounce(performBackup, 10000)
    }
  }))

  return editor
}

export const RichText = observer((props: { qi?: QiT, text: RichTextT, lenses: [TextSectionLens], onChange?: (change: string | JSONContent) => void }) => {
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

  let editor = CustomisedEditor(content)

  if (process.env.NODE_ENV === 'development') {
    if (editor) {
      // console.debug(editor.schema)
    }
  }

  return (
    <div key={props.qi?.id}>
      <div key={`bubbleMenu${props.qi?.id}`}>
        <FlowMenu editor={editor} />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
})

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
  return (<RichText qi={new QiC()} text={content} lenses={["code"]} onChange={() => {
  }} />)
}

export default RichText
