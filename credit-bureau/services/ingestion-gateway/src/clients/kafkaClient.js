import { Kafka, logLevel } from 'kafkajs';
import { config } from '../config.js';

let producerInstance;

async function getProducer() {
  if (!config.kafka.enabled) {
    return null;
  }
  if (!producerInstance) {
    const kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      logLevel: logLevel.NOTHING
    });
    producerInstance = kafka.producer();
    await producerInstance.connect();
  }
  return producerInstance;
}

export async function publishSubmission(submission) {
  if (!config.kafka.enabled) {
    return;
  }
  const producer = await getProducer();
  await producer.send({
    topic: config.kafka.submissionTopic,
    messages: [
      {
        key: submission.submissionId,
        value: JSON.stringify({
          submissionId: submission.submissionId,
          institutionId: submission.institutionId,
          submissionType: submission.submissionType,
          acceptedRecords: submission.acceptedRecords,
          rejectedRecords: submission.rejectedRecords,
          receivedAt: submission.receivedAt
        })
      }
    ]
  });
}

export async function disconnectProducer() {
  if (producerInstance) {
    await producerInstance.disconnect();
    producerInstance = null;
  }
}
