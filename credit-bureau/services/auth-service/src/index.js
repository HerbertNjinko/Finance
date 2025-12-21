import './config.js';
import { createServer } from './server.js';
import { config } from './config.js';

const server = createServer();

server.listen(config.server.port, config.server.host, () => {
  console.log(`Auth service listening on http://${config.server.host}:${config.server.port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down auth service`);
  server.close(() => process.exit(0));
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
