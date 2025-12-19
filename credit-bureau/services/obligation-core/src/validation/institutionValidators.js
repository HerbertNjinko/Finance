const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInstitutionPayload(payload = {}) {
  const errors = [];
  if (!payload.name || !payload.name.trim()) {
    errors.push('name is required');
  }
  if (!payload.shortCode || !payload.shortCode.trim()) {
    errors.push('shortCode is required');
  }
  if (!payload.institutionType || !payload.institutionType.trim()) {
    errors.push('institutionType is required');
  }
  if (!payload.contactEmail || !emailRegex.test(payload.contactEmail)) {
    errors.push('contactEmail must be a valid email');
  }
  return errors;
}
