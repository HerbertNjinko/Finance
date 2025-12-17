import crypto from 'node:crypto';
import { getRepository } from '../repositories/index.js';
import { validateRecalcPayload } from '../validation/scoreValidators.js';

function buildError(message, details = [], statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function determineRiskTier(score) {
  if (score >= 750) return 'low';
  if (score >= 600) return 'medium';
  return 'high';
}

export async function getScoreByEntity(entityId) {
  const repository = getRepository();
  const score = await repository.getLatest(entityId);
  if (!score) {
    throw buildError('Score not found', [], 404);
  }
  return score;
}

export async function recalculateScore(payload = {}) {
  const errors = validateRecalcPayload(payload);
  if (errors.length) {
    throw buildError('Invalid recalc payload', errors);
  }
  const repository = getRepository();

  const baseScore = payload.baseScore ?? 650;
  const penalty = (payload.factors?.derogatoryEvents || 0) * 40;
  const bonus = (payload.factors?.positiveHistory || 0) * 10;
  const scoreValue = Math.max(300, Math.min(900, baseScore - penalty + bonus));

  const stored = await repository.insertScore({
    scoreId: crypto.randomUUID(),
    entityId: payload.entityId,
    modelVersion: payload.modelVersion,
    score: Math.round(scoreValue),
    riskTier: determineRiskTier(scoreValue),
    adverseReasons: payload.adverseReasons || []
  });

  return stored;
}
