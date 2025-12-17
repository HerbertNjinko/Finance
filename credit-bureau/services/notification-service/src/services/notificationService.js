import crypto from 'node:crypto';
import { getRepository } from '../repositories/index.js';
import { validateTemplatePayload, validateNotificationPayload } from '../validation/notificationValidators.js';

function buildError(message, details = [], status = 400) {
  const error = new Error(message);
  error.statusCode = status;
  error.details = details;
  return error;
}

export async function listTemplates() {
  const repository = getRepository();
  return repository.listTemplates();
}

export async function createTemplate(payload = {}) {
  const errors = validateTemplatePayload(payload);
  if (errors.length) throw buildError('Invalid template payload', errors);
  const repository = getRepository();
  return repository.createTemplate({
    templateId: payload.templateId || crypto.randomUUID(),
    name: payload.name,
    channel: payload.channel,
    locale: payload.locale,
    subject: payload.subject,
    body: payload.body
  });
}

export async function enqueueNotification(payload = {}) {
  const errors = validateNotificationPayload(payload);
  if (errors.length) throw buildError('Invalid notification payload', errors);
  const repository = getRepository();
  let body = payload.body;
  if (!body && payload.templateId) {
    const template = await repository.getTemplate(payload.templateId);
    if (!template) throw buildError('Template not found', [], 404);
    body = template.body;
  }
  const event = await repository.insertEvent({
    notificationId: payload.notificationId || crypto.randomUUID(),
    templateId: payload.templateId || null,
    entityId: payload.entityId || null,
    destination: payload.destination,
    channel: payload.channel,
    payload: {
      body,
      mergeVariables: payload.mergeVariables || {}
    },
    status: 'queued'
  });
  return event;
}
