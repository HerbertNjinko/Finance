import crypto from 'node:crypto';
import { config } from '../config.js';

function base64UrlDecode(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function verifyJwt(token) {
  if (!token) return { valid: false };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false };
  const [headerB64, payloadB64, signatureB64] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return { valid: false };
  }
  if (header.alg !== 'HS256') return { valid: false };
  const hmac = crypto.createHmac('sha256', config.auth.jwtSecret);
  hmac.update(`${headerB64}.${payloadB64}`);
  const expected = hmac.digest('base64url');
  if (expected !== signatureB64) return { valid: false };
  if (payload.exp && Date.now() / 1000 > payload.exp) return { valid: false };
  return { valid: true, payload };
}

export function authorize(req) {
  if (!config.auth.enabled) return { authorized: true };

  // Allow auth service routes to be accessed without pre-auth; the auth service enforces its own.
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/auth')) return { authorized: true };

  const apiKey = req.headers['x-api-key'];
  if (apiKey && config.auth.apiKeys.includes(apiKey)) {
    return { authorized: true, principal: { type: 'api_key' } };
  }

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token) {
      const jwtResult = verifyJwt(token);
      if (jwtResult.valid) {
        return {
          authorized: true,
          principal: {
            type: 'jwt',
            userId: jwtResult.payload.sub,
            role: jwtResult.payload.role,
            institutionId: jwtResult.payload.institutionId || null
          }
        };
      }
    }
  }

  return { authorized: false, reason: apiKey ? 'invalid_api_key_or_token' : 'missing_credentials' };
}
