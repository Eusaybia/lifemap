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
import { MapboxMapExtension } from './MapboxMapExtension'
import { ExcalidrawExtension } from './ExcalidrawExtension'
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
import { TimePointMention, TimePointNode } from './TimePointMention'
import { PomodoroNode } from './PomodoroNode'
import { DurationExtension, DurationBadgeNode } from './DurationMention'
import { LocationMention, LocationNode } from './LocationMention'
import { HashtagMention, HashtagNode } from './HashtagMention'
import { MeritDemeritMention, MeritDemeritNode } from './MeritDemeritMention'
import { FinesseMention, FinesseNode } from './FinesseMention'
import { CustomLink } from './Link'
import { KeyValuePairExtension } from '../structure/KeyValuePairTipTapExtensions'
import { QuoteExtension } from '../structure/QuoteTipTapExtension'
import { MessageExtension } from './MessageExtension'
import { SophiaAI } from '../../agents/Sophia'
import { ConversationExtension } from '../structure/ConversationExtension'
// LocationExtension removed - using LocationNode from LocationMention.tsx instead (supports pin emoji)
import { CommentExtension } from '../structure/CommentTipTapExtension'
import { PortalExtension } from '../structure/PortalExtension'
import { ScrollViewExtension } from '../structure/ScrollViewExtension'
import { generateUniqueID, renderDate } from '../../utils/utils'
import { issue123DocumentState } from '../../../bugs/issue-123'
import { ExperimentalPortalExtension } from '../structure/ExperimentalPortalExtension'
import { ExternalPortalExtension } from '../structure/ExternalPortalExtension'
import { WarningExtension } from '../structure/WarningTipTapExtension'
import { LifemapCardExtension, SingleLifemapCardExtension } from '../structure/LifemapCardExtension'
import { QuantaFlowExtension } from '../structure/QuantaFlowExtension'
import { CalendarExtension } from '../structure/CalendarExtension'
import { DailyExtension, DailyYesterday, DailyToday, DailyTomorrow } from '../structure/DailyExtension'
import { WeeklyExtension } from '../structure/WeeklyExtension'
import { LunarMonthExtension } from '../structure/LunarMonthExtension'
import { DayHeaderExtension, DayHeaderTasks, DayHeaderInsights, DayHeaderObservations } from '../structure/DayHeaderExtension'
import { TemporalSpaceExtension } from '../structure/TemporalSpaceExtension'
import { LifetimeViewExtension } from '../structure/LifetimeViewExtension'
import { SlashMenuExtension } from '../structure/SlashMenuExtension'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { FocusModePlugin } from '../plugins/FocusModePlugin'
import { DocumentAttributeExtension, DocumentAttributes, defaultDocumentAttributes } from '../structure/DocumentAttributesExtension'
import { motion } from 'framer-motion'
import { SalesGuideTemplate } from './SalesGuideTemplate'
import { getDailyScheduleTemplate } from './DailyScheduleTemplate'
import { getWeeklyScheduleTemplate } from './WeeklyScheduleTemplate'
import { getLifeMappingMainTemplate } from './LifeMappingMainTemplate'
import { Plugin, Transaction } from 'prosemirror-state'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { TiptapTransformer } from '@hocuspocus/transformer'

// Template quanta ID - this is the editable template in the Daily carousel
// When empty, it will be initialized from the hardcoded TEMPLATE_SCHEMA in DailyScheduleTemplate.ts
const DAILY_TEMPLATE_QUANTA_ID = 'daily-schedule-template'
// Template quanta ID - this is the editable template in the Weekly carousel
const WEEKLY_TEMPLATE_QUANTA_ID = 'weekly-schedule-template'
// Life Mapping Main quanta ID - when empty, initialized with LifeMappingMainTemplate
const LIFE_MAPPING_MAIN_QUANTA_ID = 'life-mapping-main'

/**
 * Fetches the content of a quanta from IndexedDB
 * Returns the JSONContent or null if not found/empty
 */
