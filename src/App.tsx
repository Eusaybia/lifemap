'use client'

import { motion } from 'framer-motion';
import * as React from 'react';
import { Quanta } from './core/Quanta';
import '@fontsource/public-sans';
import dynamic from 'next/dynamic'

const AppComponent = dynamic(() => Promise.resolve(() => (
  <React.StrictMode>
    <motion.div style={{ margin: 10, padding: `8px 8px 8px 8px` }}>
      <Quanta quantaId={'000000'} userId={'000000'} />
    </motion.div>
  </React.StrictMode>
)), {
  ssr: false
})

export default AppComponent;
