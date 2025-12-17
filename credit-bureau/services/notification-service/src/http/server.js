import http from 'node:http';
import { URL } from 'node:url';
import { authorize } from '../middleware/auth.js';
import {
  createTemplateHandler,
  listTemplatesHandler,
  sendNotificationHandler
} from '../controllers/notificationController.js';

const routes = [
  { method: 'GET', pattern: /^\/v1\/notification-templates$/, handler: listTemplatesHandler },
  { method: 'POST', pattern: /^\/v1\/notification-templates$/, handler: createTemplateHandler },
  { method: 'POST', pattern: /^\/v1\/notifications$/, handler: sendNotificationHandler }
];

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('Invalid JSON payload');
    err.statusCode = 400;
    throw err;
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

    const auth = authorize(req);
    if (!auth.authorized) {
      const status = auth.reason === 'missing_api_key' ? 401 : 403;
      jsonResponse(res, status, { code: auth.reason, message: 'Unauthorized' });
      return;
    }

    try {
      const body = await parseBody(req);
      const result = await route.handler({ body });
      jsonResponse(res, result?.statusCode ?? 200, result?.body ?? {});
    } catch (error) {
      if (error.statusCode) {
        jsonResponse(res, error.statusCode, { code: 'invalid_request', message: error.message, details: error.details });
        return;
      }
      console.error('Notification service error', error);
      jsonResponse(res, 500, { code: 'server_error', message: 'Unexpected error' });
    }
  });
}
