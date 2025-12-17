## Dispute Service

Tracks borrower disputes reported through institutions or consumer portals. Persists to `disputes.disputes` and exposes endpoints to create, read, update, and list disputes with workflow metadata.

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
