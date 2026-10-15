import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateMemberAnalytics,
} from "../src/lib/memberAnalytics.js";

import {
  scoreNewEntrantAssessment,
} from "../src/lib/assessmentScoring.js";

const period = {
  start: "2026-09-21",
  end: "2026-10-02",
};

test("calculates two-week capacity correctly", () => {
  const result =
    calculateMemberAnalytics({
      member: {
        id: "member-1",
        name: "Alice",
        joinedAt: "2025-01-01",
        contractedHoursPerDay: 7.5,
        focusFactor: 80,

        skills: {
          Authentication: 90,
        },
      },

      tasks: [
        {
          id: "active-task",
          assigneeId: "member-1",
          status: "In Progress",
          remainingEffortHours: 30,
        },
      ],

      events: [],

      requirements: [
        {
          name: "Authentication",
          requiredLevel: 80,
          mandatory: true,
        },
      ],

      period,
      newTaskEffortHours: 10,
      now: new Date(
        "2026-09-24T12:00:00Z"
      ),
    });

  assert.equal(
    result.capacity.workingDays,
    10
  );

  assert.equal(
    result.capacity.grossHours,
    75
  );

  assert.equal(
    result.capacity.plannableHours,
    60
  );

  assert.equal(
    result.capacity.committedHours,
    30
  );

  assert.equal(
    result.capacity
      .projectedCommittedHours,
    40
  );

  assert.equal(
    result.capacity.utilisation,
    50
  );

  assert.equal(
    result.capacity
      .projectedUtilisation,
    66.7
  );
});

test("does not penalise a new entrant for missing history", () => {
  const result =
    calculateMemberAnalytics({
      member: {
        id: "new-member",
        name: "New entrant",
        joinedAt: "2026-09-23",
        contractedHoursPerDay: 7.5,
        focusFactor: 80,

        skills: {
          Authentication: 85,
        },
      },

      tasks: [],
      events: [],

      requirements: [
        {
          name: "Authentication",
          requiredLevel: 80,
          mandatory: true,
        },
      ],

      period,
      newTaskEffortHours: 10,

      now: new Date(
        "2026-09-24T12:00:00Z"
      ),
    });

  assert.equal(
    result.delivery.completedTaskCount,
    0
  );

  assert.equal(
    result.delivery
      .deliveryEvidenceScore,
    null
  );

  assert.equal(
    result.feedback.frequencyScore,
    null
  );

  assert.equal(
    result.confidence.isNewEntrant,
    true
  );

  assert.equal(
    result.confidence
      .recommendationStatus,
    "Provisional new entrant"
  );

  assert.equal(
    result.assignmentFit,
    100
  );

  assert.ok(
    result.confidence.score < 45
  );
});

test("calculates cycle time, throughput and delay", () => {
  const result =
    calculateMemberAnalytics({
      member: {
        id: "member-1",
        name: "Alice",
        joinedAt: "2025-01-01",
        contractedHoursPerDay: 7.5,
        focusFactor: 80,

        skills: {
          Authentication: 90,
        },
      },

      tasks: [
        {
          id: "completed-1",
          assigneeId: "member-1",
          type: "Authentication",
          status: "Done",
          startedAt: "2026-09-21",
          completedAt: "2026-09-25",
          dueAt: "2026-09-26",
          storyPoints: 5,
        },
        {
          id: "completed-2",
          assigneeId: "member-1",
          type: "Authentication",
          status: "Done",
          startedAt: "2026-09-22",
          completedAt: "2026-09-29",
          dueAt: "2026-09-28",
          storyPoints: 8,
        },
        {
          id: "completed-3",
          assigneeId: "member-1",
          type: "Authentication",
          status: "Done",
          startedAt: "2026-09-23",
          completedAt: "2026-09-30",
          dueAt: "2026-09-30",
          storyPoints: 3,
        },
      ],

      events: [],

      requirements: [
        {
          name: "Authentication",
          requiredLevel: 80,
        },
      ],

      period,

      now: new Date(
        "2026-09-30T12:00:00Z"
      ),
    });

  assert.equal(
    result.delivery.completedTaskCount,
    3
  );

  assert.equal(
    result.delivery.completedPoints,
    16
  );

  assert.equal(
    result.delivery.delayedTaskCount,
    1
  );

  assert.equal(
    result.delivery.onTimeRate,
    66.7
  );

  assert.equal(
    result.delivery.delayRate,
    33.3
  );

  assert.ok(
    result.delivery.medianCycleDays >
      0
  );

  assert.equal(
    result.confidence.isNewEntrant,
    false
  );

  assert.equal(
    result.confidence
      .recommendationStatus,
    "Established"
  );
});

