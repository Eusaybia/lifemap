import { motion } from 'framer-motion'
import { Quanta } from '../../core/Quanta';
import { QuantaId } from '../../core/Model';
import React from 'react'
import { offWhite, purple } from '../Theme';
import { Grip } from '../content/Grip';

export type GroupLenses = "identity" | "hideUnimportantNodes";

export const Group = (props: { children: any, lens: GroupLenses, quantaId: QuantaId, backgroundColor?: string, isIrrelevant: boolean }) => {

    // TODO: Exit animation doesn't work
    // TODO: Fix stretchy border: https://github.com/framer/motion/issues/1249
    return (
        <motion.div
            key="group"
            layoutId={props.quantaId}
            className="group"
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
                backgroundColor: props.backgroundColor || offWhite,
            }}
            exit={{
                opacity: 0,
            }}
            transition={{
                type: "ease",
                duration: 0.4,
                delay: Math.random() / 2
            }}
            style={{
                position: "relative",
                minHeight: 20,
                overflow: "hidden",
                // width: "fit-content",
                borderRadius: `10px`,
                // border: `2px solid var(--Light_Grey, #dddddd)`,
                boxShadow: `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 0px 10px 34px -3px rgba(0, 0, 0, 0.2)`,
                padding: `35px`,
                margin: `10px 0px 10px 0px`,
            }}
        >
            <Grip/>
            {props.children}
            {props.isIrrelevant && (
                <motion.div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'black',
                        opacity: 0.8,
                        borderRadius: 10,
                        pointerEvents: "none"
                    }}
                />
            )}
        </motion.div>
    )
}

export const GroupExample = () => {
    return (
        <Group lens={"identity"} quantaId={"000001"} isIrrelevant={false}>
            <Quanta quantaId={'000001'} userId={''} />
        </Group>
    )
}