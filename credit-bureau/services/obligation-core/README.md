## Obligation Core Service

Manages credit obligations (loans, credit cards, utility accounts) and their repayment history. Provides REST endpoints for creating obligations, updating statuses, fetching details, listing by borrower/institution, and recording repayments. Persists to `core.obligations` / `core.repayments`.

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
