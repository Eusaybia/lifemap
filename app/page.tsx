'use client'
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic'
import { offWhite } from '../src/view/Theme';
import React from 'react';

const AppComponent = () => (
  <React.StrictMode>
    <motion.div style={{ padding: `45px`, backgroundColor: offWhite }}>
      Welcome to Eusaybia Lifemap. You need to be on a specific quanta. e.g. /q/999997
    </motion.div>
  </React.StrictMode>
);

// Wrap with dynamic to disable SSR
const DynamicAppComponent = dynamic(() => Promise.resolve(AppComponent), {
  ssr: false
});

export default DynamicAppComponent;