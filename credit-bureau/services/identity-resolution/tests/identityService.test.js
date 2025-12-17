import test from 'node:test';
import assert from 'node:assert/strict';
import { overrideIdentityStore, getIdentityStore } from '../src/store/index.js';
import { InMemoryIdentityStore } from '../src/store/memoryStore.js';
import {
  resolveIdentity,
  getIdentity,
  flagIdentity,
  submitClusterDecision,
  getCluster
} from '../src/services/identityService.js';

test.beforeEach(() => {
  const store = new InMemoryIdentityStore();
  overrideIdentityStore(store);
});

test('resolve creates new entity when no matches exist', async () => {
  const response = await resolveIdentity({
    identifiers: [{ type: 'national_id', value: 'ABC123' }],
    attributes: { fullName: 'Jane Doe' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.matchStatus, 'new');
  const entity = await getIdentity(response.body.entityId);
  assert.equal(entity.fullName, 'Jane Doe');
});

test('resolve returns match when identifier already stored', async () => {
  const firstResponse = await resolveIdentity({
    identifiers: [{ type: 'passport', value: 'P123' }],
    attributes: { fullName: 'Alpha User' }
  });
  const secondResponse = await resolveIdentity({
    identifiers: [{ type: 'passport', value: 'P123' }],
    attributes: { fullName: 'Alpha User' }
  });

  assert.equal(secondResponse.body.matchStatus, 'matched');
  assert.equal(secondResponse.body.entityId, firstResponse.body.entityId);
});

test('resolve triggers manual review when multiple entities match', async () => {
  const store = getIdentityStore();
  await store.upsertEntity({
    entityId: '11111111-1111-1111-1111-111111111111',
    fullName: 'User One',
    identifiers: [{ type: 'national_id', value: 'ID1' }]
  });
  await store.upsertEntity({
    entityId: '22222222-2222-2222-2222-222222222222',
    fullName: 'User Two',
    identifiers: [{ type: 'passport', value: 'P2' }]
  });

  const response = await resolveIdentity({
    identifiers: [
      { type: 'national_id', value: 'ID1' },
      { type: 'passport', value: 'P2' }
    ]
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.body.reason, 'multiple_entities_matched');
});

test('flagging a known entity records flag', async () => {
  const resolveResponse = await resolveIdentity({
    identifiers: [{ type: 'phone', value: '677000111' }],
    attributes: { fullName: 'Flagged User' }
  });

  const flag = await flagIdentity(resolveResponse.body.entityId, {
    code: 'fraud_suspected',
    description: 'Manual inspection requested'
  });

  assert.equal(flag.code, 'fraud_suspected');
});

test('cluster decision updates cluster state', async () => {
  const store = getIdentityStore();
  const cluster = await store.createCluster({
    confidence: 0.4,
    entities: [
      { entityId: '111', matchScore: 0.4 },
      { entityId: '222', matchScore: 0.4 }
    ]
  });

  const updated = await submitClusterDecision(cluster.clusterId, {
    decision: 'approve_link',
    rationale: 'Same household',
    updates: [{ entityId: '111', matchScore: 0.9 }]
  });

  assert.equal(updated.resolutionStatus, 'approve_link');
  const stored = await getCluster(cluster.clusterId);
  assert.equal(stored.resolutionStatus, 'approve_link');
});
