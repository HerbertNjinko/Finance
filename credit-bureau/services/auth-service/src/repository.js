import { v4 as uuidv4 } from 'uuid';
import { getClient } from './db.js';
import { hashPassword } from './password.js';
import { config } from './config.js';
import { hashToken } from './tokens.js';

const pool = getClient();

export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM auth.users WHERE email = $1 LIMIT 1', [email]);
  return rows[0];
}

export async function findUserById(userId) {
  const { rows } = await pool.query('SELECT * FROM auth.users WHERE user_id = $1 LIMIT 1', [userId]);
  return rows[0];
}

export async function createUserFromInvite(invite, password) {
  const userId = uuidv4();
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await pool.query(
    `INSERT INTO auth.users (user_id, email, password_hash, role, institution_id, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,'active',$6,$6)`,
    [userId, invite.email, passwordHash, invite.role, invite.institution_id || null, now]
  );
  await pool.query(`UPDATE auth.invites SET status='accepted' WHERE invite_id = $1`, [invite.invite_id]);
  return findUserById(userId);
}

export async function updatePasswordAndActivate(userId, password) {
  const hash = await hashPassword(password);
  await pool.query(
    `UPDATE auth.users
        SET password_hash = $1, status = 'active', updated_at = NOW()
      WHERE user_id = $2`,
    [hash, userId]
  );
  return findUserById(userId);
}

export async function upsertTempUser({ email, role, institutionId, tempPassword }) {
  const existing = await findUserByEmail(email);
  const passwordHash = await hashPassword(tempPassword);
  if (existing) {
    await pool.query(
      `UPDATE auth.users
          SET password_hash = $1,
              status = 'reset_required',
              role = $2,
              institution_id = $3,
              updated_at = NOW()
        WHERE user_id = $4`,
      [passwordHash, role, institutionId || null, existing.user_id]
    );
    return findUserById(existing.user_id);
  }
  const userId = uuidv4();
  await pool.query(
    `INSERT INTO auth.users (user_id, email, password_hash, role, institution_id, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,'reset_required',NOW(),NOW())`,
    [userId, email, passwordHash, role, institutionId || null]
  );
  return findUserById(userId);
}

export async function resetWithTempPassword(userId, tempPassword) {
  const passwordHash = await hashPassword(tempPassword);
  await pool.query(
    `UPDATE auth.users
        SET password_hash = $1,
            status = 'reset_required',
            updated_at = NOW()
      WHERE user_id = $2`,
    [passwordHash, userId]
  );
  return findUserById(userId);
}

export async function createSession(userId, refreshToken) {
  const sessionId = uuidv4();
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + config.auth.refreshTtlSeconds * 1000);
  await pool.query(
    `INSERT INTO auth.sessions (session_id, user_id, refresh_token_hash, expires_at)
     VALUES ($1,$2,$3,$4)`,
    [sessionId, userId, refreshHash, expiresAt]
  );
  return { sessionId, expiresAt };
}

export async function verifyRefreshToken(refreshToken) {
  const refreshHash = hashToken(refreshToken);
  const { rows } = await pool.query(
    `SELECT s.*, u.role, u.institution_id
       FROM auth.sessions s
       JOIN auth.users u ON u.user_id = s.user_id
      WHERE s.refresh_token_hash = $1
        AND (s.revoked_at IS NULL)
        AND s.expires_at > NOW()
      LIMIT 1`,
    [refreshHash]
  );
  return rows[0];
}

export async function revokeSession(sessionId) {
  await pool.query(`UPDATE auth.sessions SET revoked_at = NOW() WHERE session_id = $1`, [sessionId]);
}

export async function createInvite({ email, institutionId, role, createdBy }) {
  const inviteId = uuidv4();
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + config.auth.inviteTtlHours * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO auth.invites (invite_id, email, institution_id, role, status, token, expires_at, created_by)
     VALUES ($1,$2,$3,$4,'pending',$5,$6,$7)`,
    [inviteId, email, institutionId || null, role, token, expiresAt, createdBy || null]
  );
  return { inviteId, token, expiresAt };
}

export async function findInviteByToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM auth.invites WHERE token = $1 AND status = 'pending' AND expires_at > NOW() LIMIT 1`,
    [token]
  );
  return rows[0];
}

export async function listUsers({ institutionId }) {
  const params = [];
  let where = '';
  if (institutionId) {
    params.push(institutionId);
    where = 'WHERE institution_id = $1';
  }
  const { rows } = await pool.query(
    `SELECT user_id, email, role, institution_id, status, created_at, updated_at FROM auth.users ${where} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

export async function recordAudit({ userId, action, ip, userAgent, metadata }) {
  await pool.query(
    `INSERT INTO auth.audit_log (audit_id, user_id, action, ip, user_agent, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [uuidv4(), userId || null, action, ip || null, userAgent || null, metadata || null]
  );
}

export async function updateUserStatus(userId, status) {
  await pool.query(`UPDATE auth.users SET status = $1, updated_at = NOW() WHERE user_id = $2`, [status, userId]);
  return findUserById(userId);
}
