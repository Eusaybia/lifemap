'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Quanta } from "../../../src/core/Quanta";

export default function Page({ params }: { params: { slug: string } }) {
    return (
        <motion.div style={{ margin: 10, padding: `30px 30px 30px 30px` }}>
            <Quanta quantaId={params.slug} userId={'000000'} />
        </motion.div>
    )
}