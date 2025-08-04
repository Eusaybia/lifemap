'use client';

import React, { useEffect, useRef } from 'react';

interface MapboxMapProps {
  center: [number, number];
  style: string;
  zoom: number;
  className?: string;
}

declare global {
  interface Window {
    mapboxgl: any;
  }
}

export default function MapboxMap({ center, style, zoom, className = '' }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    if (window.mapboxgl) {
      window.mapboxgl.accessToken = 'pk.eyJ1IjoidGhlYXVzc2llc3RldyIsImEiOiJjbGd1ZW1qaHowZmZsM3NudWdvYTY0c255In0.T7PzJ-D4ifBUDtbnRNbXFA';
      
      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: style,
        center: center,
        zoom: zoom,
        interactive: false // Disable interaction for small maps
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, style, zoom]);

  return <div ref={mapContainer} className={className} />;
}