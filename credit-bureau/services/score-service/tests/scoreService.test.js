import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryScoreRepository } from '../src/repositories/inMemoryRepository.js';
import { overrideRepository } from '../src/repositories/index.js';
import { recalculateScore, getScoreByEntity } from '../src/services/scoreService.js';

test.beforeEach(() => {
  overrideRepository(new InMemoryScoreRepository());
});

test('recalculate score stores new record', async () => {
  const result = await recalculateScore({
    entityId: '11111111-1111-1111-1111-111111111111',
    modelVersion: 'v1',
    factors: { derogatoryEvents: 1, positiveHistory: 2 }
  });
  assert.equal(result.entityId, '11111111-1111-1111-1111-111111111111');
});

test('get score returns latest calculation', async () => {
  const entityId = '22222222-2222-2222-2222-222222222222';
  await recalculateScore({ entityId, modelVersion: 'v1', factors: { derogatoryEvents: 0 } });
  const score = await getScoreByEntity(entityId);
  assert.equal(score.entityId, entityId);
});

test('get score throws when missing', async () => {
  await assert.rejects(() => getScoreByEntity('missing'), { message: 'Score not found' });
});
