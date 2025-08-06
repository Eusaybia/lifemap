'use client'

import './styles.scss'
import React from 'react'
import { Placeholder, Focus, Gapcursor } from '@tiptap/extensions'
import { Highlight } from '@tiptap/extension-highlight'
import { Color } from '@tiptap/extension-color'
import { EditorContent, Extensions, JSONContent, Editor, useEditor, Content, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { BulletList, OrderedList, ListItem, ListKeymap, TaskList, TaskItem } from '@tiptap/extension-list'
import FontFamily from '@tiptap/extension-font-family'
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
import { throttle, debounce } from 'lodash'
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
import { locationSuggestionOptions } from './LocationTipTapExtension'
import { BubbleMenu } from '@tiptap/extension-bubble-menu'
import { CalculationExtension } from './CalculationTipTapExtension'
import { FadeIn } from './FadeInExtension'
import { CustomLocation } from './Location'
import { CustomPeople } from './People'
import { CustomLink } from './Link'
import { KeyValuePairExtension } from '../structure/KeyValuePairTipTapExtensions'
import { QuoteExtension } from '../structure/QuoteTipTapExtension'
import { MessageExtension } from './MessageExtension'
import { SophiaAI } from '../../agents/Sophia'
import { ConversationExtension } from '../structure/ConversationExtension'
// import { LocationExtension } from './LocationTipTapExtension'
import { Ai } from "@tiptap-pro/extension-ai"
import { CommentExtension } from '../structure/CommentTipTapExtension'
import { PortalExtension } from '../structure/PortalExtension'
import { ScrollViewExtension } from '../structure/ScrollViewExtension'
import { generateUniqueID, renderDate } from '../../utils/utils'
import { issue123DocumentState } from '../../../bugs/issue-123'
import { ExperimentalPortalExtension } from '../structure/ExperimentalPortalExtension'
import { WarningExtension } from '../structure/WarningTipTapExtension'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { FocusModePlugin } from '../plugins/FocusModePlugin'
import { DocumentAttributeExtension, DocumentAttributes, defaultDocumentAttributes } from '../structure/DocumentAttributesExtension'
import { motion } from 'framer-motion'
import { SalesGuideTemplate } from './SalesGuideTemplate'
import { Plugin, Transaction } from 'prosemirror-state'
import { EmptyNodeCleanupExtension } from '../../extensions/EmptyNodeCleanupExtension'
import { backup } from '../../backend/backup'
import { HighlightImportantLinePlugin } from './HighlightImportantLinePlugin'
import { LocationRouteExtension } from './LocationRouteExtension'
import { PeopleRouteExtension } from './PeopleRouteExtension'
import { peopleSuggestionOptions } from './PeopleTipTapExtension'
import { FieldExtension } from './FieldTipTapExtension'
import { FocusMarkExtension } from './FocusMarkExtension'
import { ConfusionAuraExtension } from './ConfusionAuraExtension'
import { ClarityMarkExtension } from './ClarityMarkExtension'
import { BlockageMarkExtension } from './BlockageMarkExtension'
import { UnawarenessExtension } from './UnawarenessExtension'

// Feature flag to temporarily disable Location and People extensions
const DISABLE_LOCATION_AND_PEOPLE_EXTENSIONS = false

// Feature flag to disable auto-detection/tagging while keeping extensions enabled
const DISABLE_AUTO_TAGGING = true

// Add interface for Google Cloud Natural Language API response
interface LocationEntity {
  name: string;
  type: string;
  mentions: Array<{
    text: {
      content: string;
      beginOffset: number;
    };
    type: string;
    probability: number;
  }>;
}

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
    // Remove the invalid content property
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
    types: ['paragraph', 'location', 'group', 'scrollview'],
    filterTransaction: transaction => !isChangeOrigin(transaction),
    generateID: generateUniqueID,
    attributeName: 'quantaId',
  }),
] as Extensions}

