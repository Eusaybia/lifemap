import React, { useState } from 'react'
import { NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer, wrappingInputRule } from '@tiptap/react'
import { Node } from '@tiptap/react'
import { borderRadius } from '../Theme'
import IframeResizer from 'iframe-resizer-react'

const dollarInputRegex = /![^!]+!/

const ThreeD = (props: { src: string }) => {
    return (
        <IframeResizer
            log
            allow="autoplay; fullscreen; xr-spatial-tracking"
            frameBorder="0"
            src={props.src}
            style={{ width: "1px", height: "320px", minWidth: "100%", borderRadius: borderRadius }}
        />
    )
}

export const ThreeDExtension = Node.create({
    name: 'threeD',
    group: 'block',
    content: "block*",
    atom: true,
    addAttributes() {
        return {
            src: {
                default: "https://sketchfab.com/models/2aaa2d57cd99430abed9d35b2fee97a0/embed?autostart=1&preload=1&transparent=1",
            },
        }
    },
    parseHTML() {
        return [
            {
                tag: 'threeD[id]',
                getAttrs: (element: HTMLElement | string) => {
                    return {
                        src: (element as HTMLElement).getAttribute('src'),
                    }
                },
            },
        ]
    },
    renderHTML({ HTMLAttributes }) {
        return ['threeD', HTMLAttributes]
    },
    addInputRules() {
        return [
            wrappingInputRule({
                find: dollarInputRegex,
                type: this.type,
            }),
        ];
    },
    addNodeView() {
        return ReactNodeViewRenderer((props: NodeViewProps) => {
            const [src, setSrc] = useState(props.node.attrs.src);

            const handleSrcChange = (event: React.ChangeEvent<HTMLInputElement>) => {
                setSrc(event.target.value);
                props.updateAttributes({ src: event.target.value });
            };

            return (
                <NodeViewWrapper>
                    <input type="text" value={src} onChange={handleSrcChange} style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: `${src.length + 1}ch` }} />
                    <ThreeD src={props.node.attrs.src} />
                </NodeViewWrapper>
            );
        });
    },
})
