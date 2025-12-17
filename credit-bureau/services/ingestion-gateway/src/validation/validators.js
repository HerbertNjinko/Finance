import crypto from 'node:crypto';

export function ensureUuid(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${field} is required`;
  }
  try {
    crypto.randomUUID({ disableEntropyCache: true });
  } catch {
    // noop
  }
  const uuidRegex = /^[0-9a-fA-F-]{36}$/;
  if (!uuidRegex.test(value)) {
    return `${field} must be a UUID`;
  }
  return null;
}

export function validateSubmissionEnvelope(payload = {}) {
  const errors = [];
  if (!payload.institutionId) {
    errors.push('institutionId is required');
  }
  if (!payload.batchReference) {
    errors.push('batchReference is required');
  }
  if (!Array.isArray(payload.records) || payload.records.length === 0) {
    errors.push('records must be a non-empty array');
  }
  return errors;
}

export function validateObligationRecord(record = {}) {
  const errors = [];
  if (!record.referenceId) {
    errors.push('referenceId is required');
  }
  if (!record.entity || (record.entity && !record.entity.entityId && !Array.isArray(record.entity.identifiers))) {
    errors.push('entity.entityId or entity.identifiers is required');
  }
  if (!record.obligation) {
    errors.push('obligation block is required');
  } else {
    if (!record.obligation.productType) {
      errors.push('obligation.productType is required');
    }
    if (typeof record.obligation.principalAmount !== 'number') {
      errors.push('obligation.principalAmount must be a number');
    }
    if (!record.obligation.currency) {
      errors.push('obligation.currency is required');
    }
  }
  return errors;
}

export function validatePaymentRecord(record = {}) {
  const errors = [];
  if (!record.referenceId) {
    errors.push('referenceId is required');
  }
  if (!record.obligationId) {
    errors.push('obligationId is required');
  }
  if (typeof record.amount !== 'number' || record.amount <= 0) {
    errors.push('amount must be a positive number');
  }
  if (!record.paymentDate) {
    errors.push('paymentDate is required');
  }
  return errors;
}
