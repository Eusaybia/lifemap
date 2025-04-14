import React from 'react';
// @ts-ignore
import BaseMinimap from 'react-simple-minimap'; // Use BaseMinimap to avoid name collision
import { motion } from 'framer-motion';

// Define the props for our Minimap component
interface MinimapProps {
  mainContentNode: React.ReactNode;
  width?: number;
  height?: string | number;
}

// Note: react-simple-minimap works by re-rendering the entire passed node tree,
// which can have significant performance implications on complex pages.
export const Minimap: React.FC<MinimapProps> = ({ 
  mainContentNode, 
  width = 120, // Default width 
  height = '100vh' // Default height
}) => {

  const minimapRef = React.useRef<HTMLDivElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current) return;

    const minimapRect = minimapRef.current.getBoundingClientRect();
    
    // Click position relative to the minimap container
    const clickY = event.clientY - minimapRect.top;
    const clickX = event.clientX - minimapRect.left;

    // Get page and viewport dimensions
    const pageHeight = document.body.scrollHeight;
    const pageWidth = document.body.scrollWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const minimapHeight = minimapRect.height;
    const minimapWidth = minimapRect.width;

    // Calculate scaling factors
    const scaleY = minimapHeight / pageHeight;
    const scaleX = minimapWidth / pageWidth;

    // Calculate the corresponding point on the full page
    const targetPageY = clickY / scaleY;
    const targetPageX = clickX / scaleX;

    // Calculate the desired scroll position to center the target point in the viewport
    let scrollToY = targetPageY - (viewportHeight / 2);
    let scrollToX = targetPageX - (viewportWidth / 2);

    // Clamp scroll values to be within valid range
    scrollToY = Math.max(0, Math.min(scrollToY, pageHeight - viewportHeight));
    scrollToX = Math.max(0, Math.min(scrollToX, pageWidth - viewportWidth));

    window.scrollTo({
      top: scrollToY,
      left: scrollToX,
      behavior: 'smooth' // Add smooth scrolling
    });
  };

  return (
    <motion.div 
      ref={minimapRef} // Add ref to the container
      onClick={handleClick} // Add the click handler
      initial={{ opacity: 0 }} 
      animate={{ opacity: 0.7 }} // Initial opacity for overlap
      transition={{ duration: 0.5 }} 
      whileHover={{ opacity: 1 }} // Hover effect
      style={{ 
        // Fixed positioning on the right
        position: 'fixed', 
        top: 0, 
        right: 0, 
        zIndex: 10000, // High zIndex to ensure it stays on top
        width: `${width}px`, 
        height: '100vh', // Full viewport height
        overflow: 'hidden', // Clip content
        borderLeft: '1px solid #ccc', // Border on the left side
        backgroundColor: 'white', // White background
        // Add subtle drop shadow to the left
        boxShadow: 'rgba(0, 0, 0, 0.1) -2px 0px 5px 0px',
        // Remove pointerEvents: 'none' to allow clicks
        // pointerEvents: 'none' 
        cursor: 'pointer' // Add pointer cursor to indicate interactivity
      }} 
    >
        {/* The BaseMinimap itself should still ignore pointer events 
            so clicks land on our wrapper div */}
        <div style={{ pointerEvents: 'none', width: '100%', height: '100%'}}>
          {/* @ts-ignore - react-simple-minimap types might be outdated */}
          <BaseMinimap of={mainContentNode} width={width} height={'100%'} /> {/* Use 100% height relative to container */}
        </div>
    </motion.div>
  );
};

// Remove the old useMinimapWidth hook - no longer needed