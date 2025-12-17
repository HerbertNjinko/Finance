import { createServer } from './http/server.js';

const PORT = process.env.PORT || 4100;
const server = createServer();

server.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down API Gateway`);
  server.close(() => process.exit(0));
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
