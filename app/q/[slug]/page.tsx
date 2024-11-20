'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/view/Theme";
import { Minimap, useMinimapWidth } from "../../../src/view/structure/Minimap";
import { MainEditor } from "../../../src/view/content/RichText";
import { DocumentFlowMenu } from "../../../src/view/structure/FlowMenu";

export default function Page({ params }: { params: { slug: string } }) {
    const minimapWidth = useMinimapWidth();
    const padding = 20; 

    return (
        <div style={{
            backgroundColor: offWhite,
            backgroundImage: 'url("/paper-textures/paper.png")',
            minHeight: '100vh',
            paddingLeft: minimapWidth + padding,
            paddingRight: padding,
        }}>
            <motion.div style={{display: "grid", placeItems: "center", paddingTop: 15, paddingBottom: 4}}>
                <DocumentFlowMenu editor={MainEditor("", true)!}/>
            </motion.div>
            <Minimap />
            <motion.div style={{ padding: `0px 0px 40px 0px` }}>
                <Quanta quantaId={params.slug} userId={'000000'} />
            </motion.div>
        </div>
    )
}