const fetchQuantaContentFromIndexedDB = async (quantaId: string): Promise<JSONContent | null> => {
  const perfStart = performance.now()
  console.log(`[fetchQuanta PERF] Starting for ${quantaId}`)
  
  return new Promise((resolve) => {
    console.log(`[fetchQuanta PERF] ${quantaId} Creating Y.Doc...`)
    const yDocStart = performance.now()
    const yDoc = new Y.Doc()
    console.log(`[fetchQuanta PERF] ${quantaId} Y.Doc created in ${(performance.now() - yDocStart).toFixed(0)}ms`)
    
    console.log(`[fetchQuanta PERF] ${quantaId} Creating IndexeddbPersistence...`)
    const persistStart = performance.now()
    const persistence = new IndexeddbPersistence(quantaId, yDoc)
    console.log(`[fetchQuanta PERF] ${quantaId} IndexeddbPersistence created in ${(performance.now() - persistStart).toFixed(0)}ms`)
    
    persistence.on('synced', () => {
      console.log(`[fetchQuanta PERF] ${quantaId} synced event fired after ${(performance.now() - perfStart).toFixed(0)}ms from start`)
      try {
        // Convert yDoc to TipTap JSON content
        // The 'default' field is where TipTap Collaboration stores the document
        const transformStart = performance.now()
        const content = TiptapTransformer.fromYdoc(yDoc, 'default')
        console.log(`[fetchQuanta PERF] ${quantaId} TiptapTransformer.fromYdoc took ${(performance.now() - transformStart).toFixed(0)}ms`)
        
        // Check if content is empty
        const hasContent = content && 
          content.content && 
          content.content.length > 0 &&
          // Check it's not just an empty paragraph
          !(content.content.length === 1 && 
            content.content[0].type === 'paragraph' && 
            !content.content[0].content)
        
        persistence.destroy()
        
        if (hasContent) {
          console.log(`[fetchQuanta PERF] ${quantaId} total time: ${(performance.now() - perfStart).toFixed(0)}ms (has content)`)
          resolve(content)
        } else {
          console.log(`[fetchQuanta PERF] ${quantaId} total time: ${(performance.now() - perfStart).toFixed(0)}ms (empty)`)
          resolve(null)
        }
      } catch (error) {
        console.error('[RichText] Error reading template from IndexedDB:', error)
        persistence.destroy()
        resolve(null)
      }
    })
    
    // Timeout after 3 seconds
    setTimeout(() => {
      console.warn(`[fetchQuanta PERF] ${quantaId} TIMEOUT after 3s (total: ${(performance.now() - perfStart).toFixed(0)}ms)`)
      persistence.destroy()
      resolve(null)
    }, 3000)
  })
}
import { EmptyNodeCleanupExtension } from '../../extensions/EmptyNodeCleanupExtension'
import { backup } from '../../backend/backup'
import { HighlightImportantLinePlugin } from './HighlightImportantLinePlugin'
import { useEditorContext } from '../../contexts/EditorContext'

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
    // document: false, // Re-enable default document
  }),
  Table.configure({
    resizable: true,
    cellMinWidth: 300
  }),
  TableRow,
  TableHeader,
  TableCell.configure({
    content: 'block+',
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
    types: ['paragraph', 'mention', 'group', 'scrollview', 'daily'],
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
  // CustomMention disabled - using HashtagMention (#) instead for all tags
  // CustomMention.configure(
  //   {
  //     HTMLAttributes: {
  //       class: 'mention',
  //     },
  //     suggestion: mentionSuggestionOptions,
  //   }
  // ),
  // TimePoint mentions - triggered by @ for date insertion (Today, Tomorrow, etc.)
  TimePointNode,
  TimePointMention,
  // Location mentions - triggered by ! for location insertion (Sydney, Tokyo, etc.)
  LocationNode,
  LocationMention,
  // Hashtag mentions - triggered by # for tagging content
  HashtagNode,
  HashtagMention,
  // Merit/Demerit mentions - triggered by * for pros/cons, advantages/disadvantages
  MeritDemeritNode,
  MeritDemeritMention,
  // Finesse mentions - triggered by ^ for energy levels
  FinesseNode,
  FinesseMention,
  // Pomodoro/Duration - triggered by ~ for duration insertion (5 mins, 10 mins, etc.)
  // PomodoroNode is for short durations (< 1 day) with timer functionality
  // DurationBadgeNode is for celestial durations (>= 1 day) without timer functionality
  PomodoroNode,
  DurationBadgeNode,
  DurationExtension,
  DocumentAttributeExtension,
  FadeIn,
  FocusModePlugin,
  GroupExtension,
  ScrollViewExtension,
  Indent,
  KeyValuePairExtension,
  // LocationExtension removed - conflicts with LocationNode from LocationMention.tsx (both use name: "location")
  // LocationNode supports inline mentions with pin emoji via # trigger
  MapboxMapExtension,
  // Excalidraw - hand-drawn style whiteboard for moodboards, diagrams, and visual brainstorming
  // https://github.com/excalidraw/excalidraw
  ExcalidrawExtension,
  MathExtension,
  MessageExtension,
  PortalExtension,
  ExperimentalPortalExtension,
  ExternalPortalExtension,
  QuoteExtension,
  WarningExtension,
  LifemapCardExtension,
  SingleLifemapCardExtension,
  QuantaFlowExtension,
  CalendarExtension,
  HighlightImportantLinePlugin,
  DailyYesterday,
  DailyToday,
  DailyTomorrow,
  DailyExtension,
  WeeklyExtension,
  LunarMonthExtension,
  DayHeaderTasks,
  DayHeaderInsights,
  DayHeaderObservations,
  DayHeaderExtension,
  TemporalSpaceExtension,
  LifetimeViewExtension,
  SlashMenuExtension,
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

  const editor = useEditor({
    extensions: [...generatedOfficialExtensions, ...customExtensions, ...agents],
    editable: false,
    immediatelyRender: false,
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
  const [currentFocusLens, setCurrentFocusLens] = React.useState<DocumentAttributes['selectedFocusLens']>(defaultDocumentAttributes.selectedFocusLens);

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
    immediatelyRender: false,
    extensions: [...generatedOfficialExtensions, ...customExtensions, ...agents],
    editable: !readOnly, // Only enable when mounted
    enableContentCheck: true, // Enable content validation
    autofocus: true, // Auto-focus the editor on load
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
      // @ts-ignore - getDocumentAttributes exists via the extension
      const documentAttributes: DocumentAttributes = editor.commands.getDocumentAttributes()
      // Update state if lens changed
      if (documentAttributes.selectedFocusLens !== currentFocusLens) {
        setCurrentFocusLens(documentAttributes.selectedFocusLens);
      }

      // Set global editability based on the lens
      const shouldBeEditable = documentAttributes.selectedFocusLens === "admin-editing" || documentAttributes.selectedFocusLens === "call-mode" || documentAttributes.selectedFocusLens === "dev-mode";
      if (editor.isEditable !== shouldBeEditable) {
        editor.setEditable(shouldBeEditable);
      }
    },
    onCreate: ({ editor }) => {
      // Runs once when editor is initialized
      // Set initial editability and focus lens state
      // @ts-ignore
      const documentAttributes: DocumentAttributes = editor.commands.getDocumentAttributes();
      setCurrentFocusLens(documentAttributes.selectedFocusLens); // Set initial state
      const shouldBeEditable = documentAttributes.selectedFocusLens === 'admin-editing' || documentAttributes.selectedFocusLens === 'call-mode' || documentAttributes.selectedFocusLens === 'dev-mode';
      editor.setEditable(shouldBeEditable);

      // Listen for attribute changes from localStorage to update state
      const handleAttributeUpdate = (event: Event) => {
        // @ts-ignore - CustomEvent has detail property
        const updatedAttributes = event.detail as DocumentAttributes;
        if (updatedAttributes && updatedAttributes.selectedFocusLens !== currentFocusLens) {
           setCurrentFocusLens(updatedAttributes.selectedFocusLens);
        }
      };
      window.addEventListener('doc-attributes-updated', handleAttributeUpdate);
      // TODO: Consider cleanup for this listener if RichText unmounts.
    },
    onUpdate: ({ editor }) => {
      if (!contentError) {
        throttledBackup(editor.getJSON())
      }
      
      // @ts-ignore
      const documentAttributes = editor.commands.getDocumentAttributes()
    },
    onTransaction: ({ editor, transaction }) => {
    },
  })

  // Effect to manage scroll-snap based on currentFocusLens
  React.useEffect(() => {
    // Target the main scrolling element (usually documentElement for window scrolling)
    const scrollElement = document.documentElement;

    if (currentFocusLens === 'call-mode') {
      // Enable scroll snapping
      scrollElement.style.scrollSnapType = 'y mandatory';
      // Optional: Add padding to influence snapping point if needed
      // scrollElement.style.scrollPaddingTop = '25vh'; // Example: snap closer to center
    } else {
      // Disable scroll snapping
      scrollElement.style.scrollSnapType = 'none';
      // scrollElement.style.scrollPaddingTop = ''; // Reset padding if set
    }

    // Cleanup function to disable scroll snap when component unmounts or mode changes
    return () => {
      scrollElement.style.scrollSnapType = 'none';
      // scrollElement.style.scrollPaddingTop = ''; // Reset padding if set
    };
  }, [currentFocusLens]); // Rerun only when the focus lens changes

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
  
  // Share editor instance via context so DocumentFlowMenu can access it
  const { setEditor } = useEditorContext()
  React.useEffect(() => {
    if (editor) {
      setEditor(editor as Editor)
    }
    return () => {
      setEditor(null)
    }
  }, [editor, setEditor])
  
  // Listen for postMessage requests for editor JSON (from parent pages like life-mapping-old)
  React.useEffect(() => {
    if (!editor) return;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'get-editor-json') {
        // Respond with the editor's JSON content
        const json = (editor as Editor).getJSON();
        window.parent.postMessage({
          type: 'editor-json-response',
          json: json,
        }, '*');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [editor])
  
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

        // Mark template as applied
      templateApplied.current = true;
        
        // Now safe to remove from sessionStorage
        sessionStorage.removeItem('newSalesGuide');
      }, 300);
    }
  }, [props.quanta?.id, editor]);

  // Check for new daily schedule template flag
  // Uses localStorage because sessionStorage is NOT shared between iframes and parent
  // Fetches from the editable template at /q/daily-schedule-template, falls back to hardcoded
  // Supports initializing both today and tomorrow's schedules
  //
  // IMPORTANT: Uses Y.Doc event-based approach to wait for IndexedDB to sync before checking
  // if the editor is empty. This prevents race conditions where content could be applied
  // before IndexedDB finishes syncing.
  const dailyPageInitChecked = React.useRef(false);
  React.useEffect(() => {
    const pendingSchedulesStr = localStorage.getItem('newDailySchedules');
    const pendingSchedules: string[] = pendingSchedulesStr ? JSON.parse(pendingSchedulesStr) : [];
    const urlId = window.location.pathname.split('/').pop();
    
    const isInPending = urlId && pendingSchedules.includes(urlId);
    
    // Only apply template if URL ID is in the pending schedules array
    if (!isInPending) return;
    if (!props.quanta?.information || !editor || templateApplied.current || dailyPageInitChecked.current) return;
    
    const yDoc = props.quanta.information;
    let stabilizationTimeout: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    const STABILIZATION_DELAY = 800;
    const FALLBACK_TIMEOUT = 2000;
    
    const removeFromPendingList = () => {
      const currentPendingStr = localStorage.getItem('newDailySchedules');
      const currentPending: string[] = currentPendingStr ? JSON.parse(currentPendingStr) : [];
      const updatedPending = currentPending.filter(id => id !== urlId);
      if (updatedPending.length > 0) {
        localStorage.setItem('newDailySchedules', JSON.stringify(updatedPending));
      } else {
        localStorage.removeItem('newDailySchedules');
      }
    };
    
    const checkAndApplyTemplate = async () => {
      // Guard: only run once
      if (dailyPageInitChecked.current || templateApplied.current) return;
      dailyPageInitChecked.current = true;
      
      const isEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      console.log(`[RichText PERF] ${urlId} checkAndApplyTemplate started, isEmpty=${isEmpty}`)
      const perfStart = performance.now()
      
      if (isEmpty) {
        // Fetch the editable template from IndexedDB, fall back to hardcoded if not found
        console.log(`[RichText PERF] ${urlId} Calling fetchQuantaContentFromIndexedDB...`)
        const fetchStart = performance.now()
        const templateContent = await fetchQuantaContentFromIndexedDB(DAILY_TEMPLATE_QUANTA_ID);
        console.log(`[RichText PERF] ${urlId} fetchQuantaContentFromIndexedDB took ${(performance.now() - fetchStart).toFixed(0)}ms, got content: ${!!templateContent}`)
        
        const contentToApply = templateContent || getDailyScheduleTemplate();
        
        console.log(`[RichText PERF] ${urlId} Calling setContent...`)
        const setContentStart = performance.now()
        ;(editor as Editor)!.commands.setContent(contentToApply);
        console.log(`[RichText PERF] ${urlId} setContent took ${(performance.now() - setContentStart).toFixed(0)}ms`)
        
        templateApplied.current = true;
        console.log(`[RichText] Applied daily template to ${urlId} (after Y.Doc stabilization) - total: ${(performance.now() - perfStart).toFixed(0)}ms`);
      } else {
        console.log(`[RichText] ${urlId} already has content, skipping template application`);
      }
      
      // Remove from pending list regardless
      removeFromPendingList();
    };
    
    const resetStabilizationTimer = () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        checkAndApplyTemplate();
      }, STABILIZATION_DELAY);
    };
    
    const handleUpdate = () => {
      resetStabilizationTimer();
    };
    
    yDoc.on('update', handleUpdate);
    resetStabilizationTimer();
    
    fallbackTimeout = setTimeout(() => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      checkAndApplyTemplate();
    }, FALLBACK_TIMEOUT);
    
    return () => {
      yDoc.off('update', handleUpdate);
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [props.quanta?.information, editor]);

  // Initialize the editable daily-schedule-template with the hardcoded template if it's empty
  // This allows users to edit the template at /q/daily-schedule-template
  // 
  // IMPORTANT: Uses Y.Doc event-based approach to wait for IndexedDB to sync before checking
  // if the editor is empty. This prevents the race condition where content is applied before
  // IndexedDB finishes syncing, which would cause Y.js to MERGE both (duplication bug).
  const dailyTemplateInitChecked = React.useRef(false);
  React.useEffect(() => {
    const urlId = window.location.pathname.split('/').pop();
    
    // Only apply to the template quanta itself
    if (urlId !== DAILY_TEMPLATE_QUANTA_ID) return;
    if (!props.quanta?.information || !editor || templateApplied.current || dailyTemplateInitChecked.current) return;
    
    const yDoc = props.quanta.information;
    let stabilizationTimeout: NodeJS.Timeout | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;
    const STABILIZATION_DELAY = 800; // Wait 800ms of no updates before considering stable
    const FALLBACK_TIMEOUT = 2000; // Max wait time in case no updates come
    
    const checkAndInitializeIfEmpty = () => {
      // Guard: only run once
      if (dailyTemplateInitChecked.current || templateApplied.current) return;
      dailyTemplateInitChecked.current = true;
      
      const isEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      
      if (isEmpty) {
        (editor as Editor)!.commands.setContent(getDailyScheduleTemplate());
        templateApplied.current = true;
        console.log('[RichText] Initialized daily-schedule-template with hardcoded template (after Y.Doc stabilization)');
      } else {
        console.log('[RichText] daily-schedule-template already has content, skipping initialization');
      }
    };
    
    const resetStabilizationTimer = () => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        // Clear fallback since we're done
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        checkAndInitializeIfEmpty();
      }, STABILIZATION_DELAY);
    };
    
    // Listen for Y.Doc updates (triggered when IndexedDB syncs content)
    const handleUpdate = () => {
      resetStabilizationTimer();
    };
    
    yDoc.on('update', handleUpdate);
    
    // Start stabilization timer immediately (handles case where Y.Doc already has content)
    resetStabilizationTimer();
    
    // Fallback: if no updates come within FALLBACK_TIMEOUT, check anyway
    fallbackTimeout = setTimeout(() => {
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      checkAndInitializeIfEmpty();
    }, FALLBACK_TIMEOUT);
    
    return () => {
      yDoc.off('update', handleUpdate);
      if (stabilizationTimeout) clearTimeout(stabilizationTimeout);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
    };
  }, [props.quanta?.information, editor]);

  // Check for new weekly schedule template flag
  // Uses localStorage because sessionStorage is NOT shared between iframes and parent
  // Now fetches the editable template from IndexedDB instead of using hardcoded template
  // Supports initializing both this week and next week's schedules
  React.useEffect(() => {
    if (!props.quanta?.id || !editor || templateApplied.current) return;
    
    const pendingSchedulesStr = localStorage.getItem('newWeeklySchedules');
    const pendingSchedules: string[] = pendingSchedulesStr ? JSON.parse(pendingSchedulesStr) : [];
    const urlId = window.location.pathname.split('/').pop();
    
    const isInPending = urlId && pendingSchedules.includes(urlId);
    
    // Only apply template if URL ID is in the pending schedules array
    if (isInPending && editor) {
      // Check if editor is empty before applying template
      const isEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      
      if (isEmpty) {
        // Fetch the editable template from IndexedDB, fall back to hardcoded if not found
        const applyTemplate = async () => {
          const templateContent = await fetchQuantaContentFromIndexedDB(WEEKLY_TEMPLATE_QUANTA_ID);
          
          // Use the editable template if found, otherwise fall back to hardcoded
          const contentToApply = templateContent || getWeeklyScheduleTemplate();
          
          (editor as Editor)!.commands.setContent(contentToApply);
          
          // Mark template as applied
          templateApplied.current = true;
          
          // Remove this URL from pending list (not all of them)
          const updatedPending = pendingSchedules.filter(id => id !== urlId);
          if (updatedPending.length > 0) {
            localStorage.setItem('newWeeklySchedules', JSON.stringify(updatedPending));
          } else {
            localStorage.removeItem('newWeeklySchedules');
          }
        };
        
        setTimeout(() => {
          applyTemplate();
        }, 300);
      } else {
        // Remove this URL from pending list
        const updatedPending = pendingSchedules.filter(id => id !== urlId);
        if (updatedPending.length > 0) {
          localStorage.setItem('newWeeklySchedules', JSON.stringify(updatedPending));
        } else {
          localStorage.removeItem('newWeeklySchedules');
        }
      }
    }
  }, [props.quanta?.id, editor]);

  // Initialize life-mapping-main with LifeMappingMainTemplate if empty
  // DISABLED: Template auto-loading disabled to preserve user content
  // Set ENABLE_LIFE_MAPPING_MAIN_TEMPLATE to true to re-enable
  const ENABLE_LIFE_MAPPING_MAIN_TEMPLATE = false;
  React.useEffect(() => {
    if (!ENABLE_LIFE_MAPPING_MAIN_TEMPLATE) return; // Template loading disabled
    if (!props.quanta?.id || !editor || templateApplied.current) return;
    
    const urlId = window.location.pathname.split('/').pop();
    
    // Only apply to life-mapping-main
    if (urlId === LIFE_MAPPING_MAIN_QUANTA_ID && editor) {
      const isEmpty = editor.isEmpty || editor.state.doc.textContent.trim() === '';
      
      if (isEmpty) {
        setTimeout(() => {
          // Initialize with the LifeMappingMainTemplate
          (editor as Editor)!.commands.setContent(getLifeMappingMainTemplate());
          templateApplied.current = true;
          console.log('[RichText] Initialized life-mapping-main with LifeMappingMainTemplate');
        }, 300);
      }
    }
  }, [props.quanta?.id, editor]);

  // Auto-insert Daily node for present-day-tasks after content has synced from IndexedDB
  // Also removes duplicate Daily nodes if multiple exist
  const dailyNodeCheckDone = React.useRef(false);
  
  React.useEffect(() => {
    // Early exit if already checked in this component instance
    if (dailyNodeCheckDone.current) return;
    if (!props.quanta?.id || !editor) return;
    
    const urlId = window.location.pathname.split('/').pop();
    if (urlId !== 'present-day-tasks') return;
    
    // Access the Y.Doc from the quanta props
    const yDoc = props.quanta?.information;
    if (!yDoc) return;
    
    let stabilityTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;
    
    const checkAndInsertDaily = () => {
      // Double-check the ref and cancellation flag before any action
      if (isCancelled || dailyNodeCheckDone.current) return;
      
      // Mark as done FIRST to prevent any race conditions
      dailyNodeCheckDone.current = true;
      
      // Count daily nodes and collect their positions
      const dailyNodePositions: number[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'daily') {
          dailyNodePositions.push(pos);
        }
        return true;
      });
      
      const dailyCount = dailyNodePositions.length;
      
      if (dailyCount === 0) {
        // No daily node exists, insert one
        editor.chain().focus('end').insertContent({ type: 'daily' }).run();
      } else if (dailyCount > 1) {
        // Multiple daily nodes exist - remove extras (keep the first one)
        // Delete in reverse order to avoid position shifts affecting earlier positions
        const positionsToDelete = dailyNodePositions.slice(1).reverse();
        
        let chain = editor.chain();
        for (const pos of positionsToDelete) {
          const node = editor.state.doc.nodeAt(pos);
          if (node && node.type.name === 'daily') {
            chain = chain.deleteRange({ from: pos, to: pos + node.nodeSize });
          }
        }
        chain.run();
        
        console.log(`[RichText] Removed ${dailyCount - 1} duplicate Daily node(s)`);
      }
    };
    
    // Wait for content to stabilize (no Y.Doc updates for 800ms)
    const onYDocUpdate = () => {
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
      if (!isCancelled && !dailyNodeCheckDone.current) {
        stabilityTimeout = setTimeout(checkAndInsertDaily, 800);
      }
    };
    
    // Listen for Y.Doc updates
    yDoc.on('update', onYDocUpdate);
    
    // Also set an initial timeout in case the doc is already synced and no updates come
    if (!dailyNodeCheckDone.current) {
      stabilityTimeout = setTimeout(checkAndInsertDaily, 1000);
    }
    
    return () => {
      isCancelled = true;
      yDoc.off('update', onYDocUpdate);
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
    };
  }, [props.quanta?.id, editor, props.quanta?.information]);

  // Auto-insert Calendar node for 'past' quanta (Monthly section) after content has synced
  // Use a module-level flag to prevent duplicate insertions across component remounts
  const calendarNodeCheckDone = React.useRef(false);
  
  React.useEffect(() => {
    // Early exit if already checked in this component instance
    if (calendarNodeCheckDone.current) return;
    if (!props.quanta?.id || !editor) return;
    
    const urlId = window.location.pathname.split('/').pop();
    if (urlId !== 'past') return;
    
    // Access the Y.Doc from the quanta props
    const yDoc = props.quanta?.information;
    if (!yDoc) return;
    
    let stabilityTimeout: NodeJS.Timeout | null = null;
    let isCancelled = false;
    
    const checkAndInsertCalendar = () => {
      // Double-check the ref and cancellation flag before any action
      if (isCancelled || calendarNodeCheckDone.current) return;
      
      // Mark as done FIRST to prevent any race conditions
      calendarNodeCheckDone.current = true;
      
      // Count calendar nodes and collect their positions
      const calendarNodePositions: number[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'calendar') {
          calendarNodePositions.push(pos);
        }
        return true;
      });
      
      const calendarCount = calendarNodePositions.length;
      
      if (calendarCount === 0) {
        editor.chain().focus('end').insertContent({ type: 'calendar' }).run();
      } else if (calendarCount > 1) {
        // Multiple calendar nodes exist - remove extras (keep the first one)
        // Delete in reverse order to avoid position shifts affecting earlier positions
        const positionsToDelete = calendarNodePositions.slice(1).reverse();
        
        let chain = editor.chain();
        for (const pos of positionsToDelete) {
          const node = editor.state.doc.nodeAt(pos);
          if (node && node.type.name === 'calendar') {
            chain = chain.deleteRange({ from: pos, to: pos + node.nodeSize });
          }
        }
        chain.run();
        
        console.log(`[RichText] Removed ${calendarCount - 1} duplicate Calendar node(s)`);
      }
    };
    
    // Wait for content to stabilize (no Y.Doc updates for 800ms)
    const onYDocUpdate = () => {
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
      if (!isCancelled && !calendarNodeCheckDone.current) {
        stabilityTimeout = setTimeout(checkAndInsertCalendar, 800);
      }
    };
    
    // Listen for Y.Doc updates
    yDoc.on('update', onYDocUpdate);
    
    // Also set an initial timeout in case the doc is already synced and no updates come
    if (!calendarNodeCheckDone.current) {
      stabilityTimeout = setTimeout(checkAndInsertCalendar, 1000);
    }
    
    return () => {
      isCancelled = true;
      yDoc.off('update', onYDocUpdate);
      if (stabilityTimeout) clearTimeout(stabilityTimeout);
    };
  }, [props.quanta?.id, editor, props.quanta?.information]);

  // TODO: Change this to proper responsiveness for each screen size
  const maxWidth = 1300

  if (editor) {
    if (process.env.NODE_ENV === 'development') {
      // console.debug(editor.schema)
    }

    return (
      <div key={props.quanta?.id} style={{width: '100%'}}>
        {/* DocumentFlowMenu removed from here - Assuming it's rendered in a parent layout component */}
        {/* <DocumentFlowMenu editor={editor as Editor} /> */}
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
    That's a boring paragraph followed by a fenced code block:
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