import React, { useEffect, useState, useRef } from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { motion } from "framer-motion";
import { purple } from "../Theme";
import { DocumentAttributes } from "./DocumentAttributesExtension";
import { throttle } from 'lodash';

export const doubleDoubleQuoteInputRegex = /""([^""]*)""/

export const QuoteExtension = Node.create({
  name: "quote",
  group: "block",
  content: "block*",
  // TODO: Doesn't handle inline groups
  inline: false,
  selectable: false,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "quote",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["quote", HTMLAttributes, 0];
  },
  draggable: true,
  addInputRules() {
    return [
      wrappingInputRule({
        find: doubleDoubleQuoteInputRegex,
        type: this.type,
      })
    ]
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const nodeViewRef = useRef<HTMLDivElement>(null);

      // State for document attributes
      // @ts-ignore
      const [docAttributes, setDocAttributes] = useState<DocumentAttributes>(() => props.editor.commands.getDocumentAttributes());
      // State to track if the node is centered
      const [isCentered, setIsCentered] = useState(false);

      // Effect to update docAttributes from localStorage changes
      useEffect(() => {
        const handleUpdate = (event: Event) => {
          // @ts-ignore
          const updatedAttributes = event.detail as DocumentAttributes;
          if (updatedAttributes) {
            setDocAttributes(updatedAttributes);
          }
        };
        window.addEventListener('doc-attributes-updated', handleUpdate);
        return () => {
          window.removeEventListener('doc-attributes-updated', handleUpdate);
        };
      }, []);

      // Effect to handle scroll listener for centerline intersection
      useEffect(() => {
        const nodeElement = nodeViewRef.current;
        if (!nodeElement) return;

        const handleScroll = () => {
          const rect = nodeElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          // Calculate very focused area - only 10% of viewport height centered around middle
          const topBoundary = viewportHeight * 0.45;   // 45% from top
          const bottomBoundary = viewportHeight * 0.55; // 55% from top

          // Check if the element overlaps with the narrow 10% focus band
          const centered = rect.bottom > topBoundary && rect.top < bottomBoundary;
          setIsCentered(centered);
        };

        const throttledHandler = throttle(handleScroll, 100);

        let scrollContainer: HTMLElement | Window = window;

        if (docAttributes.selectedFocusLens === 'call-mode') {
          scrollContainer.addEventListener('scroll', throttledHandler);
          handleScroll(); // Initial check
        } else {
          // Ensure not marked as centered if not in call-mode
          setIsCentered(false);
        }

        // Cleanup
        return () => {
          scrollContainer.removeEventListener('scroll', throttledHandler);
        };
      }, [docAttributes.selectedFocusLens, nodeViewRef]);

      // Determine overlay opacity for dimming
      const dimmingOpacity = (docAttributes.selectedFocusLens === 'call-mode' && !isCentered) ? 0.8 : 0;

      return (
        <NodeViewWrapper
          ref={nodeViewRef}
          style={{ scrollSnapAlign: 'start' }}
        >
          <motion.div style={{
            position: 'relative',
            boxShadow: `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 0px 5px 5px -3px rgba(0, 0, 0, 0.2)`,
            backgroundColor: "#F3DFAB", 
            borderRadius: 5, 
            padding: `20px 20px 20px 20px`, 
            color: "#222222", 
            fontSize: 16
          }}>
            <div style={{fontFamily: "Georgia", fontSize: 100, height: 70}}>
              {'"'}
            </div>
            <NodeViewContent />
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'black',
                borderRadius: 5,
                pointerEvents: 'none',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: dimmingOpacity }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            />
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});