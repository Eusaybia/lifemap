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
                // width: "fit-content",
                borderRadius: `10px`,
                // border: `2px solid var(--Light_Grey, #dddddd)`,
                boxShadow: `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 0px 10px 34px -3px rgba(0, 0, 0, 0.2)`,
                padding: `35px`,
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
                suppressContentEditableWarning={true}
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