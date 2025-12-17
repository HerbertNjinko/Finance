import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryObligationRepository } from '../src/repositories/inMemoryRepository.js';
import { overrideRepository } from '../src/repositories/index.js';
import {
  createObligation,
  getObligationById,
  updateObligationStatus,
  recordRepayment,
  listObligations
} from '../src/services/obligationService.js';

test.beforeEach(() => {
  const repo = new InMemoryObligationRepository();
  overrideRepository(repo);
});

test('create and fetch obligation', async () => {
  const created = await createObligation({
    institutionId: '11111111-1111-1111-1111-111111111111',
    entityId: '22222222-2222-2222-2222-222222222222',
    productType: 'installment_loan',
    principalAmount: 100000,
    currency: 'XAF',
    disbursedAt: '2024-05-01'
  });

  assert.equal(created.status, 'active');

  const fetched = await getObligationById(created.obligationId);
  assert.equal(fetched.obligationId, created.obligationId);
});

test('status update', async () => {
  const created = await createObligation({
    institutionId: '111',
    entityId: '222',
    productType: 'credit_card',
    principalAmount: 50000,
    currency: 'XAF',
    disbursedAt: '2024-01-01'
  });

  const updated = await updateObligationStatus(created.obligationId, 'defaulted');
  assert.equal(updated.status, 'defaulted');
});

test('record repayment', async () => {
  const created = await createObligation({
    institutionId: '111',
    entityId: '222',
    productType: 'credit_card',
    principalAmount: 30000,
    currency: 'XAF',
    disbursedAt: '2024-03-01'
  });

  const repayment = await recordRepayment(created.obligationId, {
    amount: 5000,
    paymentDate: '2024-04-01',
    channel: 'bank_transfer'
  });

  assert.equal(repayment.amount, 5000);
});

test('list obligations filters by entity', async () => {
  await createObligation({
    institutionId: 'bank-1',
    entityId: 'A',
    productType: 'loan',
    principalAmount: 10000,
    currency: 'XAF',
    disbursedAt: '2024-01-01'
  });
  await createObligation({
    institutionId: 'bank-1',
    entityId: 'B',
    productType: 'loan',
    principalAmount: 20000,
    currency: 'XAF',
    disbursedAt: '2024-01-01'
  });

  const result = await listObligations({ entityId: 'A' });
  assert.equal(result.total, 1);
});
