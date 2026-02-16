import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  nodeInputRule,
} from "@tiptap/react";
import { Node } from "@tiptap/react";
import { mergeAttributes, isNodeSelection } from "@tiptap/core";
import React, { useEffect, useState } from "react";
import { DragGrip } from "../components/DragGrip";
import { motion } from "framer-motion";

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
        // Start with tall height to prevent content from being cut off during initial load
        default: 2000,
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
        const [externalQuantaId, setExternalQuantaId] = useState(props.node.attrs.externalQuantaId);
        // Start with tall height to prevent content from being cut off during initial load
        const [iframeHeight, setIframeHeight] = useState(props.node.attrs.height || 2000);

        // Get the current lens from node attributes
        const currentLens = props.node.attrs.lens as ExternalPortalLenses;
        const isTag = currentLens === 'tag';
        const isPrivate = currentLens === 'private';
        const isPreview = currentLens === 'preview';

        // Keep hook order stable across lens switches (including "tag").
        useEffect(() => {
          if (isTag) return;

          const handleMessage = (event: MessageEvent) => {
            if (
              event.data?.type === 'resize-iframe' &&
              event.data.noteId === externalQuantaId &&
              typeof event.data.height === 'number'
            ) {
              // Enforce minimum height to prevent content collapse
              const newHeight = Math.max(event.data.height, 800);
              setIframeHeight(newHeight);
              props.updateAttributes({ height: newHeight });
            }
          };

          window.addEventListener('message', handleMessage);
          return () => window.removeEventListener('message', handleMessage);
        }, [externalQuantaId, isTag, props.updateAttributes]);

        if (isTag) {
          const tagLabel = externalQuantaId?.trim() || 'External Portal';

          return (
            <NodeViewWrapper
              data-external-portal-lens="tag"
              style={{
                display: 'inline-block',
                width: 'fit-content',
                verticalAlign: 'middle',
              }}
            >
              <span
                className={`duration-badge ${props.selected ? 'selected' : ''}`}
                contentEditable={false}
              >
                <span className="duration-badge-emoji">📡</span>
                <span className="duration-badge-label">{tagLabel}</span>
              </span>
            </NodeViewWrapper>
          );
        }

        // Handle input change for quanta ID
        const handleQuantaIdChange = (newQuantaId: string) => {
          setExternalQuantaId(newQuantaId);
          props.updateAttributes({ externalQuantaId: newQuantaId });
        };

        return (
          <NodeViewWrapper>
            {/* Editable input positioned at top-left for easy editing */}
            <div contentEditable={false}>
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
                  position: "absolute",
                  zIndex: 1,
                }}
              />
            </div>
            
            {/* Neumorphic portal container - matching PortalExtension style */}
            <div
              style={{
                borderRadius: sharedBorderRadius,
                background: `#e0e0e0`,
                position: "relative",
                boxShadow: `inset 10px 10px 10px #bebebe,
                    inset -10px -10px 10px #FFFFFF99`,
                minHeight: 60,
                maxHeight: isPreview ? 100 : undefined,
                overflow: isPreview ? 'hidden' : undefined,
                padding: `11px 15px 11px 15px`,
                marginBottom: 10,
              }}
              contentEditable={false}
            >
              {/* DragGrip with onClick to select the node */}
              <div
                onMouseDown={(e) => {
                  // Prevent default to stop the editor from losing focus/selection
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const pos = props.getPos();
                  if (typeof pos === 'number') {
                    props.editor.commands.setNodeSelection(pos);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: -4,
                  zIndex: 10,
                  cursor: 'pointer',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <DragGrip
                  position="inline"
                  dotColor="#999"
                  hoverBackground="rgba(0, 0, 0, 0.08)"
                />
              </div>

              {/* Private lens overlay - completely black with grey text */}
              {isPrivate && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#000000',
                    borderRadius: sharedBorderRadius,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ color: '#666', fontSize: 14 }}>Private</span>
                </motion.div>
              )}
              
              {externalQuantaId ? (
                <iframe
                  src={`/q/${externalQuantaId}`}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: `${iframeHeight}px`,
                    border: 'none',
                    borderRadius: 10,
                    background: 'white',
                  }}
                  title={`Embedded Quanta: ${externalQuantaId}`}
                />
              ) : (
                <div style={{
                  padding: 20,
                  textAlign: 'center',
                  color: '#888',
                  fontSize: 14,
                }}>
                  Enter a quanta ID above to embed content
                </div>
              )}
              
              {/* Preview fade gradient at bottom */}
              {isPreview && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 40,
                    background: 'linear-gradient(to bottom, transparent, #e0e0e0)',
                    borderRadius: `0 0 ${sharedBorderRadius}px ${sharedBorderRadius}px`,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
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
