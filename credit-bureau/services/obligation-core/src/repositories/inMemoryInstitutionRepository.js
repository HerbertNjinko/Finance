export class InMemoryInstitutionRepository {
  constructor() {
    this.store = new Map();
  }

  async create(institution) {
    this.store.set(institution.institutionId, { ...institution });
    return { ...institution };
  }

  async update(institutionId, attributes) {
    const existing = this.store.get(institutionId);
    if (!existing) return null;
    const updated = { ...existing, ...attributes };
    this.store.set(institutionId, updated);
    return { ...updated };
  }

  async delete(institutionId) {
    return this.store.delete(institutionId);
  }

  async list() {
    return Array.from(this.store.values());
  }

  async close() {
    this.store.clear();
  }
}
