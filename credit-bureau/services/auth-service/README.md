# Auth Service

Lightweight auth microservice issuing JWT access/refresh tokens and managing invitations for institution/regulator users.

## Endpoints
- `POST /auth/login` `{ email, password }` → `{ access_token, refresh_token, role, institution_id }`
- `POST /auth/refresh` `{ refresh_token }` → new access token
- `POST /auth/logout` `{ refresh_token? }` (revokes session if provided)
- `POST /auth/invitations` `{ email, institutionId?, role }` (regulator only, via Authorization Bearer)
- `POST /auth/invitations/{token}/accept` `{ password }` → creates user, returns tokens
- `GET /auth/users?institutionId=` (regulator only)

## Environment
- `PORT` (default 4106), `HOST`
- `AUTH_JWT_SECRET` (required in non-dev)
- `AUTH_ACCESS_TTL` (seconds, default 1800), `AUTH_REFRESH_TTL` (default 604800)
- `AUTH_INVITE_TTL_HOURS` (default 168)
- `AUTH_BCRYPT_ROUNDS` (default 12, lower in tests)
- `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE/PGSSLMODE`

## Quick curl examples
```bash
# Login
curl -s -X POST http://127.0.0.1:4106/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ops@demobank.cm","password":"Passw0rd!"}'

# Invite (regulator token)
curl -s -X POST http://127.0.0.1:4106/auth/invitations \
  -H "Authorization: Bearer $REGULATOR_ACCESS" \
  -H 'Content-Type: application/json' \
  -d '{"email":"uploader@demobank.cm","institutionId":"11111111-1111-1111-1111-111111111111","role":"institution"}'

# Accept invite (token from previous response)
curl -s -X POST http://127.0.0.1:4106/auth/invitations/{token}/accept \
  -H 'Content-Type: application/json' \
  -d '{"password":"Passw0rd!"}'
```
