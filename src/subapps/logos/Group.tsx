import { motion } from 'framer-motion'
import { Quanta } from '../../core/Quanta';
import { QuantaId } from '../../core/Model';
import React, { useMemo } from 'react'
import { absoluteWhite } from '../Theme';
import { Editor } from '@tiptap/core';
import { MainEditor } from './RichText';
import { DragRing } from '../controls/DragRing';

export type GroupLenses = "verticalArray";

const textures = [
    'url("/paper-textures/groove-paper.png")',
    'url("/paper-textures/beige-paper.png")',
    'url("/paper-textures/paper.png")',
];

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

export const Group = (props: { children: any, lens: GroupLenses, quantaId?: QuantaId, editor: Editor }) => {
    const backgroundTexture = useMemo(() => {
        if (!props.quantaId) {
            return textures[Math.floor(Math.random() * textures.length)];
        }
        const index = Math.abs(hashCode(props.quantaId)) % textures.length;
        return textures[index];
    }, [props.quantaId]);

    return (
        <motion.div
            key="group"
            layoutId={props.quantaId}
            className="group-container"
        >
            {/* Reusable Ring Drag Handle */}
            <DragRing editor={props.editor} />

            {/* Main Group Content */}
            <motion.div
                className="group"
                initial={{
                    opacity: 0,
                }}
                animate={{ opacity: 1 }}
                exit={{
                    opacity: 0,
                }}
                transition={{
                    type: "ease",
                    duration: 0.4,
                    delay: Math.random() / 2
                }}
                style={{
                    backgroundColor: absoluteWhite,
                    backgroundImage: backgroundTexture,
                    minHeight: 20,
                    overflow: "hidden",
                    borderRadius: `10px`,
                    boxShadow: `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 
                                0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 
                                0px 10px 34px -3px rgba(0, 0, 0, 0.2)`,
                    padding: `35px`,
                }}
            >
                {props.children}
            </motion.div>
        </motion.div>
    )
}

// export const GroupExample = () => {
//     // Initialize or retrieve your TipTap editor instance
//     const editor = MainEditor(null, true);

//     return (
//         <Group lens={"verticalArray"} quantaId={"000001"} editor={editor}>
//             <Quanta quantaId={'000001'} userId={''} />
//         </Group>
//     )
// }