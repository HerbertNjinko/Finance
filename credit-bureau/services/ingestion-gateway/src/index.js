import '../../../shared/lib/loadEnv.js';
import { createServer } from './http/server.js';
import { closeObligationWriter } from './processors/obligationWriter.js';
import { closePaymentWriter } from './processors/paymentWriter.js';

const PORT = process.env.PORT || 4001;

const server = createServer();

server.listen(PORT, () => {
  console.log(`Ingestion gateway listening on port ${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, closing ingestion gateway`);
  await Promise.all([closeObligationWriter(), closePaymentWriter()]);
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});
