import crypto from 'node:crypto';
import { Pool } from 'pg';
import { config } from '../config.js';

export class PostgresSubmissionRepository {
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

  async saveSubmission(submission) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO ingestion.submissions
            (submission_id, institution_id, submission_type, file_name, received_at, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (submission_id) DO NOTHING
        `,
        [
          submission.submissionId,
          submission.institutionId,
          submission.submissionType,
          submission.batchReference,
          submission.receivedAt,
          submission.status
        ]
      );

      const insertItem =
        'INSERT INTO ingestion.submission_items (submission_item_id, submission_id, reference_id, entity_id, payload, validation_status, validation_errors) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::text[]) ON CONFLICT (submission_item_id) DO NOTHING';

      for (const record of submission.records) {
        await client.query(insertItem, [
          record.recordId || crypto.randomUUID(),
          submission.submissionId,
          record.referenceId,
          record.payload?.entity?.entityId ?? null,
          JSON.stringify(record.payload),
          record.status,
          record.errors.length ? record.errors : null
        ]);
      }

      await client.query('COMMIT');
      return submission;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSubmissionById(submissionId) {
    const { rows } = await this.pool.query(
      'SELECT submission_id, institution_id, submission_type, file_name, received_at, processed_at, status, status_details FROM ingestion.submissions WHERE submission_id = $1',
      [submissionId]
    );
    if (!rows.length) {
      return null;
    }
    const submission = rows[0];
    const itemRows = await this.pool.query(
      'SELECT submission_item_id, reference_id, entity_id, payload, validation_status, validation_errors FROM ingestion.submission_items WHERE submission_id = $1',
      [submissionId]
    );
    return {
      submissionId: submission.submission_id,
      submissionType: submission.submission_type,
      institutionId: submission.institution_id,
      batchReference: submission.file_name,
      status: submission.status,
      receivedAt: submission.received_at,
      processedAt: submission.processed_at,
      statusDetails: submission.status_details,
      records: itemRows.rows.map((row) => ({
        recordId: row.submission_item_id,
        referenceId: row.reference_id,
        entityId: row.entity_id,
        payload: row.payload,
        status: row.validation_status,
        errors: row.validation_errors || []
      }))
    };
  }

  async close() {
    await this.pool.end();
  }
}
