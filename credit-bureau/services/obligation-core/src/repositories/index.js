import { config } from '../config.js';
import { InMemoryObligationRepository } from './inMemoryRepository.js';
import { PostgresObligationRepository } from './postgresRepository.js';
import { InMemoryInstitutionRepository } from './inMemoryInstitutionRepository.js';
import { PostgresInstitutionRepository } from './postgresInstitutionRepository.js';

let obligationRepository;
let institutionRepository;

export function getRepository() {
  if (!obligationRepository) {
    obligationRepository = config.db.enabled
      ? new PostgresObligationRepository()
      : new InMemoryObligationRepository();
  }
  return obligationRepository;
}

export function overrideRepository(instance) {
  obligationRepository = instance;
}

export function getInstitutionRepository() {
  if (!institutionRepository) {
    institutionRepository = config.db.enabled
      ? new PostgresInstitutionRepository()
      : new InMemoryInstitutionRepository();
  }
  return institutionRepository;
}

export async function closeRepository() {
  if (obligationRepository?.close) {
    await obligationRepository.close();
  }
  obligationRepository = null;
  if (institutionRepository?.close) {
    await institutionRepository.close();
  }
  institutionRepository = null;
}
