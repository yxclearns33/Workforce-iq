export const ASSESSMENT_FORMULA_VERSION = "assessment-scoring-v1.0";

const clamp = value => Math.min(100, Math.max(0, Number(value) || 0));
const round = (value, places = 1) => {
  const factor = 10 ** places;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const hasResponse = value => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim() !== "";
};

const sameAnswer = (actual, expected) => {
  if (Array.isArray(expected)) {
    const left = [...(Array.isArray(actual) ? actual : [actual])].map(String).sort();
    const right = [...expected].map(String).sort();
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return String(actual ?? "").trim().toLowerCase() === String(expected ?? "").trim().toLowerCase();
};

const scoreQuestion = (question, response, reviewerScores) => {
  if (!hasResponse(response)) return { score: null, reviewed: false };
  const reviewer = reviewerScores?.[question.id];
  if (question.type === "practical" || question.type === "reviewed") {
    return reviewer && Number.isFinite(Number(reviewer.score))
      ? { score: clamp(reviewer.score), reviewed: true, comment: reviewer.comment || "" }
      : { score: null, reviewed: false };
  }
  if (question.type === "number" && Number.isFinite(Number(question.correctAnswer))) {
    const tolerance = Number(question.tolerance || 0);
    return { score: Math.abs(Number(response) - Number(question.correctAnswer)) <= tolerance ? 100 : 0, reviewed: true };
  }
  if (question.correctAnswer !== undefined) {
    return { score: sameAnswer(response, question.correctAnswer) ? 100 : 0, reviewed: true };
  }
  return reviewer && Number.isFinite(Number(reviewer.score))
    ? { score: clamp(reviewer.score), reviewed: true, comment: reviewer.comment || "" }
    : { score: null, reviewed: false };
};

export const scoreNewEntrantAssessment = ({
  assessment,
  responses = {},
  reviewerScores = {},
  completedAt = new Date().toISOString(),
}) => {
  const questions = assessment?.questions || [];
  const answered = questions.filter(question => hasResponse(responses[question.id])).length;
  const scored = questions.map(question => ({
    question,
    ...scoreQuestion(question, responses[question.id], reviewerScores),
  }));
  const reviewable = scored.filter(item => item.question.type === "practical" || item.question.type === "reviewed");
  const reviewed = reviewable.filter(item => item.reviewed).length;
  const completion = questions.length ? round((answered / questions.length) * 100) : 0;
  const reviewCompleteness = reviewable.length ? round((reviewed / reviewable.length) * 100) : 100;

  const bySkill = {};
  scored.forEach(item => {
    if (item.score === null) return;
    const skill = item.question.skill || "General";
    const weight = Number(item.question.weight || 1);
    bySkill[skill] ||= { weighted: 0, weight: 0 };
    bySkill[skill].weighted += item.score * weight;
    bySkill[skill].weight += weight;
  });
  const skillScores = Object.fromEntries(
    Object.entries(bySkill).map(([skill, value]) => [skill, round(value.weighted / value.weight)])
  );
  const weightedItems = scored.filter(item => item.score !== null);
  const totalWeight = weightedItems.reduce((sum, item) => sum + Number(item.question.weight || 1), 0);
  const overallScore = totalWeight
    ? round(weightedItems.reduce((sum, item) => sum + item.score * Number(item.question.weight || 1), 0) / totalWeight)
    : null;
  const status = completion === 100 && reviewCompleteness === 100 && overallScore !== null
    ? "Validated"
    : completion === 100
      ? "Awaiting review"
      : "In progress";

  return Object.freeze({
    id: `${assessment?.id || "assessment"}-${Date.parse(completedAt) || Date.now()}`,
    assessmentId: assessment?.id || null,
    assessmentName: assessment?.name || "Assessment",
    assessmentVersion: assessment?.version || "1.0",
    formulaVersion: ASSESSMENT_FORMULA_VERSION,
    completedAt,
    status,
    completion,
    reviewCompleteness,
    overallScore,
    skillScores: Object.freeze(skillScores),
    responses: Object.freeze({ ...responses }),
    reviewerScores: Object.freeze({ ...reviewerScores }),
  });
};

export const getLatestValidatedAssessment = assessments =>
  [...(assessments || [])]
    .filter(assessment => assessment?.status === "Validated")
    .sort((first, second) => new Date(second.completedAt || 0) - new Date(first.completedAt || 0))[0] || null;
