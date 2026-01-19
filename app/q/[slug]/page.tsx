'use client'

import React from "react";
import { useEffect } from "react";
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/view/Theme";
import { MainEditor } from "../../../src/view/content/RichText";
import { DocumentFlowMenu } from "../../../src/view/structure/FlowMenu";
import { useAudibleRenders } from "react-audible-debug";

const Minimap = dynamic(() => import('../../../src/view/structure/Minimap').then(mod => mod.Minimap), {
    ssr: false,
});

export default function Page({ params }: { params: { slug: string } }) {
    const searchParams = useSearchParams();
    const isGraphMode = searchParams.get('mode') === 'graph';
    const isCompactMode = searchParams.get('mode') === 'minimal' || searchParams.get('mode') === 'compact';
    // Adjustable padding via query param: ?padding=0 or ?padding=10
    const customPadding = searchParams.get('padding');
    const padding = customPadding !== null ? parseInt(customPadding, 10) : (isCompactMode ? 4 : 20);
    const editor = MainEditor("", true);
    const minimapWidth = isCompactMode ? 0 : 60; // Hide minimap in compact mode
    const maxContentWidth = 1200; // Maximum width for optimal reading experience

    useAudibleRenders(false);

    // Scroll jiggle workaround for IntersectionObserver issues
    useEffect(() => {
        const triggerScrollJiggle = () => {
            const currentScroll = window.scrollY;
            window.scrollTo(0, currentScroll + 1);
            setTimeout(() => {
                window.scrollTo(0, currentScroll);
            }, 10);
        };

        // Trigger on page load
        const timeout = setTimeout(() => {
            triggerScrollJiggle();
        }, 100);

        // Listen for focus lens changes via localStorage
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'docAttributes') {
                setTimeout(() => {
                    triggerScrollJiggle();
                }, 50);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const mainContent = (
        <>
            {/* Hide DocumentFlowMenu in graph mode and compact mode */}
            {!isGraphMode && !isCompactMode && (
                <motion.div style={{display: "grid", placeItems: "center", paddingTop: 15, paddingBottom: 4}}>
                    {editor && 'commands' in editor && <DocumentFlowMenu editor={editor} />}
                </motion.div>
            )}
            <motion.div style={{ padding: isGraphMode ? '10px 0px' : isCompactMode ? '0px' : '0px 0px 40px 0px' }}>
                <Quanta quantaId={params.slug} userId={'000000'} />
            </motion.div>
        </>
    );

    return (
        <div style={{
            backgroundColor: isCompactMode ? 'transparent' : offWhite,
            backgroundImage: isCompactMode ? 'none' : 'url("/paper-textures/paper.png")',
            minHeight: isCompactMode ? 'auto' : '100vh',
            display: 'flex',
            justifyContent: 'center',
            paddingLeft: isGraphMode ? 10 : padding,
            paddingRight: isGraphMode ? 10 : minimapWidth + padding,
        }}>
            <div className="center-content" style={{
                width: '100%',
                maxWidth: isCompactMode ? '100%' : maxContentWidth,
                position: 'relative',
            }}>
                {/* Hide Minimap in graph mode and compact mode */}
                {!isGraphMode && !isCompactMode && <Minimap mainContentNode={mainContent} />}
                {mainContent}
            </div>
        </div>
    )
}