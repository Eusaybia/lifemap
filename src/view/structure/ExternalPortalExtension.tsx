import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  nodeInputRule,
} from "@tiptap/react";
import { Node } from "@tiptap/react";
import { Editor, mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { generateUniqueID } from "../../utils/utils";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NodeOverlay } from "../components/NodeOverlay";
import { Group, GroupLenses } from "./Group";
import { ExternalPortalPreview } from "./ExternalPortalPreview";

// Lens types for ExternalPortal - controls visibility/display
type ExternalPortalLenses = "identity" | "preview" | "private" | "tag";

/**
 * ExternalPortalExtension - A portal that embeds an external Quanta as an iframe.
 * 
 * ARCHITECTURE DECISION: Iframe-based embedding with postMessage height sync
 * ==========================================================================
 * This follows the same pattern as /life-mapping-old/page.tsx:
 * 1. It provides isolation - the Quanta's styles/scripts don't affect this page
 * 2. It allows the Quanta to be opened independently in a new tab
 * 3. The Quanta can communicate its height via postMessage for dynamic sizing
 * 
 * HISTORY: Previously this rendered the content directly using generateHTML and 
 * TipTap's rendering. This was changed to use iframes for better isolation and 
 * to support full editing capability within the embedded quanta.
 * 
 * Usage: 
 * - Type @/quantaId@ to create a portal to that external quanta
 * - Or use the slash command "/external portal"
 */

// Regex to match @/quantaId@ pattern for creating external portals
const REGEX_BLOCK_AT_SLASH = /(^@\/(.+?)@)/;

// Shared border radius matching PortalExtension style
const sharedBorderRadius = 15;
const DEFAULT_IFRAME_HEIGHT = 220;
const MIN_IFRAME_HEIGHT = 40;
const MAX_INITIAL_HEIGHT = 420;
const MAX_IFRAME_HEIGHT = 420;
const buildExternalPortalSrc = (externalQuantaId: string, fillPane: boolean): string => {
  const searchParams = new URLSearchParams();

  if (!fillPane) {
    searchParams.set('mode', 'compact');
    searchParams.set('padding', '8');
  }

  if (fillPane) {
    searchParams.set('mode', 'graph');
    searchParams.set('fillPane', 'true');
    searchParams.set('disableNodeDrag', 'true');
    searchParams.set('padding', '0');
    searchParams.set('suppressFlushSyncWarning', 'true');
  }

  const queryString = searchParams.toString();
  return queryString ? `/q/${externalQuantaId}?${queryString}` : `/q/${externalQuantaId}`;
};

const SUBNOTE_USER_ID = '000000';

/**
 * Moves the current selection into a brand-new note and leaves an external
 * portal to it in the selection's place. The new note is seeded through the
 * server, because the browser has no write path to a Tiptap Cloud room it has
 * not opened yet; the portal's iframe then opens the room as usual. The
 * room lives under the same '000000' user the /q route reads, so the iframe
 * sees the content it was seeded with.
 */
const subnoteExtractionsInFlight = new WeakSet<Editor>();

const TIME_TAG_ID_PREFIX = 'timepoint:time-';
const DATE_TAG_ID_PREFIX = 'timepoint:date-';

