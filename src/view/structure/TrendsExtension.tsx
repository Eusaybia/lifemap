import React from "react";
import { Node as TipTapNode, NodeViewProps, wrappingInputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { GroupLenses } from "./Group";
import './styles.scss';
import { motion, AnimatePresence } from "framer-motion";
import { offWhite } from "../Theme";
import { getSelectedNodeType } from "../../utils/utils";
import { NodeOverlay } from "../components/NodeOverlay";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trends: {
      setTrendsLens: (options: {
        lens: string;
      }) => ReturnType;
      insertTrends: () => ReturnType;
    }
  }
}

export const trendsInputRegex = /\[(trends?)\]\s$/;

export const TrendsExtension = TipTapNode.create({
  name: "trends",
  group: "block",
  content: "block*",
  inline: false,
  selectable: true,
  draggable: true,
  atom: true,
  priority: 998,
  addCommands() {
    return {
      setTrendsLens: (attributes: { lens: string }) => ({ editor, state, dispatch }) => {
        const { selection } = state;
        const nodeType = getSelectedNodeType(editor);

        if (nodeType === "trends" && dispatch) {
          dispatch(state.tr.setNodeAttribute(selection.$from.pos, "lens", attributes.lens));
          return true;
        }
        return false;
      },
      insertTrends: () => ({ chain }) => {
        return chain()
          .insertContent({
            type: 'trends',
            content: [
              { type: 'temporalSpace', content: [{ type: 'paragraph' }] },
              { type: 'temporalSpace', content: [{ type: 'paragraph' }] },
            ],
          })
          .run();
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-trends="true"]',
      },
    ];
  },
  addAttributes() {
    return {
      pathos: { default: 0 },
      backgroundColor: { default: offWhite },
      lens: { default: "identity" as GroupLenses },
      collapsed: { default: false },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-trends": "true" }, 0];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: trendsInputRegex,
        type: this.type,
      })
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const isCollapsed = props.node.attrs.lens === 'collapsed';

      return (
        <NodeViewWrapper
          data-trends-node-view="true"
          style={{ overflow: 'visible' }}
        >
          <NodeOverlay
            nodeProps={props}
            nodeType="trends"
            borderRadius={12}
            padding={isCollapsed ? '10px 20px' : '20px'}
            backgroundColor="transparent"
            boxShadow={`
              0 4px 24px rgba(0, 0, 0, 0.08),
              0 1px 3px rgba(0, 0, 0, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.8),
              inset 0 -1px 0 rgba(0, 0, 0, 0.05),
              inset 1px 0 0 rgba(255, 255, 255, 0.4),
              inset -1px 0 0 rgba(0, 0, 0, 0.03)
            `}
          >
            <div
              style={{
                position: 'relative',
                minHeight: isCollapsed ? 48 : 80,
                margin: isCollapsed ? '-10px -20px' : '-20px',
                padding: isCollapsed ? '10px 20px' : '20px 20px 20px 34px',
                borderRadius: 12,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    <NodeViewContent />
                  </motion.div>
                )}
              </AnimatePresence>

              {!isCollapsed && (
                <div className="trends-vertical-arrow" aria-hidden="true">
                  <div className="trends-vertical-arrow-head" />
                  <div className="trends-vertical-arrow-line" />
                  <div className="trends-vertical-arrow-base" />
                </div>
              )}
            </div>
          </NodeOverlay>
        </NodeViewWrapper>
      );
    });
  },
});

export default TrendsExtension;
