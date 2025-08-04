import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  try {
    console.log('API endpoint called');
    
    const { text } = await req.json();

    if (!text) {
      console.log('No text provided');
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    console.log('Analyzing text for routes (full text):', JSON.stringify(text));
    console.log('Text length:', text.length);

    // Use OpenRouter with structured outputs for reliable location detection
    const openRouterApiKey = process.env.OPENAI_API_KEY;
    
    console.log('API key found:', !!openRouterApiKey);
    
    if (!openRouterApiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    console.log('Making OpenAI API call...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: `Analyze this text for location-to-location travel routes and single location mentions. Focus on travel intentions, plans, and destinations mentioned.

Text to analyze: "${text}"`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'route_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                routes: {
                  type: 'array',
                  description: 'Array of location-to-location travel routes found in the text',
                  items: {
                    type: 'object',
                    properties: {
                      from: {
                        type: 'string',
                        description: 'Starting location name'
                      },
                      to: {
                        type: 'string',
                        description: 'Destination location name'
                      },
                      intent: {
                        type: 'string',
                        description: 'Travel intent (e.g., "travel", "visit", "move", "fly")'
                      },
                      confidence: {
                        type: 'number',
                        description: 'Confidence score between 0 and 1'
                      }
                    },
                    required: ['from', 'to', 'intent', 'confidence'],
                    additionalProperties: false
                  }
                },
                single_locations: {
                  type: 'array',
                  description: 'Array of single location mentions that are not part of a route',
                  items: {
                    type: 'object',
                    properties: {
                      location: {
                        type: 'string',
                        description: 'Location name'
                      },
                      intent: {
                        type: 'string',
                        description: 'Intent for this location (e.g., "visit", "live", "work")'
                      },
                      confidence: {
                        type: 'number',
                        description: 'Confidence score between 0 and 1'
                      }
                    },
                    required: ['location', 'intent', 'confidence'],
                    additionalProperties: false
                  }
                }
              },
              required: ['routes', 'single_locations'],
              additionalProperties: false
            }
          }
        },
        temperature: 0.1,
        max_tokens: 1000
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Return error when OpenAI API fails - no mock fallback
      return NextResponse.json({ 
        error: 'OpenAI API call failed', 
        status: response.status,
        details: errorText 
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('OpenRouter response data:', data);
    
    const analysis: RouteAnalysis = JSON.parse(data.choices[0].message.content);

    console.log('Route analysis result:', analysis);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Route analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze routes' }, { status: 500 });
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