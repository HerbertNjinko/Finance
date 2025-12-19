import crypto from 'node:crypto';
import { Pool } from 'pg';
import { config } from '../config.js';

const uuidRegex = /^[0-9a-fA-F-]{36}$/;

async function resolveObligationId(client, identifier, institutionId) {
  if (identifier && uuidRegex.test(identifier)) {
    return identifier;
  }
  if (!identifier) {
    return null;
  }
  const { rows } = await client.query(
    `
      SELECT si.submission_item_id
        FROM ingestion.submission_items si
        JOIN ingestion.submissions s ON s.submission_id = si.submission_id
       WHERE si.reference_id = $1
         AND s.institution_id = $2
         AND s.submission_type = 'obligations'
       ORDER BY s.received_at DESC
       LIMIT 1
    `,
    [identifier, institutionId]
  );
  return rows[0]?.submission_item_id ?? null;
}

class PaymentWriter {
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

  async persist(submission) {
    const acceptedRecords = submission.records?.filter((record) => record.status === 'accepted') ?? [];
    if (!acceptedRecords.length) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const insertQuery = `
        INSERT INTO core.repayments
          (repayment_id, obligation_id, payment_date, amount, currency, channel, reported_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (obligation_id, payment_date, amount, channel) DO NOTHING
      `;
      for (const record of acceptedRecords) {
        const payload = record.payload || {};
        if (!payload.obligationId || typeof payload.amount !== 'number' || payload.amount <= 0) {
          continue;
        }
        const normalizedObligationId = await resolveObligationId(client, payload.obligationId, submission.institutionId);
        if (!normalizedObligationId) {
          console.warn(`Unable to resolve obligationId ${payload.obligationId} for institution ${submission.institutionId}`);
          continue;
        }
        const repaymentId =
          payload.repaymentId && uuidRegex.test(payload.repaymentId) ? payload.repaymentId : crypto.randomUUID();
        const paymentDate = payload.paymentDate || submission.receivedAt;
        await client.query(insertQuery, [
          repaymentId,
          normalizedObligationId,
          paymentDate,
          payload.amount,
          payload.currency || 'XAF',
          payload.channel || payload.method || null
        ]);
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

export async function persistPayments(submission) {
  if (!config.db.enabled) {
    return;
  }
  if (!writer) {
    writer = new PaymentWriter();
  }
  await writer.persist(submission);
}

export async function closePaymentWriter() {
  if (writer) {
    await writer.close();
    writer = null;
  }
}
