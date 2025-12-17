import {
  createTemplate,
  listTemplates,
  enqueueNotification
} from '../services/notificationService.js';

export async function listTemplatesHandler() {
  const templates = await listTemplates();
  return { statusCode: 200, body: { items: templates } };
}

export async function createTemplateHandler({ body }) {
  const template = await createTemplate(body);
  return { statusCode: 201, body: template };
}

export async function sendNotificationHandler({ body }) {
  const event = await enqueueNotification(body);
  return { statusCode: 202, body: event };
}
