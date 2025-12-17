import crypto from 'node:crypto';

export class InMemoryObligationRepository {
  constructor() {
    this.obligations = new Map();
    this.repayments = new Map();
  }

  reset() {
    this.obligations.clear();
    this.repayments.clear();
  }

  async create(obligation) {
    const obligationId = obligation.obligationId || crypto.randomUUID();
    const record = {
      ...obligation,
      obligationId,
      status: obligation.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.obligations.set(obligationId, record);
    return record;
  }

  async updateStatus(obligationId, status) {
    const record = this.obligations.get(obligationId);
    if (!record) return null;
    record.status = status;
    record.updatedAt = new Date().toISOString();
    this.obligations.set(obligationId, record);
    return record;
  }

  async findById(obligationId) {
    return this.obligations.get(obligationId) || null;
  }

  async list({ entityId, institutionId, limit = 50, offset = 0 }) {
    let values = Array.from(this.obligations.values());
    if (entityId) values = values.filter((o) => o.entityId === entityId);
    if (institutionId) values = values.filter((o) => o.institutionId === institutionId);
    return {
      total: values.length,
      items: values.slice(offset, offset + limit)
    };
  }

  async addRepayment(obligationId, repayment) {
    const record = this.obligations.get(obligationId);
    if (!record) return null;
    const repaymentId = crypto.randomUUID();
    const payment = {
      repaymentId,
      obligationId,
      ...repayment,
      recordedAt: new Date().toISOString()
    };
    const current = this.repayments.get(obligationId) || [];
    current.push(payment);
    this.repayments.set(obligationId, current);
    return payment;
  }

  async getRepayments(obligationId) {
    return this.repayments.get(obligationId) || [];
  }
}
