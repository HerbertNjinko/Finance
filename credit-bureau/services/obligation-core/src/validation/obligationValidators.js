export function validateObligationPayload(payload = {}) {
  const errors = [];
  if (!payload.institutionId) errors.push('institutionId is required');
  if (!payload.entityId) errors.push('entityId is required');
  if (!payload.productType) errors.push('productType is required');
  if (typeof payload.principalAmount !== 'number') errors.push('principalAmount must be numeric');
  if (!payload.currency) errors.push('currency is required');
  if (!payload.disbursedAt) errors.push('disbursedAt is required');
  return errors;
}

export function validateStatus(status) {
  const allowed = ['active', 'closed', 'defaulted', 'written_off'];
  if (!allowed.includes(status)) {
    return [`status must be one of ${allowed.join(', ')}`];
  }
  return [];
}

export function validateRepaymentPayload(payload = {}) {
  const errors = [];
  if (typeof payload.amount !== 'number' || payload.amount <= 0) errors.push('amount must be positive number');
  if (!payload.paymentDate) errors.push('paymentDate is required');
  if (!payload.channel) errors.push('channel is required');
  return errors;
}
