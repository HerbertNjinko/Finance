import { createServer } from './http/server.js';
import { closeRepository } from './repositories/index.js';
import { startNotificationConsumer, stopNotificationConsumer } from './events/eventConsumer.js';

const PORT = process.env.PORT || 4005;
const server = createServer();

server.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
});

startNotificationConsumer().catch((error) => {
  console.error('Failed to start notification consumer', error);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down notification service`);
  await stopNotificationConsumer();
  await closeRepository();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
