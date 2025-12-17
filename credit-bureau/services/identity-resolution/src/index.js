import { createServer } from './http/server.js';
import { startIngestionConsumer, stopIngestionConsumer } from './events/ingestionConsumer.js';
import { closeIdentityStore } from './store/index.js';

const PORT = process.env.PORT || 4002;
const server = createServer();
let shuttingDown = false;

server.listen(PORT, () => {
  console.log(`Identity resolution service listening on port ${PORT}`);
});

startIngestionConsumer().catch((error) => {
  console.error('Failed to start ingestion consumer', error);
});

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down identity service...`);
  await stopIngestionConsumer();
  await closeIdentityStore();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});
