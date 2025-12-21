import crypto from 'node:crypto';
import { getRepository } from '../repositories/index.js';
import { publishObligationEvent } from '../events/kafkaPublisher.js';
import {
  validateObligationPayload,
  validateStatus,
  validateRepaymentPayload
} from '../validation/obligationValidators.js';

function buildError(message, details, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

async function emitEvent(eventType, payload) {
  try {
    await publishObligationEvent(eventType, {
      eventId: crypto.randomUUID(),
      ...payload
    });
  } catch (error) {
    console.error('Failed to publish obligation event', error);
  }
}

export async function createObligation(payload = {}) {
  const errors = validateObligationPayload(payload);
  if (errors.length) {
    throw buildError('Invalid obligation payload', errors);
  }
  const repository = getRepository();
  const obligation = await repository.create({
    obligationId: payload.obligationId || crypto.randomUUID(),
    institutionId: payload.institutionId,
    entityId: payload.entityId,
    productType: payload.productType,
    status: payload.status || 'active',
    principalAmount: payload.principalAmount,
    currency: payload.currency,
    interestRate: payload.interestRate,
    disbursedAt: payload.disbursedAt,
    maturityDate: payload.maturityDate,
    collateral: payload.collateral,
    purpose: payload.purpose
  });
  await emitEvent('obligation.created', {
    obligationId: obligation.obligationId,
    entityId: obligation.entityId,
    institutionId: obligation.institutionId,
    status: obligation.status,
    productType: obligation.productType,
    principalAmount: obligation.principalAmount,
    currency: obligation.currency,
    disbursedAt: obligation.disbursedAt
  });
  return obligation;
}

export async function getObligationById(obligationId) {
  const repository = getRepository();
  const obligation = await repository.findById(obligationId);
  if (!obligation) {
    throw buildError('Obligation not found', [], 404);
  }
  return obligation;
}

export async function updateObligationStatus(obligationId, status) {
  const errors = validateStatus(status);
  if (errors.length) {
    throw buildError('Invalid status payload', errors);
  }
  const repository = getRepository();
  const updated = await repository.updateStatus(obligationId, status);
  if (!updated) {
    throw buildError('Obligation not found', [], 404);
  }
  await emitEvent('obligation.status_updated', {
    obligationId: updated.obligationId,
    entityId: updated.entityId,
    institutionId: updated.institutionId,
    status: updated.status
  });
  return updated;
}

export async function recordRepayment(obligationId, payload = {}) {
  const errors = validateRepaymentPayload(payload);
  if (errors.length) {
    throw buildError('Invalid repayment payload', errors);
  }
  const repository = getRepository();
  const obligation = await repository.findById(obligationId);
  if (!obligation) {
    throw buildError('Obligation not found', [], 404);
  }
  const repayment = await repository.addRepayment(obligationId, {
    amount: payload.amount,
    paymentDate: payload.paymentDate,
    currency: payload.currency || obligation.currency,
    channel: payload.channel
  });
  await emitEvent('obligation.repayment_recorded', {
    obligationId: obligationId,
    entityId: obligation.entityId,
    institutionId: obligation.institutionId,
    amount: repayment.amount,
    paymentDate: repayment.paymentDate,
    currency: repayment.currency,
    channel: repayment.channel
  });
  return repayment;
}

export async function listObligations(query = {}) {
  const repository = getRepository();
  const limit = query.limit ? Number(query.limit) : 50;
  const offset = query.offset ? Number(query.offset) : 0;
  return repository.list({
    entityId: query.entityId,
    institutionId: query.institutionId,
    limit,
    offset
  });
}

export async function listRepayments(query = {}) {
  const repository = getRepository();
  const limit = query.limit ? Number(query.limit) : 25;
  const offset = query.offset ? Number(query.offset) : 0;
  return repository.listRepayments({
    obligationId: query.obligationId,
    institutionId: query.institutionId,
    limit,
    offset
  });
}
