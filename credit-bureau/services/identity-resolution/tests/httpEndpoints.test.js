import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { createServer } from '../src/http/server.js';
import { overrideIdentityStore } from '../src/store/index.js';
import { InMemoryIdentityStore } from '../src/store/memoryStore.js';

class MockRequest extends Readable {
  constructor({ method, path, headers, body }) {
    super();
    this.method = method;
    this.url = path;
    this.headers = headers;
    this.bodyBuffer = body ? Buffer.from(body) : null;
  }

  _read() {
    if (this.bodyBuffer) {
      this.push(this.bodyBuffer);
      this.bodyBuffer = null;
    } else {
      this.push(null);
    }
  }
}

class MockResponse extends Writable {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.chunks = [];
  }

  writeHead(statusCode, headers) {
    this.statusCode = statusCode;
    this.headers = headers;
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }

  end(chunk) {
    if (chunk) {
      this.chunks.push(Buffer.from(chunk));
    }
    this.emit('finish');
  }

  get body() {
    const raw = Buffer.concat(this.chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
  }
}

async function invokeRequest(server, { method, path, body }) {
  const headers = {
    host: 'identity.test',
    'content-type': 'application/json'
  };
  const req = new MockRequest({
    method,
    path,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const res = new MockResponse();
  const requestHandled = new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
  });
  server.emit('request', req, res);
  await requestHandled;
  return res;
}

test('resolve endpoint creates entity and can be fetched via GET', async () => {
  overrideIdentityStore(new InMemoryIdentityStore());
  const server = createServer();

  const resolveRes = await invokeRequest(server, {
    method: 'POST',
    path: '/v1/identities/resolve',
    body: {
      identifiers: [{ type: 'national_id', value: 'HTTP-123' }],
      attributes: { fullName: 'HTTP User' }
    }
  });

  assert.equal(resolveRes.statusCode, 200);
  const { entityId } = resolveRes.body;
  assert.ok(entityId);

  const getRes = await invokeRequest(server, {
    method: 'GET',
    path: `/v1/identities/${entityId}`
  });
  assert.equal(getRes.statusCode, 200);
  assert.equal(getRes.body.fullName, 'HTTP User');
});

test('flag endpoint returns 201 with flag payload', async () => {
  overrideIdentityStore(new InMemoryIdentityStore());
  const server = createServer();

  const resolveRes = await invokeRequest(server, {
    method: 'POST',
    path: '/v1/identities/resolve',
    body: {
      identifiers: [{ type: 'phone', value: '677-HTTP' }],
      attributes: { fullName: 'Flag Candidate' }
    }
  });
  const { entityId } = resolveRes.body;

  const flagRes = await invokeRequest(server, {
    method: 'POST',
    path: `/v1/identities/${entityId}/flags`,
    body: {
      code: 'fraud_suspected',
      description: 'HTTP test flag'
    }
  });

  assert.equal(flagRes.statusCode, 201);
  assert.equal(flagRes.body.code, 'fraud_suspected');
});
