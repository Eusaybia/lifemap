import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

// Explicitly empty payload for AI JWT
const payload = {};

/**
 * Generate a short-lived JWT for Tiptap Content AI.
 *
 * NOTE: Keep the Content AI secret **only** on the server!
 */
export const getAiToken = async () => {
  const aiSecret = process.env.TIPTAP_CONTENT_AI_SECRET;

  if (!aiSecret) {
    throw new Error('Missing TIPTAP_CONTENT_AI_SECRET env variable');
  }

  const aiJwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(new TextEncoder().encode(aiSecret));

  return aiJwt;
};

// App Router API endpoint handler
export async function GET(req: NextRequest) {
  try {
    const token = await getAiToken();
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating TipTap AI token:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}