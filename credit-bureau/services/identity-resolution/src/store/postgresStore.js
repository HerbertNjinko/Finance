import crypto from 'node:crypto';
import { Pool } from 'pg';
import { config } from '../config.js';

function mapBorrowerRow(row, identifiers = []) {
  if (!row) return null;
  return {
    entityId: row.entity_id,
    entityType: row.entity_type,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString().slice(0, 10) : null,
    gender: row.gender,
    nationality: row.nationality,
    primaryPhone: row.primary_phone,
    primaryEmail: row.primary_email,
    address: row.address,
    identifiers,
    riskFlags: row.risk_flags || [],
    createdAt: row.created_at?.toISOString(),
    updatedAt: row.updated_at?.toISOString()
  };
}

function mapIdentifierRow(row) {
  return {
    identifierId: row.borrower_identifier_id,
    type: row.id_type,
    value: row.id_value,
    issuingCountry: row.issuing_country,
    issuedAt: row.issued_at ? row.issued_at.toISOString().slice(0, 10) : null,
    expiresAt: row.expires_at ? row.expires_at.toISOString().slice(0, 10) : null,
    verified: row.verified
  };
}

function mapClusterRow(row, links) {
  if (!row) return null;
  return {
    clusterId: row.cluster_id,
    confidence: Number(row.confidence),
    resolutionStatus: row.resolution_status,
    reviewer: row.reviewer,
    reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
    notes: row.notes,
    entities: links.map((link) => ({
      entityId: link.entity_id,
      matchScore: Number(link.match_score),
      attributes: link.attributes
    }))
  };
}

export class PostgresIdentityStore {
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

  async findEntityById(entityId) {
    const client = await this.pool.connect();
    try {
      const borrowerResult = await client.query(
        `SELECT * FROM core.borrowers WHERE entity_id = $1`,
        [entityId]
      );
      if (!borrowerResult.rowCount) {
        return null;
      }
      const identifierResult = await client.query(
        `SELECT * FROM core.borrower_identifiers WHERE entity_id = $1`,
        [entityId]
      );
      return mapBorrowerRow(
        borrowerResult.rows[0],
        identifierResult.rows.map(mapIdentifierRow)
      );
    } finally {
      client.release();
    }
  }

  async findEntityByIdentifier(type, value) {
    const query = `
      SELECT b.* FROM core.borrowers b
      INNER JOIN core.borrower_identifiers bi ON bi.entity_id = b.entity_id
      WHERE bi.id_type = $1 AND bi.id_value = $2
    `;
    const { rows } = await this.pool.query(query, [type, value]);
    if (!rows.length) {
      return null;
    }
    return this.findEntityById(rows[0].entity_id);
  }

