import http from 'node:http';
import { URL } from 'node:url';
import { handleObligationSubmission, handlePaymentSubmission, handleGetSubmission } from '../controllers/submissionsController.js';
import { authorizeRequest } from '../middleware/auth.js';

const routes = [
  { method: 'POST', pattern: /^\/v1\/submissions\/obligations$/, handler: handleObligationSubmission },
  { method: 'POST', pattern: /^\/v1\/submissions\/payments$/, handler: handlePaymentSubmission },
  { method: 'GET', pattern: /^\/v1\/submissions\/(.+)$/, handler: handleGetSubmission }
];

function matchRoute(method, pathname) {
  return routes.find((route) => route.method === method && route.pattern.test(pathname));
}

async function readJsonBody(req) {
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
  } catch (error) {
    const err = new Error('Invalid JSON payload');
    err.statusCode = 400;
    throw err;
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const { method } = req;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = matchRoute(method, url.pathname);

    if (!route) {
      sendJson(res, 404, { code: 'not_found', message: 'Route not found' });
      return;
    }

    const authResult = authorizeRequest(req);
    if (!authResult.authorized) {
      const statusCode = authResult.reason === 'missing_api_key' ? 401 : 403;
      sendJson(res, statusCode, { code: authResult.reason, message: 'Unauthorized request' });
      return;
    }

    try {
      const params = {};
      if (route.pattern.source.includes('(.+)')) {
        const match = url.pathname.match(route.pattern);
        if (match && match[1]) {
          params.id = match[1];
        }
      }

      const body = method === 'POST' ? await readJsonBody(req) : undefined;
      const result = await route.handler({ req, res, body, params });

      if (!res.writableEnded) {
        sendJson(res, result?.statusCode ?? 200, result?.body ?? {});
      }
    } catch (error) {
      if (error.statusCode) {
        sendJson(res, error.statusCode, { code: error.code ?? 'invalid_request', message: error.message });
        return;
      }
      console.error('Unhandled server error', error);
      sendJson(res, 500, { code: 'server_error', message: 'Unexpected error' });
    }
  });
}
