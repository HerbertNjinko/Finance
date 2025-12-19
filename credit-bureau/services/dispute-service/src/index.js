import '../../../shared/lib/loadEnv.js';
import { createServer } from './http/server.js';
import { closeRepository } from './repositories/index.js';
import { closeDisputeProducer } from './events/disputePublisher.js';

const PORT = process.env.PORT || 4006;
const server = createServer();

server.listen(PORT, () => {
  console.log(`Dispute service listening on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down dispute service`);
  await closeDisputeProducer();
  await closeRepository();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
