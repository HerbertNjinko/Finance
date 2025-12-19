import {
  createInstitution,
  listInstitutions,
  updateInstitution,
  deleteInstitution
} from '../services/institutionService.js';

export async function createInstitutionHandler({ body }) {
  const institution = await createInstitution(body);
  return { statusCode: 201, body: institution };
}

export async function listInstitutionsHandler() {
  const institutions = await listInstitutions();
  return { statusCode: 200, body: { items: institutions } };
}

export async function updateInstitutionHandler({ params, body }) {
  const institution = await updateInstitution(params[0], body);
  return { statusCode: 200, body: institution };
}

export async function deleteInstitutionHandler({ params }) {
  await deleteInstitution(params[0]);
  return { statusCode: 204, body: null };
}
