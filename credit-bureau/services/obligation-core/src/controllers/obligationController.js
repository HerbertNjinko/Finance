import {
  createObligation,
  getObligationById,
  updateObligationStatus,
  recordRepayment,
  listObligations,
  listRepayments
} from '../services/obligationService.js';

export async function createObligationHandler({ body }) {
  const obligation = await createObligation(body);
  return { statusCode: 201, body: obligation };
}

export async function getObligationHandler({ params }) {
  const obligation = await getObligationById(params[0]);
  return { statusCode: 200, body: obligation };
}

export async function updateStatusHandler({ params, body }) {
  const obligation = await updateObligationStatus(params[0], body.status);
  return { statusCode: 200, body: obligation };
}

export async function recordRepaymentHandler({ params, body }) {
  const repayment = await recordRepayment(params[0], body);
  return { statusCode: 201, body: repayment };
}

export async function listObligationsHandler({ query }) {
  const result = await listObligations(query);
  return { statusCode: 200, body: result };
}

export async function listRepaymentsHandler({ query }) {
  const repayments = await listRepayments(query);
  return { statusCode: 200, body: { items: repayments } };
}
