const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

const splitCsv = (value = '') =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

export const config = {
  env,
  auth: {
    enabled: !isTest && Boolean(process.env.GATEWAY_API_KEYS),
    apiKeys: splitCsv(process.env.GATEWAY_API_KEYS || '')
  },
  upstreams: {
    ingestion: {
      baseUrl: process.env.INGESTION_SERVICE_URL || 'http://127.0.0.1:4001/v1',
      apiKey: process.env.INGESTION_SERVICE_KEY || ''
    },
    identity: {
      baseUrl: process.env.IDENTITY_SERVICE_URL || 'http://127.0.0.1:4002/v1',
      apiKey: process.env.IDENTITY_SERVICE_KEY || ''
    },
    obligation: {
      baseUrl: process.env.OBLIGATION_SERVICE_URL || 'http://127.0.0.1:4003/v1',
      apiKey: process.env.OBLIGATION_SERVICE_KEY || ''
    },
    score: {
      baseUrl: process.env.SCORE_SERVICE_URL || 'http://127.0.0.1:4004/v1',
      apiKey: process.env.SCORE_SERVICE_KEY || ''
    },
    notification: {
      baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:4005/v1',
      apiKey: process.env.NOTIFICATION_SERVICE_KEY || ''
    },
    dispute: {
      baseUrl: process.env.DISPUTE_SERVICE_URL || 'http://127.0.0.1:4006/v1',
      apiKey: process.env.DISPUTE_SERVICE_KEY || ''
    }
  }
};
