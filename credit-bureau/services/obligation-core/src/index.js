import '../../../shared/lib/loadEnv.js';
import { createServer } from './http/server.js';
import { closeRepository } from './repositories/index.js';
import { closeProducer } from './events/kafkaPublisher.js';

const PORT = process.env.PORT || 4003;
const server = createServer();

server.listen(PORT, () => {
  console.log(`Obligation service listening on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down obligation service`);
  await closeRepository();
  await closeProducer();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
