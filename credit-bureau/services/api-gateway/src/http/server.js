import http from 'node:http';
import { authorize } from '../middleware/auth.js';
import { config } from '../config.js';

const routes = [
  { prefix: '/auth', upstream: 'auth' },
  { prefix: '/reports', handler: handleReports },
  { prefix: '/submissions', upstream: 'ingestion' },
  { prefix: '/identities', upstream: 'identity' },
  { prefix: '/identity-clusters', upstream: 'identity' },
  { prefix: '/obligations', upstream: 'obligation' },
  { prefix: '/repayments', upstream: 'obligation' },
  { prefix: '/institutions', upstream: 'obligation' },
  { prefix: '/scores', upstream: 'score' },
  { prefix: '/notifications', upstream: 'notification' },
  { prefix: '/disputes', upstream: 'dispute' }
];

function findRoute(pathname) {
  return routes.find((route) => pathname.startsWith(route.prefix));
}

function buildTargetUrl(route, requestUrl) {
  const upstream = config.upstreams[route.upstream];
  return `${upstream.baseUrl}${requestUrl.pathname}${requestUrl.search}`;
}

function buildHeaders(route, req) {
  const upstream = config.upstreams[route.upstream];
  const headers = {
    'content-type': 'application/json',
    'x-api-key': upstream.apiKey
  };
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization;
  }
  return headers;
}

async function proxyRequest(req, res, route, requestUrl, principal) {
  const targetUrl = buildTargetUrl(route, requestUrl);
  const upstreamHeaders = buildHeaders(route, req);
  if (principal?.type === 'jwt') {
    upstreamHeaders['x-auth-user-id'] = principal.userId || '';
    upstreamHeaders['x-auth-role'] = principal.role || '';
    if (principal.institutionId) {
      upstreamHeaders['x-auth-institution-id'] = principal.institutionId;
    }
  }
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
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const auth = authorize(req);
    if (!auth.authorized) {
      const status = auth.reason === 'missing_credentials' ? 401 : 403;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: auth.reason, message: 'Unauthorized request' }));
      return;
    }

    const route = findRoute(requestUrl.pathname);
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'not_found', message: 'Route not configured' }));
      return;
    }

    if (route.handler) {
      route.handler(req, res, requestUrl);
      return;
    }

    try {
      await proxyRequest(req, res, route, requestUrl, auth.principal);
    } catch (error) {
      console.error('Gateway proxy error', error);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'bad_gateway', message: 'Upstream error' }));
    }
  });
}

function handleReports(req, res, requestUrl) {
  if (req.method === 'GET' && requestUrl.pathname === '/reports/daily') {
    const today = new Date().toISOString().split('T')[0];
    const csv = `date,submission_batches,score_lookups,delinquent_accounts
${today},184,1284,312`;
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="daily-report-${today}.csv"`
    });
    res.end(csv);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ code: 'not_found', message: 'Report endpoint not found' }));
}
