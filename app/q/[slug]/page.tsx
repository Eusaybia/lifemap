'use client'

import React from "react";
import { motion } from 'framer-motion';
import { Qi } from "../../../src/core/Qi";

export default function Page({ params }: { params: { slug: string } }) {
    return (
        <motion.div style={{ margin: 10, padding: `30px 30px 30px 30px` }}>
          <Qi qiId={params.slug} userId={'000000'} />
      </motion.div>
    )
  }