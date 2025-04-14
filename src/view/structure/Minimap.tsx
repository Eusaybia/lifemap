import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  const minimapRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null); // Ref for the indicator
  // State for the viewport indicator box style
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  
  // Drag state
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollY = useRef(0);

  // --- Calculation moved to useCallback for reuse --- 
  const updateIndicatorBox = useCallback(() => {
    if (!minimapRef.current) return;
    const pageHeight = document.body.scrollHeight;
    const pageWidth = document.body.scrollWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const minimapRect = minimapRef.current.getBoundingClientRect();
    const minimapHeight = minimapRect.height;
    const minimapWidth = minimapRect.width;

    // Avoid division by zero or negative heights/widths
    if (pageHeight <= 0 || pageWidth <= 0 || minimapHeight <= 0 || minimapWidth <= 0) {
        return;
    }

    const scaleY = minimapHeight / pageHeight;
    const scaleX = minimapWidth / pageWidth;
    const indicatorHeight = viewportHeight * scaleY;
    const indicatorWidth = viewportWidth * scaleX;
    const indicatorTop = scrollY * scaleY;
    const indicatorLeft = scrollX * scaleX;

    setIndicatorStyle({
      position: 'absolute',
      top: `${indicatorTop}px`,
      left: `${indicatorLeft}px`,
      width: `${indicatorWidth}px`,
      height: `${indicatorHeight}px`,
      border: '2.5px solid black',
      borderRadius: '3px',
      backgroundColor: isDragging.current ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
      zIndex: 1,
      cursor: isDragging.current ? 'grabbing' : 'grab',
      pointerEvents: 'auto'
    });
  }, []); // Dependency: isDragging.current changes, but this function doesn't need to re-run, only the style needs update

  // Effect for scroll/resize updates
  useEffect(() => {
    const handleScrollResize = () => updateIndicatorBox();

    window.addEventListener('scroll', handleScrollResize, { passive: true });
    window.addEventListener('resize', handleScrollResize);
    updateIndicatorBox(); 

    return () => {
      window.removeEventListener('scroll', handleScrollResize);
      window.removeEventListener('resize', handleScrollResize);
    };
  }, [updateIndicatorBox]);

  // --- Drag Handlers --- 
  const handleDragMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging.current || !minimapRef.current) return;
    event.preventDefault(); 
    const currentY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const deltaY = currentY - startY.current; 
    const pageHeight = document.body.scrollHeight;
    const minimapHeight = minimapRef.current.clientHeight;
    const scaleY = minimapHeight / pageHeight;
    if (scaleY <= 0) return;
    const deltaPageScroll = deltaY / scaleY;
    let newScrollY = startScrollY.current + deltaPageScroll;
    const scrollableHeight = pageHeight - window.innerHeight;
    newScrollY = Math.max(0, Math.min(newScrollY, scrollableHeight));
    window.scrollTo({ top: newScrollY, left: window.scrollX }); // Keep existing X scroll
  }, []); 

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    updateIndicatorBox(); // Update style back to normal cursor/background
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchend', handleDragEnd);
    window.removeEventListener('mouseleave', handleDragEnd); 
  }, [handleDragMove, updateIndicatorBox]);

  const handleDragStart = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation(); 
    isDragging.current = true;
    startY.current = 'touches' in event ? event.touches[0].clientY : event.clientY;
    startScrollY.current = window.scrollY;
    updateIndicatorBox(); // Update style to dragging state
    window.addEventListener('mousemove', handleDragMove, { passive: false });
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('mouseleave', handleDragEnd);
  }, [handleDragMove, handleDragEnd, updateIndicatorBox]);

  // --- Click Handler (Navigation) --- 
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (indicatorRef.current?.contains(event.target as Node) || !minimapRef.current) {
        return; // Don't navigate if click is on indicator or ref is missing
    }
    const minimapRect = minimapRef.current.getBoundingClientRect();
    const clickY = event.clientY - minimapRect.top;
    const clickX = event.clientX - minimapRect.left;
    const pageHeight = document.body.scrollHeight;
    const pageWidth = document.body.scrollWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const minimapHeight = minimapRect.height;
    const minimapWidth = minimapRect.width;

    if (minimapHeight <= 0 || minimapWidth <= 0) return; // Avoid division by zero

    const clickProportionY = clickY / minimapHeight;
    const scrollableHeight = pageHeight - viewportHeight;
    let scrollToY = clickProportionY * scrollableHeight;
    const clickProportionX = clickX / minimapWidth;
    const scrollableWidth = pageWidth - viewportWidth;
    let scrollToX = clickProportionX * scrollableWidth;
    scrollToY = Math.max(0, Math.min(scrollToY, scrollableHeight));
    scrollToX = Math.max(0, Math.min(scrollToX, scrollableWidth));
    window.scrollTo({ top: scrollToY, left: scrollToX, behavior: 'smooth' });
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
        {/* Viewport Indicator Box */}
        <div 
          ref={indicatorRef}
          style={indicatorStyle} 
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        ></div> 
    </motion.div>
  );
};

// Remove the old useMinimapWidth hook - no longer needed