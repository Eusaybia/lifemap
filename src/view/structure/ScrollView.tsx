import { motion } from 'framer-motion'
import { Quanta } from '../../core/Quanta';
import { QuantaId } from '../../core/Model';
import React from 'react'
import { offWhite, purple } from '../Theme';
import { Grip } from '../content/Grip';

export type ScrollViewLenses = "identity" | "hideUnimportantNodes";

export const ScrollView = (props: { children: any, lens: ScrollViewLenses, quantaId: QuantaId, backgroundColor?: string }) => {
    return (
        <motion.div
            key="scrollview"
            layoutId={props.quantaId}
            className="scrollview"
            initial={{
                // Opacity is now handled by the dimming overlay in NodeView
                // opacity: 0,
            }}
            animate={{
                // opacity: 1,
                backgroundColor: props.backgroundColor || offWhite,
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
                maxHeight: 400, // Key difference from Group - max height constraint
                overflowY: "auto", // Enable vertical scrolling
                overflowX: "hidden", // Hide horizontal scrollbar
                borderRadius: `10px`,
                boxShadow: `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 0px 10px 34px -3px rgba(0, 0, 0, 0.2)`,
                padding: `20px`,
                margin: `10px 0px 10px 0px`,
                // Hide scrollbar while maintaining functionality
                scrollbarWidth: "none", // Firefox
                msOverflowStyle: "none", // IE and Edge
            }}
        >
            {/* Hide scrollbar for webkit browsers */}
            <style>
                {`
                .scrollview::-webkit-scrollbar {
                    display: none;
                }
                `}
            </style>
            <Grip/>
            {props.children}
        </motion.div>
    )
}

export const ScrollViewExample = () => {
    return (
        <ScrollView lens={"identity"} quantaId={"000001"}>
            <Quanta quantaId={'000001'} userId={''} />
        </ScrollView>
    )
}