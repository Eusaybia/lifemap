'use client'

import { motion } from 'framer-motion';
import * as React from 'react';
import '@fontsource/public-sans';
import { Qi } from '../src/core/Qi';

const App = () => {
  return (
    <React.StrictMode>
      <motion.div style={{ margin: 10, padding: `10px 30px 0px 30px` }}>
          <Qi qiId={'000000'} userId={'000000'} />
      </motion.div>
    </React.StrictMode>
  );
};

export default App;
