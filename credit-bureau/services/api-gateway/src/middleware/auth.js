import jwt from 'jsonwebtoken';
import { config } from '../config.js';

function verifyJwt(token) {
  try {
    const payload = jwt.verify(token, config.auth.jwtSecret);
    return { valid: true, payload };
  } catch (err) {
    return { valid: false };
  }
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
