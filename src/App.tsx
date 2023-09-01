import { motion } from 'framer-motion';
import * as React from 'react';
import { Qi } from './core/Qi';
import { Group } from './view/structure/Group';
import '@fontsource/public-sans';

const App = () => {
  return (
    <React.StrictMode>
      <motion.div style={{ margin: 10, padding: `8px 8px 8px 8px` }}>
          <Qi qiId={'000000'} userId={'000000'} />
      </motion.div>
    </React.StrictMode>
  );
};

export default App;
