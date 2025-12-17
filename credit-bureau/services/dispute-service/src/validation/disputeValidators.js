export function validateCreatePayload(payload = {}) {
  const errors = [];
  if (!payload.entityId) errors.push('entityId is required');
  if (!payload.reason) errors.push('reason is required');
  if (!payload.channel) errors.push('channel is required');
  return errors;
}

export function validateUpdatePayload(payload = {}) {
  const errors = [];
  if (!payload.status && !payload.resolutionSummary) {
    errors.push('status or resolutionSummary must be provided');
  }
  return errors;
}
