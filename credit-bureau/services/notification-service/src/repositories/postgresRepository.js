import { Pool } from 'pg';
import crypto from 'node:crypto';
import { config } from '../config.js';

function mapTemplate(row) {
  if (!row) return null;
  return {
    templateId: row.template_id,
    name: row.name,
    channel: row.channel,
    locale: row.locale,
    subject: row.subject,
    body: row.body,
    createdAt: row.created_at?.toISOString()
  };
}

function mapEvent(row) {
  if (!row) return null;
  return {
    notificationId: row.notification_id,
    templateId: row.template_id,
    entityId: row.entity_id,
    destination: row.destination,
    channel: row.channel,
    payload: row.payload,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at?.toISOString()
  };
}

export class PostgresNotificationRepository {
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

  async listTemplates() {
    const result = await this.pool.query(
      `SELECT * FROM notifications.notification_templates ORDER BY created_at DESC`
    );
    return result.rows.map(mapTemplate);
  }

  async createTemplate(template) {
    const templateId = template.templateId || crypto.randomUUID();
    const result = await this.pool.query(
      `
        INSERT INTO notifications.notification_templates
          (template_id, name, channel, locale, subject, body, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        RETURNING *
      `,
      [templateId, template.name, template.channel, template.locale, template.subject ?? null, template.body]
    );
    return mapTemplate(result.rows[0]);
  }

  async getTemplate(templateId) {
    const result = await this.pool.query(
      `SELECT * FROM notifications.notification_templates WHERE template_id = $1`,
      [templateId]
    );
    if (!result.rowCount) return null;
    return mapTemplate(result.rows[0]);
  }

  async insertEvent(event) {
    const notificationId = event.notificationId || crypto.randomUUID();
    const result = await this.pool.query(
      `
        INSERT INTO notifications.notification_events
          (notification_id, template_id, entity_id, destination, channel, payload, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,NOW())
        RETURNING *
      `,
      [
        notificationId,
        event.templateId ?? null,
        event.entityId ?? null,
        event.destination,
        event.channel,
        JSON.stringify(event.payload || {}),
        event.status || 'queued'
      ]
    );
    return mapEvent(result.rows[0]);
  }
}
