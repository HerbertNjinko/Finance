import { createObligationSubmission, createPaymentSubmission, getSubmissionById } from '../services/submissionService.js';

function formatSubmissionResponse(submission) {
  return {
    submissionId: submission.submissionId,
    submissionType: submission.submissionType,
    institutionId: submission.institutionId,
    batchReference: submission.batchReference,
    status: submission.status,
    receivedAt: submission.receivedAt,
    acceptedRecords: submission.acceptedRecords,
    rejectedRecords: submission.rejectedRecords
  };
}

export async function handleObligationSubmission({ body }) {
  const submission = await createObligationSubmission(body);
  return {
    statusCode: 202,
    body: formatSubmissionResponse(submission)
  };
}

export async function handlePaymentSubmission({ body }) {
  const submission = await createPaymentSubmission(body);
  return {
    statusCode: 202,
    body: formatSubmissionResponse(submission)
  };
}

export async function handleGetSubmission({ params }) {
  const submission = await getSubmissionById(params.id);
  return {
    statusCode: 200,
    body: submission
  };
}
