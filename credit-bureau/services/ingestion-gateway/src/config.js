const splitCsv = (value = '') =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

const dbEnabled = Boolean(process.env.PGHOST && process.env.PGDATABASE);
const kafkaBrokers = splitCsv(process.env.KAFKA_BROKERS);

export const config = {
  env: process.env.NODE_ENV || 'development',
  db: {
    enabled: dbEnabled && process.env.NODE_ENV !== 'test',
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'require'
  },
  auth: {
    enabled: Boolean(process.env.INGESTION_API_KEYS),
    apiKeys: splitCsv(process.env.INGESTION_API_KEYS)
  },
  kafka: {
    enabled: kafkaBrokers.length > 0,
    brokers: kafkaBrokers,
    clientId: process.env.KAFKA_CLIENT_ID || 'ingestion-gateway',
    submissionTopic: process.env.KAFKA_SUBMISSION_TOPIC || 'credit-submissions'
  }
};
