import crypto from 'node:crypto';

export class InMemoryDisputeRepository {
  constructor() {
    this.disputes = new Map();
  }

  reset() {
    this.disputes.clear();
  }

  async create(dispute) {
    const disputeId = dispute.disputeId || crypto.randomUUID();
    const record = {
      disputeId,
      entityId: dispute.entityId,
      obligationId: dispute.obligationId || null,
      channel: dispute.channel,
      reason: dispute.reason,
      status: dispute.status || 'open',
      resolutionSummary: dispute.resolutionSummary || null,
      openedAt: new Date().toISOString(),
      closedAt: null
    };
    this.disputes.set(disputeId, record);
    return record;
  }

  async findById(disputeId) {
    return this.disputes.get(disputeId) || null;
  }

  async update(disputeId, updates) {
    const record = this.disputes.get(disputeId);
    if (!record) return null;
    Object.assign(record, updates);
    if (updates.status && ['resolved', 'rejected', 'closed'].includes(updates.status)) {
      record.closedAt = new Date().toISOString();
    }
    this.disputes.set(disputeId, record);
    return record;
  }

  async list({ entityId, status }) {
    let items = Array.from(this.disputes.values());
    if (entityId) items = items.filter((d) => d.entityId === entityId);
    if (status) items = items.filter((d) => d.status === status);
    return { total: items.length, items };
  }
}
