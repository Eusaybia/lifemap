import { motion, AnimatePresence } from 'framer-motion'
import { Quanta } from '../../core/Quanta';
import { QuantaId } from '../../core/Model';
import React from 'react'
import { offWhite, purple } from '../Theme';
import { Grip } from '../content/Grip';

export type GroupLenses = "identity" | "hideUnimportantNodes";

// Collapse toggle chevron component
const CollapseChevron = ({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) => (
    <motion.div
        onClick={(e) => {
            e.stopPropagation();
            onToggle();
        }}
        style={{
            position: 'absolute',
            top: 12,
            right: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            padding: 4,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
    >
        <motion.svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
        >
            <path
                d="M3 6L8 11L13 6"
                stroke="#888"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </motion.svg>
    </motion.div>
);

export const Group = (props: { 
    children: any, 
    lens: GroupLenses, 
    quantaId: QuantaId, 
    backgroundColor?: string,
    isCollapsed?: boolean,
    onToggleCollapse?: () => void,
}) => {

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
                minHeight: props.isCollapsed ? 48 : 20,
                overflow: "visible",
                borderRadius: `10px`,
                boxShadow: `-2px 3px 6px -1px rgba(0, 0, 0, 0.25), -4px 6px 12px -2px rgba(0, 0, 0, 0.2), -8px 12px 24px -3px rgba(0, 0, 0, 0.15)`,
                padding: props.isCollapsed ? '10px 20px' : '20px',
                margin: `8px 0px 8px 0px`,
            }}
        >
            <Grip/>
            {props.onToggleCollapse && (
                <CollapseChevron 
                    isCollapsed={props.isCollapsed || false} 
                    onToggle={props.onToggleCollapse} 
                />
            )}
            <AnimatePresence>
                {!props.isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {props.children}
                    </motion.div>
                )}
            </AnimatePresence>
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