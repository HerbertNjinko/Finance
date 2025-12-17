## API Gateway

Simple reverse proxy that fronts all backend services (ingestion, identity, obligation, score, notification, dispute). Enforces a shared API key and forwards requests to internal services while injecting their respective API keys.

### Install

```bash
cd services/api-gateway
npm install
```

### Environment

```bash
cp .env.example .env
source .env
npm start
```

### Routes

| Gateway path prefix | Upstream service |
| --- | --- |
| `/ingestion` | Ingestion Gateway |
| `/identities`, `/identity-clusters` | Identity Resolution |
| `/obligations` | Obligation Core |
| `/scores` | Score Service |
| `/notifications` | Notification Service |
| `/disputes` | Dispute Service |

Send requests to the gateway (including `x-api-key` header) and it will proxy to internal services with their individual API keys.
