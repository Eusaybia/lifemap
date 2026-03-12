import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  nodeInputRule,
} from "@tiptap/react";
import { Node } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NodeOverlay } from "../components/NodeOverlay";
import { Group, GroupLenses } from "./Group";

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
const MIN_IFRAME_HEIGHT = 96;
const MAX_INITIAL_HEIGHT = 420;
const MAX_IFRAME_HEIGHT = 420;
const KAIROS_USER_ID_STORAGE_KEY = 'kairos-user-id';
const LEGACY_KAIROS_USER_ID = '000000';

type DirectEmbedComponents = {
  EditorProvider: React.ComponentType<{ children: React.ReactNode }>
  Quanta: React.ComponentType<{ quantaId: string; userId: string }>
};

const resolveKairosUserId = (): string => {
  if (typeof window === 'undefined') return LEGACY_KAIROS_USER_ID;

  const storedUserId = window.localStorage.getItem(KAIROS_USER_ID_STORAGE_KEY);
  if (storedUserId && storedUserId.trim().length > 0) {
    return storedUserId;
  }

  return LEGACY_KAIROS_USER_ID;
};

const buildExternalPortalSrc = (externalQuantaId: string): string => {
  return `/q/${externalQuantaId}`;
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
        tag: "div",
        attrs: {
          "data-external-portal": "true",
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
        const usesDirectReactEmbed = shouldFillSingleRootPortalPane;
        const embeddedUserId = useMemo(() => resolveKairosUserId(), []);
        const [directEmbedComponents, setDirectEmbedComponents] = useState<DirectEmbedComponents | null>(null);
        const resolvedQuantaId = String(props.node.attrs.quantaId || externalQuantaId || "external-portal");
        const externalPortalSrc = useMemo(() => buildExternalPortalSrc(externalQuantaId), [externalQuantaId]);
        const handleQuantaIdChange = (newQuantaId: string) => {
          props.updateAttributes({ externalQuantaId: newQuantaId });
        };
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

            const measuredHeight = Math.max(
              doc.body?.scrollHeight || 0,
              doc.documentElement?.scrollHeight || 0,
              doc.body?.offsetHeight || 0,
              doc.documentElement?.offsetHeight || 0,
            );

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

        useEffect(() => {
          if (!usesDirectReactEmbed) {
            setDirectEmbedComponents(null);
            return;
          }

          let cancelled = false;

          void Promise.all([
            import('../../core/Quanta'),
            import('../../contexts/EditorContext'),
          ]).then(([quantaModule, editorContextModule]) => {
            if (cancelled) return;
            setDirectEmbedComponents({
              Quanta: quantaModule.Quanta as DirectEmbedComponents['Quanta'],
              EditorProvider: editorContextModule.EditorProvider as DirectEmbedComponents['EditorProvider'],
            });
          });

          return () => {
            cancelled = true;
          };
        }, [usesDirectReactEmbed]);

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
            style={usesFullHeightPane
              ? {
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }
              : undefined}
          >
            <div contentEditable={false} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
              <input
                type="text"
                value={externalQuantaId}
                onChange={(e) => handleQuantaIdChange(e.target.value)}
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
                {externalQuantaId ? (
                  <div
                    style={{
                      width: '100%',
                      height: usesFullHeightPane ? '100%' : `${iframeHeight}px`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: 'white',
                      // ARCHITECTURE DECISION: round and clip on a wrapper div instead of
                      // the iframe itself because browsers do not reliably clip iframe
                      // content to border-radius after dynamic resizes.
                      clipPath: 'inset(0 round 10px)',
                      transform: 'translateZ(0)',
                      WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                      minHeight: 0,
                      flex: usesFullHeightPane ? 1 : undefined,
                    }}
                  >
                    {usesDirectReactEmbed ? (
                      <div
                        className="nodrag nopan"
                        style={{
                          width: '100%',
                          height: '100%',
                          overflow: 'auto',
                          background: 'white',
                        }}
                      >
                        <style>{`
                          .external-portal-react-embed [data-drag-handle] {
                            display: none !important;
                          }
                        `}</style>
                        <div
                          className="external-portal-react-embed"
                          style={{
                            width: '100%',
                            minHeight: '100%',
                            padding: 16,
                            boxSizing: 'border-box',
                          }}
                        >
                          {directEmbedComponents ? (
                            <directEmbedComponents.EditorProvider>
                              <directEmbedComponents.Quanta quantaId={externalQuantaId} userId={embeddedUserId} />
                            </directEmbedComponents.EditorProvider>
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                minHeight: '100%',
                                display: 'grid',
                                placeItems: 'center',
                                color: '#64748b',
                              }}
                            >
                              Loading quanta…
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
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
                    )}
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
              ? { display: 'block', height: '100%', minHeight: 0 }
              : undefined}
          >
            {renderExternalPortalFrame(groupLens)}
          </NodeViewWrapper>
        );
      },
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
