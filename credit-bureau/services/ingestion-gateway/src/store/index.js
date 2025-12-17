import { config } from '../config.js';
import { InMemorySubmissionRepository } from './memoryStore.js';
import { PostgresSubmissionRepository } from './postgresStore.js';

let repositoryInstance;

export function getSubmissionRepository() {
  if (!repositoryInstance) {
    repositoryInstance = config.db.enabled
      ? new PostgresSubmissionRepository()
      : new InMemorySubmissionRepository();
  }
  return repositoryInstance;
}

export function overrideSubmissionRepository(repo) {
  repositoryInstance = repo;
}
