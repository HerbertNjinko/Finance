## Score Service

Calculates and serves borrower credit scores stored in `core.credit_scores`. Supports retrieving the latest score for an entity, triggering recalculation events (heuristic scoring for now; swap with production model later), and consuming Kafka obligation events to auto-refresh scores.

### Install

```bash
cd services/score-service
npm install
```

### Environment

```bash
cp .env.example .env
source .env
npm start
```

Important env vars: `SCORE_API_KEYS`, `PG*`, `KAFKA_*`, `SCORE_MODEL_VERSION`.

### Test

```bash
npm test
```

Unit tests run with an in-memory repository.
