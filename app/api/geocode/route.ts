import { NextRequest, NextResponse } from 'next/server';

interface LocationCoordinates {
  location: string;
  latitude: number;
  longitude: number;
  country: string;
  confidence: number;
}

interface GeocodeResponse {
  coordinates: LocationCoordinates | null;
}

export async function POST(req: NextRequest) {
  try {
    const { location } = await req.json();
    
    if (!location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    console.log('🌍 Geocoding location:', location);

    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Get the geographic coordinates for this location: "${location}". Return the most likely/prominent location if there are multiple matches (e.g., for "Auckland" return Auckland, New Zealand).`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'geocode_response',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                coordinates: {
                  type: 'object',
                  properties: {
                    location: {
                      type: 'string',
                      description: 'Standardized location name'
                    },
                    latitude: {
                      type: 'number',
                      description: 'Latitude coordinate'
                    },
                    longitude: {
                      type: 'number',
                      description: 'Longitude coordinate'
                    },
                    country: {
                      type: 'string',
                      description: 'Country name'
                    },
                    confidence: {
                      type: 'number',
                      description: 'Confidence score between 0 and 1'
                    }
                  },
                  required: ['location', 'latitude', 'longitude', 'country', 'confidence'],
                  additionalProperties: false
                }
              },
              required: ['coordinates'],
              additionalProperties: false
            }
          }
        },
        temperature: 0.1,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI geocoding API error:', response.status, errorText);
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
    }

    const data = await response.json();
    const result: GeocodeResponse = JSON.parse(data.choices[0].message.content);

    console.log('📍 Geocoded result:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Failed to geocode location' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 