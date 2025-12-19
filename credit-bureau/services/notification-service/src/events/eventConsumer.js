import { Kafka, logLevel } from 'kafkajs';
import { config } from '../config.js';
import { handleIncomingEvent } from '../services/notificationService.js';

let consumer;

function parseMessage(message) {
  if (!message.value) return null;
  try {
    return JSON.parse(message.value.toString('utf8'));
  } catch (error) {
    console.error('Notification consumer failed to parse message', error);
    return null;
  }
}

export async function startNotificationConsumer() {
  if (!config.kafka.enabled) {
    return;
  }
  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
    logLevel: logLevel.NOTHING
  });
  consumer = kafka.consumer({ groupId: config.kafka.groupId });
  await consumer.connect();
  const topics = [config.kafka.obligationTopic, config.kafka.disputeTopic].filter(Boolean);
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: config.kafka.fromBeginning });
  }
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = parseMessage(message);
      if (!event) return;
      try {
        await handleIncomingEvent(event);
      } catch (error) {
        console.error('Failed to process notification event', error);
      }
    }
  });
  console.log(`Notification service subscribed to topics: ${topics.join(', ')}`);
}

export async function stopNotificationConsumer() {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
}
