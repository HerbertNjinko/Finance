import http from 'node:http';
import { authorize } from '../middleware/auth.js';
import { config } from '../config.js';

const routes = [
  { prefix: '/ingestion', upstream: 'ingestion' },
  { prefix: '/identities', upstream: 'identity' },
  { prefix: '/identity-clusters', upstream: 'identity' },
  { prefix: '/obligations', upstream: 'obligation' },
  { prefix: '/scores', upstream: 'score' },
  { prefix: '/notifications', upstream: 'notification' },
  { prefix: '/disputes', upstream: 'dispute' }
];

function findRoute(pathname) {
  return routes.find((route) => pathname.startsWith(route.prefix));
}

function buildTargetUrl(route, originalUrl) {
  const { prefix } = route;
  const upstream = config.upstreams[route.upstream];
  const trimmed = originalUrl.slice(prefix.length) || '';
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${upstream.baseUrl}${normalized}`;
}

function buildHeaders(route) {
  const upstream = config.upstreams[route.upstream];
  const headers = {
    'content-type': 'application/json',
    'x-api-key': upstream.apiKey
  };
  return headers;
}

async function proxyRequest(req, res, route) {
  const targetUrl = buildTargetUrl(route, req.url);
  const upstreamHeaders = buildHeaders(route);
  const bodyChunks = [];
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    for await (const chunk of req) {
      bodyChunks.push(chunk);
    }
  }
  const body = bodyChunks.length ? Buffer.concat(bodyChunks) : undefined;
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: upstreamHeaders,
    body
  });
  const respBody = await response.arrayBuffer();
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(respBody));
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const auth = authorize(req);
    if (!auth.authorized) {
      const status = auth.reason === 'missing_api_key' ? 401 : 403;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: auth.reason, message: 'Unauthorized request' }));
      return;
    }

    const route = findRoute(new URL(req.url, `http://${req.headers.host}`).pathname);
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'not_found', message: 'Route not configured' }));
      return;
    }

    try {
      await proxyRequest(req, res, route);
    } catch (error) {
      console.error('Gateway proxy error', error);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'bad_gateway', message: 'Upstream error' }));
    }
  });
}
