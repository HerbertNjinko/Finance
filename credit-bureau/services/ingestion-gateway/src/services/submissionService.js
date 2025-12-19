import crypto from 'node:crypto';
import { getSubmissionRepository } from '../store/index.js';
import { persistObligations } from '../processors/obligationWriter.js';
import { persistPayments } from '../processors/paymentWriter.js';
import { validateSubmissionEnvelope, validateObligationRecord, validatePaymentRecord } from '../validation/validators.js';
import { publishSubmission } from '../clients/kafkaClient.js';

function normalizeEnvelope(payload, submissionType) {
  const submissionId = payload.submissionId || crypto.randomUUID();
  return {
    submissionId,
    submissionType,
    institutionId: payload.institutionId,
    batchReference: payload.batchReference,
    receivedAt: new Date().toISOString(),
    status: 'received',
    records: []
  };
}

function buildRecord(recordPayload, validator) {
  const errors = validator(recordPayload);
  return {
    recordId: crypto.randomUUID(),
    referenceId: recordPayload.referenceId,
    payload: recordPayload,
    status: errors.length ? 'rejected' : 'accepted',
    errors
  };
}

async function persistAndNotify(submission) {
  const repository = getSubmissionRepository();
  await repository.saveSubmission(submission);
  await publishSubmission(submission).catch((error) => {
    console.error('Failed to publish submission to Kafka', error);
  });
  return submission;
}

export async function createObligationSubmission(payload = {}) {
  const envelopeErrors = validateSubmissionEnvelope(payload);
  if (envelopeErrors.length) {
    const error = new Error('Invalid obligation submission payload');
    error.statusCode = 400;
    error.details = envelopeErrors;
    throw error;
  }
  const submission = normalizeEnvelope(payload, 'obligations');
  submission.records = payload.records.map((record) => buildRecord(record, validateObligationRecord));
  submission.acceptedRecords = submission.records.filter((r) => r.status === 'accepted').length;
  submission.rejectedRecords = submission.records.length - submission.acceptedRecords;
  const persisted = await persistAndNotify(submission);
  await persistObligations(persisted).catch((error) => {
    console.error('Failed to propagate obligations from submission', error);
  });
  return persisted;
}

export async function createPaymentSubmission(payload = {}) {
  const envelopeErrors = validateSubmissionEnvelope(payload);
  if (envelopeErrors.length) {
    const error = new Error('Invalid payment submission payload');
    error.statusCode = 400;
    error.details = envelopeErrors;
    throw error;
  }
  const submission = normalizeEnvelope(payload, 'payments');
  submission.records = payload.records.map((record) => buildRecord(record, validatePaymentRecord));
  submission.acceptedRecords = submission.records.filter((r) => r.status === 'accepted').length;
  submission.rejectedRecords = submission.records.length - submission.acceptedRecords;
  const persisted = await persistAndNotify(submission);
  await persistPayments(persisted).catch((error) => {
    console.error('Failed to persist payments from submission', error);
  });
  return persisted;
}

export async function getSubmissionById(submissionId) {
  const repository = getSubmissionRepository();
  const submission = await repository.getSubmissionById(submissionId);
  if (!submission) {
    const error = new Error('Submission not found');
    error.statusCode = 404;
    throw error;
  }
  return submission;
}
