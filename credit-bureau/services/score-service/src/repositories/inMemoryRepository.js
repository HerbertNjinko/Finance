import crypto from 'node:crypto';

export class InMemoryScoreRepository {
  constructor() {
    this.scores = new Map(); // entityId -> array of scores
  }

  reset() {
    this.scores.clear();
  }

  async getLatest(entityId) {
    const entries = this.scores.get(entityId) || [];
    return entries[0] || null;
  }

  async insertScore(score) {
    const record = {
      scoreId: score.scoreId || crypto.randomUUID(),
      entityId: score.entityId,
      modelVersion: score.modelVersion,
      score: score.score,
      riskTier: score.riskTier,
      adverseReasons: score.adverseReasons || [],
      calculatedAt: new Date().toISOString()
    };
    const entries = this.scores.get(score.entityId) || [];
    entries.unshift(record);
    this.scores.set(score.entityId, entries);
    return record;
  }
}
