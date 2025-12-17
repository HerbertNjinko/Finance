import { createServer } from './http/server.js';
import { closeRepository } from './repositories/index.js';

const PORT = process.env.PORT || 4005;
const server = createServer();

server.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down notification service`);
  await closeRepository();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
