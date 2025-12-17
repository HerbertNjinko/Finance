import { Kafka, logLevel } from 'kafkajs';
import { config } from '../config.js';
import { getIdentityStore } from '../store/index.js';

let consumer;

function parseMessage(message) {
  if (!message.value) return null;
  try {
    return JSON.parse(message.value.toString('utf8'));
  } catch (error) {
    console.error('Failed to parse ingestion event', error);
    return null;
  }
}

async function handleEvent(event) {
  if (!event) return;
  const store = getIdentityStore();
  if (event.type === 'identifier_update' && event.entityId && Array.isArray(event.identifiers)) {
    await store.addIdentifiers(event.entityId, event.identifiers);
  } else if (event.type === 'entity_upsert' && event.entity) {
    await store.upsertEntity(event.entity);
  }
}

export async function startIngestionConsumer() {
  if (!config.kafka.enabled || !config.kafka.ingestionTopic) {
    return null;
  }

  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
    logLevel: logLevel.NOTHING
  });

  consumer = kafka.consumer({ groupId: config.kafka.groupId });
  await consumer.connect();
  await consumer.subscribe({
    topic: config.kafka.ingestionTopic,
    fromBeginning: config.kafka.fromBeginning
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = parseMessage(message);
      try {
        await handleEvent(event);
      } catch (error) {
        console.error('Failed to apply ingestion event', error);
      }
    }
  });

  console.log(`Subscribed to ingestion topic ${config.kafka.ingestionTopic}`);
  return consumer;
}

export async function stopIngestionConsumer() {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
}
