'use client'

import React from "react";
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/view/Theme";
import { MainEditor } from "../../../src/view/content/RichText";
import { DocumentFlowMenu } from "../../../src/view/structure/FlowMenu";
import { useAudibleRenders } from "react-audible-debug";

const Minimap = dynamic(() => import('../../../src/view/structure/Minimap').then(mod => mod.Minimap), {
    ssr: false,
});

export default function Page({ params }: { params: { slug: string } }) {
    const padding = 20;
    const editor = MainEditor("", true);
    const minimapWidth = 60; // Update to match new default minimap width
    const maxContentWidth = 1200; // Maximum width for optimal reading experience

    useAudibleRenders(false);

    const mainContent = (
        <>
            <motion.div style={{display: "grid", placeItems: "center", paddingTop: 15, paddingBottom: 4}}>
                {editor && 'commands' in editor && <DocumentFlowMenu editor={editor} />}
            </motion.div>
            <motion.div style={{ padding: `0px 0px 40px 0px` }}>
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
            paddingLeft: padding,
            paddingRight: minimapWidth + padding,
        }}>
            <div className="center-content" style={{
                width: '100%',
                maxWidth: maxContentWidth,
                position: 'relative',
            }}>
                <Minimap mainContentNode={mainContent} />
                {mainContent}
            </div>
        </div>
    )
}