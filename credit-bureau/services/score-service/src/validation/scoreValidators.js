export function validateRecalcPayload(payload = {}) {
  const errors = [];
  if (!payload.entityId) errors.push('entityId is required');
  if (!payload.modelVersion) errors.push('modelVersion is required');
  if (payload.factors && typeof payload.factors !== 'object') {
    errors.push('factors must be an object');
  }
  return errors;
}
