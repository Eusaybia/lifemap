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
  width = 60, // Reduce default width by 50%
  height = '100vh' // Default height
}) => {

  const minimapRef = React.useRef<HTMLDivElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current) return;

    const minimapRect = minimapRef.current.getBoundingClientRect();
    
    const clickY = event.clientY - minimapRect.top;
    const clickX = event.clientX - minimapRect.left; // Keep X calculation simple for now

    const pageHeight = document.body.scrollHeight;
    const pageWidth = document.body.scrollWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const minimapHeight = minimapRect.height;
    const minimapWidth = minimapRect.width;

    // --- Revised Y Calculation --- 
    // Calculate the proportion of the click within the minimap's visible height
    const clickProportionY = clickY / minimapHeight;
    // Calculate the total scrollable range of the page
    const scrollableHeight = pageHeight - viewportHeight;
    // Calculate target scroll Y position based on the proportion
    let scrollToY = clickProportionY * scrollableHeight;
    // --- End Revised Y Calculation ---

    // --- Simple X Calculation (Align left edge based on click proportion) ---
    const clickProportionX = clickX / minimapWidth;
    const scrollableWidth = pageWidth - viewportWidth;
    let scrollToX = clickProportionX * scrollableWidth;
    // --- End Simple X Calculation ---

    // Clamp scroll values (important especially if pageHeight <= viewportHeight)
    scrollToY = Math.max(0, Math.min(scrollToY, scrollableHeight));
    scrollToX = Math.max(0, Math.min(scrollToX, scrollableWidth));

    window.scrollTo({
      top: scrollToY,
      left: scrollToX,
      behavior: 'smooth' 
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