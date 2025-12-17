import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryNotificationRepository } from '../src/repositories/inMemoryRepository.js';
import { overrideRepository } from '../src/repositories/index.js';
import { createTemplate, listTemplates, enqueueNotification } from '../src/services/notificationService.js';

test.beforeEach(() => {
  overrideRepository(new InMemoryNotificationRepository());
});

test('create template and list', async () => {
  await createTemplate({
    name: 'Reminder',
    channel: 'email',
    locale: 'en',
    subject: 'Payment Reminder',
    body: 'Please pay your loan installment.'
  });
  const templates = await listTemplates();
  assert.equal(templates.length, 1);
});

test('enqueue notification with template resolves body', async () => {
  const template = await createTemplate({
    name: 'Test',
    channel: 'sms',
    locale: 'en',
    body: 'Hello {{name}}'
  });
  const event = await enqueueNotification({
    templateId: template.templateId,
    destination: '+237677000000',
    channel: 'sms'
  });
  assert.equal(event.channel, 'sms');
});
