export class InMemorySubmissionRepository {
  constructor() {
    this.submissions = new Map();
  }

  async saveSubmission(submission) {
    this.submissions.set(submission.submissionId, submission);
    return submission;
  }

  async getSubmissionById(submissionId) {
    return this.submissions.get(submissionId);
  }

  clear() {
    this.submissions.clear();
  }
}
