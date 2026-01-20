import { motion, AnimatePresence } from 'framer-motion'
import { Quanta } from '../../core/Quanta';
import { QuantaId } from '../../core/Model';
import React from 'react'
import { offWhite, purple } from '../Theme';
// Grip is now handled by the parent NodeView (GroupTipTapExtension)

export type GroupLenses = "identity" | "private" | "chip" | "collapsed" | "preview";

export const Group = (props: { 
    children: any, 
    lens: GroupLenses, 
    quantaId: QuantaId, 
    backgroundColor?: string,
}) => {
    // Helper function to make color opaque
    const getOpaqueBackground = (color: string) => {
        // If color has alpha channel (8 character hex), make it fully opaque
        if (color && color.length === 9 && color.startsWith('#')) {
            return color.substring(0, 7); // Remove alpha channel
        }
        
        return color || '#FFFFFF';
    };

    // TODO: Exit animation doesn't work
    // TODO: Fix stretchy border: https://github.com/framer/motion/issues/1249
    
    const isCollapsed = props.lens === 'collapsed';
    const isPreview = props.lens === 'preview';

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
                backgroundColor: getOpaqueBackground(props.backgroundColor || '#FFFFFF'),
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
                minHeight: isCollapsed ? 48 : 20,
                maxHeight: isPreview ? 100 : undefined,
                overflow: isPreview ? "hidden" : "visible",
                borderRadius: `10px`,
                boxShadow: `-2px 3px 6px -1px rgba(0, 0, 0, 0.25), -4px 6px 12px -2px rgba(0, 0, 0, 0.2), -8px 12px 24px -3px rgba(0, 0, 0, 0.15)`,
                padding: isCollapsed ? '10px 20px' : '20px',
                margin: `8px 0px 8px 0px`,
            }}
        >
            {/* Grip is now handled by the parent NodeView (GroupTipTapExtension) */}
            <AnimatePresence>
                {!isCollapsed && (
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
            {/* Preview fade gradient at bottom */}
            {isPreview && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 40,
                        background: `linear-gradient(to bottom, transparent, ${getOpaqueBackground(props.backgroundColor || '#FFFFFF')})`,
                        borderRadius: '0 0 10px 10px',
                        pointerEvents: 'none',
                    }}
                />
            )}
            {/* Private lens overlay */}
            {props.lens === 'private' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#000000',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20,
                        userSelect: 'none',
                        pointerEvents: 'none',
                    }}
                >
                    <span style={{ color: '#666', fontSize: 14 }}>Private</span>
                </motion.div>
            )}
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