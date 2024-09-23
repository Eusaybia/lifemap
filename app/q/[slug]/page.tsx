'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/view/Theme";
import { Minimap } from "../../../src/view/structure/Minimap";
import { useMinimapWidth } from "../../../src/view/structure/Minimap";
import { MainEditor } from "../../../src/view/content/RichText";
import { DocumentFlowMenu } from "../../../src/view/structure/FlowMenu";

export default function Page({ params }: { params: { slug: string } }) {
    const minimapWidth = useMinimapWidth();
    const paddingBuffer = 15; // Add a buffer of 20 pixels

    return (
        <div style={{
            backgroundColor: offWhite,
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")',
            minHeight: '100vh',
            paddingLeft: minimapWidth + paddingBuffer,
            paddingRight: paddingBuffer,
        }}>
            <Minimap />
            <motion.div style={{display: "grid", placeItems: "center", paddingTop: 15, paddingBottom: 4}}>
                <DocumentFlowMenu editor={MainEditor("", true)!}/>
            </motion.div>
            <motion.div style={{ padding: `0px 0px 40px 0px` }}>
                <Quanta quantaId={params.slug} userId={'000000'} />
            </motion.div>
        </div>
    )
}