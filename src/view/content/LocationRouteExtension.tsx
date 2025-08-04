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
    let lastAnalysisTime = 0;
    const ANALYSIS_COOLDOWN = 5000; // 5 second cooldown between analyses

    // Debounced function to analyze text for routes
    const analyzeTextForRoutes = debounce(async (text: string) => {
      const now = Date.now();
      
      // Prevent duplicate analysis and enforce cooldown
      if (isAnalyzing || 
          text === lastAnalyzedText || 
          text.trim().length < 10 ||
          (now - lastAnalysisTime) < ANALYSIS_COOLDOWN) {
        console.log('🚫 Skipping analysis - cooldown or duplicate');
        return;
      }

      isAnalyzing = true;
      lastAnalyzedText = text;
      lastAnalysisTime = now;

      try {
        console.log('🔍 Analyzing text for routes:', text.substring(0, 50) + '...');
        console.log('🔍 Full text length:', text.length);
        console.log('🔍 Full text:', JSON.stringify(text));
        
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
        
        // Only update if the analysis is actually different
        const routesChanged = JSON.stringify(detectedRoutes) !== JSON.stringify(analysis.routes);
        const locationsChanged = JSON.stringify(detectedLocations) !== JSON.stringify(analysis.single_locations);
        
        if (routesChanged || locationsChanged) {
          // Update global state
          detectedRoutes = analysis.routes;
          detectedLocations = analysis.single_locations;

          console.log('✅ Updated detected routes:', detectedRoutes);
          console.log('✅ Updated detected locations:', detectedLocations);

          // Dispatch custom event to notify map component
          window.dispatchEvent(new CustomEvent('routesUpdated', {
            detail: { routes: detectedRoutes, locations: detectedLocations }
          }));
        } else {
          console.log('🔄 Analysis result unchanged, skipping update');
        }

      } catch (error) {
        console.error('Error analyzing routes:', error);
      } finally {
        isAnalyzing = false;
      }
    }, 5000); // 5 second debounce - wait for typing to complete

    return [
      new Plugin({
        key: new PluginKey('locationRoute'),
        state: {
          init() {
            return null;
          },
          apply(tr, oldState) {
            // Extract text including location node labels
            let newState = '';
            tr.doc.descendants((node) => {
              if (node.isText) {
                newState += node.text;
              } else if (node.type.name === 'location' && node.attrs.label) {
                newState += node.attrs.label;
              }
              return true;
            });
            
            // Fallback to simple text content if needed
            if (!newState) {
              newState = tr.doc.textContent;
            }
            
            // Skip analysis if this transaction was from auto-tagging or other internal systems
            if (tr.getMeta('fromAutoTagging') || tr.getMeta('fromLocationRouteAnalysis')) {
              return null;
            }
            
            // Only analyze if there's a meaningful change and the text is long enough
            if (newState !== oldState && newState.trim().length > 15) {
              // Check if the text contains location-related keywords
              const locationKeywords = ['from', 'to', 'travel', 'visit', 'go', 'fly', 'drive'];
              const hasLocationContent = locationKeywords.some(keyword => 
                newState.toLowerCase().includes(keyword)
              );
              
              // Only trigger if text looks complete (no trailing incomplete words)
              const looksComplete = !newState.trim().endsWith(' ') || newState.trim().length > 25;
              
              // Also check if the change is significant enough (not just minor edits)
              const textLengthDifference = Math.abs(newState.length - (oldState || '').length);
              const significantChange = textLengthDifference > 5 || newState.split(' ').length !== (oldState || '').split(' ').length;
              
              if (hasLocationContent && significantChange && looksComplete) {
                console.log('📝 Triggering route analysis for text:', newState);
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