import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  wrappingInputRule,
} from "@tiptap/react";
import { Node } from "@tiptap/react";
import { Editor, JSONContent, generateHTML } from "@tiptap/core";
import React, { useEffect } from "react";
import { Node as ProseMirrorNode } from "prosemirror-model";
import {
  agents,
  customExtensions,
  officialExtensions,
} from "../content/RichText";
import { debounce } from "lodash";
import { Grip } from "../content/Grip";

const REGEX_BLOCK_TILDE = /~[^~]+~/;
const sharedBorderRadius = 15;

/**
 * Get HTML representation of a Quanta referenced by ID
 * @param quantaId - the quantaId to search for
 * @param editor - editor instance
 * @returns - HTML string (if quanta was found)
 */
const getQuantaHTML = (quantaId: string, editor: Editor): string | null => {
  let node: ProseMirrorNode | null = null;

  editor.state.doc.descendants((descendant) => {
    if (descendant.attrs.quantaId === quantaId) {
      node = descendant;
    }
  });

  if (node) {
    const jsonContent: JSONContent = (node as ProseMirrorNode).toJSON();
    const generatedOfficialExtensions = officialExtensions(quantaId);
    const extensions = [
      ...generatedOfficialExtensions,
      ...customExtensions,
      ...agents,
    ];

    return generateHTML(jsonContent, extensions);
  }

  return null;
};

const PortalView = (props: NodeViewProps) => {
  const [htmlContent, setHTMLContent] = React.useState(
    "<p>Content has not been updated to match the referenced node.</p>"
  );
  const { referencedQuantaId } = props.node.attrs;
  const updateContent = () => {
    const quantaHTML = getQuantaHTML(referencedQuantaId, props.editor);

    if (!quantaHTML) {
      setHTMLContent(
        "<p>Couldn't find referenced quanta. Are you sure the id you're using is a valid one?</p>"
      );
    } else {
      setHTMLContent(quantaHTML);
    }
  };

  useEffect(() => {
    updateContent();

    const debouncedUpdateContent = debounce(updateContent, 1000);
    props.editor.on("update", debouncedUpdateContent);

    return () => {
      props.editor.off("update", debouncedUpdateContent);
    };
  }, [props.editor, referencedQuantaId]);

  return (
    <NodeViewWrapper>
      <input
        type="text"
        value={referencedQuantaId}
        onChange={(event) => {
          props.updateAttributes({ referencedQuantaId: event.target.value });
        }}
        style={{
          border: "1.5px solid #34343430",
          borderRadius: sharedBorderRadius,
          outline: "none",
          backgroundColor: "transparent",
          width: `80px`,
          position: "absolute",
          zIndex: 1,
        }}
      />
      <Grip/>
      <div
        style={{
          borderRadius: sharedBorderRadius,
          background: `#e0e0e0`,
          boxShadow: `inset 10px 10px 10px #bebebe,
              inset -10px -10px 10px #FFFFFF99`,
          minHeight: 20,
          padding: `11px 15px 11px 15px`,
          marginBottom: 10,
        }}
        contentEditable="false"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </NodeViewWrapper>
  );
};

const PortalExtension = Node.create({
  name: "portal",
  group: "block",
  addAttributes() {
    return {
      referencedQuantaId: {
        default: undefined,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "portal[id]",
        getAttrs: (element: HTMLElement | string) => {
          return {
            id: (element as HTMLElement).getAttribute("id"),
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["portal", HTMLAttributes];
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: REGEX_BLOCK_TILDE,
        type: this.type,
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PortalView);
  },
});

export { PortalExtension };
