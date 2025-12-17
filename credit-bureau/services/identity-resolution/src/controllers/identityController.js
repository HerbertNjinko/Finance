import {
  resolveIdentity,
  getIdentity,
  flagIdentity,
  getCluster,
  submitClusterDecision
} from '../services/identityService.js';

export async function resolveIdentityHandler({ body }) {
  return resolveIdentity(body);
}

export async function getIdentityHandler({ params }) {
  const entity = await getIdentity(params[0]);
  return {
    statusCode: 200,
    body: entity
  };
}

export async function flagIdentityHandler({ params, body }) {
  const flag = await flagIdentity(params[0], body);
  return {
    statusCode: 201,
    body: flag
  };
}

export async function getClusterHandler({ params }) {
  const cluster = await getCluster(params[0]);
  return {
    statusCode: 200,
    body: cluster
  };
}

export async function submitClusterDecisionHandler({ params, body }) {
  const cluster = await submitClusterDecision(params[0], body);
  return {
    statusCode: 200,
    body: cluster
  };
}
