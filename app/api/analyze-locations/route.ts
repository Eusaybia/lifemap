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

    // For now, let's create a mock response to test the functionality
    // TODO: Replace with actual Google Cloud API call once authentication is resolved
    
    // Mock location detection for common city names
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

    console.log('Mock locations found:', mockLocationEntities.length);

    return NextResponse.json({ entities: mockLocationEntities });

    /* 
    // Commented out Google Cloud API call until authentication is resolved
    try {
      // Import the Google Cloud client library inside the function
      const { LanguageServiceClient } = require('@google-cloud/language').v2;
      
      // Create client with explicit project ID
      const client = new LanguageServiceClient({
        projectId: 'eusaybia-lifemap',
      });

      console.log('Google Cloud client created successfully');

      const document = {
        content: text,
        type: 'PLAIN_TEXT',
      };

      console.log('Calling Google Cloud Natural Language API...');

      // Detects entities in the document
      const [result] = await client.analyzeEntities({ 
        document,
        encodingType: 'UTF8'
      });
      
      console.log('API call successful, entities found:', result.entities?.length || 0);

      const entities = result.entities || [];

      // Filter for locations with high confidence
      const locations = entities.filter((entity: any) => 
        entity.type === 'LOCATION' &&
        entity.mentions?.[0]?.probability > 0.7
      );

      console.log('Filtered locations:', locations.length);

      return NextResponse.json({ entities: locations });
    } catch (apiError) {
      console.error('Google Cloud API error:', apiError);
      // Fall back to mock response
      return NextResponse.json({ entities: mockLocationEntities });
    }
    */

  } catch (error) {
    console.error('Detailed error in analyze-locations:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({ 
      error: 'Failed to analyze entities', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 