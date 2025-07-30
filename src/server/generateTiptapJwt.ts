import jwt from 'jsonwebtoken'

/**
 * Generate a short-lived JWT for Tiptap Content AI.
 *
 * NOTE: Keep the Content AI secret **only** on the server!
 */
export const generateTiptapJwt = () => {
  const secret = process.env.TIPTAP_APP_SECRET
  if (!secret) {
    throw new Error('Missing TIPTAP_APP_SECRET env variable')
  }
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  }
  return jwt.sign(payload, secret, { algorithm: 'HS256' })
} 