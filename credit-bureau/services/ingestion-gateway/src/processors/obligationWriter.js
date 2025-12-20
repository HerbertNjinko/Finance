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
    const dateOfBirth = entityPayload.dateOfBirth || entityPayload.dob || null;
    const gender = entityPayload.gender || null;
    const nationality = entityPayload.nationality || null;
    const primaryPhone = entityPayload.primaryPhone || entityPayload.phone || null;
    const primaryEmail = entityPayload.primaryEmail || entityPayload.email || null;
    const address = entityPayload.address ? JSON.stringify(entityPayload.address) : null;
    const riskFlags = Array.isArray(entityPayload.riskFlags) ? entityPayload.riskFlags : null;
    await client.query(
      `
        INSERT INTO core.borrowers (entity_id, entity_type, full_name, date_of_birth, gender, nationality, primary_phone, primary_email, address, risk_flags, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
        ON CONFLICT (entity_id) DO UPDATE
          SET full_name = COALESCE(EXCLUDED.full_name, core.borrowers.full_name),
              date_of_birth = COALESCE(EXCLUDED.date_of_birth, core.borrowers.date_of_birth),
              gender = COALESCE(EXCLUDED.gender, core.borrowers.gender),
              nationality = COALESCE(EXCLUDED.nationality, core.borrowers.nationality),
              primary_phone = COALESCE(EXCLUDED.primary_phone, core.borrowers.primary_phone),
              primary_email = COALESCE(EXCLUDED.primary_email, core.borrowers.primary_email),
              address = COALESCE(EXCLUDED.address, core.borrowers.address),
              risk_flags = COALESCE(EXCLUDED.risk_flags, core.borrowers.risk_flags),
              updated_at = NOW()
      `,
      [entityId, entityType, fullName, dateOfBirth, gender, nationality, primaryPhone, primaryEmail, address, riskFlags]
    );
    const identifiers = Array.isArray(entityPayload.identifiers) ? entityPayload.identifiers : [];
    const insertIdentifier = `
      INSERT INTO core.borrower_identifiers (borrower_identifier_id, entity_id, id_type, id_value, issuing_country, issued_at, verified)
      VALUES ($1,$2,$3,$4,$5,$6,false)
      ON CONFLICT (id_type, id_value) DO NOTHING
    `;
    for (const identifier of identifiers) {
      if (!identifier?.type || !identifier?.value) continue;
      await client.query(insertIdentifier, [
        crypto.randomUUID(),
        entityId,
        identifier.type,
        identifier.value,
        identifier.issuingCountry || null,
        identifier.issuedAt || null
      ]);
    }
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
             disbursed_at, maturity_date, past_due_amount, next_due_date, collateral, purpose, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
          ON CONFLICT (obligation_id) DO UPDATE
            SET status = EXCLUDED.status,
                principal_amount = EXCLUDED.principal_amount,
                currency = EXCLUDED.currency,
                interest_rate = EXCLUDED.interest_rate,
                disbursed_at = EXCLUDED.disbursed_at,
                maturity_date = EXCLUDED.maturity_date,
                past_due_amount = EXCLUDED.past_due_amount,
                next_due_date = EXCLUDED.next_due_date,
                collateral = EXCLUDED.collateral,
                purpose = EXCLUDED.purpose,
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
          maturityDate,
          typeof obligation.pastDueAmount === 'number' ? obligation.pastDueAmount : null,
          normalizeDate(obligation.nextDueDate),
          obligation.collateral ? JSON.stringify(obligation.collateral) : null,
          obligation.purpose || null
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
