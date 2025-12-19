import crypto from 'node:crypto';
import { Pool } from 'pg';
import { config } from '../config.js';

const uuidRegex = /^[0-9a-fA-F-]{36}$/;

function deriveObligationId(record) {
  const candidates = [
    record.payload?.obligation?.obligationId,
    record.payload?.obligationId,
    record.referenceId
  ];
  for (const value of candidates) {
    if (value && uuidRegex.test(value)) {
      return value;
    }
  }
  return record.recordId || crypto.randomUUID();
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

class ObligationWriter {
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

  async ensureBorrower(client, entityId, entityPayload = {}) {
    const entityType = entityPayload.entityType || 'individual';
    const fullName = entityPayload.fullName || entityPayload.name || `Pending entity ${entityId.slice(0, 8)}`;
    await client.query(
      `
        INSERT INTO core.borrowers (entity_id, entity_type, full_name, created_at, updated_at)
        VALUES ($1,$2,$3,NOW(),NOW())
        ON CONFLICT (entity_id) DO NOTHING
      `,
      [entityId, entityType, fullName]
    );
  }

  async persist(submission) {
    const acceptedRecords = submission.records?.filter((record) => record.status === 'accepted') ?? [];
    if (!acceptedRecords.length) {
      return;
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const record of acceptedRecords) {
        const entityId = record.payload?.entity?.entityId;
        if (!entityId || !submission.institutionId) {
          continue;
        }
        const obligation = record.payload.obligation || {};
        if (typeof obligation.principalAmount !== 'number') {
          continue;
        }
        await this.ensureBorrower(client, entityId, record.payload.entity || {});
        const obligationId = deriveObligationId(record);
        const disbursedAt = normalizeDate(obligation.disbursedAt) || normalizeDate(record.payload.obligation?.bookedAt) || normalizeDate(submission.receivedAt) || normalizeDate(new Date().toISOString());
        const maturityDate = normalizeDate(obligation.maturityDate);
        const query = `
          INSERT INTO core.obligations
            (obligation_id, institution_id, entity_id, product_type, status, principal_amount, currency, interest_rate,
             disbursed_at, maturity_date, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
          ON CONFLICT (obligation_id) DO UPDATE
            SET status = EXCLUDED.status,
                principal_amount = EXCLUDED.principal_amount,
                currency = EXCLUDED.currency,
                interest_rate = EXCLUDED.interest_rate,
                disbursed_at = EXCLUDED.disbursed_at,
                maturity_date = EXCLUDED.maturity_date,
                updated_at = NOW()
        `;
        const values = [
          obligationId,
          submission.institutionId,
          entityId,
          obligation.productType || 'unknown',
          obligation.status || 'active',
          obligation.principalAmount,
          obligation.currency || 'XAF',
          typeof obligation.interestRate === 'number' ? obligation.interestRate : null,
          disbursedAt,
          maturityDate
        ];
        await client.query(query, values);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

let writer;

export async function persistObligations(submission) {
  if (!config.db.enabled) {
    return;
  }
  if (!writer) {
    writer = new ObligationWriter();
  }
  await writer.persist(submission);
}

export async function closeObligationWriter() {
  if (writer) {
    await writer.close();
    writer = null;
  }
}
