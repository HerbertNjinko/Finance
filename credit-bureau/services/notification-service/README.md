## Notification Service

Manages notification templates and queues notification events for delivery. Persists to `notifications.notification_templates` and `notifications.notification_events`. Delivery adapters (SMS, email) can subscribe to these events later.

### Install

```bash
cd services/notification-service
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

Unit tests leverage the in-memory repository.
