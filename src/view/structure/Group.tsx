import { motion } from 'framer-motion'
import { Quanta } from '../../core/Quanta';
import { QuantaId } from '../../core/Model';
import React from 'react'
import { offWhite, purple } from '../Theme';
import { Grip } from '../content/Grip';

export type GroupLenses = "identity" | "hideUnimportantNodes";

export const Group = (props: { 
    children: any, 
    lens: GroupLenses, 
    quantaId: QuantaId, 
    backgroundColor?: string,
    hasConfusionHighlight?: boolean,
    hasClarityHighlight?: boolean 
}) => {

    // Helper function to make color opaque (no aura effects on background)
    const getOpaqueBackground = (color: string) => {
        let baseColor = color || offWhite;
        
        // If color has alpha channel (8 character hex), make it fully opaque
        if (baseColor && baseColor.length === 9 && baseColor.startsWith('#')) {
            baseColor = baseColor.substring(0, 7); // Remove alpha channel
        }
        
        return baseColor;
    };

    // Helper function to darken a color
    const darkenColor = (color: string, factor: number): string => {
        if (!color || !color.startsWith('#')) return color;
        
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        
        const newR = Math.round(r * (1 - factor));
        const newG = Math.round(g * (1 - factor));
        const newB = Math.round(b * (1 - factor));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    };

    // Helper function to lighten a color
    const lightenColor = (color: string, factor: number): string => {
        if (!color || !color.startsWith('#')) return color;
        
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        
        const newR = Math.round(r + (255 - r) * factor);
        const newG = Math.round(g + (255 - g) * factor);
        const newB = Math.round(b + (255 - b) * factor);
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    };

    // TODO: Exit animation doesn't work
    // TODO: Fix stretchy border: https://github.com/framer/motion/issues/1249

    // Get additional styling based on aura effects
    const getAuraBoxShadow = () => {
        const baseShadow = `0px 0.6021873017743928px 2.0474368260329356px -1px rgba(0, 0, 0, 0.29), 0px 2.288533303243457px 7.781013231027754px -2px rgba(0, 0, 0, 0.27711), 0px 10px 34px -3px rgba(0, 0, 0, 0.2)`;
        
        if (props.hasConfusionHighlight) {
            // Add a dark, murky glow around the group for confusion
            return `${baseShadow}, 0px 0px 30px 10px rgba(50, 50, 50, 0.6), 0px 0px 60px 20px rgba(80, 80, 80, 0.4)`;
        } else if (props.hasClarityHighlight) {
            // Add a bright, clear glow around the group for clarity
            return `${baseShadow}, 0px 0px 30px 10px rgba(255, 255, 255, 0.6), 0px 0px 60px 20px rgba(240, 248, 255, 0.4)`;
        }
        
        return baseShadow;
    };

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
                boxShadow: getAuraBoxShadow(),
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