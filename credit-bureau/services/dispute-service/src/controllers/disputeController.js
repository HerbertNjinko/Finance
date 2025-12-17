import {
  createDispute,
  getDisputeById,
  updateDispute,
  listDisputes
} from '../services/disputeService.js';

export async function createDisputeHandler({ body }) {
  const dispute = await createDispute(body);
  return { statusCode: 201, body: dispute };
}

export async function getDisputeHandler({ params }) {
  const dispute = await getDisputeById(params[0]);
  return { statusCode: 200, body: dispute };
}

export async function updateDisputeHandler({ params, body }) {
  const dispute = await updateDispute(params[0], body);
  return { statusCode: 200, body: dispute };
}

export async function listDisputesHandler({ query }) {
  const disputes = await listDisputes(query);
  return { statusCode: 200, body: disputes };
}
