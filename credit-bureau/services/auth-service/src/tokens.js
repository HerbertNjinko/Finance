import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import crypto from 'node:crypto';

export function signAccessToken(user) {
  const payload = {
    sub: user.user_id,
    role: user.role,
    institutionId: user.institution_id || null,
    jti: uuidv4()
  };
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.accessTtlSeconds });
}

export function signRefreshToken(user) {
  const payload = {
    sub: user.user_id,
    role: user.role,
    institutionId: user.institution_id || null,
    jti: uuidv4(),
    type: 'refresh'
  };
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.refreshTtlSeconds });
}

export function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
