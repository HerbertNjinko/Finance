import { Pool } from 'pg';
import crypto from 'node:crypto';
import { config } from '../config.js';

function mapObligation(row) {
  if (!row) return null;
  return {
    obligationId: row.obligation_id,
    institutionId: row.institution_id,
    institutionName: row.institution_name || null,
    entityId: row.entity_id,
    borrowerName: row.borrower_name || row.full_name || null,
    productType: row.product_type,
    status: row.status,
    principalAmount: Number(row.principal_amount),
    currency: row.currency,
    interestRate: row.interest_rate ? Number(row.interest_rate) : null,
    pastDueAmount: row.past_due_amount ? Number(row.past_due_amount) : null,
    nextDueDate: row.next_due_date ? row.next_due_date.toISOString().slice(0, 10) : null,
    disbursedAt: row.disbursed_at ? row.disbursed_at.toISOString().slice(0, 10) : null,
    maturityDate: row.maturity_date ? row.maturity_date.toISOString().slice(0, 10) : null,
    collateral: row.collateral,
    purpose: row.purpose,
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString()
  };
}

function mapRepayment(row) {
  return {
    repaymentId: row.repayment_id,
    obligationId: row.obligation_id,
    institutionId: row.institution_id,
    institutionName: row.institution_name || null,
    entityId: row.entity_id,
    borrowerName: row.borrower_name || null,
    paymentDate: row.payment_date ? row.payment_date.toISOString().slice(0, 10) : null,
    amount: Number(row.amount),
    currency: row.currency,
    channel: row.channel,
    reportedAt: row.reported_at?.toISOString()
  };
}

export class PostgresObligationRepository {
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

  async create(obligation) {
    const obligationId = obligation.obligationId || crypto.randomUUID();
    const query = `
      INSERT INTO core.obligations
        (obligation_id, institution_id, entity_id, product_type, status, principal_amount, currency,
         interest_rate, disbursed_at, maturity_date, collateral, purpose, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
      RETURNING *
    `;
    const values = [
      obligationId,
      obligation.institutionId,
      obligation.entityId,
      obligation.productType,
      obligation.status || 'active',
      obligation.principalAmount,
      obligation.currency,
      obligation.interestRate ?? null,
      obligation.disbursedAt,
      obligation.maturityDate ?? null,
      obligation.collateral ?? null,
      obligation.purpose ?? null
    ];
    const result = await this.pool.query(query, values);
    return mapObligation(result.rows[0]);
  }

  async updateStatus(obligationId, status) {
    const result = await this.pool.query(
      `UPDATE core.obligations SET status = $2, updated_at = NOW() WHERE obligation_id = $1 RETURNING *`,
      [obligationId, status]
    );
    return mapObligation(result.rows[0]);
  }

  async findById(obligationId) {
    const result = await this.pool.query(
      `
        SELECT o.*, b.full_name AS borrower_name, i.name AS institution_name
          FROM core.obligations o
          LEFT JOIN core.borrowers b ON b.entity_id = o.entity_id
          LEFT JOIN core.institutions i ON i.institution_id = o.institution_id
         WHERE o.obligation_id = $1
      `,
      [obligationId]
    );
    if (!result.rowCount) return null;
    const obligation = mapObligation(result.rows[0]);
    const repayments = await this.getRepayments(obligationId);
    return { ...obligation, repayments };
  }

  async list({ entityId, institutionId, limit = 50, offset = 0 }) {
    const params = [];
    const where = [];
    if (entityId) {
      params.push(entityId);
      where.push(`o.entity_id = $${params.length}`);
    }
    if (institutionId) {
      params.push(institutionId);
      where.push(`o.institution_id = $${params.length}`);
    }
    params.push(limit);
    params.push(offset);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const query = `
      SELECT o.*, b.full_name AS borrower_name, i.name AS institution_name, count(*) OVER() AS total_rows
        FROM core.obligations o
        LEFT JOIN core.borrowers b ON b.entity_id = o.entity_id
        LEFT JOIN core.institutions i ON i.institution_id = o.institution_id
        ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const result = await this.pool.query(query, params);
    const total = result.rows[0]?.total_rows ? Number(result.rows[0].total_rows) : 0;
    return {
      total,
      items: result.rows.map(mapObligation)
    };
  }

  async addRepayment(obligationId, repayment) {
    const repaymentId = crypto.randomUUID();
    const query = `
      INSERT INTO core.repayments
        (repayment_id, obligation_id, payment_date, amount, currency, channel, reported_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *
    `;
    const values = [
      repaymentId,
      obligationId,
      repayment.paymentDate,
      repayment.amount,
      repayment.currency || 'XAF',
      repayment.channel
    ];
    const result = await this.pool.query(query, values);
    return mapRepayment(result.rows[0]);
  }

  async getRepayments(obligationId) {
    const result = await this.pool.query(
      `SELECT r.*, o.institution_id, o.entity_id, b.full_name AS borrower_name
         FROM core.repayments r
         JOIN core.obligations o ON o.obligation_id = r.obligation_id
         LEFT JOIN core.borrowers b ON b.entity_id = o.entity_id
         LEFT JOIN core.institutions i ON i.institution_id = o.institution_id
        WHERE r.obligation_id = $1
        ORDER BY r.payment_date DESC`,
      [obligationId]
    );
    return result.rows.map(mapRepayment);
  }

  async listRepayments({ obligationId, institutionId, limit = 25 }) {
    const clauses = [];
    const params = [];
    if (obligationId) {
      params.push(obligationId);
      clauses.push(`r.obligation_id = $${params.length}`);
    }
    if (institutionId) {
      params.push(institutionId);
      clauses.push(`o.institution_id = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(limit);
    const query = `
      SELECT r.*, o.institution_id, o.entity_id, b.full_name AS borrower_name, i.name AS institution_name
        FROM core.repayments r
        JOIN core.obligations o ON o.obligation_id = r.obligation_id
        LEFT JOIN core.borrowers b ON b.entity_id = o.entity_id
        LEFT JOIN core.institutions i ON i.institution_id = o.institution_id
        ${where}
        ORDER BY r.payment_date DESC, r.reported_at DESC
        LIMIT $${params.length}
    `;
    const result = await this.pool.query(query, params);
    return result.rows.map(mapRepayment);
  }
}
