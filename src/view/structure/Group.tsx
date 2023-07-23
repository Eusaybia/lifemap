import { motion } from 'framer-motion'
import { Qi } from '../../core/Qi';
import { QiId } from '../../core/Model';
import React from 'react'
import { white } from '../Theme';

export type GroupLenses = "verticalArray";

export const Group = (props: { children: any, lens: GroupLenses, qid: QiId }) => {

    // TODO: Exit animation doesn't work
    // TODO: Fix stretchy border: https://github.com/framer/motion/issues/1249
    return (
            <motion.div
                key="group"
                layoutId={props.qid}
                className="group"
                initial={{
                    scale: 0,
                    opacity: 0,
                    originX: 0,
                    originY: 0
                }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{
                    scale: 0,
                    opacity: 0,
                }}
                transition={{
                    type: "ease",
                    duration: 0.4
                }}
                style={{
                    position: "relative",
                    backgroundColor: white,
                    minHeight: 20,
                    borderRadius: `10px`,
                    border: `2px solid var(--Light_Grey, #dddddd)`,
                    boxShadow: `0px 0.6032302072222955px 0.6032302072222955px -1.25px rgba(0, 0, 0, 0.18), 0px 2.290210571630906px 2.290210571630906px -2.5px rgba(0, 0, 0, 0.15887), 0px 10px 10px -3.75px rgba(0, 0, 0, 0.0625)`,
                    padding: `20px`,
                    margin: `10px 0px 10px 0px`,
                }}
            >
            <motion.div data-drag-handle
                onMouseLeave={(event) => {
                    event.currentTarget.style.cursor = "grab";
                }}
                onMouseDown={(event) => {
                    event.currentTarget.style.cursor = "grabbing";
                }}
                onMouseUp={(event) => {
                    event.currentTarget.style.cursor = "grab";
                }}
                style={{ position: "absolute", right: -5, top: 10, display: "flex", flexDirection: "column", cursor: "grab", fontSize: "24px", color: "grey" }} 
                contentEditable="false" 
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}>
                ⠿
            </motion.div>
            {props.children}
            </motion.div>
    )
}

export const GroupExample = () => {
    return (
        <Group lens={"verticalArray"} qid={"000001"}>
            <Qi qiId={'000001'} userId={''} />
        </Group>
    )
}