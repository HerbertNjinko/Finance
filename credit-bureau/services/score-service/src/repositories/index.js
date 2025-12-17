import { config } from '../config.js';
import { InMemoryScoreRepository } from './inMemoryRepository.js';
import { PostgresScoreRepository } from './postgresRepository.js';

let repository;

export function getRepository() {
  if (!repository) {
    repository = config.db.enabled ? new PostgresScoreRepository() : new InMemoryScoreRepository();
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
