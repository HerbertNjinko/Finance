import { config } from '../config.js';
import { InMemoryNotificationRepository } from './inMemoryRepository.js';
import { PostgresNotificationRepository } from './postgresRepository.js';

let repository;

export function getRepository() {
  if (!repository) {
    repository = config.db.enabled
      ? new PostgresNotificationRepository()
      : new InMemoryNotificationRepository();
  }
  return repository;
}

export function overrideRepository(repo) {
  repository = repo;
}

export async function closeRepository() {
  if (repository?.close) {
    await repository.close();
  }
  repository = null;
}
