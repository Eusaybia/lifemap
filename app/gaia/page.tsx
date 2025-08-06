'use client';

import React, { useEffect, useRef, useState } from 'react';
import MapboxMap from '../../components/MapboxMap';
import { Quanta } from '../../src/core/Quanta';

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


// Flag to control visibility of the diagnostic routes panel
const SHOW_DIAGNOSTIC_PANEL = false;

export default function PhysicalSpacePage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [detectedRoutes, setDetectedRoutes] = useState<Array<{from: string, to: string, intent: string, confidence: number}>>([]);
  const [detectedLocations, setDetectedLocations] = useState<Array<{location: string, intent: string, confidence: number}>>([]);

  // Define route mappings and location coordinates globally - keeping only Singapore to Hong Kong
  const routeMappings: { [key: string]: { from: [number, number], to: [number, number], color: string } } = {
    'Singapore-Hong Kong': { from: [103.8198, 1.3521], to: [114.1694, 22.3193], color: '#eab308' }
  };

  const locationCoords: { [key: string]: [number, number] } = {
    'Sydney': [151.2093, -33.8688],
    'Brisbane': [153.0251, -27.4698],
    'Shanghai': [121.4737, 31.2304],
    'San Francisco': [-122.4194, 37.7749],
    'Singapore': [103.8198, 1.3521],
    'Malaysia': [101.6869, 3.1390],
    'Hong Kong': [114.1694, 22.3193],
    'Shenzhen': [114.0579, 22.5431],
    'Hubei': [114.3416, 30.5468],
    'Rajasthan': [75.7873, 26.9124],
    'Kansas City': [-94.5786, 39.0997],
    'Tibet': [91.1172, 29.6440],
    'Essaouira': [-9.7700, 31.5125],
    'Auckland': [174.7633, -36.8485],
    'London': [-0.1278, 51.5074],
    'Tokyo': [139.6503, 35.6762],
    'Beijing': [116.4074, 39.9042],
    'New York': [-74.0060, 40.7128],
    'Paris': [2.3522, 48.8566],
    'Mumbai': [72.8777, 19.0760],
    'Dubai': [55.2708, 25.2048],
    'Cairo': [31.2357, 30.0444],
    'Washington': [-77.0369, 38.9072]
  };

  // Listen for route updates from the editor
  useEffect(() => {
    const handleRoutesUpdated = (event: CustomEvent) => {
      const { routes, locations } = event.detail;
      setDetectedRoutes(routes);
      setDetectedLocations(locations);
      console.log('Routes updated:', routes);
      console.log('Locations updated:', locations);
    };

    window.addEventListener('routesUpdated', handleRoutesUpdated as EventListener);

    return () => {
      window.removeEventListener('routesUpdated', handleRoutesUpdated as EventListener);
    };
  }, []);

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
      
      // Journey coordinates - only keeping Singapore and Hong Kong
      const singapore = [103.8198, 1.3521] as [number, number];
      const hongKong = [114.1694, 22.3193] as [number, number];

      // Create arc path - only Singapore to Hong Kong
      const singaporeToHongKong = createArc(singapore, hongKong, 100);

      // Add journey line source - only Singapore to Hong Kong
      map.current.addSource('singapore-hongkong-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: singaporeToHongKong
          }
        }
      });


      // Add city markers - only Singapore and Hong Kong
      map.current.addSource('journey-cities', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { city: 'Singapore', status: 'current' },
              geometry: { type: 'Point', coordinates: singapore }
            },
            {
              type: 'Feature',
              properties: { city: 'Hong Kong', status: 'future' },
              geometry: { type: 'Point', coordinates: hongKong }
            }
          ]
        }
      });

      // Add Singapore to Hong Kong route line layer
      map.current.addLayer({
        id: 'singapore-hongkong-line',
        type: 'line',
        source: 'singapore-hongkong-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#eab308',
          'line-width': 7,
          'line-opacity': 0.8
        }
      });

      // Add Singapore to Hong Kong glow effect layer
      map.current.addLayer({
        id: 'singapore-hongkong-glow',
        type: 'line',
        source: 'singapore-hongkong-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#eab308',
          'line-width': 15,
          'line-opacity': 0.3,
          'line-blur': 2
        }
      }, 'singapore-hongkong-line');

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
  }, [mapboxLoaded, detectedRoutes, detectedLocations]);

  // Handle route updates with dynamic geocoding
  useEffect(() => {
    if (!map.current || !mapboxLoaded) return;

    // Cache for geocoded coordinates
    const geocodeCache = new Map<string, [number, number]>();

    // Function to geocode a location using our API
    const geocodeLocation = async (location: string): Promise<[number, number] | null> => {
      if (geocodeCache.has(location)) {
        return geocodeCache.get(location)!;
      }

      // Check if we already have coordinates for this location
      if (locationCoords[location]) {
        const coords: [number, number] = locationCoords[location];
        geocodeCache.set(location, coords);
        return coords;
      }

      try {
        console.log('🌍 Geocoding unknown location:', location);
        const response = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location })
        });

        if (!response.ok) {
          console.error('Geocoding failed for:', location);
          return null;
        }

        const data = await response.json();
        if (data.coordinates) {
          const coords: [number, number] = [data.coordinates.longitude, data.coordinates.latitude];
          geocodeCache.set(location, coords);
          console.log('📍 Geocoded', location, 'to:', coords);
          return coords;
        }
      } catch (error) {
        console.error('Geocoding error for', location, ':', error);
      }

      return null;
    };

    // Wait for map to be fully loaded before adding sources
    const addDynamicRoutes = async () => {
      try {
        // Clear existing highlighted routes
        detectedRoutes.forEach((_, index) => {
          const routeSourceId = `highlighted-route-${index}`;
          const routeLayerId = `highlighted-route-line-${index}`;
          const routeGlowLayerId = `highlighted-route-glow-${index}`;
          
          // Remove route line and glow
          if (map.current.getLayer(routeLayerId)) {
            map.current.removeLayer(routeLayerId);
          }
          if (map.current.getLayer(routeGlowLayerId)) {
            map.current.removeLayer(routeGlowLayerId);
          }
          if (map.current.getSource(routeSourceId)) {
            map.current.removeSource(routeSourceId);
          }
        });

        // Clear existing highlighted locations
        detectedLocations.forEach((_, index) => {
          const sourceId = `highlighted-location-${index}`;
          const layerId = `highlighted-location-marker-${index}`;
          
          if (map.current.getLayer(layerId)) {
            map.current.removeLayer(layerId);
          }
          if (map.current.getSource(sourceId)) {
            map.current.removeSource(sourceId);
          }
        });

        // Add new highlighted routes with dynamic geocoding
        for (const [index, route] of detectedRoutes.entries()) {
          const routeKey = `${route.from}-${route.to}`;
          const reverseRouteKey = `${route.to}-${route.from}`;
          console.log('🔍 Processing route:', routeKey);
          
          let routeMapping = routeMappings[routeKey] || routeMappings[reverseRouteKey];
          
          // If no existing mapping, try to geocode both locations
          if (!routeMapping) {
            console.log('🌍 No existing mapping, geocoding route:', routeKey);
            
            const [fromCoords, toCoords] = await Promise.all([
              geocodeLocation(route.from),
              geocodeLocation(route.to)
            ]);

            if (fromCoords && toCoords) {
              // Create dynamic route mapping
              routeMapping = {
                from: fromCoords,
                to: toCoords,
                color: '#ff6b6b' // Dynamic routes get a distinct red color
              };
              
              // Cache the mapping for future use
              routeMappings[routeKey] = routeMapping;
              console.log('✅ Created dynamic mapping for:', routeKey, routeMapping);
            }
          }

          if (routeMapping) {
            console.log('🎯 Adding route to map:', routeKey);
            const highlightedRoute = createArc(routeMapping.from, routeMapping.to, 100);
            
            // Add the route line
            map.current.addSource(`highlighted-route-${index}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: highlightedRoute
                }
              }
            });

            // Add glow effect layer first (wider, more transparent)
            map.current.addLayer({
              id: `highlighted-route-glow-${index}`,
              type: 'line',
              source: `highlighted-route-${index}`,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': routeMapping.color,
                'line-width': 15,
                'line-opacity': 0.3,
                'line-blur': 2
              }
            });

            // Add main route line
            map.current.addLayer({
              id: `highlighted-route-line-${index}`,
              type: 'line',
              source: `highlighted-route-${index}`,
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': routeMapping.color,
                'line-width': 7,
                'line-opacity': 0.8
              }
            });

          } else {
            console.log('❌ Could not geocode route:', routeKey);
          }
        }

        // Add new highlighted locations with dynamic geocoding
        for (const [index, location] of detectedLocations.entries()) {
          const coords = await geocodeLocation(location.location);
          if (coords) {
            console.log('🎯 Adding location marker:', location.location);
            map.current.addSource(`highlighted-location-${index}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: { name: location.location },
                geometry: { type: 'Point', coordinates: coords }
              }
            });

            map.current.addLayer({
              id: `highlighted-location-marker-${index}`,
              type: 'circle',
              source: `highlighted-location-${index}`,
              paint: {
                'circle-radius': 15,
                'circle-color': '#ef4444',
                'circle-stroke-width': 4,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.9
              }
            });
          } else {
            console.log('❌ Could not geocode location:', location.location);
          }
        }
      } catch (error) {
        console.error('Error adding dynamic routes:', error);
      }
    };

    // Check if map is ready, if not wait for it
    if (map.current.isStyleLoaded()) {
      addDynamicRoutes();
    } else {
      map.current.once('style.load', addDynamicRoutes);
    }
  }, [detectedRoutes, detectedLocations, mapboxLoaded]);

  return (
    <div className="flex h-screen">
      {/* Travel Notes Overlay */}
      <div style={{ position: 'absolute', top: '5rem', right: '5rem', zIndex: 10, backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 0 10px rgba(0,0,0,0.2)', width: '400px', height: '500px', overflow: 'auto' }}>
        <Quanta quantaId="gaia-travel-notes-f7a8b9c0-1234-5678-9abc-def012345678" userId="default-user" />
      </div>

      {/* Detected Routes Status */}
      {SHOW_DIAGNOSTIC_PANEL && (detectedRoutes.length > 0 || detectedLocations.length > 0) && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '1rem', borderRadius: '0.5rem', maxWidth: '300px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Detected Routes:</h3>
          {detectedRoutes.map((route, index) => (
            <div key={index} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              📍 {route.from} → {route.to} ({route.intent})
            </div>
          ))}
          {detectedLocations.map((location, index) => (
            <div key={`loc-${index}`} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              🎯 {location.location} ({location.intent})
            </div>
          ))}
        </div>
      )}

      {/* Left side - Globe (now full screen) */}
      <div className="w-full relative">
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
      
    </div>
  );
} 