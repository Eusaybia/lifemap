'use client'

import * as React from 'react';
import { motion } from 'framer-motion';
import { Quanta } from '../src/core/Quanta';
import { offWhite } from '../src/view/Theme';

const App = () => {
  return (
    <React.StrictMode>
      <motion.div style={{ padding: `45px`, backgroundColor: offWhite }}>
        <Quanta quantaId={'000000'} userId={'000000'} />
      </motion.div>
    </React.StrictMode>
  );
};

export default App;