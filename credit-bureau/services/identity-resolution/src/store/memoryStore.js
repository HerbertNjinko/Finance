import crypto from 'node:crypto';

export class InMemoryIdentityStore {
  constructor() {
    this.entities = new Map(); // entityId -> entity
    this.identifiers = new Map(); // `${type}:${value}` -> entityId
    this.clusters = new Map(); // clusterId -> cluster
    this.flags = [];
  }

  reset() {
    this.entities.clear();
    this.identifiers.clear();
    this.clusters.clear();
    this.flags = [];
  }

  async upsertEntity(entity) {
    const entityId = entity.entityId || crypto.randomUUID();
    const stored = {
      entityId,
      entityType: entity.entityType ?? 'individual',
      fullName: entity.fullName,
      dateOfBirth: entity.dateOfBirth,
      gender: entity.gender,
      nationality: entity.nationality,
      primaryPhone: entity.primaryPhone,
      primaryEmail: entity.primaryEmail,
      address: entity.address,
      identifiers: entity.identifiers ?? [],
      riskFlags: entity.riskFlags ?? [],
      createdAt: entity.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.entities.set(entityId, stored);
    for (const identifier of stored.identifiers) {
      const key = `${identifier.type}:${identifier.value}`.toLowerCase();
      this.identifiers.set(key, entityId);
    }
    return stored;
  }

  async findEntityById(entityId) {
    return this.entities.get(entityId);
  }

  async findEntityByIdentifier(type, value) {
    const key = `${type}:${value}`.toLowerCase();
    const entityId = this.identifiers.get(key);
    return entityId ? this.findEntityById(entityId) : null;
  }

  async addIdentifiers(entityId, identifiers) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return null;
    }
    entity.identifiers.push(...identifiers);
    entity.updatedAt = new Date().toISOString();
    for (const identifier of identifiers) {
      const key = `${identifier.type}:${identifier.value}`.toLowerCase();
      this.identifiers.set(key, entityId);
    }
    return entity;
  }

  async addFlag(entityId, flag) {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return null;
    }
    entity.riskFlags = entity.riskFlags ?? [];
    entity.riskFlags.push(flag.code);
    entity.updatedAt = new Date().toISOString();
    const storedFlag = {
      flagId: crypto.randomUUID(),
      entityId,
      ...flag,
      createdAt: new Date().toISOString()
    };
    this.flags.push(storedFlag);
    return storedFlag;
  }

  async createCluster(cluster) {
    const clusterId = cluster.clusterId || crypto.randomUUID();
    const stored = {
      clusterId,
      confidence: cluster.confidence ?? 0,
      resolutionStatus: cluster.resolutionStatus ?? 'pending_review',
      reviewer: cluster.reviewer ?? null,
      reviewedAt: cluster.reviewedAt ?? null,
      notes: cluster.notes ?? null,
      entities: cluster.entities ?? []
    };
    this.clusters.set(clusterId, stored);
    return stored;
  }

  async getCluster(clusterId) {
    return this.clusters.get(clusterId);
  }

  async updateClusterDecision(clusterId, decision) {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      return null;
    }
    cluster.resolutionStatus = decision.decision;
    cluster.reviewer = decision.reviewer ?? 'system';
    cluster.reviewedAt = new Date().toISOString();
    cluster.notes = decision.rationale;
    cluster.entities = decision.resolvedEntities ?? cluster.entities;
    this.clusters.set(clusterId, cluster);
    return cluster;
  }
}