const timepointIdsIn = (nodes: unknown[]): string[] => {
  const ids: string[] = [];
  const walk = (node: unknown) => {
    const typed = node as { type?: string; attrs?: { id?: string }; content?: unknown[] };
    if (typed.type === 'timepoint' && typeof typed.attrs?.id === 'string') ids.push(typed.attrs.id);
    (typed.content ?? []).forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
};

/**
 * A line such as "12 PM – Arrive at Shoal Bay" only makes sense under the date
 * heading above it. Once it becomes its own note that context is gone, so the
 * sub-note inherits the nearest date tag that precedes it in the parent.
 */
const nearestDateTagBefore = (doc: ProseMirrorNode, pos: number): ProseMirrorNode | null => {
  let found: ProseMirrorNode | null = null;
  doc.nodesBetween(0, pos, (node) => {
    if (node.type.name === 'timepoint' && String(node.attrs.id ?? '').startsWith(DATE_TAG_ID_PREFIX)) found = node;
    return true;
  });
  return found;
};

const HARD_BREAK_TYPES = new Set(['hardBreak', 'hard_break']);

/** Widen a range over the line breaks that surround it so the parent keeps no dangling blank lines. */
const absorbAdjacentHardBreaks = (doc: ProseMirrorNode, from: number, to: number) => {
  let start = from;
  let end = to;
  for (;;) {
    const before = doc.resolve(start).nodeBefore;
    if (!before || !HARD_BREAK_TYPES.has(before.type.name)) break;
    start -= before.nodeSize;
  }
  for (;;) {
    const after = doc.resolve(end).nodeAfter;
    if (!after || !HARD_BREAK_TYPES.has(after.type.name)) break;
    end += after.nodeSize;
  }
  return { from: start, to: end };
};

export const extractSelectionToSubnote = async (editor: Editor): Promise<string | null> => {
  if (subnoteExtractionsInFlight.has(editor)) return null;
  const { state } = editor;
  const { selection } = state;
  if (selection instanceof NodeSelection && selection.node.type.name === 'externalPortal') {
    throw new Error('This is already a sub-note.');
  }
  const slice = selection.empty
    ? (() => {
        const $from = selection.$from;
        const block = $from.node($from.depth);
        return { content: [block.toJSON()], from: $from.before($from.depth), to: $from.after($from.depth) };
      })()
    : {
        content: selection.content().content.toJSON() as unknown[],
        ...absorbAdjacentHardBreaks(state.doc, selection.from, selection.to),
      };

  if (!Array.isArray(slice.content) || slice.content.length === 0) return null;
  const blocks = slice.content.map((node) => {
    const typed = node as { type?: string };
    return typed.type === 'text' ? { type: 'paragraph', content: [node] } : node;
  });

  const tagIds = timepointIdsIn(blocks);
  const hasTimeTag = tagIds.some((id) => id.startsWith(TIME_TAG_ID_PREFIX));
  const hasDateTag = tagIds.some((id) => id.startsWith(DATE_TAG_ID_PREFIX));
  if (hasTimeTag && !hasDateTag) {
    const dateTag = nearestDateTagBefore(state.doc, slice.from);
    if (dateTag) blocks.unshift({ type: 'paragraph', content: [dateTag.toJSON()] });
  }

  const noteId = generateUniqueID();
  subnoteExtractionsInFlight.add(editor);
  // Other portals write their measured height into the doc while the request
  // is in flight, so the range is mapped through every transaction instead of
  // assumed fixed.
  const mapping = new Mapping();
  const trackTransaction = ({ transaction }: { transaction: { docChanged: boolean; mapping: Mapping } }) => {
    if (transaction.docChanged) mapping.appendMapping(transaction.mapping);
  };
  editor.on('transaction', trackTransaction);
  try {
    const response = await fetch('/api/createNote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, userId: SUBNOTE_USER_ID, content: { type: 'doc', content: blocks } }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || 'Could not create the sub-note.');
    }
    const fromResult = mapping.mapResult(slice.from, 1);
    const toResult = mapping.mapResult(slice.to, -1);
    if (fromResult.deletedAfter || toResult.deletedBefore || toResult.pos <= fromResult.pos) {
      throw new Error(`The selected text changed while the sub-note was being created. It is saved at /q/${noteId}.`);
    }

    editor
      .chain()
      .focus()
      .deleteRange({ from: fromResult.pos, to: toResult.pos })
      .insertContentAt(fromResult.pos, { type: 'externalPortal', attrs: { externalQuantaId: noteId } })
      .run();
    return noteId;
  } finally {
    editor.off('transaction', trackTransaction);
    subnoteExtractionsInFlight.delete(editor);
  }
};

// Declare the setExternalPortalLens command for TypeScript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    externalPortal: {
      setExternalPortalLens: (options: { lens: ExternalPortalLenses }) => ReturnType;
    }
  }
}

