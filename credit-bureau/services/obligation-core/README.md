## Obligation Core Service

Manages credit obligations (loans, credit cards, utility accounts) and their repayment history. Provides REST endpoints for creating obligations, updating statuses, fetching details, listing by borrower/institution, and recording repayments. Persists to `core.obligations` / `core.repayments` and emits Kafka events (`obligation.created`, `obligation.status_updated`, `obligation.repayment_recorded`) consumed by downstream services like scoring.

### Requirements

- Node.js 22+
- Postgres (for production runs)

### Install

```bash
cd services/obligation-core
npm install
```

### Environment

```bash
cp .env.example .env
source .env
npm start
```

Key variables: `OBLIGATION_API_KEYS`, `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE`.

### Run

```bash
npm start
```

### Test

```bash
npm test
```

Tests operate on the in-memory repository; no Postgres needed.

### Integration test

```bash
PGHOST=127.0.0.1 PGPORT=5433 PGUSER=postgres PGPASSWORD=Advance12 PGDATABASE=credit_bureau \
npm run test:integration
```

Requires a running Postgres instance (see `infrastructure/tests/README.md`).
