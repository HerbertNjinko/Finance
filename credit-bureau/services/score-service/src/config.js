const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

export const config = {
  env,
  auth: {
    enabled: !isTest && Boolean(process.env.SCORE_API_KEYS),
    apiKeys: (process.env.SCORE_API_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  },
  db: {
    enabled: Boolean(process.env.PGHOST && process.env.PGDATABASE),
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'require'
  },
  kafka: {
    enabled: !isTest && Boolean((process.env.KAFKA_BROKERS || '').trim()),
    brokers: (process.env.KAFKA_BROKERS || '')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean),
    clientId: process.env.KAFKA_CLIENT_ID || 'score-service',
    groupId: process.env.KAFKA_GROUP_ID || 'score-service-group',
    obligationTopic: process.env.KAFKA_OBLIGATION_TOPIC || 'obligation-events',
    fromBeginning: process.env.KAFKA_FROM_BEGINNING === 'true'
  },
  scoring: {
    defaultModelVersion: process.env.SCORE_MODEL_VERSION || 'v1'
  }
};
