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

// Helper function to create straight line between two points for 2D
const createStraightLine = (start: [number, number], end: [number, number], steps = 100) => {
  const coordinates = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    coordinates.push([lng, lat]);
  }
  return coordinates;
};

// Flag to control visibility of the diagnostic routes panel
const SHOW_DIAGNOSTIC_PANEL = false;

export default function AtlasPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [detectedRoutes, setDetectedRoutes] = useState<Array<{from: string, to: string, intent: string, confidence: number}>>([]);
  const [detectedLocations, setDetectedLocations] = useState<Array<{location: string, intent: string, confidence: number}>>([]);

  // Define route mappings for extended Brazil and Argentina tourist routes
  const routeMappings: { [key: string]: { from: [number, number], to: [number, number], color: string } } = {
    'Rio de Janeiro-Petrópolis': { from: [-43.1729, -22.9068], to: [-43.1790, -22.5057], color: '#10b981' },
    'Petrópolis-Búzios': { from: [-43.1790, -22.5057], to: [-41.8813, -22.7461], color: '#f59e0b' },
    'Búzios-Paraty': { from: [-41.8813, -22.7461], to: [-44.7147, -23.2177], color: '#8b5cf6' },
    'Paraty-Angra dos Reis': { from: [-44.7147, -23.2177], to: [-44.3188, -23.0067], color: '#ef4444' },
    'Angra dos Reis-Salvador': { from: [-44.3188, -23.0067], to: [-38.5014, -12.9714], color: '#3b82f6' },
    'Salvador-Buenos Aires': { from: [-38.5014, -12.9714], to: [-58.3816, -34.6037], color: '#ec4899' },
    'Buenos Aires-Mendoza': { from: [-58.3816, -34.6037], to: [-68.8458, -32.8895], color: '#06b6d4' },
    'Mendoza-Bariloche': { from: [-68.8458, -32.8895], to: [-71.3103, -41.1335], color: '#84cc16' },
    'Bariloche-Rio de Janeiro': { from: [-71.3103, -41.1335], to: [-43.1729, -22.9068], color: '#f97316' }
  };

  const locationCoords: { [key: string]: [number, number] } = {
    'Rio de Janeiro': [-43.1729, -22.9068],
    'Petrópolis': [-43.1790, -22.5057],
    'Búzios': [-41.8813, -22.7461],
    'Paraty': [-44.7147, -23.2177],
    'Angra dos Reis': [-44.3188, -23.0067],
    'Salvador': [-38.5014, -12.9714],
    'Buenos Aires': [-58.3816, -34.6037],
    'Mendoza': [-68.8458, -32.8895],
    'Bariloche': [-71.3103, -41.1335],
    'Niterói': [-43.1039, -22.8833],
    'Nova Friburgo': [-42.5313, -22.2817],
    'Cabo Frio': [-42.0278, -22.8794],
    'Teresópolis': [-42.9664, -22.4144],
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

    // Initialize 2D map centered on South America
    map.current = new window.mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12', // Using standard 2D streets style
      projection: 'mercator', // Standard 2D projection
      zoom: 3,
      center: [-55, -15] // South America center coordinates
    });

    // Add navigation controls
    map.current.addControl(new window.mapboxgl.NavigationControl());

    // Set up map layers
    map.current.on('style.load', () => {
      // Extended South American tourist route coordinates
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
      const rioToPetropolis = createStraightLine(rioDeJaneiro, petropolis, 50);
      const petropolisToBuzios = createStraightLine(petropolis, buzios, 50);
      const buziosToParaty = createStraightLine(buzios, paraty, 50);
      const paratyToAngra = createStraightLine(paraty, angraDosReis, 50);
      const angraToSalvador = createStraightLine(angraDosReis, salvador, 100);
      const salvadorToBuenosAires = createStraightLine(salvador, buenosAires, 100);
      const buenosAiresToMendoza = createStraightLine(buenosAires, mendoza, 100);
      const mendozaToBariloche = createStraightLine(mendoza, bariloche, 100);
      const barilocheToRio = createStraightLine(bariloche, rioDeJaneiro, 100);

      // Add route sources
      map.current.addSource('rio-petropolis-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Rio to Petrópolis' },
          geometry: {
            type: 'LineString',
            coordinates: rioToPetropolis
          }
        }
      });

      map.current.addSource('petropolis-buzios-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Petrópolis to Búzios' },
          geometry: {
            type: 'LineString',
            coordinates: petropolisToBuzios
          }
        }
      });

      map.current.addSource('buzios-paraty-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Búzios to Paraty' },
          geometry: {
            type: 'LineString',
            coordinates: buziosToParaty
          }
        }
      });

      map.current.addSource('paraty-angra-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Paraty to Angra dos Reis' },
          geometry: {
            type: 'LineString',
            coordinates: paratyToAngra
          }
        }
      });

      map.current.addSource('angra-salvador-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Angra dos Reis to Salvador' },
          geometry: {
            type: 'LineString',
            coordinates: angraToSalvador
          }
        }
      });

      map.current.addSource('salvador-buenosaires-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Salvador to Buenos Aires' },
          geometry: {
            type: 'LineString',
            coordinates: salvadorToBuenosAires
          }
        }
      });

      map.current.addSource('buenosaires-mendoza-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Buenos Aires to Mendoza' },
          geometry: {
            type: 'LineString',
            coordinates: buenosAiresToMendoza
          }
        }
      });

      map.current.addSource('mendoza-bariloche-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Mendoza to Bariloche' },
          geometry: {
            type: 'LineString',
            coordinates: mendozaToBariloche
          }
        }
      });

      map.current.addSource('bariloche-rio-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { route: 'Bariloche to Rio' },
          geometry: {
            type: 'LineString',
            coordinates: barilocheToRio
          }
        }
      });

      // Add city markers for the extended South American circuit
      map.current.addSource('tourist-cities', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { city: 'Rio de Janeiro', status: 'start', order: 1 },
              geometry: { type: 'Point', coordinates: rioDeJaneiro }
            },
            {
              type: 'Feature',
              properties: { city: 'Petrópolis', status: 'visit', order: 2 },
              geometry: { type: 'Point', coordinates: petropolis }
            },
            {
              type: 'Feature',
              properties: { city: 'Búzios', status: 'visit', order: 3 },
              geometry: { type: 'Point', coordinates: buzios }
            },
            {
              type: 'Feature',
              properties: { city: 'Paraty', status: 'visit', order: 4 },
              geometry: { type: 'Point', coordinates: paraty }
            },
            {
              type: 'Feature',
              properties: { city: 'Angra dos Reis', status: 'visit', order: 5 },
              geometry: { type: 'Point', coordinates: angraDosReis }
            },
            {
              type: 'Feature',
              properties: { city: 'Salvador', status: 'visit', order: 6 },
              geometry: { type: 'Point', coordinates: salvador }
            },
            {
              type: 'Feature',
              properties: { city: 'Buenos Aires', status: 'visit', order: 7 },
              geometry: { type: 'Point', coordinates: buenosAires }
            },
            {
              type: 'Feature',
              properties: { city: 'Mendoza', status: 'visit', order: 8 },
              geometry: { type: 'Point', coordinates: mendoza }
            },
            {
              type: 'Feature',
              properties: { city: 'Bariloche', status: 'visit', order: 9 },
              geometry: { type: 'Point', coordinates: bariloche }
            }
          ]
        }
      });

      // Add route layers with different colors for the extended circuit
      const routeConfigs = [
        { id: 'rio-petropolis', source: 'rio-petropolis-route', color: '#10b981' },
        { id: 'petropolis-buzios', source: 'petropolis-buzios-route', color: '#f59e0b' },
        { id: 'buzios-paraty', source: 'buzios-paraty-route', color: '#8b5cf6' },
        { id: 'paraty-angra', source: 'paraty-angra-route', color: '#ef4444' },
        { id: 'angra-salvador', source: 'angra-salvador-route', color: '#3b82f6' },
        { id: 'salvador-buenosaires', source: 'salvador-buenosaires-route', color: '#ec4899' },
        { id: 'buenosaires-mendoza', source: 'buenosaires-mendoza-route', color: '#06b6d4' },
        { id: 'mendoza-bariloche', source: 'mendoza-bariloche-route', color: '#84cc16' },
        { id: 'bariloche-rio', source: 'bariloche-rio-route', color: '#f97316' }
      ];

      routeConfigs.forEach((config) => {
        // Add glow effect layer first
        map.current.addLayer({
          id: `${config.id}-glow`,
          type: 'line',
          source: config.source,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': config.color,
            'line-width': 8,
            'line-opacity': 0.4,
            'line-blur': 1
          }
        });

        // Add main route line
        map.current.addLayer({
          id: `${config.id}-line`,
          type: 'line',
          source: config.source,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': config.color,
            'line-width': 4,
            'line-opacity': 0.9
          }
        });
      });

      // Add city markers
      map.current.addLayer({
        id: 'tourist-cities-layer',
        type: 'circle',
        source: 'tourist-cities',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'status'], 'start'], 12,  // Largest for start location
            10  // Smaller for visit locations
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'start'], '#dc2626',  // Red for start (Rio)
            '#059669'  // Green for visit locations
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

      // Add city labels
      map.current.addLayer({
        id: 'tourist-cities-labels',
        type: 'symbol',
        source: 'tourist-cities',
        layout: {
          'text-field': ['get', 'city'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-offset': [0, -2.5],
          'text-anchor': 'bottom'
        },
        paint: {
          'text-color': '#1f2937',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });

      // Add order numbers for the cities
      map.current.addLayer({
        id: 'tourist-cities-numbers',
        type: 'symbol',
        source: 'tourist-cities',
        layout: {
          'text-field': ['get', 'order'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-anchor': 'center'
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
            const highlightedRoute = createStraightLine(routeMapping.from, routeMapping.to, 100);
            
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
                'line-width': 8,
                'line-opacity': 0.4,
                'line-blur': 1
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
                'line-width': 4,
                'line-opacity': 0.9
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
                'circle-radius': 12,
                'circle-color': '#ef4444',
                'circle-stroke-width': 3,
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
        <Quanta quantaId="atlas-travel-notes-f7a8b9c0-1234-5678-9abc-def012345678" userId="default-user" />
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

      {/* Full screen 2D Map */}
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
              <p className="text-gray-600">Loading Atlas...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 