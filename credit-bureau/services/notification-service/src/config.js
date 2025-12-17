const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

export const config = {
  env,
  auth: {
    enabled: !isTest && Boolean(process.env.NOTIFICATION_API_KEYS),
    apiKeys: (process.env.NOTIFICATION_API_KEYS || '')
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
  }
};
