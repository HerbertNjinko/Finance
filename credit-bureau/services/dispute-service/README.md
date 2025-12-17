## Dispute Service

Tracks borrower disputes reported through institutions or consumer portals. Persists to `disputes.disputes`, exposes endpoints to create/read/update/list disputes, and emits Kafka events (`dispute.created`, `dispute.updated`) so downstream systems (notifications, analytics) stay in sync.

### Install

```bash
cd services/dispute-service
npm install
```

### Environment

```bash
cp .env.example .env
source .env
npm start
```

### Test

```bash
npm test
```

Tests run with the in-memory repository.
