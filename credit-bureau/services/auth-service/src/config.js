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
  },
  mail: {
    enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    inviteBaseUrl: process.env.INVITE_BASE_URL || 'http://localhost:4203',
    resetBaseUrl: process.env.RESET_BASE_URL || process.env.INVITE_BASE_URL || 'http://localhost:4203'
  }
};
