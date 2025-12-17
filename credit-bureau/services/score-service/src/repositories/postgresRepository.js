import { Pool } from 'pg';
import crypto from 'node:crypto';
import { config } from '../config.js';

function mapRow(row) {
  if (!row) return null;
  return {
    scoreId: row.score_id,
    entityId: row.entity_id,
    modelVersion: row.model_version,
    score: row.score,
    riskTier: row.risk_tier,
    adverseReasons: row.adverse_reasons || [],
    calculatedAt: row.calculated_at?.toISOString()
  };
}

export class PostgresScoreRepository {
  constructor() {
    this.pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined
    });
  }

  async close() {
    await this.pool.end();
  }

  async getLatest(entityId) {
    const result = await this.pool.query(
      `SELECT * FROM core.credit_scores WHERE entity_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
      [entityId]
    );
    if (!result.rowCount) return null;
    return mapRow(result.rows[0]);
  }

  async insertScore(score) {
    const scoreId = score.scoreId || crypto.randomUUID();
    const result = await this.pool.query(
      `
        INSERT INTO core.credit_scores
          (score_id, entity_id, model_version, score, risk_tier, adverse_reasons, calculated_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        RETURNING *
      `,
      [
        scoreId,
        score.entityId,
        score.modelVersion,
        score.score,
        score.riskTier,
        score.adverseReasons || []
      ]
    );
    return mapRow(result.rows[0]);
  }
}
