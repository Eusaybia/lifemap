import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { debounce } from 'lodash';

interface PeopleRoute {
  from: string;
  to: string;
  intent: string;
  confidence: number;
}

interface SinglePerson {
  person: string;
  intent: string;
  confidence: number;
}

interface PeopleAnalysis {
  routes: PeopleRoute[];
  single_people: SinglePerson[];
}

// Global state to store detected people routes
let detectedPeopleRoutes: PeopleRoute[] = [];
let detectedPeople: SinglePerson[] = [];

// Event to notify when people are updated
const peopleUpdateEvent = new CustomEvent('peopleUpdated', {
  detail: { routes: detectedPeopleRoutes, people: detectedPeople }
});

export const PeopleRouteExtension = Extension.create({
  name: 'peopleRoute',

  addProseMirrorPlugins() {
    let lastAnalyzedText = '';
    let isAnalyzing = false;
    let lastAnalysisTime = 0;
    const ANALYSIS_COOLDOWN = 5000; // 5 second cooldown between analyses

    // Debounced function to analyze text for people
    const analyzeTextForPeople = debounce(async (text: string) => {
      const now = Date.now();
      
      // Prevent duplicate analysis and enforce cooldown
      if (isAnalyzing || 
          text === lastAnalyzedText || 
          text.trim().length < 10 ||
          (now - lastAnalysisTime) < ANALYSIS_COOLDOWN) {
        console.log('🚫 Skipping people analysis - cooldown or duplicate');
        return;
      }

      isAnalyzing = true;
      lastAnalyzedText = text;
      lastAnalysisTime = now;

      try {
        console.log('🔍 Analyzing text for people:', text.substring(0, 50) + '...');
        console.log('🔍 Full text length:', text.length);
        console.log('🔍 Full text:', JSON.stringify(text));
        
        // Use Compromise to detect people
        let detectedPeople: SinglePerson[] = [];
        try {
          const nlp = (await import('compromise')).default;
          const doc = nlp(text);
          const people = doc.people().out('array');
          
          people.forEach((person: string) => {
            detectedPeople.push({
              person: person,
              intent: 'mention',
              confidence: 0.9
            });
          });
          
          console.log('👤 Compromise detected people:', people);
        } catch (error) {
          console.error('Compromise error for people detection:', error);
          // Fallback to simple regex-based people detection
          const peoplePatterns = [
            /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\b/gi,
            /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g // Capitalized words (potential names)
          ];
          
          peoplePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
              detectedPeople.push({
                person: match[0],
                intent: 'mention',
                confidence: 0.7
              });
            }
          });
        }

        // Only update if the analysis is actually different
        const peopleChanged = JSON.stringify(detectedPeople) !== JSON.stringify(detectedPeople);
        
        if (peopleChanged) {
          // Update global state
          detectedPeople = detectedPeople;

          console.log('✅ Updated detected people:', detectedPeople);

          // Dispatch custom event to notify components
          window.dispatchEvent(new CustomEvent('peopleUpdated', {
            detail: { routes: detectedPeopleRoutes, people: detectedPeople }
          }));
        } else {
          console.log('🔄 People analysis result unchanged, skipping update');
        }

      } catch (error) {
        console.error('Error analyzing people:', error);
      } finally {
        isAnalyzing = false;
      }
    }, 1000);

    return [
      new Plugin({
        key: new PluginKey('peopleRoute'),
        state: {
          init() {
            return null;
          },
          apply(tr, oldState) {
            // Extract text including people node labels
            let newState = '';
            tr.doc.descendants((node) => {
              if (node.isText) {
                newState += node.text;
              } else if (node.type.name === 'people' && node.attrs.label) {
                newState += node.attrs.label;
              }
              return true;
            });
            
            // Fallback to simple text content if needed
            if (!newState) {
              newState = tr.doc.textContent;
            }
            
            // Skip analysis if this transaction was from auto-tagging or other internal systems
            if (tr.getMeta('fromAutoTagging') || tr.getMeta('fromPeopleRouteAnalysis')) {
              return null;
            }
            
            // Only analyze if there's a meaningful change and the text is long enough
            if (newState !== oldState && newState.trim().length > 15) {
              // Check if the text contains people-related keywords
              const peopleKeywords = ['meet', 'talk', 'call', 'email', 'contact', 'friend', 'family', 'colleague'];
              const hasPeopleContent = peopleKeywords.some(keyword => 
                newState.toLowerCase().includes(keyword)
              );
              
              // Only trigger if text looks complete (no trailing incomplete words)
              const looksComplete = !newState.trim().endsWith(' ') || newState.trim().length > 25;
              
              // Also check if the change is significant enough (not just minor edits)
              const textLengthDifference = Math.abs(newState.length - (oldState || '').length);
              const significantChange = textLengthDifference > 5 || newState.split(' ').length !== (oldState || '').split(' ').length;
              
              if (hasPeopleContent && significantChange && looksComplete) {
                console.log('📝 Triggering people analysis for text:', newState);
                analyzeTextForPeople(newState);
              }
            }

            return null;
          }
        }
      })
    ];
  }
});

export const getDetectedPeopleRoutes = () => detectedPeopleRoutes;
export const getDetectedPeople = () => detectedPeople; 