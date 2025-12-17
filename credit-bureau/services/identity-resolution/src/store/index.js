import { config } from '../config.js';
import { InMemoryIdentityStore } from './memoryStore.js';
import { PostgresIdentityStore } from './postgresStore.js';

let storeInstance;

export function getIdentityStore() {
  if (!storeInstance) {
    storeInstance = config.db.enabled ? new PostgresIdentityStore() : new InMemoryIdentityStore();
  }
  return storeInstance;
}

export function overrideIdentityStore(store) {
  storeInstance = store;
}

export async function closeIdentityStore() {
  if (storeInstance?.close) {
    await storeInstance.close();
  }
  storeInstance = null;
}
