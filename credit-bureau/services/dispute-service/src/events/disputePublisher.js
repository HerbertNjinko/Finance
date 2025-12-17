import { Kafka, logLevel } from 'kafkajs';
import { config } from '../config.js';

let producer;

async function getProducer() {
  if (!config.kafka.enabled) {
    return null;
  }
  if (!producer) {
    const kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      logLevel: logLevel.NOTHING
    });
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
}

export async function publishDisputeEvent(eventType, payload) {
  if (!config.kafka.enabled) return;
  const producerInstance = await getProducer();
  const event = {
    eventType,
    eventId: payload.eventId,
    disputeId: payload.disputeId,
    entityId: payload.entityId,
    occurredAt: new Date().toISOString(),
    payload
  };
  await producerInstance.send({
    topic: config.kafka.eventTopic,
    messages: [
      {
        key: payload.disputeId,
        value: JSON.stringify(event)
      }
    ]
  });
}

export async function closeDisputeProducer() {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
