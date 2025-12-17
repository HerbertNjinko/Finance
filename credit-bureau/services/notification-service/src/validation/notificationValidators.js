export function validateTemplatePayload(payload = {}) {
  const errors = [];
  if (!payload.name) errors.push('name is required');
  if (!payload.channel) errors.push('channel is required');
  if (!payload.locale) errors.push('locale is required');
  if (!payload.body) errors.push('body is required');
  return errors;
}

export function validateNotificationPayload(payload = {}) {
  const errors = [];
  if (!payload.templateId && !payload.body) errors.push('templateId or body is required');
  if (!payload.destination) errors.push('destination is required');
  if (!payload.channel) errors.push('channel is required');
  return errors;
}
