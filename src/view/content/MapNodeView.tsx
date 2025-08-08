import React, { useEffect, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'

interface MapNodeViewProps {
  node: {
    attrs: {
      center: [number, number]
      zoom: number
      style: string
      width: string
      height: string
    }
  }
  updateAttributes: (attributes: Record<string, any>) => void
  deleteNode: () => void
}

declare global {
  interface Window {
    mapboxgl: any;
  }
}

// Helper function to create straight line between two points
const createStraightLine = (start: [number, number], end: [number, number], steps = 50) => {
  const coordinates = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    coordinates.push([lng, lat]);
  }
  return coordinates;
};

export const MapNodeView: React.FC<MapNodeViewProps> = ({ node, updateAttributes, deleteNode }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  // Load Mapbox if not already loaded
  useEffect(() => {
    const loadMapbox = async () => {
      if (typeof window !== 'undefined' && !window.mapboxgl) {
        // Load CSS
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Load JS
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.js';
        script.onload = () => setMapboxLoaded(true);
        document.head.appendChild(script);
      } else if (window.mapboxgl) {
        setMapboxLoaded(true);
      }
    };

    loadMapbox();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapboxLoaded || !mapContainer.current || map.current) return;

    // Set access token
    window.mapboxgl.accessToken = 'pk.eyJ1IjoidGhlYXVzc2llc3RldyIsImEiOiJjbGd1ZW1qaHowZmZsM3NudWdvYTY0c255In0.T7PzJ-D4ifBUDtbnRNbXFA';

    // Initialize map
    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: node.attrs.style,
      projection: 'mercator',
      zoom: node.attrs.zoom,
      center: node.attrs.center,
      interactive: true
    });

    // Add navigation controls
    map.current.addControl(new window.mapboxgl.NavigationControl(), 'top-right');

    // Set up map layers when style loads
    map.current.on('style.load', () => {
      // South American tourist route coordinates
      const rioDeJaneiro = [-43.1729, -22.9068] as [number, number];
      const petropolis = [-43.1790, -22.5057] as [number, number];
      const buzios = [-41.8813, -22.7461] as [number, number];
      const paraty = [-44.7147, -23.2177] as [number, number];
      const angraDosReis = [-44.3188, -23.0067] as [number, number];
      const salvador = [-38.5014, -12.9714] as [number, number];
      const buenosAires = [-58.3816, -34.6037] as [number, number];
      const mendoza = [-68.8458, -32.8895] as [number, number];
      const bariloche = [-71.3103, -41.1335] as [number, number];

      // Create route paths
      const routes = [
        { name: 'rio-petropolis', path: createStraightLine(rioDeJaneiro, petropolis, 30), color: '#10b981' },
        { name: 'petropolis-buzios', path: createStraightLine(petropolis, buzios, 30), color: '#f59e0b' },
        { name: 'buzios-paraty', path: createStraightLine(buzios, paraty, 30), color: '#8b5cf6' },
        { name: 'paraty-angra', path: createStraightLine(paraty, angraDosReis, 30), color: '#ef4444' },
        { name: 'angra-salvador', path: createStraightLine(angraDosReis, salvador, 50), color: '#3b82f6' },
        { name: 'salvador-buenosaires', path: createStraightLine(salvador, buenosAires, 50), color: '#ec4899' },
        { name: 'buenosaires-mendoza', path: createStraightLine(buenosAires, mendoza, 50), color: '#06b6d4' },
        { name: 'mendoza-bariloche', path: createStraightLine(mendoza, bariloche, 50), color: '#84cc16' },
        { name: 'bariloche-rio', path: createStraightLine(bariloche, rioDeJaneiro, 50), color: '#f97316' }
      ];

      // Add route sources and layers
      routes.forEach((route, index) => {
        // Add source
        map.current.addSource(`route-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: route.path
            }
          }
        });

        // Add glow layer
        map.current.addLayer({
          id: `route-${index}-glow`,
          type: 'line',
          source: `route-${index}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': route.color,
            'line-width': 6,
            'line-opacity': 0.4,
            'line-blur': 1
          }
        });

        // Add main line
        map.current.addLayer({
          id: `route-${index}-line`,
          type: 'line',
          source: `route-${index}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': route.color,
            'line-width': 3,
            'line-opacity': 0.8
          }
        });
      });

      // Add city markers
      map.current.addSource('cities', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            { type: 'Feature', properties: { city: 'Rio', order: 1 }, geometry: { type: 'Point', coordinates: rioDeJaneiro } },
            { type: 'Feature', properties: { city: 'Petrópolis', order: 2 }, geometry: { type: 'Point', coordinates: petropolis } },
            { type: 'Feature', properties: { city: 'Búzios', order: 3 }, geometry: { type: 'Point', coordinates: buzios } },
            { type: 'Feature', properties: { city: 'Paraty', order: 4 }, geometry: { type: 'Point', coordinates: paraty } },
            { type: 'Feature', properties: { city: 'Angra', order: 5 }, geometry: { type: 'Point', coordinates: angraDosReis } },
            { type: 'Feature', properties: { city: 'Salvador', order: 6 }, geometry: { type: 'Point', coordinates: salvador } },
            { type: 'Feature', properties: { city: 'Buenos Aires', order: 7 }, geometry: { type: 'Point', coordinates: buenosAires } },
            { type: 'Feature', properties: { city: 'Mendoza', order: 8 }, geometry: { type: 'Point', coordinates: mendoza } },
            { type: 'Feature', properties: { city: 'Bariloche', order: 9 }, geometry: { type: 'Point', coordinates: bariloche } }
          ]
        }
      });

      // Add city markers layer
      map.current.addLayer({
        id: 'cities-layer',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': 6,
          'circle-color': '#059669',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

      // Add city labels
      map.current.addLayer({
        id: 'cities-labels',
        type: 'symbol',
        source: 'cities',
        layout: {
          'text-field': ['get', 'city'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 10,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom'
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        }
      });
    });

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxLoaded, node.attrs]);

  const handleDelete = () => {
    deleteNode();
  };

  return (
    <NodeViewWrapper className="map-node-view">
      <div style={{ position: 'relative', width: node.attrs.width, height: node.attrs.height, border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div 
          ref={mapContainer} 
          style={{ width: '100%', height: '100%' }}
        />
        
        {/* Loading indicator */}
        {!mapboxLoaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #d1d5db', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }}></div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading Map...</p>
            </div>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#ef4444',
            zIndex: 10
          }}
          title="Delete map"
        >
          ×
        </button>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </NodeViewWrapper>
  )
}