import crypto from 'node:crypto';

export class InMemoryNotificationRepository {
  constructor() {
    this.templates = new Map();
    this.events = new Map();
  }

  reset() {
    this.templates.clear();
    this.events.clear();
  }

  async listTemplates() {
    return Array.from(this.templates.values());
  }

  async createTemplate(template) {
    const templateId = template.templateId || crypto.randomUUID();
    const record = {
      templateId,
      name: template.name,
      channel: template.channel,
      locale: template.locale,
      subject: template.subject,
      body: template.body,
      createdAt: new Date().toISOString()
    };
    this.templates.set(templateId, record);
    return record;
  }

  async getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  async insertEvent(event) {
    const notificationId = event.notificationId || crypto.randomUUID();
    const record = {
      notificationId,
      templateId: event.templateId,
      destination: event.destination,
      channel: event.channel,
      payload: event.payload || {},
      status: event.status || 'queued',
      createdAt: new Date().toISOString()
    };
    this.events.set(notificationId, record);
    return record;
  }
}
