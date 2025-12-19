import { motion } from 'framer-motion'
import { Quanta } from '../../core/Quanta';
import { QuantaId } from '../../core/Model';
import React from 'react'
import { offWhite, purple } from '../Theme';
import { Grip } from '../content/Grip';

export type GroupLenses = "identity" | "hideUnimportantNodes";

export const Group = (props: { children: any, lens: GroupLenses, quantaId: QuantaId, backgroundColor?: string }) => {

    // Helper function to make color opaque
    const getOpaqueBackground = (color: string) => {
        // If color has alpha channel (8 character hex), make it fully opaque
        if (color && color.length === 9 && color.startsWith('#')) {
            return color.substring(0, 7); // Remove alpha channel
        }
        
        return color || offWhite;
    };

    // TODO: Exit animation doesn't work
    // TODO: Fix stretchy border: https://github.com/framer/motion/issues/1249

    return (
        <motion.div
            key="group"
            layoutId={props.quantaId}
            className="group"
            initial={{
                // Opacity is now handled by the dimming overlay in NodeView
                // opacity: 0,
            }}
            animate={{
                // opacity: 1,
                backgroundColor: getOpaqueBackground(props.backgroundColor || offWhite),
            }}
            exit={{
                // opacity: 0,
            }}
            transition={{
                type: "ease",
                duration: 0.4,
                delay: Math.random() / 2
            }}
            style={{
                position: "relative", // Keep relative for Grip positioning
                minHeight: 20,
                overflow: "hidden",
                borderRadius: `10px`,
                boxShadow: `-2px 3px 6px -1px rgba(0, 0, 0, 0.25), -4px 6px 12px -2px rgba(0, 0, 0, 0.2), -8px 12px 24px -3px rgba(0, 0, 0, 0.15)`,
                padding: `35px`,
                margin: `10px 0px 10px 0px`,
            }}
        >
            <Grip/>
            {props.children}
            {/* Overlay is now handled in the NodeView */}
        </motion.div>
    )
}

export const GroupExample = () => {
    return (
        // Removed isHidden prop
        <Group lens={"identity"} quantaId={"000001"}>
            <Quanta quantaId={'000001'} userId={''} />
        </Group>
    )
}