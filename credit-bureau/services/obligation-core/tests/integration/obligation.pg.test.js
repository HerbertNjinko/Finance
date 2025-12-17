import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Pool } from 'pg';
import { PostgresObligationRepository } from '../../src/repositories/postgresRepository.js';

const shouldSkip = process.env.RUN_INTEGRATION_TESTS !== '1';
if (shouldSkip) {
  test('obligation repository persists to Postgres (skipped)', { skip: true }, () => {});
} else {
  const pgConfig = {
    host: process.env.PGHOST || '127.0.0.1',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'Advance12',
    database: process.env.PGDATABASE || 'credit_bureau',
    ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined
  };

  test('obligation repository persists to Postgres', async (t) => {
    const pool = new Pool(pgConfig);
    const repo = new PostgresObligationRepository();
    const institutionId = crypto.randomUUID();
    const entityId = crypto.randomUUID();
    const obligationId = crypto.randomUUID();

  await pool.query(
    `INSERT INTO core.institutions (institution_id, name, short_code, institution_type, contact_email, status, created_at)
     VALUES ($1,$2,$3,$4,$5,'active',NOW())
     ON CONFLICT (institution_id) DO NOTHING`,
    [institutionId, 'Integration Bank', 'INTBANK', 'bank', 'intbank@example.com']
  );

  await pool.query(
    `INSERT INTO core.borrowers (entity_id, entity_type, full_name, created_at, updated_at)
     VALUES ($1,'individual',$2,NOW(),NOW())
     ON CONFLICT (entity_id) DO NOTHING`,
    [entityId, 'Integration User']
  );

  t.after(async () => {
    await pool.query(`DELETE FROM core.repayments WHERE obligation_id = $1`, [obligationId]);
    await pool.query(`DELETE FROM core.obligations WHERE obligation_id = $1`, [obligationId]);
    await pool.query(`DELETE FROM core.borrowers WHERE entity_id = $1`, [entityId]);
    await pool.query(`DELETE FROM core.institutions WHERE institution_id = $1`, [institutionId]);
    await pool.end();
    await repo.close();
  });

    const created = await repo.create({
      obligationId,
      institutionId,
      entityId,
      productType: 'installment_loan',
      principalAmount: 123456,
      currency: 'XAF',
      disbursedAt: '2024-06-01'
    });

    assert.equal(created.obligationId, obligationId);

    const loaded = await repo.findById(obligationId);
    assert.equal(loaded.obligationId, obligationId);
    assert.equal(loaded.entityId, entityId);
  });
}
