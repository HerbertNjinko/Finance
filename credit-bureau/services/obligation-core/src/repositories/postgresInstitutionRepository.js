import { Pool } from 'pg';
import { config } from '../config.js';

function map(row) {
  return {
    institutionId: row.institution_id,
    name: row.name,
    shortCode: row.short_code,
    institutionType: row.institution_type,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    createdAt: row.created_at?.toISOString()
  };
}

export class PostgresInstitutionRepository {
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

  async create(institution) {
    const query = `
      INSERT INTO core.institutions
        (institution_id, name, short_code, institution_type, contact_email, contact_phone, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      ON CONFLICT (institution_id) DO UPDATE
        SET name = EXCLUDED.name,
            short_code = EXCLUDED.short_code,
            institution_type = EXCLUDED.institution_type,
            contact_email = EXCLUDED.contact_email,
            contact_phone = EXCLUDED.contact_phone,
            status = EXCLUDED.status,
            created_at = core.institutions.created_at
      RETURNING *
    `;
    const values = [
      institution.institutionId,
      institution.name,
      institution.shortCode,
      institution.institutionType,
      institution.contactEmail,
      institution.contactPhone,
      institution.status || 'active'
    ];
    const { rows } = await this.pool.query(query, values);
    return map(rows[0]);
  }

  async update(institutionId, attributes) {
    const query = `
      UPDATE core.institutions
         SET name = $2,
             short_code = $3,
             institution_type = $4,
             contact_email = $5,
             contact_phone = $6,
             status = $7
       WHERE institution_id = $1
       RETURNING institution_id, name, short_code, institution_type, contact_email, contact_phone, status, created_at
    `;
    const values = [
      institutionId,
      attributes.name,
      attributes.shortCode,
      attributes.institutionType,
      attributes.contactEmail,
      attributes.contactPhone,
      attributes.status || 'active'
    ];
    const { rows } = await this.pool.query(query, values);
    return rows.length ? map(rows[0]) : null;
  }

  async delete(institutionId) {
    const { rowCount } = await this.pool.query('DELETE FROM core.institutions WHERE institution_id = $1', [
      institutionId
    ]);
    return rowCount > 0;
  }

  async list() {
    const { rows } = await this.pool.query(
      'SELECT institution_id, name, short_code, institution_type, contact_email, contact_phone, status, created_at FROM core.institutions ORDER BY created_at DESC'
    );
    return rows.map(map);
  }

  async close() {
    await this.pool.end();
  }
}
