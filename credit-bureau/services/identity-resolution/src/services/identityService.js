import crypto from 'node:crypto';
import { getIdentityStore } from '../store/index.js';
import {
  validateResolvePayload,
  validateFlagPayload,
  validateClusterDecisionPayload
} from '../validation/identityValidators.js';

function buildError(message, errors) {
  const err = new Error(message);
  err.statusCode = 400;
  err.details = errors;
  return err;
}

export async function resolveIdentity(payload = {}) {
  const validationErrors = validateResolvePayload(payload);
  if (validationErrors.length) {
    throw buildError('Invalid resolve request', validationErrors);
  }

  const store = getIdentityStore();
  const matchedEntities = new Map();

  for (const identifier of payload.identifiers) {
    const existing = await store.findEntityByIdentifier(identifier.type, identifier.value);
    if (existing) {
      matchedEntities.set(existing.entityId, existing);
    }
  }

  if (matchedEntities.size > 1) {
    const cluster = await store.createCluster({
      confidence: 0.4,
      entities: Array.from(matchedEntities.values()).map((entity) => ({
        entityId: entity.entityId,
        matchScore: 0.4,
        attributes: { fullName: entity.fullName }
      }))
    });
    const reviewResponse = {
      statusCode: 202,
      body: {
        clusterId: cluster.clusterId,
        reason: 'multiple_entities_matched',
        slaHours: 24
      }
    };
    return reviewResponse;
  }

  if (matchedEntities.size === 1) {
    const entity = matchedEntities.values().next().value;
    await store.addIdentifiers(entity.entityId, payload.identifiers);
    return {
      statusCode: 200,
      body: {
        entityId: entity.entityId,
        confidence: 0.92,
        matchStatus: 'matched',
        clusterId: null,
        attributesMerged: payload.identifiers.map((identifier) => ({
          attribute: 'identifier',
          source: identifier.type,
          value: identifier.value
        }))
      }
    };
  }

  const entity = await store.upsertEntity({
    entityId: crypto.randomUUID(),
    entityType: payload.entityType ?? 'individual',
    fullName: payload.attributes?.fullName ?? payload.fullName ?? 'Unknown',
    dateOfBirth: payload.attributes?.dateOfBirth,
    gender: payload.attributes?.gender,
    nationality: payload.attributes?.nationality,
    primaryPhone: payload.attributes?.primaryPhone,
    primaryEmail: payload.attributes?.primaryEmail,
    address: payload.attributes?.address,
    identifiers: payload.identifiers
  });

  return {
    statusCode: 200,
    body: {
      entityId: entity.entityId,
      confidence: 0.65,
      matchStatus: 'new',
      clusterId: null,
      attributesMerged: payload.identifiers.map((identifier) => ({
        attribute: 'identifier',
        source: identifier.type,
        value: identifier.value
      }))
    }
  };
}

export async function getIdentity(entityId) {
  const store = getIdentityStore();
  const entity = await store.findEntityById(entityId);
  if (!entity) {
    const err = new Error('Entity not found');
    err.statusCode = 404;
    throw err;
  }
  return entity;
}

export async function flagIdentity(entityId, payload = {}) {
  const errors = validateFlagPayload(payload);
  if (errors.length) {
    throw buildError('Invalid flag request', errors);
  }
  const store = getIdentityStore();
  const flag = await store.addFlag(entityId, payload);
  if (!flag) {
    const err = new Error('Entity not found');
    err.statusCode = 404;
    throw err;
  }
  return flag;
}

export async function getCluster(clusterId) {
  const store = getIdentityStore();
  const cluster = await store.getCluster(clusterId);
  if (!cluster) {
    const err = new Error('Cluster not found');
    err.statusCode = 404;
    throw err;
  }
  return cluster;
}

export async function submitClusterDecision(clusterId, payload = {}) {
  const errors = validateClusterDecisionPayload(payload);
  if (errors.length) {
    throw buildError('Invalid cluster decision request', errors);
  }
  const store = getIdentityStore();
  const cluster = await store.getCluster(clusterId);
  if (!cluster) {
    const err = new Error('Cluster not found');
    err.statusCode = 404;
    throw err;
  }
  if (cluster.resolutionStatus !== 'pending_review') {
    const err = new Error('Cluster already decided');
    err.statusCode = 409;
    throw err;
  }

  const resolvedEntities = payload.updates?.map((update) => ({
    entityId: update.entityId ?? crypto.randomUUID(),
    matchScore: update.matchScore ?? 0.8,
    attributes: update.attributes ?? {}
  }));

  const updatedCluster = await store.updateClusterDecision(clusterId, {
    decision: payload.decision,
    resolvedEntities,
    rationale: payload.rationale,
    reviewer: payload.reviewer
  });

  return updatedCluster;
}
