'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Quanta } from "../../../src/core/Quanta";
import { offWhite } from "../../../src/view/Theme";
import { Minimap } from "../../../src/view/structure/Minimap";

export default function Page({ params }: { params: { slug: string } }) {
    return (
        <>
            <motion.div style={{ display: "relative", width: 65 }}>
                <Minimap />
            </motion.div>
            <motion.div style={{ padding: `40px 100px 40px 100px`, backgroundColor: offWhite }}>
                <Quanta quantaId={params.slug} userId={'000000'} />
            </motion.div>
        </>
    )
}