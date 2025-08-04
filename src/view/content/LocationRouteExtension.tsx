import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { debounce } from 'lodash';

interface LocationRoute {
  from: string;
  to: string;
  intent: string;
  confidence: number;
}

interface SingleLocation {
  location: string;
  intent: string;
  confidence: number;
}

interface RouteAnalysis {
  routes: LocationRoute[];
  single_locations: SingleLocation[];
}

// Global state to store detected routes
let detectedRoutes: LocationRoute[] = [];
let detectedLocations: SingleLocation[] = [];

// Event to notify when routes are updated
const routeUpdateEvent = new CustomEvent('routesUpdated', {
  detail: { routes: detectedRoutes, locations: detectedLocations }
});

export const LocationRouteExtension = Extension.create({
  name: 'locationRoute',

  addProseMirrorPlugins() {
    let lastAnalyzedText = '';
    let isAnalyzing = false;

    // Debounced function to analyze text for routes
    const analyzeTextForRoutes = debounce(async (text: string) => {
      // Prevent duplicate analysis
      if (isAnalyzing || text === lastAnalyzedText || text.trim().length < 10) {
        return;
      }

      isAnalyzing = true;
      lastAnalyzedText = text;

      try {
        console.log('Analyzing text for routes:', text.substring(0, 50) + '...');
        
        const response = await fetch('/api/analyze-routes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          console.error('Failed to analyze routes');
          return;
        }

        const analysis: RouteAnalysis = await response.json();
        
        // Update global state
        detectedRoutes = analysis.routes;
        detectedLocations = analysis.single_locations;

        console.log('Detected routes:', detectedRoutes);
        console.log('Detected locations:', detectedLocations);

        // Dispatch custom event to notify map component
        window.dispatchEvent(new CustomEvent('routesUpdated', {
          detail: { routes: detectedRoutes, locations: detectedLocations }
        }));

      } catch (error) {
        console.error('Error analyzing routes:', error);
      } finally {
        isAnalyzing = false;
      }
    }, 2000); // 2 second debounce

    return [
      new Plugin({
        key: new PluginKey('locationRoute'),
        state: {
          init() {
            return null;
          },
          apply(tr, oldState) {
            const newState = tr.doc.textContent;
            
            // Only analyze if there's a meaningful change and the text is long enough
            if (newState !== oldState && newState.trim().length > 10) {
              // Check if the text contains location-related keywords
              const locationKeywords = ['from', 'to', 'travel', 'visit', 'go', 'fly', 'drive'];
              const hasLocationContent = locationKeywords.some(keyword => 
                newState.toLowerCase().includes(keyword)
              );
              
              if (hasLocationContent) {
                analyzeTextForRoutes(newState);
              }
            }

            return null;
          },
        },
      }),
    ];
  },
});

// Export functions to access detected routes
export const getDetectedRoutes = () => detectedRoutes;
export const getDetectedLocations = () => detectedLocations; 