import React, { useEffect, useState, useRef } from "react";
import { Node, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, nodeInputRule } from "@tiptap/react";
import { motion } from "framer-motion";
import { purple } from "../Theme";
import { DocumentAttributes } from "./DocumentAttributesExtension";

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
      const overlayRef = useRef<HTMLDivElement>(null);

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
        const overlayElement = overlayRef.current;
        if (!nodeElement || !overlayElement) return;

        // A function to set opacity directly on the DOM element
        const setDimmed = (dim: boolean) => {
          overlayElement.style.transition = 'opacity 0.2s ease-in-out';
          overlayElement.style.opacity = dim ? '0.8' : '0';
        };

        if (docAttributes.selectedFocusLens !== 'call-mode') {
          setDimmed(false);
          return; // No observer needed
        }

        const scrollParent = nodeElement.closest('.scrollview') as HTMLElement | null;

        const observer = new IntersectionObserver(
          ([entry]) => {
            setDimmed(!entry.isIntersecting);
          },
          {
            root: scrollParent,
            // A negative margin shrinks the root's bounding box.
            // '-45% 0% -45% 0%' means the "viewport" for intersection is a 10%
            // horizontal band in the vertical middle of the scroll container.
            rootMargin: '-45% 0% -45% 0%',
            threshold: 0.0, // Trigger as soon as any part of the element enters the zone
          }
        );

        // Perform an initial synchronous check to prevent flash of dimmed content
        const rect = nodeElement.getBoundingClientRect();
        let topBoundary: number, bottomBoundary: number;
        if (scrollParent) {
          const parentRect = scrollParent.getBoundingClientRect();
          topBoundary = parentRect.top + parentRect.height * 0.45;
          bottomBoundary = parentRect.top + parentRect.height * 0.55;
        } else {
          const viewportHeight = window.innerHeight;
          topBoundary = viewportHeight * 0.45;
          bottomBoundary = viewportHeight * 0.55;
        }
        setDimmed(!(rect.bottom > topBoundary && rect.top < bottomBoundary));

        observer.observe(nodeElement);

        return () => {
          observer.disconnect();
        };
      }, [docAttributes.selectedFocusLens]);

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
              ref={overlayRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'black',
                borderRadius: 5,
                pointerEvents: 'none',
                opacity: 0,
              }}
            />
          </motion.div>
        </NodeViewWrapper>
      );
    });
  },
});