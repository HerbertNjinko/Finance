import '../../../shared/lib/loadEnv.js';

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

export const config = {
  env,
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT ? Number(process.env.PORT) : 4106
  },
  db: {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'require'
  },
  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET || 'dev-secret-change-me',
    accessTtlSeconds: process.env.AUTH_ACCESS_TTL ? Number(process.env.AUTH_ACCESS_TTL) : 1800, // 30m
    refreshTtlSeconds: process.env.AUTH_REFRESH_TTL ? Number(process.env.AUTH_REFRESH_TTL) : 60 * 60 * 24 * 7, // 7d
    inviteTtlHours: process.env.AUTH_INVITE_TTL_HOURS ? Number(process.env.AUTH_INVITE_TTL_HOURS) : 168, // 7d
    bcryptRounds: process.env.AUTH_BCRYPT_ROUNDS ? Number(process.env.AUTH_BCRYPT_ROUNDS) : isTest ? 4 : 12
  }
};
