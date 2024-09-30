'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/subapps/Theme";
import { Minimap, useMinimapWidth } from "../../../src/subapps/controls/Minimap";
import { DocumentFlowMenu } from "../../../src/subapps/controls/FlowMenu";
import { MainEditor } from "../../../src/subapps/logos/RichText";
import { version } from "../../../package.json";

export default function Page({ params }: { params: { slug: string } }) {
    const minimapWidth = useMinimapWidth();
    const paddingBuffer = 20;

    return (
        <div style={{
            backgroundColor: offWhite,
            backgroundImage: 'url("/paper-textures/paper.png")',
            minHeight: '100vh',
            paddingLeft: minimapWidth + paddingBuffer,
            paddingRight: minimapWidth + paddingBuffer,
        }}>
            <Minimap />
            <motion.div style={{display: "grid", placeItems: "center", paddingTop: 15, paddingBottom: 4}}>
                <DocumentFlowMenu editor={MainEditor("", true)!}/>
            </motion.div>
            <motion.div style={{ padding: `0px 0px 40px 0px` }}>
                <Quanta quantaId={params.slug} userId={'000000'} />
            </motion.div>
            <div
                title="Versioning indicator"
                style={{
                    position: 'fixed',
                    bottom: '10px',
                    left: '10px', // Changed from 'right' to 'left'
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '5px',
                    fontSize: '13px',
                    zIndex: 1000,
                }}>
                Pre-Alpha v{version}
            </div>
        </div>
    )
}