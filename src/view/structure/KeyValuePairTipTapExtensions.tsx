import React, { useState } from 'react';
import { Node, mergeAttributes, NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Tag } from "../content/Tag";

interface KeyValuePairAttributes {
  key: string;
  value: string;
}

export const KeyValuePairExtension = Node.create<KeyValuePairAttributes>({
  name: "keyValuePair",
  group: "block",
  content: "block*",
  inline: false,
  selectable: false,
  atom: true,
  parseHTML() {
    return [
      {
        tag: "keyValuePair",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['keyValuePair', mergeAttributes(HTMLAttributes), 0];
  },
  draggable: true,
  addAttributes() {
    return {
      key: {
        default: 'defaultKey',
      },
      value: {
        default: 'defaultValue',
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => {
      const [key, setKey] = useState(props.node.attrs.key);
      const [value, setValue] = useState(props.node.attrs.value);

      const handleKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setKey(event.target.value);
        const { tr } = props.editor.state;
        tr.setNodeMarkup(props.getPos(), undefined, { key: event.target.value });
        props.editor.view.dispatch(tr);
      };

      const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
        const { tr } = props.editor.state;
        tr.setNodeMarkup(props.getPos(), undefined, { value: event.target.value });
        props.editor.view.dispatch(tr);
      };

      return (
        <NodeViewWrapper>
          <Tag>
            <input type="text" value={key} onChange={handleKeyChange} style={{ border: 'none', backgroundColor: 'transparent', width: `${key.length + 1}ch` }} />
            <Tag>
              <input type="text" value={value} onChange={handleValueChange} style={{ border: 'none', backgroundColor: 'transparent', width: `${value.length + 1}ch` }} />
            </Tag>
          </Tag>
        </NodeViewWrapper>
      );
    });
  },
});
