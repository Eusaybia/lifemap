'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/subapps/Theme";
import { Minimap } from "../../../src/subapps/controls/Minimap";
import { DocumentFlowMenu } from "../../../src/subapps/controls/FlowMenu";
import { Editor } from "@tiptap/core";
import { MainEditor } from "../../../src/subapps/logos/RichText";

export default function Page({ params }: { params: { slug: string } }) {
    return (
        <>
            <Minimap />
            <motion.div style={{display: "grid", placeItems: "center", paddingTop: 15, paddingBottom: 4}}>
                <DocumentFlowMenu editor={MainEditor("", true)!}/>
            </motion.div>
            <motion.div style={{ padding: `0px 0px 40px 0px`, backgroundColor: offWhite }}>
                <Quanta quantaId={params.slug} userId={'000000'} />
            </motion.div>
        </>
    )
}