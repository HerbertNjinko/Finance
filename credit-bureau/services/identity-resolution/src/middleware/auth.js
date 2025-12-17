import { config } from '../config.js';

export function authorizeRequest(req) {
  if (!config.auth.enabled) {
    return { authorized: true };
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return { authorized: false, reason: 'missing_api_key' };
  }
  if (!config.auth.apiKeys.includes(apiKey)) {
    return { authorized: false, reason: 'invalid_api_key' };
  }
  return { authorized: true };
}
