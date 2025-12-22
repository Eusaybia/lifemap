'use client'

import React from "react";
import { useEffect } from "react";
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/view/Theme";
// MainEditor import removed - not used
// DocumentFlowMenu hidden - import removed
import { useAudibleRenders } from "react-audible-debug";

const Minimap = dynamic(() => import('../../../src/view/structure/Minimap').then(mod => mod.Minimap), {
    ssr: false,
});

export default function Page({ params }: { params: { slug: string } }) {
    const searchParams = useSearchParams();
    const isGraphMode = searchParams.get('mode') === 'graph';
    const padding = 20;
    const minimapWidth = 60; // Update to match new default minimap width
    const maxContentWidth = 1200; // Maximum width for optimal reading experience

    useAudibleRenders(false);

    // Listen for postMessage from parent window (e.g., life-mapping-old page)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'set-document-attribute') {
                const { attribute, value } = event.data;
                const LOCAL_STORAGE_KEY = 'tiptapDocumentAttributes';
                
                try {
                    // Get current attributes from localStorage
                    const storedAttrs = localStorage.getItem(LOCAL_STORAGE_KEY);
                    const currentAttributes = storedAttrs ? JSON.parse(storedAttrs) : {};
                    
                    // Update with new attribute
                    const updatedAttributes = { ...currentAttributes, [attribute]: value };
                    
                    // Save to localStorage
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedAttributes));
                    
                    // Dispatch custom event to notify components
                    window.dispatchEvent(new CustomEvent('doc-attributes-updated', { detail: updatedAttributes }));
                } catch (error) {
                    console.error('Error handling document attribute message:', error);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

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
            {/* DocumentFlowMenu hidden */}
            <motion.div style={{ padding: isGraphMode ? '10px 0px' : '0px 0px 40px 0px' }}>
                <Quanta quantaId={params.slug} userId={'000000'} />
            </motion.div>
        </>
    );

    return (
        <div style={{
            backgroundColor: offWhite,
            backgroundImage: 'url("/paper-textures/paper.png")',
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            paddingLeft: isGraphMode ? 10 : padding,
            paddingRight: isGraphMode ? 10 : minimapWidth + padding,
        }}>
            <div className="center-content" style={{
                width: '100%',
                maxWidth: maxContentWidth,
                position: 'relative',
                backgroundColor: '#ffffff',
                borderRadius: 2,
                marginTop: 20,
                marginBottom: 40,
                padding: '20px 40px 40px 40px',
                boxShadow: '-4px 6px 12px -2px rgba(0, 0, 0, 0.15), -8px 12px 24px -4px rgba(0, 0, 0, 0.12), -16px 24px 48px -6px rgba(0, 0, 0, 0.1)',
            }}>
                {/* Hide Minimap in graph mode */}
                {!isGraphMode && <Minimap mainContentNode={mainContent} />}
                {mainContent}
            </div>
        </div>
    )
}