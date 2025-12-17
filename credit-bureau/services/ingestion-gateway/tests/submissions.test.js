import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createObligationSubmission,
  createPaymentSubmission,
  getSubmissionById
} from '../src/services/submissionService.js';
import { InMemorySubmissionRepository } from '../src/store/memoryStore.js';
import { overrideSubmissionRepository } from '../src/store/index.js';

test.beforeEach(() => {
  const repository = new InMemorySubmissionRepository();
  overrideSubmissionRepository(repository);
});

test('obligation submission succeeds and can be retrieved', async () => {
  const payload = {
    institutionId: '11111111-1111-1111-1111-111111111111',
    batchReference: 'BATCH-001',
    records: [
      {
        referenceId: 'OBL-1',
        entity: { entityId: '22222222-2222-2222-2222-222222222222' },
        obligation: {
          productType: 'installment_loan',
          principalAmount: 500000,
          currency: 'XAF'
        }
      }
    ]
  };

  const submission = await createObligationSubmission(payload);
  assert.equal(submission.acceptedRecords, 1);
  assert.equal(submission.rejectedRecords, 0);

  const stored = await getSubmissionById(submission.submissionId);
  assert.equal(stored.records.length, 1);
});

test('invalid obligation submission throws validation error', async () => {
  await assert.rejects(() => createObligationSubmission({}), {
    message: 'Invalid obligation submission payload'
  });
});

test('payment submission rejects invalid records but accepts valid ones', async () => {
  const payload = {
    institutionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    batchReference: 'PAY-01',
    records: [
      {
        referenceId: 'PAY-OK',
        obligationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        amount: 10000,
        paymentDate: '2024-05-01'
      },
      {
        referenceId: 'PAY-BAD',
        obligationId: '',
        amount: -10,
        paymentDate: null
      }
    ]
  };

  const submission = await createPaymentSubmission(payload);
  assert.equal(submission.acceptedRecords, 1);
  assert.equal(submission.rejectedRecords, 1);
});

test('lookup missing submission throws 404 error', async () => {
  await assert.rejects(() => getSubmissionById('unknown'), {
    message: 'Submission not found'
  });
});
