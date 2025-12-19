import '../../../shared/lib/loadEnv.js';
import { createServer } from './http/server.js';

const PORT = process.env.PORT || 4001;

const server = createServer();

server.listen(PORT, () => {
  console.log(`Ingestion gateway listening on port ${PORT}`);
});
