'use client'

import * as React from 'react';
import { motion } from 'framer-motion';
import { Quanta } from '../src/core/Quanta';
import { offWhite } from '../src/view/Theme';

const App = () => {
  return (
    <React.StrictMode>
      <motion.div style={{ padding: `45px`, backgroundColor: offWhite }}>
        Welcome to Eusaybia Lifemap. You need to be on a specific quanta. e.g. /q/999997
      </motion.div>
    </React.StrictMode>
  );
};

export default App;