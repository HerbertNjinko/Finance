import http from 'node:http';
import { config } from './config.js';
import {
  findUserByEmail,
  createSession,
  verifyRefreshToken,
  revokeSession,
  createInvite,
  findInviteByToken,
  createUserFromInvite,
  listUsers,
  recordAudit,
  updateUserStatus,
  findUserById,
  updatePasswordAndActivate
} from './repository.js';
import { verifyPassword } from './password.js';
import { signAccessToken, signRefreshToken, verifyToken } from './tokens.js';

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    return null;
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseAuth(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  try {
    return verifyToken(token);
  } catch (err) {
    return null;
  }
}

function requireRegulator(res, claims) {
  if (!claims || claims.role !== 'regulator') {
    send(res, 403, { code: 'forbidden', message: 'Regulator access required' });
    return false;
  }
  return true;
}

async function handleLogin(req, res) {
  const body = await readJson(req);
  if (!body) return send(res, 400, { code: 'invalid_json', message: 'Invalid JSON body' });
  const { email, password } = body;
  if (!email || !password) return send(res, 400, { code: 'invalid_request', message: 'email and password are required' });

  const user = await findUserByEmail(email);
  if (!user || (user.status !== 'active' && user.status !== 'reset_required')) {
    return send(res, 401, { code: 'invalid_credentials', message: 'Invalid email or password' });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return send(res, 401, { code: 'invalid_credentials', message: 'Invalid email or password' });
  if (user.status === 'reset_required') {
    return send(res, 403, { code: 'reset_required', message: 'Password reset required' });
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const session = await createSession(user.user_id, refreshToken);
  await recordAudit({ userId: user.user_id, action: 'login' });

  return send(res, 200, {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: config.auth.accessTtlSeconds,
    refresh_expires_in: config.auth.refreshTtlSeconds,
    session_id: session.sessionId,
    role: user.role,
    institution_id: user.institution_id
  });
}

async function handleRefresh(req, res) {
  const body = await readJson(req);
  if (!body) return send(res, 400, { code: 'invalid_json', message: 'Invalid JSON body' });
  const { refresh_token } = body;
  if (!refresh_token) return send(res, 400, { code: 'invalid_request', message: 'refresh_token is required' });
  let payload;
  try {
    payload = verifyToken(refresh_token);
  } catch (err) {
    return send(res, 401, { code: 'invalid_token', message: 'Refresh token invalid or expired' });
  }
  if (payload.type !== 'refresh') return send(res, 400, { code: 'invalid_token', message: 'Not a refresh token' });
  const session = await verifyRefreshToken(refresh_token);
  if (!session) return send(res, 401, { code: 'invalid_token', message: 'Refresh token revoked or expired' });

  const user = await findUserByEmail(session.email || payload.email || '');
  // If user lookup by email fails, fallback to payload
  const userForToken = user || { user_id: session.user_id, role: session.role, institution_id: session.institution_id };
  const accessToken = signAccessToken(userForToken);
  await recordAudit({ userId: session.user_id, action: 'refresh' });
  return send(res, 200, { access_token: accessToken, expires_in: config.auth.accessTtlSeconds });
}

async function handleLogout(req, res, claims) {
  const body = await readJson(req);
  const { refresh_token } = body || {};
  if (refresh_token) {
    const session = await verifyRefreshToken(refresh_token);
    if (session) {
      await revokeSession(session.session_id);
    }
  }
  await recordAudit({ userId: claims?.sub, action: 'logout' });
  return send(res, 200, { success: true });
}

async function handleInvite(req, res, claims) {
  if (!requireRegulator(res, claims)) return;
  const body = await readJson(req);
  if (!body) return send(res, 400, { code: 'invalid_json', message: 'Invalid JSON body' });
  const { email, institutionId, role } = body;
  if (!email || !role) return send(res, 400, { code: 'invalid_request', message: 'email and role are required' });
  const invite = await createInvite({ email, institutionId, role, createdBy: claims.sub });
  await recordAudit({ userId: claims.sub, action: 'invite_sent', metadata: { email, institutionId, role } });
  return send(res, 201, { inviteId: invite.inviteId, token: invite.token, expires_at: invite.expiresAt });
}

async function handleAcceptInvite(req, res, token) {
  const body = await readJson(req);
  if (!body) return send(res, 400, { code: 'invalid_json', message: 'Invalid JSON body' });
  const { password } = body;
  if (!password) return send(res, 400, { code: 'invalid_request', message: 'password is required' });
  const invite = await findInviteByToken(token);
  if (!invite) return send(res, 400, { code: 'invalid_invite', message: 'Invite token invalid or expired' });
  const user = await createUserFromInvite(invite, password);
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await createSession(user.user_id, refreshToken);
  await recordAudit({ userId: user.user_id, action: 'invite_accepted' });
  return send(res, 200, {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: config.auth.accessTtlSeconds,
    refresh_expires_in: config.auth.refreshTtlSeconds,
    role: user.role,
    institution_id: user.institution_id
  });
}

async function handleListUsers(req, res, claims, requestUrl) {
  if (!requireRegulator(res, claims)) return;
  const institutionId = requestUrl.searchParams.get('institutionId') || undefined;
  const users = await listUsers({ institutionId });
  return send(res, 200, { items: users });
}

async function handleUpdateUserStatus(req, res, claims, userId) {
  if (!requireRegulator(res, claims)) return;
  const body = await readJson(req);
  if (!body) return send(res, 400, { code: 'invalid_json', message: 'Invalid JSON body' });
  const { status } = body;
  if (!status || !['active', 'locked', 'reset_required', 'pending'].includes(status)) {
    return send(res, 400, { code: 'invalid_request', message: 'status is required and must be valid' });
  }
  const user = await findUserById(userId);
  if (!user) return send(res, 404, { code: 'not_found', message: 'User not found' });
  const updated = await updateUserStatus(userId, status);
  await recordAudit({ userId: claims.sub, action: 'user_status_change', metadata: { target: userId, status } });
  return send(res, 200, updated);
}

async function handleResetPassword(req, res) {
  const body = await readJson(req);
  if (!body) return send(res, 400, { code: 'invalid_json', message: 'Invalid JSON body' });
  const { email, current_password, new_password } = body;
  if (!email || !current_password || !new_password) {
    return send(res, 400, { code: 'invalid_request', message: 'email, current_password, new_password are required' });
  }
  const user = await findUserByEmail(email);
  if (!user) return send(res, 401, { code: 'invalid_credentials', message: 'Invalid email or password' });
  const ok = await verifyPassword(current_password, user.password_hash);
  if (!ok) return send(res, 401, { code: 'invalid_credentials', message: 'Invalid email or password' });
  const updated = await updatePasswordAndActivate(user.user_id, new_password);
  await recordAudit({ userId: user.user_id, action: 'password_reset' });
  const accessToken = signAccessToken(updated);
  const refreshToken = signRefreshToken(updated);
  await createSession(updated.user_id, refreshToken);
  return send(res, 200, {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: config.auth.accessTtlSeconds,
    refresh_expires_in: config.auth.refreshTtlSeconds,
    role: updated.role,
    institution_id: updated.institution_id
  });
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const claims = parseAuth(req);

    if (req.method === 'POST' && requestUrl.pathname === '/auth/login') {
      return handleLogin(req, res);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/auth/refresh') {
      return handleRefresh(req, res);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/auth/logout') {
      return handleLogout(req, res, claims);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/auth/invitations') {
      return handleInvite(req, res, claims);
    }
    if (req.method === 'POST' && requestUrl.pathname.startsWith('/auth/invitations/')) {
      const token = requestUrl.pathname.split('/').pop();
      return handleAcceptInvite(req, res, token);
    }
    if (req.method === 'GET' && requestUrl.pathname === '/auth/users') {
      return handleListUsers(req, res, claims, requestUrl);
    }
    if (req.method === 'PATCH' && requestUrl.pathname.startsWith('/auth/users/')) {
      const userId = requestUrl.pathname.split('/').pop();
      return handleUpdateUserStatus(req, res, claims, userId);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/auth/reset-password') {
      return handleResetPassword(req, res);
    }

    send(res, 404, { code: 'not_found', message: 'Route not found' });
  });
}
