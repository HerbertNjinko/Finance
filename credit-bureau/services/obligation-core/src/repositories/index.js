import { config } from '../config.js';
import { InMemoryObligationRepository } from './inMemoryRepository.js';
import { PostgresObligationRepository } from './postgresRepository.js';

let repository;

export function getRepository() {
  if (!repository) {
    repository = config.db.enabled
      ? new PostgresObligationRepository()
      : new InMemoryObligationRepository();
  }
  return repository;
}

export function overrideRepository(instance) {
  repository = instance;
}

export async function closeRepository() {
  if (repository?.close) {
    await repository.close();
  }
  repository = null;
}
