## Integration Test Harness

Spin up Postgres locally (matching schema in `infrastructure/docs/db-schema.sql`) before running the service integration tests.

```bash
cd infrastructure/tests
docker compose up -d
```

Use port `5433` (as exposed in the compose file) and export the PG variables:

```bash
export PGHOST=127.0.0.1
export PGPORT=5433
export PGUSER=postgres
export PGPASSWORD=Advance12
export PGDATABASE=credit_bureau
```

Then run each service integration suite, e.g.:

```bash
cd services/obligation-core
npm run test:integration
```

Set `RUN_INTEGRATION_TESTS=1` if you prefer to drive tests manually. Stop containers afterwards:

```bash
cd infrastructure/tests
docker compose down -v
```
