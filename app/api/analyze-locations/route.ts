import { NextRequest, NextResponse } from 'next/server';

// Define the structure for location entities
interface LocationEntity {
  name: string;
  type: string;
  mentions: Array<{
    text: {
      content: string;
      beginOffset: number;
    };
    type: string;
    probability: number;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('Received text for analysis:', text.substring(0, 100) + '...');

    // Use Compromise for entity extraction
    try {
      const nlp = (await import('compromise')).default;
      const doc = nlp(text);
      
      // Extract different entity types
      const places = doc.places().out('array');
      const people = doc.people().out('array');
      const organizations = doc.organizations().out('array');
      
      console.log('Compromise extracted entities:', {
        places: places.length,
        people: people.length,
        organizations: organizations.length
      });

      // Convert to our expected format
      const entities: LocationEntity[] = [];
      
      // Add places as location entities
      places.forEach((place: string, index: number) => {
        const beginOffset = text.indexOf(place);
        if (beginOffset !== -1) {
          entities.push({
            name: place,
            type: 'LOCATION',
            mentions: [{
              text: {
                content: place,
                beginOffset: beginOffset
              },
              type: 'PROPER',
              probability: 0.9
            }]
          });
        }
      });

      // Add people as person entities (for completeness)
      people.forEach((person: string, index: number) => {
        const beginOffset = text.indexOf(person);
        if (beginOffset !== -1) {
          entities.push({
            name: person,
            type: 'PERSON',
            mentions: [{
              text: {
                content: person,
                beginOffset: beginOffset
              },
              type: 'PROPER',
              probability: 0.9
            }]
          });
        }
      });

      // Add organizations as organization entities
      organizations.forEach((org: string, index: number) => {
        const beginOffset = text.indexOf(org);
        if (beginOffset !== -1) {
          entities.push({
            name: org,
            type: 'ORGANIZATION',
            mentions: [{
              text: {
                content: org,
                beginOffset: beginOffset
              },
              type: 'PROPER',
              probability: 0.9
            }]
          });
        }
      });

      console.log('Processed entities:', entities.length);

      return NextResponse.json({ entities });

    } catch (compromiseError) {
      console.error('Compromise error:', compromiseError);
      
      // Fallback to mock implementation
      const mockLocationEntities: LocationEntity[] = [];
      const locationWords = ['Sydney', 'Shanghai', 'Singapore', 'Malaysia', 'Hong Kong', 'Shenzhen', 'Kansas City', 'Tibet', 'Essaouira', 'Morocco', 'San Francisco', 'Washington', 'New York', 'London', 'Paris', 'Tokyo', 'Beijing', 'Mumbai', 'Dubai', 'Cairo'];
      
      locationWords.forEach(location => {
        const index = text.toLowerCase().indexOf(location.toLowerCase());
        if (index !== -1) {
          mockLocationEntities.push({
            name: location,
            type: 'LOCATION',
            mentions: [{
              text: {
                content: location,
                beginOffset: index
              },
              type: 'PROPER',
              probability: 0.95
            }]
          });
        }
      });

      console.log('Fallback mock locations found:', mockLocationEntities.length);
      return NextResponse.json({ entities: mockLocationEntities });
    }

  } catch (error) {
    console.error('Error in analyze-locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
} 