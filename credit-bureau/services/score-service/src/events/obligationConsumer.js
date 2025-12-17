import { Kafka, logLevel } from 'kafkajs';
import { config } from '../config.js';
import { recalculateScore } from '../services/scoreService.js';

let consumer;

function parseMessage(message) {
  if (!message.value) return null;
  try {
    return JSON.parse(message.value.toString('utf8'));
  } catch (error) {
    console.error('Score consumer failed to parse message', error);
    return null;
  }
}

async function handleEvent(event) {
  if (!event || !event.entityId) return;
  const reasons = [];
  if (event.eventType === 'obligation.status_updated' && event.payload.status === 'defaulted') {
    reasons.push('recent_default');
  }
  if (event.eventType === 'obligation.repayment_recorded') {
    reasons.push('recent_payment');
  }
  try {
    await recalculateScore({
      entityId: event.entityId,
      modelVersion: config.scoring.defaultModelVersion,
      factors: {
        derogatoryEvents: event.payload?.status === 'defaulted' ? 1 : 0,
        positiveHistory: event.eventType === 'obligation.repayment_recorded' ? 1 : 0
      },
      adverseReasons: reasons
    });
  } catch (error) {
    console.error('Score recalculation from event failed', error);
  }
}

export async function startObligationConsumer() {
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
  await consumer.subscribe({
    topic: config.kafka.obligationTopic,
    fromBeginning: config.kafka.fromBeginning
  });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = parseMessage(message);
      await handleEvent(event);
    }
  });
  console.log(`Score service subscribed to ${config.kafka.obligationTopic}`);
}

export async function stopObligationConsumer() {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
}