const ExternalPortalExtension = Node.create({
  name: "externalPortal",
  group: "block",

  addStorage() {
    return { extractSelectionToSubnote };
  },
  atom: true, // Atom since we're embedding an iframe
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      externalQuantaId: {
        default: "",
        parseHTML: (element) => {
          return element.getAttribute("data-external-quanta-id");
        },
      },
      height: {
        // Keep a modest default; runtime resize logic grows/shrinks to content.
        default: DEFAULT_IFRAME_HEIGHT,
      },
      lens: {
        default: "identity" as ExternalPortalLenses,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-external-portal="true"]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const hasAttr = element.getAttribute('data-external-portal') === 'true';
          return hasAttr ? {} : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-external-portal": "true",
        "data-external-quanta-id": node.attrs.externalQuantaId,
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: REGEX_BLOCK_AT_SLASH,
        type: this.type,
        getAttributes: (match) => {
          return { externalQuantaId: match[2] || "" };
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      (props: NodeViewProps) => {
        const externalQuantaId = String(props.node.attrs.externalQuantaId || "");
        const iframeRef = useRef<HTMLIFrameElement | null>(null);
        const [iframeHeight, setIframeHeight] = useState(() => {
          const raw = Number(props.node.attrs.height);
          if (Number.isFinite(raw) && raw > 0) {
            return Math.min(raw, MAX_INITIAL_HEIGHT);
          }
          return DEFAULT_IFRAME_HEIGHT;
        });
        const [isTagExpanded, setIsTagExpanded] = useState(false);
        // Sub-notes open in the full editor so they are editable in place; the
        // static preview (ExternalPortalPreview) stays behind the toggle as the
        // fast path to return to once editing is optimised.
        const [isEditing, setIsEditing] = useState(true);

        // Get the current lens from node attributes
        const currentLens = (props.node.attrs.lens as ExternalPortalLenses | undefined) ?? 'identity';
        const isTag = currentLens === 'tag';
        const isPrivate = currentLens === 'private';
        const isPreview = currentLens === 'preview';
        const shouldFillSingleRootPortalPane = useMemo(() => {
          if (currentLens !== 'identity') {
            return false;
          }

          try {
            const doc = props.editor.state.doc;
            let meaningfulTopLevelNodeCount = 0;
            let portalNodeCount = 0;

            doc.forEach((child) => {
              const isEmptyParagraph =
                child.type.name === 'paragraph' &&
                child.textContent.trim() === '' &&
                child.childCount === 0;

              if (isEmptyParagraph) {
                return;
              }

              meaningfulTopLevelNodeCount += 1;
              if (child.type.name === 'externalPortal') {
                portalNodeCount += 1;
              }
            });

            return meaningfulTopLevelNodeCount === 1 && portalNodeCount === 1;
          } catch {
            return false;
          }
        }, [currentLens, props.editor.state.doc]);
        const usesFullHeightPane = shouldFillSingleRootPortalPane;
        const resolvedQuantaId = String(props.node.attrs.quantaId || externalQuantaId || "external-portal");
        const externalPortalSrc = useMemo(
          () => buildExternalPortalSrc(externalQuantaId, usesFullHeightPane),
          [externalQuantaId, usesFullHeightPane]
        );
        const handleQuantaIdChange = (newQuantaId: string) => {
          props.updateAttributes({ externalQuantaId: newQuantaId });
        };
        const stopInteractiveInputPropagation = useCallback((event: React.SyntheticEvent<HTMLElement>) => {
          event.stopPropagation();
        }, []);
        const applyIframeHeight = useCallback((value: number) => {
          if (usesFullHeightPane) return;

          const nextHeight = Math.min(
            Math.max(Math.round(value), MIN_IFRAME_HEIGHT),
            MAX_IFRAME_HEIGHT,
          );
          setIframeHeight((previousHeight) => previousHeight === nextHeight ? previousHeight : nextHeight);
          if (props.node.attrs.height !== nextHeight) {
            props.updateAttributes({ height: nextHeight });
          }
        }, [props.node.attrs.height, props.updateAttributes, usesFullHeightPane]);
        const measureIframeHeight = useCallback((iframe: HTMLIFrameElement | null) => {
          if (!iframe || usesFullHeightPane) return;

          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;

            // The body stretches to the iframe's own height, so measuring it can
            // never shrink the frame. The editor's bottom edge is the real content height.
            const editorElement = doc.querySelector('.ProseMirror');
            const measuredHeight = editorElement
              ? Math.ceil(editorElement.getBoundingClientRect().bottom + 8)
              : Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);

            if (measuredHeight > 0) {
              applyIframeHeight(measuredHeight);
            }
          } catch {
            // Ignore cross-context access issues; postMessage resize will still apply.
          }
        }, [applyIframeHeight, usesFullHeightPane]);
        const handleIframeLoad = useCallback((event: React.SyntheticEvent<HTMLIFrameElement>) => {
          measureIframeHeight(event.currentTarget);
        }, [measureIframeHeight]);

        // Keep hook order stable across lens switches (including "tag").
        useEffect(() => {
          const handleMessage = (event: MessageEvent) => {
            if (
              event.data?.type === 'resize-iframe' &&
              event.data.noteId === externalQuantaId &&
              typeof event.data.height === 'number'
            ) {
              applyIframeHeight(event.data.height);
            }
          };

          window.addEventListener('message', handleMessage);
          return () => window.removeEventListener('message', handleMessage);
        }, [applyIframeHeight, externalQuantaId]);

        useEffect(() => {
          measureIframeHeight(iframeRef.current);
        }, [measureIframeHeight, externalPortalSrc]);

        // The inner editor mounts only after its document syncs, well after the
        // iframe's load event, and nothing inside announces later edits, so poll.
        useEffect(() => {
          if (usesFullHeightPane || !isEditing) return;
          const timer = window.setInterval(() => measureIframeHeight(iframeRef.current), 600);
          return () => window.clearInterval(timer);
        }, [isEditing, measureIframeHeight, usesFullHeightPane]);
        const showLiveEditor = usesFullHeightPane || isEditing;

        useEffect(() => {
          if (!props.selected) {
            setIsTagExpanded(false);
          }
        }, [props.selected]);

        const renderExternalPortalFrame = (lens: GroupLenses) => (
          <NodeOverlay
            nodeProps={props}
            nodeType="externalPortal"
            isPrivate={lens === "private"}
            backgroundColor="#ffffff"
            boxShadow="none"
            borderRadius={6}
            padding={0}
            enableAuraGlow={false}
            style={{
              border: '1px solid #dadce0',
              ...(usesFullHeightPane
                ? {
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                  }
                : {}),
            }}
          >
            {externalQuantaId && !usesFullHeightPane ? (
              <button
                type="button"
                contentEditable={false}
                onClick={(event) => { event.stopPropagation(); setIsEditing((editing) => !editing); }}
                onPointerDown={stopInteractiveInputPropagation}
                onMouseDown={stopInteractiveInputPropagation}
                title={isEditing ? 'Back to the read-only view' : 'Edit this sub-note in place'}
                style={{
                  position: 'absolute', top: 4, right: 26, zIndex: 2,
                  border: '1px solid #dadce0', borderRadius: 4, background: '#fff', color: '#5f6368',
                  fontSize: 11, lineHeight: 1, padding: '3px 6px', cursor: 'pointer',
                }}
              >
                {isEditing ? 'Done' : '✎ Edit'}
              </button>
            ) : null}
            <div contentEditable={false} hidden={!props.selected} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
              <input
                type="text"
                value={externalQuantaId}
                onChange={(e) => handleQuantaIdChange(e.target.value)}
                onPointerDown={stopInteractiveInputPropagation}
                onMouseDown={stopInteractiveInputPropagation}
                onClick={stopInteractiveInputPropagation}
                onFocus={stopInteractiveInputPropagation}
                onKeyDown={stopInteractiveInputPropagation}
                onKeyUp={stopInteractiveInputPropagation}
                onBeforeInput={stopInteractiveInputPropagation}
                placeholder="quanta-id"
                style={{
                  border: "1.5px solid #34343430",
                  borderRadius: sharedBorderRadius,
                  outline: "none",
                  backgroundColor: "transparent",
                  width: `120px`,
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
                }}
              />
            </div>
            <Group
              lens={lens}
              quantaId={resolvedQuantaId}
              fillHeight={usesFullHeightPane}
              padding={0}
            >
              <div
                contentEditable={false}
                style={usesFullHeightPane
                  ? {
                      height: '100%',
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                    }
                  : undefined}
              >
                {externalQuantaId && !showLiveEditor ? (
                  <ExternalPortalPreview quantaId={externalQuantaId} userId={SUBNOTE_USER_ID} />
                ) : externalQuantaId ? (
                  <div
                    style={{
                      width: '100%',
                      height: usesFullHeightPane ? '100%' : `${iframeHeight}px`,
                      borderRadius: 5,
                      overflow: 'hidden',
                      background: 'white',
                      // ARCHITECTURE DECISION: round and clip on a wrapper div instead of
                      // the iframe itself because browsers do not reliably clip iframe
                      // content to border-radius after dynamic resizes.
                      clipPath: 'inset(0 round 5px)',
                      transform: 'translateZ(0)',
                      WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                      minHeight: 0,
                      flex: usesFullHeightPane ? 1 : undefined,
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={externalPortalSrc}
                      loading="lazy"
                      onLoad={handleIframeLoad}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'white',
                        display: 'block',
                      }}
                      title={`Embedded Quanta: ${externalQuantaId}`}
                    />
                  </div>
                ) : (
                  <div style={{
                    padding: 20,
                    textAlign: 'center',
                    color: '#888',
                    fontSize: 14,
                  }}>
                    No external quanta reference set
                  </div>
                )}
              </div>
            </Group>
          </NodeOverlay>
        );

        if (isTag) {
          const tagLabel = externalQuantaId?.trim() || 'External Portal';
          const sharedLayoutId = `external-portal-tag-preview-${props.node.attrs.quantaId ?? externalQuantaId ?? 'default'}`;
          const sharedTransition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.75 } as const;
          const handleTagMouseDown = (e: React.MouseEvent<HTMLElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsTagExpanded(true);

            const pos = props.getPos();
            if (typeof pos === 'number') {
              props.editor.chain().focus().setNodeSelection(pos).run();
            }
          };
          const shouldShowExpanded = props.selected && isTagExpanded;

          return (
            <NodeViewWrapper
              as="span"
              data-external-portal-lens="tag"
              style={{
                display: 'inline-block',
                position: 'relative',
                verticalAlign: 'middle',
              }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {!shouldShowExpanded ? (
                  <motion.span
                    key="external-portal-tag"
                    layoutId={sharedLayoutId}
                    transition={sharedTransition}
                    className={`duration-badge ${props.selected ? 'selected' : ''}`}
                    contentEditable={false}
                    onMouseDown={handleTagMouseDown}
                    style={{ cursor: 'pointer', opacity: 1 }}
                  >
                    <span className="duration-badge-label">{tagLabel}</span>
                  </motion.span>
                ) : (
                  <motion.div
                    key="external-portal-preview"
                    layoutId={sharedLayoutId}
                    transition={sharedTransition}
                    contentEditable={false}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      zIndex: 1000,
                      width: 'min(760px, 92vw)',
                    }}
                  >
                    {renderExternalPortalFrame("identity")}
                  </motion.div>
                )}
              </AnimatePresence>
            </NodeViewWrapper>
          );
        }

        const groupLens: GroupLenses = isPrivate ? "private" : (isPreview ? "preview" : "identity");

        return (
          <NodeViewWrapper
            style={usesFullHeightPane
              ? {
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  minHeight: 0,
                }
              : undefined}
          >
            {renderExternalPortalFrame(groupLens)}
          </NodeViewWrapper>
        );
      },
      {
        stopEvent: ({ event }) => {
          const target = event.target;
          if (!(target instanceof HTMLElement)) {
            return false;
          }

          return Boolean(
            target.closest(
              'input, textarea, select, button, a, [role="button"], [contenteditable="true"], iframe'
            )
          );
        },
      }
    );
  },

  addCommands() {
    return {
      setExternalPortalLens: (attributes: { lens: ExternalPortalLenses }) => ({ state, dispatch }) => {
        const { selection } = state;
        const pos = selection.$from.pos;
        const node = state.doc.nodeAt(pos);
        
        if (node && node.type.name === "externalPortal" && dispatch) {
          const tr = state.tr.setNodeMarkup(
            pos,
            null,
            {
              ...node.attrs,
              lens: attributes.lens
            }
          );
          dispatch(tr);
          return true;
        }
        return false;
      },
    };
  },
});

export { ExternalPortalExtension };
