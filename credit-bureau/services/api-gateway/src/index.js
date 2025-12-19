import '../../../shared/lib/loadEnv.js';
import { createServer } from './http/server.js';

const PORT = process.env.PORT || 4100;
const HOST = process.env.HOST || '127.0.0.1';
const server = createServer();

server.listen(PORT, HOST, () => {
  console.log(`API Gateway listening on http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down API Gateway`);
  server.close(() => process.exit(0));
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
