import React, { useEffect } from 'react';
// @ts-ignore
import pagemap from 'pagemap';

export const Minimap = () => {

  useEffect(() => {
    pagemap(document.querySelector('#minimap'), {
      viewport: null,
      styles: {
        'header,footer,section,article': 'rgba(0,0,0,0.08)',
        'h1,a': 'rgba(0,0,0,0.10)',
        'h2,h3,h4': 'rgba(0,0,0,0.08)'
      },
      back: 'rgba(0,0,0,0.02)',
      view: 'rgba(0,0,0,0.05)',
      drag: 'rgba(0,0,0,0.10)',
      interval: null
    });
  }, []);

  return <canvas id="minimap" style={{ position: 'fixed', right: 0, top: 0, width: '100px', height: '100%', zIndex: 1 }}></canvas>;
}