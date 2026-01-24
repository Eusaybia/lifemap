'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import rough from 'roughjs'

interface HandDrawnArrowProps {
  fromId: string
  toId: string
  animated?: boolean
  animationInterval?: number
  side?: 'left' | 'right'
  showArrowhead?: boolean
  emotion?: 'love' | 'hate' | 'neutral' | 'excitement' | 'anxiety' | 'hope' | 'none'
  intensity?: number // 0-1, affects the visual intensity for emotions
}

type Point = [number, number]

// Helper function to check if an element is in the viewport
const isElementInViewport = (el: HTMLElement): boolean => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    // Check if any part of the element is visible vertically and horizontally
    const vertInView = (rect.top <= window.innerHeight) && ((rect.top + rect.height) >= 0);
    const horzInView = (rect.left <= window.innerWidth) && ((rect.left + rect.width) >= 0);
    return vertInView && horzInView;
};

const HandDrawnArrow: React.FC<HandDrawnArrowProps> = ({ 
  fromId, 
  toId, 
  animated = false,
  animationInterval = 100,
  side = 'left',
  showArrowhead = true,
  emotion = 'none',
  intensity = 0.5
}) => {
  const svgRef = useRef<SVGSVGElement>(null)

  // Added a ref to store previous positions for non-animated arrows
  const prevPosRef = useRef<{ x1: number, y1: number, x2: number, y2: number, midX: number, midY: number } | null>(null);
  
  // State to track the currently "focused" end when both are visible
  const [focusedEnd, setFocusedEnd] = useState<'head' | 'tail'>('tail'); 
  // Ref to hold the latest focusedEnd value for use in handleClick without causing dependency changes
  const focusedEndRef = useRef(focusedEnd);

  // Keep the ref updated with the latest state value
  useEffect(() => {
    focusedEndRef.current = focusedEnd;
  }, [focusedEnd]);

  // Get emotion styles for emotional arrows
  const getEmotionStyles = useCallback(() => {
    if (emotion === 'none') return null;
    
    const baseIntensity = Math.max(0.3, Math.min(1, intensity));
    
    switch (emotion) {
      case 'love':
        return {
          primary: `rgba(255, 215, 0, ${baseIntensity})`,
          glow: `rgba(255, 255, 255, ${baseIntensity * 0.9})`,
          shadow: `0 0 ${20 * baseIntensity}px rgba(255, 255, 255, ${baseIntensity})`,
          animation: 'emotionalPulse 2s ease-in-out infinite',
          thickness: 4 + (baseIntensity * 2)
        };
      case 'hate':
        return {
          primary: `rgba(139, 0, 0, ${baseIntensity})`,
          glow: `rgba(75, 0, 0, ${baseIntensity * 0.6})`,
          shadow: `0 0 ${15 * baseIntensity}px rgba(0, 0, 0, ${baseIntensity * 0.8})`,
          animation: 'emotionalDarkPulse 3s ease-in-out infinite',
          thickness: 3 + (baseIntensity * 1.5)
        };
      case 'excitement':
        return {
          primary: `rgba(255, 215, 0, ${baseIntensity})`,
          glow: `rgba(255, 165, 0, ${baseIntensity * 0.7})`,
          shadow: `0 0 ${25 * baseIntensity}px rgba(255, 255, 255, ${baseIntensity * 0.9})`,
          animation: 'emotionalBurst 1.5s ease-in-out infinite',
          thickness: 5 + (baseIntensity * 2)
        };
      case 'anxiety':
        return {
          primary: `rgba(128, 0, 128, ${baseIntensity})`,
          glow: `rgba(75, 0, 130, ${baseIntensity * 0.6})`,
          shadow: `0 0 ${18 * baseIntensity}px rgba(0, 0, 0, ${baseIntensity * 0.7})`,
          animation: 'emotionalAnxiety 0.8s ease-in-out infinite',
          thickness: 2 + (baseIntensity * 2)
        };
      case 'hope':
        return {
          primary: `rgba(135, 206, 235, ${baseIntensity})`,
          glow: `rgba(173, 216, 230, ${baseIntensity * 0.8})`,
          shadow: `0 0 ${22 * baseIntensity}px rgba(255, 255, 255, ${baseIntensity * 0.8})`,
          animation: 'emotionalGentle 3s ease-in-out infinite',
          thickness: 3 + (baseIntensity * 1.8)
        };
      default: // neutral
        return {
          primary: `rgba(169, 169, 169, ${baseIntensity})`,
          glow: `rgba(128, 128, 128, ${baseIntensity * 0.5})`,
          shadow: `0 0 ${10 * baseIntensity}px rgba(0, 0, 0, ${baseIntensity * 0.6})`,
          animation: 'emotionalNeutral 4s ease-in-out infinite',
          thickness: 2 + (baseIntensity * 1)
        };
    }
  }, [emotion, intensity]);

  const getMarkerPosition = useCallback((elem: HTMLElement): { isMap: boolean; x: number; y: number } => {
    const mapContainer = elem.querySelector('.mapboxgl-map')
    const marker = elem.querySelector('.mapboxgl-marker')
    
    if (mapContainer && marker) {
      const markerRect = marker.getBoundingClientRect()
      
      return {
        isMap: true,
        x: markerRect.left + markerRect.width / 2,
        y: markerRect.top + markerRect.height
      }
    }
    
    const rect = elem.getBoundingClientRect()
    return {
      isMap: false,
      x: side === 'left' ? rect.left : rect.right,
      y: rect.top + rect.height / 2
    }
  }, [side])

  // Click handler logic - navigates between connected elements
  // Decision logic:
  // 1. Both off-screen: Click position determines target (upper half → head, lower half → tail)
  // 2. Only head off-screen: Navigate to head
  // 3. Only tail off-screen: Navigate to tail
  // 4. Both visible: Toggle between head and tail based on last focus
  const handleClick = useCallback((event: React.MouseEvent<SVGElement>) => {
    const fromElem = document.getElementById(fromId);
    const toElem = document.getElementById(toId);

    if (!fromElem || !toElem) {
      return;
    }

    const fromVisible = isElementInViewport(fromElem);
    const toVisible = isElementInViewport(toElem);

    const currentFocus = focusedEndRef.current;

    let targetElem: HTMLElement | null = null;
    let nextFocusedEnd = currentFocus; // Default to current, update based on logic

    // --- Decision Logic --- 
    if (!fromVisible && !toVisible) { // 1. Both off-screen: Click position determines target
        const clickY = event.clientY;
        const viewportCenterY = window.innerHeight / 2;
        if (clickY < viewportCenterY) {
            targetElem = toElem;
            nextFocusedEnd = 'head';
        } else {
            targetElem = fromElem;
            nextFocusedEnd = 'tail';
        }
        // Update state based on where we decided to scroll
        setFocusedEnd(nextFocusedEnd);

    } else if (!toVisible) { // 2. Only Head off-screen
        targetElem = toElem;
        nextFocusedEnd = 'head';
        setFocusedEnd(nextFocusedEnd); // Update state
        
    } else if (!fromVisible) { // 3. Only Tail off-screen (implies Head is visible)
        targetElem = fromElem;
        nextFocusedEnd = 'tail';
        setFocusedEnd(nextFocusedEnd); // Update state

    } else { // 4. Both are visible: Toggle based on current focus
        if (currentFocus === 'tail') {
             targetElem = toElem;
             nextFocusedEnd = 'head';
        } else {
             targetElem = fromElem;
             nextFocusedEnd = 'tail';
        }
        setFocusedEnd(nextFocusedEnd); // Update state for toggle
    }
    // --- End Decision Logic ---

    if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [fromId, toId]);

  const drawArrow = useCallback(() => {
    if (!svgRef.current) return
    const svg = svgRef.current
    
    const svgRect = svg.getBoundingClientRect()

    const fromElem = document.getElementById(fromId)
    const toElem = document.getElementById(toId)
    if (!fromElem || !toElem) return

    // Improved helper function to check if an element is visible by also checking its parents
    const isElementCompletelyHidden = (elem: HTMLElement): boolean => {
        if (!elem) return true; // Consider non-existent elements as hidden
        const style = window.getComputedStyle(elem);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return true;
        }
        if (elem.offsetWidth <= 0 && elem.offsetHeight <= 0 && style.overflow !== 'visible') {
            // Check offsetWidth/Height but allow elements with overflow:visible (like SVG paths)
            return true;
        }
        // Recursively check parent's visibility only up to the body
        if (elem.parentElement && elem.parentElement !== document.body) {
            return isElementCompletelyHidden(elem.parentElement);
        }
        return false; // If it reaches here and isn't hidden, it's considered visible enough to draw towards
    };

    // If either element is completely hidden, clear any existing arrow and do not draw
    if (isElementCompletelyHidden(fromElem) || isElementCompletelyHidden(toElem)) {
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        return;
    }

    const fromPos = getMarkerPosition(fromElem)
    const toPos = getMarkerPosition(toElem)

    // Calculate positions relative to the SVG
    const x1 = fromPos.x - svgRect.left + (fromPos.isMap ? 0 : (side === 'left' ? 3 : -3))
    const y1 = fromPos.y - svgRect.top
    const x2 = toPos.x - svgRect.left + (toPos.isMap ? 0 : (side === 'left' ? -3 : 3))
    const y2 = toPos.y - svgRect.top

    // Add a slight curve with random variation if animated
    const randomOffset = animated ? Math.random() * 10 - 5 : 0
    // Calculate control point for a natural curve
    const midX = (x1 + x2) / 2 + (side === 'left' ? -50 : 50) + randomOffset
    const midY = (y1 + y2) / 2

    // If not animated, only update if positions have significantly changed
    if (!animated && emotion === 'none') {
      if (prevPosRef.current) {
        const { x1: prevX1, y1: prevY1, x2: prevX2, y2: prevY2, midX: prevMidX, midY: prevMidY } = prevPosRef.current;
        const diff = Math.abs(x1 - prevX1) + Math.abs(y1 - prevY1) + Math.abs(x2 - prevX2) + Math.abs(y2 - prevY2) + Math.abs(midX - prevMidX) + Math.abs(midY - prevMidY);
        if(diff < 1) {
          // No significant change, so skip redrawing
          return;
        }
      }
      prevPosRef.current = { x1, y1, x2, y2, midX, midY };
    }

    // Clear previous drawings
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild)
    }

    // Get emotion styles
    const emotionStyles = getEmotionStyles();

    if (emotion !== 'none' && emotionStyles) {
      // Render emotional arrow with SVG
      const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
      
      // Create style element for animations if it doesn't exist
      let styleElement = document.querySelector('#emotional-arrow-styles');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'emotional-arrow-styles';
        document.head.appendChild(styleElement);
        styleElement.textContent = `
          @keyframes emotionalPulse {
            0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 8px currentColor); }
            50% { opacity: 1; filter: drop-shadow(0 0 16px currentColor); }
          }
          
          @keyframes emotionalDarkPulse {
            0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 6px currentColor); }
            50% { opacity: 0.9; filter: drop-shadow(0 0 12px currentColor); }
          }
          
          @keyframes emotionalBurst {
            0%, 100% { opacity: 0.9; transform: scale(1); filter: drop-shadow(0 0 10px currentColor); }
            25% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 20px currentColor); }
            75% { opacity: 0.95; transform: scale(1.02); filter: drop-shadow(0 0 15px currentColor); }
          }
          
          @keyframes emotionalAnxiety {
            0%, 100% { opacity: 0.7; transform: translateX(0); filter: drop-shadow(0 0 8px currentColor); }
            25% { opacity: 0.9; transform: translateX(1px); filter: drop-shadow(0 0 12px currentColor); }
            75% { opacity: 0.8; transform: translateX(-1px); filter: drop-shadow(0 0 10px currentColor); }
          }
          
          @keyframes emotionalGentle {
            0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 8px currentColor); }
            50% { opacity: 1; filter: drop-shadow(0 0 16px currentColor); }
          }
          
          @keyframes emotionalNeutral {
            0%, 100% { opacity: 0.7; filter: drop-shadow(0 0 4px currentColor); }
            50% { opacity: 0.9; filter: drop-shadow(0 0 8px currentColor); }
          }
        `;
      }

      // Create emotional path
      const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElement.setAttribute('d', pathData);
      pathElement.setAttribute('fill', 'none');
      pathElement.setAttribute('stroke', emotionStyles.primary);
      pathElement.setAttribute('stroke-width', emotionStyles.thickness.toString());
      pathElement.style.animation = emotionStyles.animation;
      pathElement.style.pointerEvents = 'auto';
      pathElement.style.cursor = 'pointer';
      pathElement.addEventListener('click', handleClick as unknown as EventListener);

      svg.appendChild(pathElement);

      // Only draw arrowhead if showArrowhead is true
      if (showArrowhead) {
        const arrowSize = 12;
        const angle = Math.atan2(y2 - midY, x2 - midX);
        const arrowPoints = `${x2},${y2} ${x2 - arrowSize * Math.cos(angle - Math.PI / 6)},${y2 - arrowSize * Math.sin(angle - Math.PI / 6)} ${x2 - arrowSize * Math.cos(angle + Math.PI / 6)},${y2 - arrowSize * Math.sin(angle + Math.PI / 6)}`;
        
        const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrowHead.setAttribute('points', arrowPoints);
        arrowHead.setAttribute('fill', emotionStyles.primary);
        arrowHead.style.animation = emotionStyles.animation;
        
        svg.appendChild(arrowHead);
      }

    } else {
      // Render traditional rough.js arrow
      const rc = rough.svg(svg)

      // Draw a simple curved path with 3 points for a natural curve
      const curvePoints: [number, number][] = [
        [x1, y1],
        [midX, midY],
        [x2, y2]
      ]

      const curve = rc.curve(curvePoints, {
        stroke: '#262626',
        strokeWidth: 3,
        roughness: 1.2,
        bowing: 0.5
      })

      // --- Make the curve path clickable ---
      if (curve) {
          // @ts-ignore - RoughSVG returns SVGGElement, but the path is what we need
          const pathElement = curve.querySelector('path') || curve; 
          if (pathElement) {
               // @ts-ignore 
              pathElement.style.pointerEvents = 'auto'; 
               // @ts-ignore 
              pathElement.style.cursor = 'pointer';      
              // Add click listener - the event object will be passed automatically
              // Need to cast handleClick slightly because addEventListener expects EventListener type
              pathElement.addEventListener('click', handleClick as unknown as EventListener); 
          }
      }
      // ------------------------------------

      svg.appendChild(curve)

      // Only draw arrowhead if showArrowhead is true
      if (showArrowhead) {
        // Add the arrow head
        const arrowSize = 15
        const angle = Math.atan2(y2 - midY, x2 - midX)
        const arrowPoints: [number, number][] = [
          [x2, y2],
          [x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6)],
          [x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6)]
        ]

        const arrowHead = rc.polygon(arrowPoints, {
          stroke: '#262626',
          strokeWidth: 2,
          fill: '#262626',
          fillStyle: 'solid',
          roughness: 1.5
        })

        svg.appendChild(arrowHead)
      }
    }
  }, [animated, fromId, toId, getMarkerPosition, side, showArrowhead, emotion, getEmotionStyles, handleClick]);

  // Use requestAnimationFrame to continuously update the arrow ...
  useEffect(() => {
    let animationFrameId: number;
    let lastUpdateTime = performance.now();

    // Define the update function separately to ensure it captures the latest drawArrow
    const updateLoop = (time: number) => {
      if (animated) {
        if (time - lastUpdateTime >= animationInterval) {
          lastUpdateTime = time;
          drawArrow(); // drawArrow uses the latest stable handleClick
        }
      } else {
        drawArrow(); // drawArrow uses the latest stable handleClick
      }
      animationFrameId = requestAnimationFrame(updateLoop);
    };
    
    animationFrameId = requestAnimationFrame(updateLoop);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameId);
      // Use the stable handleClick reference for removal
      if (svgRef.current && handleClick) { 
         const pathElement = svgRef.current.querySelector('path[style*="pointer-events: auto"]');
         if (pathElement) {
             pathElement.removeEventListener('click', handleClick as unknown as EventListener);
         } else {
            const groupElement = svgRef.current.querySelector('g > path')?.parentElement;
            if (groupElement && groupElement.style.pointerEvents === 'auto') {
                 groupElement.removeEventListener('click', handleClick as unknown as EventListener);
            }
         }
      }
    };
  // Now useEffect only depends on things that should actually restart the animation loop or cleanup/re-attach
  // drawArrow is stable enough (deps: animated, fromId, toId, getMarkerPosition, side, showArrowhead)
  // handleClick is stable (deps: fromId, toId)
  }, [drawArrow, animated, animationInterval, handleClick]); // Keep handleClick here for cleanup reference

  const svgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // Keep the main SVG non-interactive
    zIndex: 10,
    overflow: 'visible' // Allow the SVG to render outside its container
  }

  return <svg ref={svgRef} style={svgStyle} className="absolute inset-0 w-full h-full pointer-events-none"></svg>
}

export default HandDrawnArrow