export const customExtensions: Extensions = [
  BlockageMarkExtension,
  CalculationExtension,
  ClarityMarkExtension,
  CommentExtension,
  ConversationExtension,
  ConfusionAuraExtension,
  CustomLink.configure({
    openOnClick: true,
  }),
  FieldExtension,
  FocusMarkExtension,
  UnawarenessExtension,
  // Conditionally include Location and People extensions
  ...(DISABLE_LOCATION_AND_PEOPLE_EXTENSIONS ? [] : [
    CustomLocation.configure(
      {
        HTMLAttributes: {
          class: 'location',
        },
        suggestion: locationSuggestionOptions,
      }
    ),
    CustomPeople.configure(
      {
        HTMLAttributes: {
          class: 'people',
        },
        suggestion: peopleSuggestionOptions,
      }
    ),
    LocationRouteExtension,
    PeopleRouteExtension,
  ]),
  DocumentAttributeExtension,
  FadeIn,
  FocusModePlugin,
  GroupExtension,
  ScrollViewExtension,
  Indent,
  KeyValuePairExtension,
  // LocationExtension,
  MathExtension,
  MessageExtension,
  PortalExtension,
  ExperimentalPortalExtension,
  QuoteExtension,
  WarningExtension,
  HighlightImportantLinePlugin,
  Ai.configure({
    appId: 'x0q7vmd9',
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTQwMDU4NzEsIm5iZiI6MTc1NDAwNTg3MSwiZXhwIjoxNzU0MDkyMjcxLCJpc3MiOiJodHRwczovL2Nsb3VkLnRpcHRhcC5kZXYiLCJhdWQiOiI1MjRmNjczZi0yNTQ1LTRkNDQtYTFmOC1mNDUwZDUxMzE3YTEifQ.Jp_2Q7pyEJeBcaogFLuoR2rLF-WIQM0M7weAezFD8ec',
  }),
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
      console.log("Initial Document Attributes", documentAttributes);
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
      
      console.log("JSON Output", editor.getJSON())
      // @ts-ignore
      const documentAttributes = editor.commands.getDocumentAttributes()
      console.log("Document Attributes", documentAttributes)
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
      console.log("Scroll snap ENABLED (y mandatory)");
    } else {
      // Disable scroll snapping
      scrollElement.style.scrollSnapType = 'none';
      // scrollElement.style.scrollPaddingTop = ''; // Reset padding if set
      console.log("Scroll snap DISABLED");
    }

    // Cleanup function to disable scroll snap when component unmounts or mode changes
    return () => {
      scrollElement.style.scrollSnapType = 'none';
      // scrollElement.style.scrollPaddingTop = ''; // Reset padding if set
      console.log("Scroll snap DISABLED (cleanup)");
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
  
  // Real-time function for tagging people (no debounce)
  const tagPeopleRealTime = React.useCallback(async (editorInstance: Editor) => {
    if (!editorInstance || editorInstance.isDestroyed) return;

    // Get existing tagged people to avoid re-tagging
    const existingPeople = new Set<string>();
    editorInstance.state.doc.descendants((node) => {
      if (node.type.name === 'people') {
        existingPeople.add(node.attrs.label);
      }
      return true;
    });

    const plainText = editorInstance.getText();
    if (!plainText.trim()) return;

    // Use Compromise to detect people
    let peopleToTag: string[] = [];
    try {
      const nlp = (await import('compromise')).default;
      const doc = nlp(plainText);
      const people = doc.people().out('array');
      
      // Filter out existing people and add new ones
      people.forEach((person: string) => {
        if (!existingPeople.has(person)) {
          peopleToTag.push(person);
        }
      });
      
      console.log('👤 Compromise detected people:', people);
    } catch (error) {
      console.error('Compromise error for people detection, falling back to regex:', error);
      
      // Fallback to regex-based detection
      const peoplePatterns = [
        /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\b/gi,
        /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g // Capitalized words (potential names)
      ];
      
      peoplePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(plainText)) !== null) {
          if (!existingPeople.has(match[0])) {
            peopleToTag.push(match[0]);
          }
        }
      });
    }

    if (peopleToTag.length === 0) return;

    // Walk through the document and find text nodes that contain untagged people
    editorInstance.commands.command(({ tr, state }) => {
      tr.setMeta('fromAutoTagging', true);
      
      let hasChanges = false;

      state.doc.descendants((node, pos) => {
        // Only process text nodes
        if (node.isText && node.text) {
          peopleToTag.forEach(personName => {
            const text = node.text!;
            const index = text.indexOf(personName);
            
            if (index !== -1) {
              // Calculate absolute position in document
              const from = pos + index;
              const to = from + personName.length;
              
              // Make sure we're not overwriting an existing people tag
              let alreadyTagged = false;
              state.doc.nodesBetween(from, to, (checkNode) => {
                if (checkNode.type.name === 'people') {
                  alreadyTagged = true;
                }
              });

              if (!alreadyTagged && from >= 0 && to <= state.doc.content.size) {
                const peopleNode = state.schema.nodes.people.create({
                  id: personName,
                  label: personName,
                });
                tr.replaceWith(from, to, peopleNode);
                hasChanges = true;
                
                // Remove this person from the list to avoid tagging them multiple times
                const personIndex = peopleToTag.indexOf(personName);
                if (personIndex > -1) {
                  peopleToTag.splice(personIndex, 1);
                }
              }
            }
          });
        }
        return true;
      });
      
      return hasChanges;
    });

  }, []);

  // Real-time function for tagging locations (no debounce)
  const tagLocationsRealTime = React.useCallback(async (editorInstance: Editor) => {
    if (!editorInstance || editorInstance.isDestroyed) return;

    // Get existing tagged locations to avoid re-tagging
    const existingLocations = new Set<string>();
    editorInstance.state.doc.descendants((node) => {
      if (node.type.name === 'location') {
        existingLocations.add(node.attrs.label);
      }
      return true;
    });

    const plainText = editorInstance.getText();
    if (!plainText.trim()) return;

    // Use Compromise to detect locations
    let locationsToTag: string[] = [];
    try {
      const nlp = (await import('compromise')).default;
      const doc = nlp(plainText);
      const places = doc.places().out('array');
      
      // Filter out existing locations and add new ones
      places.forEach((place: string) => {
        if (!existingLocations.has(place)) {
          locationsToTag.push(place);
        }
      });
      
      console.log('📍 Compromise detected locations:', places);
    } catch (error) {
      console.error('Compromise error, falling back to regex:', error);
      
      // Fallback to regex-based detection
      const locationWords = ['Sydney', 'Shanghai', 'Singapore', 'Malaysia', 'Hong Kong', 'Shenzhen', 'Kansas City', 'Tibet', 'Essaouira', 'Morocco', 'San Francisco', 'Washington', 'New York', 'London', 'Paris', 'Tokyo', 'Beijing', 'Mumbai', 'Dubai', 'Cairo'];
      
      locationWords.forEach(location => {
        if (plainText.includes(location) && !existingLocations.has(location)) {
          locationsToTag.push(location);
        }
      });
    }

    if (locationsToTag.length === 0) return;

    // Walk through the document and find text nodes that contain untagged locations
    editorInstance.commands.command(({ tr, state }) => {
      tr.setMeta('fromAutoTagging', true);
      
      let hasChanges = false;

      state.doc.descendants((node, pos) => {
        // Only process text nodes
        if (node.isText && node.text) {
          locationsToTag.forEach(locationName => {
            const text = node.text!;
            const index = text.indexOf(locationName);
            
            if (index !== -1) {
              // Calculate absolute position in document
              const from = pos + index;
              const to = from + locationName.length;
              
              // Make sure we're not overwriting an existing location tag
              let alreadyTagged = false;
              state.doc.nodesBetween(from, to, (checkNode) => {
                if (checkNode.type.name === 'location') {
                  alreadyTagged = true;
                }
              });

              if (!alreadyTagged && from >= 0 && to <= state.doc.content.size) {
                const locationNode = state.schema.nodes.location.create({
                  id: locationName,
                  label: locationName,
                });
                tr.replaceWith(from, to, locationNode);
                hasChanges = true;
                
                // Remove this location from the list to avoid tagging it multiple times
                const locationIndex = locationsToTag.indexOf(locationName);
                if (locationIndex > -1) {
                  locationsToTag.splice(locationIndex, 1);
                }
              }
            }
          });
        }
        return true;
      });
      
      return hasChanges;
    });

  }, []);

  // Trigger the functions on every editor update
  React.useEffect(() => {
    if (editor && !DISABLE_LOCATION_AND_PEOPLE_EXTENSIONS && !DISABLE_AUTO_TAGGING) {
      const handleUpdate = ({ editor: editorInstance, transaction }: { editor: Editor; transaction: Transaction }) => {
        // Ignore updates that were triggered by our own tagging to prevent a loop
        if (transaction.getMeta('fromAutoTagging')) {
          return;
        }
        tagPeopleRealTime(editorInstance);
        tagLocationsRealTime(editorInstance);
      };
      
      editor.on('update', handleUpdate);
      
      return () => {
        editor.off('update', handleUpdate);
      };
    }
  }, [editor, tagPeopleRealTime, tagLocationsRealTime]);
  
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
        editor.commands.setContent(SalesGuideTemplate);
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