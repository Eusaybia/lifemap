'use client'

import * as React from 'react';
import { motion } from 'framer-motion';
import { Quanta } from '../src/core/Quanta';

const App = () => {
  return (
    <React.StrictMode>
      <motion.div style={{ margin: 10, padding: `30px 30px 30px 30px` }}>
        <Quanta quantaId={'000000'} userId={'000000'} />
      </motion.div>
    </React.StrictMode>
  );
};

export default App;