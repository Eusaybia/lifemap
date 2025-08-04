'use client';

import React, { useEffect, useRef, useState } from 'react';
import MapboxMap from '../../components/MapboxMap';

// We'll need to install mapbox-gl: yarn add mapbox-gl @types/mapbox-gl
declare global {
  interface Window {
    mapboxgl: any;
  }
}

// Helper function to create great circle arc between two points
const createArc = (start: [number, number], end: [number, number], steps = 100) => {
  const coordinates = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Simple interpolation for demonstration - in production you'd use proper great circle calculation
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    coordinates.push([lng, lat]);
  }
  return coordinates;
};

// Helper function to calculate bearing between two points for arrow direction
const calculateBearing = (start: [number, number], end: [number, number]) => {
  const startLat = start[1] * Math.PI / 180;
  const startLng = start[0] * Math.PI / 180;
  const endLat = end[1] * Math.PI / 180;
  const endLng = end[0] * Math.PI / 180;
  
  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  
  return Math.atan2(y, x) * 180 / Math.PI;
};

export default function PhysicalSpacePage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  useEffect(() => {
    // Load Mapbox GL JS dynamically
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

  useEffect(() => {
    if (!mapboxLoaded || !mapContainer.current || map.current) return;

    // Set access token
    window.mapboxgl.accessToken = 'pk.eyJ1IjoidGhlYXVzc2llc3RldyIsImEiOiJjbGd1ZW1qaHowZmZsM3NudWdvYTY0c255In0.T7PzJ-D4ifBUDtbnRNbXFA';

    // Initialize map centered on Sydney
    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      projection: 'globe', // Display the map as a globe
      zoom: 1.3,
      center: [151.2093, -33.8688] // Sydney coordinates
    });

    // Set atmosphere style and add journey arcs
    map.current.on('style.load', () => {
      map.current.setFog({}); // Set the default atmosphere style
      
      // Journey coordinates
      const sydney = [151.2093, -33.8688] as [number, number];
      const shanghai = [121.4737, 31.2304] as [number, number];
      const sanFrancisco = [-122.4194, 37.7749] as [number, number];

      // Create arc paths
      const sydneyToShanghai = createArc(sydney, shanghai, 100);
      const shanghaiToSanFrancisco = createArc(shanghai, sanFrancisco, 100);
      const sydneyToSanFrancisco = createArc(sydney, sanFrancisco, 150); // More steps for longer arc

      // Add journey line sources
      map.current.addSource('sydney-shanghai-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: sydneyToShanghai
          }
        }
      });

      map.current.addSource('shanghai-sf-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: shanghaiToSanFrancisco
          }
        }
      });

      map.current.addSource('sydney-sf-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: sydneyToSanFrancisco
          }
        }
      });

      // Add arrow markers for line directions
      const createArrowMarkers = (lineCoords: number[][], routeId: string) => {
        const markers = [];
        const numArrows = 3; // Number of arrows per line
        
        for (let i = 0; i < numArrows; i++) {
          const progress = (i + 1) / (numArrows + 1); // Distribute arrows along the line
          const index = Math.floor(progress * (lineCoords.length - 1));
          const coord = lineCoords[index];
          const nextCoord = lineCoords[Math.min(index + 5, lineCoords.length - 1)];
          
          const bearing = calculateBearing([coord[0], coord[1]], [nextCoord[0], nextCoord[1]]);
          
          markers.push({
            type: 'Feature',
            properties: { bearing, routeId },
            geometry: { type: 'Point', coordinates: coord }
          });
          
          // Add reverse arrow for two-headed effect
          markers.push({
            type: 'Feature',
            properties: { bearing: bearing + 180, routeId },
            geometry: { type: 'Point', coordinates: coord }
          });
        }
        return markers;
      };

      // Create arrow markers for all routes
      const allArrows = [
        ...createArrowMarkers(sydneyToShanghai, 'sydney-shanghai'),
        ...createArrowMarkers(shanghaiToSanFrancisco, 'shanghai-sf'),
        ...createArrowMarkers(sydneyToSanFrancisco, 'sydney-sf')
      ];

      map.current.addSource('route-arrows', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: allArrows
        }
      });

      // Add city markers
      map.current.addSource('journey-cities', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { city: 'Sydney', status: 'current' },
              geometry: { type: 'Point', coordinates: sydney }
            },
            {
              type: 'Feature',
              properties: { city: 'Shanghai', status: 'future' },
              geometry: { type: 'Point', coordinates: shanghai }
            },
            {
              type: 'Feature',
              properties: { city: 'San Francisco', status: 'future' },
              geometry: { type: 'Point', coordinates: sanFrancisco }
            }
          ]
        }
      });

      // Add route line layers with gradient effect
      map.current.addLayer({
        id: 'sydney-shanghai-line',
        type: 'line',
        source: 'sydney-shanghai-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6', // Blue color
          'line-width': 3,
          'line-opacity': 0.8
        }
      });

      map.current.addLayer({
        id: 'shanghai-sf-line',
        type: 'line',
        source: 'shanghai-sf-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#06b6d4', // Cyan color
          'line-width': 3,
          'line-opacity': 0.8
        }
      });

      map.current.addLayer({
        id: 'sydney-sf-line',
        type: 'line',
        source: 'sydney-sf-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#10b981', // Green color
          'line-width': 3,
          'line-opacity': 0.8
        }
      });

      // Add glowing effect lines (wider, more transparent)
      map.current.addLayer({
        id: 'sydney-shanghai-glow',
        type: 'line',
        source: 'sydney-shanghai-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 8,
          'line-opacity': 0.3,
          'line-blur': 2
        }
      }, 'sydney-shanghai-line');

      map.current.addLayer({
        id: 'shanghai-sf-glow',
        type: 'line',
        source: 'shanghai-sf-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#06b6d4',
          'line-width': 8,
          'line-opacity': 0.3,
          'line-blur': 2
        }
      }, 'shanghai-sf-line');

      map.current.addLayer({
        id: 'sydney-sf-glow',
        type: 'line',
        source: 'sydney-sf-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#10b981',
          'line-width': 8,
          'line-opacity': 0.3,
          'line-blur': 2
        }
      }, 'sydney-sf-line');

      // Add arrow symbols
      map.current.addLayer({
        id: 'route-arrows-layer',
        type: 'symbol',
        source: 'route-arrows',
        layout: {
          'icon-image': 'triangle', // Use built-in triangle
          'icon-size': 0.8,
          'icon-rotate': ['get', 'bearing'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
        paint: {
          'icon-color': [
            'case',
            ['==', ['get', 'routeId'], 'sydney-shanghai'], '#3b82f6',
            ['==', ['get', 'routeId'], 'shanghai-sf'], '#06b6d4',
            '#10b981'
          ],
          'icon-opacity': 0.9
        }
      });

      // Add city markers
      map.current.addLayer({
        id: 'journey-cities-layer',
        type: 'circle',
        source: 'journey-cities',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'status'], 'current'], 8,  // Larger for current location
            6  // Smaller for future locations
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'current'], '#ef4444',  // Red for current
            '#3b82f6'  // Blue for future
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

      // Add city labels
      map.current.addLayer({
        id: 'journey-cities-labels',
        type: 'symbol',
        source: 'journey-cities',
        layout: {
          'text-field': ['get', 'city'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-offset': [0, -2],
          'text-anchor': 'bottom'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
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
  }, [mapboxLoaded]);

  return (
    <div className="flex h-screen">
      {/* Left side - Globe (2/3 of screen on desktop) */}
      <div className="w-full md:w-2/3 relative">
        {/* Map Container */}
        <div 
          ref={mapContainer} 
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '100vh' }}
        />

        {/* Loading indicator */}
        {!mapboxLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-blue-50 to-green-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Earth...</p>
            </div>
          </div>
        )}
      </div>

      {/* Right side - Maps sidebar (1/3 of screen on desktop, hidden on mobile) */}
      <div className="hidden md:block w-1/3 bg-amber-50 border-l border-gray-200 overflow-y-auto">
        <div className="p-6 relative">
          {/* Maps Section */}
          <div>
            <div className="grid grid-cols-1 gap-4 relative">
            {/* Arrow overlay container - Hand-drawn arrows only */}
            <div className="absolute inset-0 pointer-events-none z-10">
              
            </div>

            {/* San Francisco Map (Future - Top) */}
            <div id="san-francisco-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[-122.4194, 37.7749] as [number, number]}
                style="mapbox://styles/mapbox/streets-v11"
                zoom={10}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">San Francisco, USA</h3>
            </div>

            {/* Shanghai Map (Future) */}
            <div id="shanghai-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[121.4737, 31.2304] as [number, number]}
                style="mapbox://styles/theaussiestew/cm6r2jbtu000c01r9cgl81jtf"
                zoom={8}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Shanghai, China</h3>
            </div>

            {/* Sydney Map (Present) */}
            <div id="sydney-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[151.2093, -33.8688] as [number, number]}
                style="mapbox://styles/mapbox/streets-v11"
                zoom={10}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Northern Beaches</h3>
            </div>

            {/* Central Coast Map (Near Future) - Zoomed in more */}
            <div id="central-coast-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[151.2173, -33.2320] as [number, number]}
                style="mapbox://styles/mapbox/streets-v11"
                zoom={7}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Central Coast, Australia</h3>
            </div>

            {/* Sydney Map (Present) */}
            <div id="sydney-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[151.2093, -33.8688] as [number, number]}
                style="mapbox://styles/mapbox/streets-v11"
                zoom={10}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Sydney, Australia</h3>
            </div>

            {/* Newport Map (Local) */}
            <div id="newport-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[151.3181, -33.6567] as [number, number]}
                style="mapbox://styles/mapbox/streets-v11"
                zoom={12}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Newport, Sydney</h3>
            </div>

            {/* Ocean Shores Map (Coastal - Bottom) */}
            <div id="ocean-shores-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[153.5376, -28.5093] as [number, number]}
                style="mapbox://styles/mapbox/satellite-v9"
                zoom={14}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Ocean Shores, Byron Bay</h3>
            </div>

            {/* Mount Warning Map */}
            <div id="mount-warning-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[153.27083, -28.39722] as [number, number]}
                style="mapbox://styles/mapbox/satellite-v9"
                zoom={8}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Mount Warning, Northern Rivers</h3>
            </div>

            {/* Dangar Island Map */}
            <div id="dangar-island-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[151.242904663, -33.540199279] as [number, number]}
                style="mapbox://styles/mapbox/streets-v11"
                zoom={12}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Dangar Island, Sydney</h3>
            </div>

            {/* Shanghai Past Map */}
            <div id="shanghai-past-map-card" className="bg-white rounded-xl shadow-lg p-2">
              <MapboxMap 
                center={[121.473842, 31.230437] as [number, number]}
                style="mapbox://styles/theaussiestew/cm6r2jbtu000c01r9cgl81jtf"
                zoom={10}
                className="w-full h-32"
              />
              <h3 className="font-semibold text-gray-800 mt-2 text-sm">Shanghai, China</h3>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 