import crypto from 'node:crypto';
import { getRepository } from '../repositories/index.js';
import { validateCreatePayload, validateUpdatePayload } from '../validation/disputeValidators.js';
import { publishDisputeEvent } from '../events/disputePublisher.js';

function buildError(message, details = [], statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

async function emitEvent(eventType, dispute) {
  try {
    await publishDisputeEvent(eventType, {
      eventId: crypto.randomUUID(),
      disputeId: dispute.disputeId,
      entityId: dispute.entityId,
      obligationId: dispute.obligationId,
      status: dispute.status,
      reason: dispute.reason,
      borrowerName: dispute.borrowerName ?? null,
      resolutionSummary: dispute.resolutionSummary ?? null
    });
  } catch (error) {
    console.error('Failed to publish dispute event', error);
  }
}

export async function createDispute(payload = {}) {
  const errors = validateCreatePayload(payload);
  if (errors.length) {
    throw buildError('Invalid dispute payload', errors);
  }
  const repository = getRepository();
  const dispute = await repository.create({
    disputeId: payload.disputeId || crypto.randomUUID(),
    entityId: payload.entityId,
    obligationId: payload.obligationId,
    submittedBy: payload.submittedBy,
    channel: payload.channel,
    reason: payload.reason,
    dueAt: payload.dueAt,
    status: payload.status || 'open'
  });
  await emitEvent('dispute.created', dispute);
  return dispute;
}

export async function getDisputeById(disputeId) {
  const repository = getRepository();
  const dispute = await repository.findById(disputeId);
  if (!dispute) {
    throw buildError('Dispute not found', [], 404);
  }
  return dispute;
}

export async function updateDispute(disputeId, payload = {}) {
  const errors = validateUpdatePayload(payload);
  if (errors.length) {
    throw buildError('Invalid dispute update payload', errors);
  }
  const repository = getRepository();
  const updated = await repository.update(disputeId, {
    status: payload.status,
    resolutionSummary: payload.resolutionSummary,
    dueAt: payload.dueAt
  });
  if (!updated) {
    throw buildError('Dispute not found', [], 404);
  }
  await emitEvent('dispute.updated', updated);
  return updated;
}

export async function listDisputes(query = {}) {
  const repository = getRepository();
  return repository.list({ entityId: query.entityId, status: query.status });
}
