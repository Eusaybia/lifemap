import nlp from 'compromise';

export interface ExtractedEntity {
  text: string;
  type: 'LOCATION' | 'PERSON' | 'ORGANIZATION' | 'DATE' | 'MONEY' | 'CARDINAL';
  confidence: number;
  position: number;
}

/**
 * Extract entities using Compromise (lightweight, browser-compatible)
 */
export async function extractEntitiesWithCompromise(text: string): Promise<ExtractedEntity[]> {
  try {
    const doc = nlp(text);
    const entities: ExtractedEntity[] = [];

    // Extract places
    const places = doc.places().out('array');
    places.forEach((place: string) => {
      const position = text.indexOf(place);
      if (position !== -1) {
        entities.push({
          text: place,
          type: 'LOCATION',
          confidence: 0.9,
          position
        });
      }
    });

    // Extract people
    const people = doc.people().out('array');
    people.forEach((person: string) => {
      const position = text.indexOf(person);
      if (position !== -1) {
        entities.push({
          text: person,
          type: 'PERSON',
          confidence: 0.9,
          position
        });
      }
    });

    // Extract organizations
    const organizations = doc.organizations().out('array');
    organizations.forEach((org: string) => {
      const position = text.indexOf(org);
      if (position !== -1) {
        entities.push({
          text: org,
          type: 'ORGANIZATION',
          confidence: 0.9,
          position
        });
      }
    });

    return entities;
  } catch (error) {
    console.error('Compromise extraction error:', error);
    return [];
  }
}

/**
 * Extract entities using a simple regex-based approach (fallback)
 */
export function extractEntitiesWithRegex(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  
  // Common location patterns
  const locationPatterns = [
    /\b(Sydney|Shanghai|Singapore|Malaysia|Hong Kong|Shenzhen|Kansas City|Tibet|Essaouira|Morocco|San Francisco|Washington|New York|London|Paris|Tokyo|Beijing|Mumbai|Dubai|Cairo)\b/gi,
    /\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b/g // Capitalized words (potential places)
  ];

  locationPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'LOCATION',
        confidence: 0.7,
        position: match.index
      });
    }
  });

  return entities;
}

/**
 * Extract travel routes from text using pattern matching
 */
export function extractTravelRoutes(text: string): Array<{from: string, to: string, confidence: number}> {
  const routes: Array<{from: string, to: string, confidence: number}> = [];
  
  // Pattern for "from X to Y" or "X to Y"
  const routePatterns = [
    /(?:from|go from|travel from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:to|and then to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
  ];

  routePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      routes.push({
        from: match[1].trim(),
        to: match[2].trim(),
        confidence: 0.8
      });
    }
  });

  return routes;
}

/**
 * Main entity extraction function that tries multiple approaches
 */
export async function extractEntities(text: string): Promise<{
  entities: ExtractedEntity[];
  routes: Array<{from: string, to: string, confidence: number}>;
}> {
  // Try Compromise first
  let entities = await extractEntitiesWithCompromise(text);
  
  // Fallback to regex if Compromise fails
  if (entities.length === 0) {
    entities = extractEntitiesWithRegex(text);
  }

  // Extract travel routes
  const routes = extractTravelRoutes(text);

  return { entities, routes };
} 