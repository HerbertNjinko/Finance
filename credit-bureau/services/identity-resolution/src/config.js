const splitCsv = (value = '') =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const kafkaBrokers = splitCsv(process.env.KAFKA_BROKERS);

export const config = {
  env,
  auth: {
    enabled: !isTest && Boolean(process.env.IDENTITY_API_KEYS),
    apiKeys: splitCsv(process.env.IDENTITY_API_KEYS)
  },
  db: {
    enabled: !isTest && Boolean(process.env.PGHOST && process.env.PGDATABASE),
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'require'
  },
  kafka: {
    enabled: !isTest && kafkaBrokers.length > 0,
    brokers: kafkaBrokers,
    clientId: process.env.KAFKA_CLIENT_ID || 'identity-resolution',
    groupId: process.env.KAFKA_GROUP_ID || 'identity-resolution-group',
    ingestionTopic: process.env.KAFKA_INGESTION_TOPIC || 'identity-events',
    fromBeginning: process.env.KAFKA_FROM_BEGINNING === 'true'
  }
};
