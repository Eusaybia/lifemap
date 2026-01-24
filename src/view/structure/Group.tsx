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
    const isPrivate = props.lens === 'private';

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
                maxHeight: (isPreview || isPrivate) ? 100 : undefined,
                overflow: (isPreview || isPrivate) ? "hidden" : "visible",
                borderRadius: `10px`,
                // Note: boxShadow removed - now provided by NodeOverlay wrapper
                padding: isCollapsed ? '10px 20px' : '20px',
                // Note: margin removed - now provided by NodeOverlay wrapper
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
            {/* Private lens overlay is now handled by NodeOverlay for full coverage */}
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