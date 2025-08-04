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
  const [detectedRoutes, setDetectedRoutes] = useState<Array<{from: string, to: string, intent: string, confidence: number}>>([]);
  const [detectedLocations, setDetectedLocations] = useState<Array<{location: string, intent: string, confidence: number}>>([]);

  // Define route mappings and location coordinates globally
  const routeMappings: { [key: string]: { from: [number, number], to: [number, number], color: string } } = {
    'Sydney-Brisbane': { from: [151.2093, -33.8688], to: [153.0251, -27.4698], color: '#22c55e' },
    'Sydney-Shanghai': { from: [151.2093, -33.8688], to: [121.4737, 31.2304], color: '#3b82f6' },
    'Shanghai-San Francisco': { from: [121.4737, 31.2304], to: [-122.4194, 37.7749], color: '#06b6d4' },
    'Sydney-San Francisco': { from: [151.2093, -33.8688], to: [-122.4194, 37.7749], color: '#10b981' },
    'Sydney-Singapore': { from: [151.2093, -33.8688], to: [103.8198, 1.3521], color: '#8b5cf6' },
    'Singapore-Malaysia': { from: [103.8198, 1.3521], to: [101.6869, 3.1390], color: '#f59e0b' },
    'Malaysia-Hong Kong': { from: [101.6869, 3.1390], to: [114.1694, 22.3193], color: '#eab308' },
    'Sydney-Shenzhen': { from: [151.2093, -33.8688], to: [114.0579, 22.5431], color: '#ec4899' },
    'Sydney-Hubei': { from: [151.2093, -33.8688], to: [114.3416, 30.5468], color: '#14b8a6' },
    'Sydney-Rajasthan': { from: [151.2093, -33.8688], to: [75.7873, 26.9124], color: '#6366f1' },
    'Sydney-Kansas City': { from: [151.2093, -33.8688], to: [-94.5786, 39.0997], color: '#ef4444' },
    'Sydney-Tibet': { from: [151.2093, -33.8688], to: [91.1172, 29.6440], color: '#6b7280' },
    'Sydney-Essaouira': { from: [151.2093, -33.8688], to: [-9.7700, 31.5125], color: '#f97316' }
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
    'Essaouira': [-9.7700, 31.5125]
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
      
      // Journey coordinates
      const sydney = [151.2093, -33.8688] as [number, number];
      const shanghai = [121.4737, 31.2304] as [number, number];
      const sanFrancisco = [-122.4194, 37.7749] as [number, number];
      const singapore = [103.8198, 1.3521] as [number, number];
      const malaysia = [101.6869, 3.1390] as [number, number]; // Kuala Lumpur
      const hongKong = [114.1694, 22.3193] as [number, number];
      const shenzhen = [114.0579, 22.5431] as [number, number];
      const hubei = [114.3416, 30.5468] as [number, number]; // Wuhan
      const rajasthan = [75.7873, 26.9124] as [number, number]; // Jaipur
      const kansasCity = [-94.5786, 39.0997] as [number, number];
      const tibet = [91.1172, 29.6440] as [number, number]; // Lhasa
      const essaouira = [-9.7700, 31.5125] as [number, number];

      // Create arc paths
      const sydneyToShanghai = createArc(sydney, shanghai, 100);
      const shanghaiToSanFrancisco = createArc(shanghai, sanFrancisco, 100);
      const sydneyToSanFrancisco = createArc(sydney, sanFrancisco, 150); // More steps for longer arc
      const sydneyToSingapore = createArc(sydney, singapore, 100);
      const singaporeToMalaysia = createArc(singapore, malaysia, 100);
      const malaysiaToHongKong = createArc(malaysia, hongKong, 100);
      const sydneyToShenzhen = createArc(sydney, shenzhen, 100);
      const sydneyToHubei = createArc(sydney, hubei, 100);
      const sydneyToRajasthan = createArc(sydney, rajasthan, 100);
      const sydneyToKansasCity = createArc(sydney, kansasCity, 150);
      const sydneyToTibet = createArc(sydney, tibet, 100);
      const sydneyToEssaouira = createArc(sydney, essaouira, 150);

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

      map.current.addSource('sydney-singapore-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: sydneyToSingapore }
        }
      });
      map.current.addSource('singapore-malaysia-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: singaporeToMalaysia }
        }
      });
      map.current.addSource('malaysia-hongkong-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: malaysiaToHongKong }
        }
      });
      map.current.addSource('sydney-shenzhen-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: sydneyToShenzhen }
        }
      });
      map.current.addSource('sydney-hubei-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: sydneyToHubei }
        }
      });
      map.current.addSource('sydney-rajasthan-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: sydneyToRajasthan }
        }
      });
      map.current.addSource('sydney-kansascity-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: sydneyToKansasCity }
        }
      });
      map.current.addSource('sydney-tibet-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: sydneyToTibet }
        }
      });
      map.current.addSource('sydney-essaouira-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: sydneyToEssaouira }
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
        }
        return markers;
      };

      // Create arrow markers for all routes
      const allArrows = [
        ...createArrowMarkers(sydneyToShanghai, 'sydney-shanghai'),
        ...createArrowMarkers(shanghaiToSanFrancisco, 'shanghai-sf'),
        ...createArrowMarkers(sydneyToSanFrancisco, 'sydney-sf'),
        ...createArrowMarkers(sydneyToSingapore, 'sydney-singapore'),
        ...createArrowMarkers(singaporeToMalaysia, 'singapore-malaysia'),
        ...createArrowMarkers(malaysiaToHongKong, 'malaysia-hongkong'),
        ...createArrowMarkers(sydneyToShenzhen, 'sydney-shenzhen'),
        ...createArrowMarkers(sydneyToHubei, 'sydney-hubei'),
        ...createArrowMarkers(sydneyToRajasthan, 'sydney-rajasthan'),
        ...createArrowMarkers(sydneyToKansasCity, 'sydney-kansascity'),
        ...createArrowMarkers(sydneyToTibet, 'sydney-tibet'),
        ...createArrowMarkers(sydneyToEssaouira, 'sydney-essaouira')
      ];

      const arrowImage = new Image(15, 15);
      arrowImage.src = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 15"><polygon fill="#ffffff" points="0,0 15,7.5 0,15"/></svg>';
      arrowImage.onload = () => {
        map.current.addImage('arrow-icon', arrowImage);
      };

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
            },
            {
              type: 'Feature',
              properties: { city: 'Singapore', status: 'future' },
              geometry: { type: 'Point', coordinates: singapore }
            },
            {
              type: 'Feature',
              properties: { city: 'Malaysia', status: 'future' },
              geometry: { type: 'Point', coordinates: malaysia }
            },
            {
              type: 'Feature',
              properties: { city: 'Hong Kong', status: 'future' },
              geometry: { type: 'Point', coordinates: hongKong }
            },
            {
              type: 'Feature',
              properties: { city: 'Shenzhen', status: 'future' },
              geometry: { type: 'Point', coordinates: shenzhen }
            },
            {
              type: 'Feature',
              properties: { city: 'Hubei (Wuhan)', status: 'future' },
              geometry: { type: 'Point', coordinates: hubei }
            },
            {
              type: 'Feature',
              properties: { city: 'Rajasthan (Jaipur)', status: 'future' },
              geometry: { type: 'Point', coordinates: rajasthan }
            },
            {
              type: 'Feature',
              properties: { city: 'Kansas City', status: 'future' },
              geometry: { type: 'Point', coordinates: kansasCity }
            },
            {
              type: 'Feature',
              properties: { city: 'Tibet (Lhasa)', status: 'future' },
              geometry: { type: 'Point', coordinates: tibet }
            },
            {
              type: 'Feature',
              properties: { city: 'Essaouira, Morocco', status: 'future' },
              geometry: { type: 'Point', coordinates: essaouira }
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
          'line-width': 7,
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
          'line-width': 7,
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
          'line-width': 7,
          'line-opacity': 0.8
        }
      });

      // Add new line layers with colors
      map.current.addLayer({
        id: 'sydney-singapore-line',
        type: 'line',
        source: 'sydney-singapore-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#8b5cf6', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'singapore-malaysia-line',
        type: 'line',
        source: 'singapore-malaysia-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f59e0b', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'malaysia-hongkong-line',
        type: 'line',
        source: 'malaysia-hongkong-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#eab308', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'sydney-shenzhen-line',
        type: 'line',
        source: 'sydney-shenzhen-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ec4899', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'sydney-hubei-line',
        type: 'line',
        source: 'sydney-hubei-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#14b8a6', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'sydney-rajasthan-line',
        type: 'line',
        source: 'sydney-rajasthan-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#6366f1', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'sydney-kansascity-line',
        type: 'line',
        source: 'sydney-kansascity-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ef4444', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'sydney-tibet-line',
        type: 'line',
        source: 'sydney-tibet-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#6b7280', 'line-width': 7, 'line-opacity': 0.8 }
      });
      map.current.addLayer({
        id: 'sydney-essaouira-line',
        type: 'line',
        source: 'sydney-essaouira-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f97316', 'line-width': 7, 'line-opacity': 0.8 }
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
          'line-width': 15,
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
          'line-width': 15,
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
          'line-width': 15,
          'line-opacity': 0.3,
          'line-blur': 2
        }
      }, 'sydney-sf-line');

      // Add glow layers similarly
      map.current.addLayer({
        id: 'sydney-singapore-glow',
        type: 'line',
        source: 'sydney-singapore-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#8b5cf6', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'sydney-singapore-line');
      map.current.addLayer({
        id: 'singapore-malaysia-glow',
        type: 'line',
        source: 'singapore-malaysia-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f59e0b', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'singapore-malaysia-line');
      map.current.addLayer({
        id: 'malaysia-hongkong-glow',
        type: 'line',
        source: 'malaysia-hongkong-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#eab308', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'malaysia-hongkong-line');
      map.current.addLayer({
        id: 'sydney-shenzhen-glow',
        type: 'line',
        source: 'sydney-shenzhen-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ec4899', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'sydney-shenzhen-line');
      map.current.addLayer({
        id: 'sydney-hubei-glow',
        type: 'line',
        source: 'sydney-hubei-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#14b8a6', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'sydney-hubei-line');
      map.current.addLayer({
        id: 'sydney-rajasthan-glow',
        type: 'line',
        source: 'sydney-rajasthan-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#6366f1', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'sydney-rajasthan-line');
      map.current.addLayer({
        id: 'sydney-kansascity-glow',
        type: 'line',
        source: 'sydney-kansascity-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ef4444', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'sydney-kansascity-line');
      map.current.addLayer({
        id: 'sydney-tibet-glow',
        type: 'line',
        source: 'sydney-tibet-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#6b7280', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'sydney-tibet-line');
      map.current.addLayer({
        id: 'sydney-essaouira-glow',
        type: 'line',
        source: 'sydney-essaouira-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f97316', 'line-width': 15, 'line-opacity': 0.3, 'line-blur': 2 }
      }, 'sydney-essaouira-line');

      // Add arrow symbols
      map.current.addLayer({
        id: 'route-arrows-layer',
        type: 'symbol',
        source: 'route-arrows',
        layout: {
          'icon-image': 'arrow-icon', // Use built-in triangle
          'icon-size': 0.5,
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
            ['==', ['get', 'routeId'], 'sydney-sf'], '#10b981',
            ['==', ['get', 'routeId'], 'sydney-singapore'], '#8b5cf6',
            ['==', ['get', 'routeId'], 'singapore-malaysia'], '#f59e0b',
            ['==', ['get', 'routeId'], 'malaysia-hongkong'], '#eab308',
            ['==', ['get', 'routeId'], 'sydney-shenzhen'], '#ec4899',
            ['==', ['get', 'routeId'], 'sydney-hubei'], '#14b8a6',
            ['==', ['get', 'routeId'], 'sydney-rajasthan'], '#6366f1',
            ['==', ['get', 'routeId'], 'sydney-kansascity'], '#ef4444',
            ['==', ['get', 'routeId'], 'sydney-tibet'], '#6b7280',
            ['==', ['get', 'routeId'], 'sydney-essaouira'], '#f97316',
            '#000000'
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
  }, [mapboxLoaded, detectedRoutes, detectedLocations]);

  // Handle route updates
  useEffect(() => {
    if (!map.current || !mapboxLoaded) return;

    // Wait for map to be fully loaded before adding sources
    const addDynamicRoutes = () => {
      try {
        // Clear existing highlighted routes
        detectedRoutes.forEach((_, index) => {
          const sourceId = `highlighted-route-${index}`;
          const layerId = `highlighted-route-line-${index}`;
          
          if (map.current.getLayer(layerId)) {
            map.current.removeLayer(layerId);
          }
          if (map.current.getSource(sourceId)) {
            map.current.removeSource(sourceId);
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

        // Add new highlighted routes
        detectedRoutes.forEach((route, index) => {
          const routeKey = `${route.from}-${route.to}`;
          const reverseRouteKey = `${route.to}-${route.from}`;
          const routeMapping = routeMappings[routeKey] || routeMappings[reverseRouteKey];

          if (routeMapping) {
            const highlightedRoute = createArc(routeMapping.from, routeMapping.to, 100);
            
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
                'line-width': 12,
                'line-opacity': 1,
                'line-dasharray': [2, 2]
              }
            });
          }
        });

        // Add new highlighted locations
        detectedLocations.forEach((location, index) => {
          const coords = locationCoords[location.location];
          if (coords) {
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
          }
        });
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
      {(detectedRoutes.length > 0 || detectedLocations.length > 0) && (
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