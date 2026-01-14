import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  nodeInputRule,
} from "@tiptap/react";
import { Node } from "@tiptap/react";
import { mergeAttributes } from "@tiptap/core";
import React, { useEffect, useState, useRef } from "react";
import { Grip } from "../content/Grip";

/**
 * ExternalPortalExtension - A portal that embeds an external Quanta
 * as an iframe for full editing capability with proper styling.
 * 
 * Usage: Type @/quantaId@ to create a portal to that external quanta.
 */

// Regex to match @/quantaId@ pattern for creating external portals
const REGEX_BLOCK_AT_SLASH = /(^@\/(.+?)@)/;
const sharedBorderRadius = 15;

// Track input focus state
const inputFocused = { current: false };

const ExternalPortalExtension = Node.create({
  name: "externalPortal",
  group: "block",
  atom: true, // Atom since we're embedding an iframe

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
        default: 300,
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
        const [iframeHeight, setIframeHeight] = useState(props.node.attrs.height || 300);
        const iframeRef = useRef<HTMLIFrameElement>(null);

        // Handle input change
        const handleQuantaIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          const newQuantaId = event.target.value;
          setExternalQuantaId(newQuantaId);
          props.updateAttributes({ externalQuantaId: newQuantaId });
        };

        // Listen for resize messages from the iframe
        useEffect(() => {
          const handleMessage = (event: MessageEvent) => {
            if (
              event.data?.type === 'resize-iframe' && 
              event.data.noteId === externalQuantaId && 
              typeof event.data.height === 'number'
            ) {
              const newHeight = Math.max(100, Math.min(event.data.height, 800));
              setIframeHeight(newHeight);
              props.updateAttributes({ height: newHeight });
            }
          };

          window.addEventListener('message', handleMessage);
          return () => window.removeEventListener('message', handleMessage);
        }, [externalQuantaId]);

        return (
          <NodeViewWrapper>
            {/* Input field positioned at top-left */}
            <div contentEditable={false}>
              <input
                type="text"
                value={externalQuantaId}
                onFocus={() => {
                  inputFocused.current = true;
                }}
                onBlur={() => {
                  inputFocused.current = false;
                }}
                onChange={handleQuantaIdChange}
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
            
            {/* Main neumorphic container */}
            <div
              style={{
                borderRadius: sharedBorderRadius,
                background: `#e0e0e0`,
                position: "relative",
                boxShadow: `inset 10px 10px 10px #bebebe,
                    inset -10px -10px 10px #FFFFFF99`,
                minHeight: 60,
                padding: `11px 15px 11px 15px`,
                marginBottom: 10,
              }}
              contentEditable={false}
            >
              <Grip />
              
              {/* Iframe container */}
              {externalQuantaId ? (
                <iframe
                  ref={iframeRef}
                  src={`/q/${externalQuantaId}`}
                  style={{
                    width: '100%',
                    height: `${iframeHeight}px`,
                    border: 'none',
                    borderRadius: 10,
                    background: 'white',
                  }}
                  title={`External Quanta: ${externalQuantaId}`}
                />
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#888',
                  fontSize: '14px',
                }}>
                  Enter a quanta ID above to embed content
                </div>
              )}

            </div>
          </NodeViewWrapper>
        );
      },
    );
  },
});

export { ExternalPortalExtension };
