import crypto from 'node:crypto';
import { getInstitutionRepository } from '../repositories/index.js';
import { validateInstitutionPayload } from '../validation/institutionValidators.js';

function buildError(message, details = [], statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

export async function createInstitution(payload = {}) {
  const errors = validateInstitutionPayload(payload);
  if (errors.length) {
    throw buildError('Invalid institution payload', errors);
  }
  const repository = getInstitutionRepository();
  return repository.create({
    institutionId: payload.institutionId && payload.institutionId.trim() ? payload.institutionId : crypto.randomUUID(),
    name: payload.name.trim(),
    shortCode: payload.shortCode.trim(),
    institutionType: payload.institutionType.trim(),
    contactEmail: payload.contactEmail.trim(),
    contactPhone: payload.contactPhone || null,
    status: payload.status || 'active'
  });
}

export async function listInstitutions() {
  const repository = getInstitutionRepository();
  return repository.list();
}

export async function updateInstitution(institutionId, payload = {}) {
  const errors = validateInstitutionPayload(payload);
  if (errors.length) {
    throw buildError('Invalid institution payload', errors);
  }
  const repository = getInstitutionRepository();
  const updated = await repository.update(institutionId, {
    name: payload.name.trim(),
    shortCode: payload.shortCode.trim(),
    institutionType: payload.institutionType.trim(),
    contactEmail: payload.contactEmail.trim(),
    contactPhone: payload.contactPhone || null,
    status: payload.status || 'active'
  });
  if (!updated) {
    throw buildError('Institution not found', [], 404);
  }
  return updated;
}

export async function deleteInstitution(institutionId) {
  const repository = getInstitutionRepository();
  const deleted = await repository.delete(institutionId);
  if (!deleted) {
    throw buildError('Institution not found', [], 404);
  }
}
