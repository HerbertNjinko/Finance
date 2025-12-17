import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryDisputeRepository } from '../src/repositories/inMemoryRepository.js';
import { overrideRepository } from '../src/repositories/index.js';
import { createDispute, getDisputeById, updateDispute, listDisputes } from '../src/services/disputeService.js';

test.beforeEach(() => {
  overrideRepository(new InMemoryDisputeRepository());
});

test('create and fetch dispute', async () => {
  const created = await createDispute({
    entityId: '11111111-1111-1111-1111-111111111111',
    channel: 'portal',
    reason: 'Incorrect balance'
  });
  const fetched = await getDisputeById(created.disputeId);
  assert.equal(fetched.reason, 'Incorrect balance');
});

test('update dispute status', async () => {
  const created = await createDispute({
    entityId: '22222222-2222-2222-2222-222222222222',
    channel: 'branch',
    reason: 'Fraudulent account'
  });
  const updated = await updateDispute(created.disputeId, { status: 'resolved', resolutionSummary: 'Fixed' });
  assert.equal(updated.status, 'resolved');
});

test('list disputes filtered by entity', async () => {
  await createDispute({ entityId: 'A', channel: 'portal', reason: 'Test' });
  await createDispute({ entityId: 'B', channel: 'portal', reason: 'Test' });
  const list = await listDisputes({ entityId: 'A' });
  assert.equal(list.total, 1);
});
