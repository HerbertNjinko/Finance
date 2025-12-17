import http from 'node:http';
import { URL } from 'node:url';
import { authorizeRequest } from '../middleware/auth.js';
import {
  resolveIdentityHandler,
  getIdentityHandler,
  flagIdentityHandler,
  getClusterHandler,
  submitClusterDecisionHandler
} from '../controllers/identityController.js';

const routes = [
  { method: 'POST', pattern: /^\/v1\/identities\/resolve$/, handler: resolveIdentityHandler },
  { method: 'GET', pattern: /^\/v1\/identities\/([0-9a-fA-F-]{36})$/, handler: getIdentityHandler },
  { method: 'POST', pattern: /^\/v1\/identities\/([0-9a-fA-F-]{36})\/flags$/, handler: flagIdentityHandler },
  { method: 'GET', pattern: /^\/v1\/identity-clusters\/([0-9a-fA-F-]{36})$/, handler: getClusterHandler },
  {
    method: 'POST',
    pattern: /^\/v1\/identity-clusters\/([0-9a-fA-F-]{36})\/decisions$/,
    handler: submitClusterDecisionHandler
  }
];

const jsonResponse = (res, statusCode, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
};

async function parseJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Invalid JSON payload');
    error.statusCode = 400;
    throw error;
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));

    if (!route) {
      jsonResponse(res, 404, { code: 'not_found', message: 'Route not found' });
      return;
    }

    const authResult = authorizeRequest(req);
    if (!authResult.authorized) {
      const status = authResult.reason === 'missing_api_key' ? 401 : 403;
      jsonResponse(res, status, { code: authResult.reason, message: 'Unauthorized request' });
      return;
    }

    try {
      const match = url.pathname.match(route.pattern);
      const params = match?.slice(1) ?? [];
      const body = req.method === 'POST' ? await parseJson(req) : undefined;
      const result = await route.handler({ body, params, req });
      if (!res.writableEnded) {
        jsonResponse(res, result?.statusCode ?? 200, result?.body ?? {});
      }
    } catch (error) {
      if (error.statusCode) {
        jsonResponse(res, error.statusCode, {
          code: error.code ?? 'invalid_request',
          message: error.message,
          details: error.details
        });
        return;
      }
      console.error('Identity service error', error);
      jsonResponse(res, 500, { code: 'server_error', message: 'Unexpected error' });
    }
  });
}
