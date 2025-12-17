import { getScoreByEntity, recalculateScore } from '../services/scoreService.js';

export async function getScoreHandler({ params }) {
  const result = await getScoreByEntity(params[0]);
  return { statusCode: 200, body: result };
}

export async function recalcScoreHandler({ body }) {
  const result = await recalculateScore(body);
  return { statusCode: 200, body: result };
}
