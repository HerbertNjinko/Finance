import { config } from '../config.js';
import { InMemoryDisputeRepository } from './inMemoryRepository.js';
import { PostgresDisputeRepository } from './postgresRepository.js';

let repository;

export function getRepository() {
  if (!repository) {
    repository = config.db.enabled ? new PostgresDisputeRepository() : new InMemoryDisputeRepository();
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
