'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/view/Theme";
import { Minimap } from "../../../src/view/structure/Minimap";
import { MainEditor } from "../../../src/view/content/RichText";
import { DocumentFlowMenu } from "../../../src/view/structure/FlowMenu";
import { useAudibleRenders } from "react-audible-debug";

export default function Page({ params }: { params: { slug: string } }) {
    const padding = 20;
    const editor = MainEditor("", true);
    const minimapWidth = 120; // Use the default width from Minimap.tsx

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
            paddingLeft: padding,
            paddingRight: minimapWidth + padding,
        }}>
            <Minimap mainContentNode={mainContent} />
            {mainContent}
        </div>
    )
}