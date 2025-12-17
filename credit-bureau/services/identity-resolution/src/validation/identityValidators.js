export function validateResolvePayload(payload = {}) {
  const errors = [];
  if (!Array.isArray(payload.identifiers) || payload.identifiers.length === 0) {
    errors.push('identifiers must be a non-empty array');
  }
  payload.identifiers?.forEach((identifier, index) => {
    if (!identifier?.type || !identifier?.value) {
      errors.push(`identifiers[${index}] requires type and value`);
    }
  });
  return errors;
}

export function validateFlagPayload(payload = {}) {
  const errors = [];
  if (!payload.code) {
    errors.push('code is required');
  }
  if (!payload.description) {
    errors.push('description is required');
  }
  return errors;
}

export function validateClusterDecisionPayload(payload = {}) {
  const errors = [];
  if (!payload.decision) {
    errors.push('decision is required');
  }
  if (!payload.rationale) {
    errors.push('rationale is required');
  }
  return errors;
}
