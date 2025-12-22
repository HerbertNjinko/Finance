import { Pool } from 'pg';
import crypto from 'node:crypto';
import { config } from '../config.js';

function mapRow(row) {
  if (!row) return null;
  return {
    disputeId: row.dispute_id,
    entityId: row.entity_id,
    borrowerName: row.borrower_name || null,
    institutionName: row.institution_name || null,
    obligationId: row.obligation_id,
    submittedBy: row.submitted_by,
    channel: row.channel,
    reason: row.reason,
    status: row.status,
    openedAt: row.opened_at?.toISOString(),
    dueAt: row.due_at?.toISOString(),
    closedAt: row.closed_at?.toISOString(),
    resolutionSummary: row.resolution_summary
  };
}

export class PostgresDisputeRepository {
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

  async create(dispute) {
    const disputeId = dispute.disputeId || crypto.randomUUID();
    const result = await this.pool.query(
      `
        INSERT INTO disputes.disputes
          (dispute_id, entity_id, obligation_id, submitted_by, channel, reason, status, opened_at, due_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)
        RETURNING *
      `,
      [
        disputeId,
        dispute.entityId,
        dispute.obligationId ?? null,
        dispute.submittedBy ?? null,
        dispute.channel,
        dispute.reason,
        dispute.status || 'open',
        dispute.dueAt ?? null
      ]
    );
    return mapRow(result.rows[0]);
  }

  async findById(disputeId) {
    const result = await this.pool.query(
      `SELECT d.*, b.full_name AS borrower_name, i.name AS institution_name
         FROM disputes.disputes d
         LEFT JOIN core.borrowers b ON b.entity_id = d.entity_id
         LEFT JOIN core.obligations o ON o.obligation_id = d.obligation_id
         LEFT JOIN core.institutions i ON i.institution_id = o.institution_id
        WHERE d.dispute_id = $1`,
      [disputeId]
    );
    if (!result.rowCount) return null;
    return mapRow(result.rows[0]);
  }

  async update(disputeId, updates) {
    const fields = [];
    const values = [];
    let index = 1;
    if (updates.status) {
      fields.push(`status = $${index++}`);
      values.push(updates.status);
    }
    if (updates.resolutionSummary) {
      fields.push(`resolution_summary = $${index++}`);
      values.push(updates.resolutionSummary);
    }
    if (updates.dueAt) {
      fields.push(`due_at = $${index++}`);
      values.push(updates.dueAt);
    }
    if (!fields.length) {
      return this.findById(disputeId);
    }
    let closedClause = '';
    if (updates.status && ['resolved', 'rejected', 'closed', 'approved', 'denied'].includes(updates.status)) {
      closedClause = ', closed_at = NOW()';
    }
    const query = `
      UPDATE disputes.disputes
      SET ${fields.join(', ')}${closedClause}
      WHERE dispute_id = $${index}
      RETURNING *
    `;
    values.push(disputeId);
    const result = await this.pool.query(query, values);
    return mapRow(result.rows[0]);
  }

  async list({ entityId, status }) {
    const conditions = [];
    const values = [];
    let index = 1;
    if (entityId) {
      conditions.push(`entity_id = $${index++}`);
      values.push(entityId);
    }
    if (status) {
      conditions.push(`status = $${index++}`);
      values.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT d.*, b.full_name AS borrower_name, i.name AS institution_name, count(*) OVER() AS total_rows
         FROM disputes.disputes d
         LEFT JOIN core.borrowers b ON b.entity_id = d.entity_id
         LEFT JOIN core.obligations o ON o.obligation_id = d.obligation_id
         LEFT JOIN core.institutions i ON i.institution_id = o.institution_id
        ${where}
        ORDER BY opened_at DESC
        LIMIT 100`,
      values
    );
    const total = result.rows[0]?.total_rows ? Number(result.rows[0].total_rows) : 0;
    return { total, items: result.rows.map(mapRow) };
  }
}