  async upsertEntity(entity) {
    const client = await this.pool.connect();
    const entityId = entity.entityId || crypto.randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO core.borrowers
            (entity_id, entity_type, full_name, date_of_birth, gender, nationality,
             primary_phone, primary_email, address, risk_flags, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, NOW()), NOW())
          ON CONFLICT (entity_id) DO UPDATE
          SET entity_type = EXCLUDED.entity_type,
              full_name = EXCLUDED.full_name,
              date_of_birth = EXCLUDED.date_of_birth,
              gender = EXCLUDED.gender,
              nationality = EXCLUDED.nationality,
              primary_phone = EXCLUDED.primary_phone,
              primary_email = EXCLUDED.primary_email,
              address = EXCLUDED.address,
              updated_at = NOW()
        `,
        [
          entityId,
          entity.entityType ?? 'individual',
          entity.fullName,
          entity.dateOfBirth ?? null,
          entity.gender ?? null,
          entity.nationality ?? null,
          entity.primaryPhone ?? null,
          entity.primaryEmail ?? null,
          entity.address ?? null,
          entity.riskFlags ?? [],
          entity.createdAt ? new Date(entity.createdAt) : null
        ]
      );

      if (Array.isArray(entity.identifiers)) {
        const insertIdentifier = `
          INSERT INTO core.borrower_identifiers
            (borrower_identifier_id, entity_id, id_type, id_value, issuing_country, issued_at, expires_at, verified)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id_type, id_value) DO UPDATE
          SET entity_id = EXCLUDED.entity_id,
              issuing_country = EXCLUDED.issuing_country,
              issued_at = EXCLUDED.issued_at,
              expires_at = EXCLUDED.expires_at,
              verified = EXCLUDED.verified
        `;
        for (const identifier of entity.identifiers) {
          await client.query(insertIdentifier, [
            identifier.identifierId || crypto.randomUUID(),
            entityId,
            identifier.type,
            identifier.value,
            identifier.issuingCountry ?? null,
            identifier.issuedAt ?? null,
            identifier.expiresAt ?? null,
            identifier.verified ?? false
          ]);
        }
      }

      await client.query('COMMIT');
      return this.findEntityById(entityId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addIdentifiers(entityId, identifiers = []) {
    if (!identifiers.length) {
      return this.findEntityById(entityId);
    }
    const insertIdentifier = `
      INSERT INTO core.borrower_identifiers
        (borrower_identifier_id, entity_id, id_type, id_value, issuing_country, issued_at, expires_at, verified)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id_type, id_value) DO UPDATE
      SET entity_id = EXCLUDED.entity_id,
          issuing_country = EXCLUDED.issuing_country,
          issued_at = EXCLUDED.issued_at,
          expires_at = EXCLUDED.expires_at,
          verified = EXCLUDED.verified
    `;
    for (const identifier of identifiers) {
      await this.pool.query(insertIdentifier, [
        identifier.identifierId || crypto.randomUUID(),
        entityId,
        identifier.type,
        identifier.value,
        identifier.issuingCountry ?? null,
        identifier.issuedAt ?? null,
        identifier.expiresAt ?? null,
        identifier.verified ?? false
      ]);
    }
    return this.findEntityById(entityId);
  }

  async addFlag(entityId, flag) {
    const result = await this.pool.query(
      `
        UPDATE core.borrowers
        SET risk_flags = array_append(COALESCE(risk_flags, ARRAY[]::text[]), $2),
            updated_at = NOW()
        WHERE entity_id = $1
        RETURNING entity_id
      `,
      [entityId, flag.code]
    );
    if (!result.rowCount) {
      return null;
    }
    return {
      flagId: crypto.randomUUID(),
      entityId,
      ...flag,
      createdAt: new Date().toISOString()
    };
  }

  async createCluster(cluster) {
    const client = await this.pool.connect();
    const clusterId = cluster.clusterId || crypto.randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          INSERT INTO identity.identity_clusters
            (cluster_id, confidence, resolution_status, reviewer, reviewed_at, notes)
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          clusterId,
          cluster.confidence ?? 0,
          cluster.resolutionStatus ?? 'pending_review',
          cluster.reviewer ?? null,
          cluster.reviewedAt ?? null,
          cluster.notes ?? null
        ]
      );

      const insertLink = `
        INSERT INTO identity.identity_links
          (link_id, cluster_id, entity_id, match_score, attributes)
        VALUES ($1,$2,$3,$4,$5::jsonb)
      `;
      for (const link of cluster.entities ?? []) {
        await client.query(insertLink, [
          crypto.randomUUID(),
          clusterId,
          link.entityId,
          link.matchScore ?? 0.5,
          JSON.stringify(link.attributes ?? {})
        ]);
      }

      await client.query('COMMIT');
      return this.getCluster(clusterId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCluster(clusterId) {
    const client = await this.pool.connect();
    try {
      const clusterResult = await client.query(
        'SELECT * FROM identity.identity_clusters WHERE cluster_id = $1',
        [clusterId]
      );
      if (!clusterResult.rowCount) {
        return null;
      }
      const linkResult = await client.query(
        'SELECT * FROM identity.identity_links WHERE cluster_id = $1',
        [clusterId]
      );
      return mapClusterRow(clusterResult.rows[0], linkResult.rows);
    } finally {
      client.release();
    }
  }

  async updateClusterDecision(clusterId, decision) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          UPDATE identity.identity_clusters
          SET resolution_status = $2,
              reviewer = $3,
              reviewed_at = NOW(),
              notes = $4
          WHERE cluster_id = $1
        `,
        [clusterId, decision.decision, decision.reviewer ?? 'system', decision.rationale ?? null]
      );

      if (Array.isArray(decision.resolvedEntities) && decision.resolvedEntities.length) {
        await client.query('DELETE FROM identity.identity_links WHERE cluster_id = $1', [clusterId]);
        const insertLink = `
          INSERT INTO identity.identity_links
            (link_id, cluster_id, entity_id, match_score, attributes)
          VALUES ($1,$2,$3,$4,$5::jsonb)
        `;
        for (const entity of decision.resolvedEntities) {
          await client.query(insertLink, [
            crypto.randomUUID(),
            clusterId,
            entity.entityId,
            entity.matchScore ?? 0.8,
            JSON.stringify(entity.attributes ?? {})
          ]);
        }
      }

      await client.query('COMMIT');
      return this.getCluster(clusterId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