test("calculates feedback frequency and response time", () => {
  const result =
    calculateMemberAnalytics({
      member: {
        id: "member-1",
        name: "Alice",
        joinedAt: "2025-01-01",
        contractedHoursPerDay: 7.5,
        focusFactor: 80,
        targetFeedbackPerWeek: 1,

        skills: {
          Authentication: 90,
        },
      },

      tasks: [],

      events: [
        {
          id: "feedback-1",
          memberId: "member-1",
          type: "feedback",
          requestedAt:
            "2026-09-22T09:00:00Z",
          respondedAt:
            "2026-09-22T13:00:00Z",
        },
        {
          id: "feedback-2",
          memberId: "member-1",
          type: "feedback",
          requestedAt:
            "2026-09-29T09:00:00Z",
          respondedAt:
            "2026-09-29T17:00:00Z",
        },
      ],

      requirements: [],
      period,

      now: new Date(
        "2026-10-02T12:00:00Z"
      ),
    });

  assert.equal(
    result.feedback.feedbackCount,
    2
  );

  assert.equal(
    result.feedback.feedbackPerWeek,
    1
  );

  assert.equal(
    result.feedback.frequencyScore,
    100
  );

  assert.equal(
    result.feedback
      .medianResponseHours,
    6
  );

  assert.equal(
    result.feedback.responseScore,
    100
  );
});

test("validates a new entrant assessment", () => {
  const assessment = {
    id: "developer-entry",
    name: "Developer assessment",
    version: "1.0",

    questions: [
      {
        id: "authentication-question",
        skill: "Authentication",
        type: "multiple-choice",
        weight: 1,
        correctAnswer:
          "OpenID Connect",
      },
      {
        id: "security-practical",
        skill: "Security",
        type: "practical",
        weight: 2,
      },
    ],
  };

  const result =
    scoreNewEntrantAssessment({
      assessment,

      responses: {
        "authentication-question":
          "OpenID Connect",

        "security-practical":
          "Submitted solution",
      },

      reviewerScores: {
        "security-practical": {
          score: 80,
          comment:
            "Good security approach.",
        },
      },

      completedAt:
        "2026-09-24T12:00:00Z",
    });

  assert.equal(
    result.status,
    "Validated"
  );

  assert.equal(
    result.completion,
    100
  );

  assert.equal(
    result.reviewCompleteness,
    100
  );

  assert.equal(
    result.skillScores.Authentication,
    100
  );

  assert.equal(
    result.skillScores.Security,
    80
  );

  assert.ok(
    result.overallScore > 80
  );
});

test("uses validated assessment evidence for a new entrant", () => {
  const assessment =
    scoreNewEntrantAssessment({
      assessment: {
        id: "developer-entry",
        name: "Developer assessment",
        version: "1.0",

        questions: [
          {
            id: "authentication-question",
            skill: "Authentication",
            type: "multiple-choice",
            weight: 1,
            correctAnswer:
              "OpenID Connect",
          },
        ],
      },

      responses: {
        "authentication-question":
          "OpenID Connect",
      },

      completedAt:
        "2026-09-24T12:00:00Z",
    });

  const result =
    calculateMemberAnalytics({
      member: {
        id: "new-member",
        name: "New entrant",
        joinedAt: "2026-09-23",
        contractedHoursPerDay: 7.5,
        focusFactor: 80,
        skills: {},
        assessments: [assessment],
      },

      tasks: [],
      events: [],

      requirements: [
        {
          name: "Authentication",
          requiredLevel: 80,
          mandatory: true,
        },
      ],

      period,
      newTaskEffortHours: 10,

      now: new Date(
        "2026-09-24T12:00:00Z"
      ),
    });

  assert.equal(
    result.skillMatch.score,
    100
  );

  assert.equal(
    result.confidence
      .recommendationStatus,
    "Validated new entrant"
  );

  assert.equal(
    result.assessmentEvidence.status,
    "Validated"
  );

  assert.equal(
    result.delivery
      .deliveryEvidenceScore,
    null
  );
});