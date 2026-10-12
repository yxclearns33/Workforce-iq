import { getLatestValidatedAssessment } from "./assessmentScoring.js";

export const MEMBER_ANALYTICS_VERSION = "member-analytics-v1.1";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const clamp = (value, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

const round = (value, places = 1) => {
  const multiplier = 10 ** places;
  return Math.round((Number(value) || 0) * multiplier) / multiplier;
};

const validDate = value => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const median = values => {
  const numbers = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  if (!numbers.length) return null;

  const middle = Math.floor(numbers.length / 2);

  return numbers.length % 2
    ? numbers[middle]
    : (numbers[middle - 1] + numbers[middle]) / 2;
};

const percentile = (values, percentage) => {
  const numbers = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  if (!numbers.length) return null;
  if (numbers.length === 1) return numbers[0];

  const index = (numbers.length - 1) * percentage;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  return (
    numbers[lower] +
    (numbers[upper] - numbers[lower]) * fraction
  );
};

const differenceHours = (start, end) => {
  const startDate = validDate(start);
  const endDate = validDate(end);

  if (!startDate || !endDate || endDate < startDate) return null;

  return (endDate.getTime() - startDate.getTime()) / HOUR_MS;
};

const differenceDays = (start, end) => {
  const hours = differenceHours(start, end);
  return hours === null ? null : hours / 24;
};

const workingDaysBetween = (start, end) => {
  const startDate = validDate(start);
  const endDate = validDate(end);

  if (!startDate || !endDate || endDate < startDate) return 0;

  let count = 0;
  const cursor = new Date(startDate);

  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const day = cursor.getUTCDay();

    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
};

const weeksBetween = (start, end) => {
  const startDate = validDate(start);
  const endDate = validDate(end);

  if (!startDate || !endDate) return 1;

  return Math.max(1, workingDaysBetween(start, end) / 5);
};

const isCompleted = task =>
  ["done", "completed", "closed"].includes(
    String(task.status || "").toLowerCase()
  );

const isActive = task =>
  !isCompleted(task) &&
  !["cancelled", "canceled"].includes(
    String(task.status || "").toLowerCase()
  );

const taskStartedAt = task =>
  task.startedAt ||
  task.inProgressAt ||
  task.createdAt;

const taskCompletedAt = task =>
  task.completedAt ||
  task.doneAt ||
  task.closedAt;

const taskEffortHours = task =>
  Number(
    task.remainingEffortHours ??
      task.remainingHours ??
      task.estimatedHours ??
      task.effortHours ??
      0
  );

const taskPoints = task =>
  Number(task.storyPoints ?? task.points ?? task.effort ?? 0);

const scoreLowerIsBetter = (value, good, poor) => {
  if (value === null || value === undefined) return null;
  if (value <= good) return 100;
  if (value >= poor) return 20;

  const position = (value - good) / (poor - good);
  return round(100 - position * 80);
};

const scoreAgainstBenchmark = (value, benchmark) => {
  if (
    value === null ||
    benchmark === null ||
    benchmark === undefined ||
    benchmark <= 0
  ) {
    return null;
  }

  const ratio = value / benchmark;

  if (ratio >= 1.25) return 100;
  if (ratio >= 1) return round(80 + ((ratio - 1) / 0.25) * 20);
  if (ratio >= 0.5) return round(40 + ((ratio - 0.5) / 0.5) * 40);

  return round(clamp(ratio * 80, 0, 40));
};

const weightedAvailableScore = components => {
  const available = components.filter(
    component =>
      component.value !== null &&
      component.value !== undefined &&
      Number.isFinite(Number(component.value))
  );

  if (!available.length) return null;

  const totalWeight = available.reduce(
    (total, component) => total + component.weight,
    0
  );

  if (!totalWeight) return null;

  return round(
    available.reduce(
      (total, component) =>
        total +
        clamp(component.value) *
          (component.weight / totalWeight),
      0
    )
  );
};

const confidenceLabel = score => {
  if (score >= 75) return "High";
  if (score >= 45) return "Medium";
  return "Low";
};

const normaliseSkills = skills => {
  if (Array.isArray(skills)) {
    return Object.fromEntries(
      skills.map(skill => [
        String(skill.name || skill.skill || "").toLowerCase(),
        Number(
          skill.score ??
            skill.level ??
            skill.proficiency ??
            0
        ),
      ])
    );
  }

  return Object.fromEntries(
    Object.entries(skills || {}).map(([name, value]) => [
      name.toLowerCase(),
      Number(
        typeof value === "object"
          ? value.score ??
              value.level ??
              value.proficiency ??
              0
          : value
      ),
    ])
  );
};

const calculateSkillMatch = (member, requirements = []) => {
  if (!requirements.length) {
    return {
      score: null,
      matched: [],
      missing: [],
    };
  }

  const memberSkills = normaliseSkills(member.skills);
  let totalWeight = 0;
  let weightedScore = 0;
  const matched = [];
  const missing = [];

  requirements.forEach(requirement => {
    const name = String(requirement.name || "").trim();
    const key = name.toLowerCase();
    const requiredLevel = Number(requirement.requiredLevel || 70);
    const weight = Number(requirement.weight || 1);
    const memberLevel = Number(memberSkills[key] || 0);

    totalWeight += weight;

    const requirementScore =
      requiredLevel > 0
        ? clamp((memberLevel / requiredLevel) * 100)
        : 100;

    weightedScore += requirementScore * weight;

    const record = {
      name,
      requiredLevel,
      memberLevel,
      score: round(requirementScore),
      mandatory: Boolean(requirement.mandatory),
    };

    if (memberLevel >= requiredLevel) matched.push(record);
    else missing.push(record);
  });

  return {
    score: totalWeight
      ? round(weightedScore / totalWeight)
      : null,
    matched,
    missing,
  };
};

const calculateCapacity = ({
  member,
  tasks,
  period,
  teamFocusFactor = 0.8,
  newTaskEffortHours = 0,
}) => {
  const workingDays = workingDaysBetween(
    period.start,
    period.end
  );

  const weeks = weeksBetween(period.start, period.end);
  const hoursPerDay = Number(
    member.contractedHoursPerDay ?? 7.5
  );

  const grossHours = workingDays * hoursPerDay;

  const leaveHours = Number(
    member.leaveHours ??
      member.capacityAdjustments?.leaveHours ??
      0
  );

  const holidayHours = Number(
    member.holidayHours ??
      member.capacityAdjustments?.holidayHours ??
      0
  );

  const meetingHours =
    Number(
      member.meetingHoursPerWeek ??
        member.capacityAdjustments?.meetingHoursPerWeek ??
        0
    ) * weeks;

  const supportHours =
    Number(
      member.supportHoursPerWeek ??
        member.capacityAdjustments?.supportHoursPerWeek ??
        0
    ) * weeks;

  const trainingHours = Number(
    member.trainingHours ??
      member.capacityAdjustments?.trainingHours ??
      0
  );

  const otherHours = Number(
    member.otherCommitmentHours ??
      member.capacityAdjustments?.otherHours ??
      0
  );

  const unavailableHours =
    leaveHours +
    holidayHours +
    meetingHours +
    supportHours +
    trainingHours +
    otherHours;

  const netAvailableHours = Math.max(
    0,
    grossHours - unavailableHours
  );

  const focusFactor = clamp(
    member.focusFactor ?? teamFocusFactor,
    40,
    100
  ) / 100;

  const plannableHours = netAvailableHours * focusFactor;

  const assignedTasks = tasks.filter(
    task =>
      task.assigneeId === member.id &&
      isActive(task)
  );

  const committedHours = assignedTasks.reduce(
    (total, task) => total + taskEffortHours(task),
    0
  );

  const projectedCommittedHours =
    committedHours + Number(newTaskEffortHours || 0);

  const utilisation =
    plannableHours > 0
      ? (committedHours / plannableHours) * 100
      : committedHours > 0
        ? 200
        : 0;

  const projectedUtilisation =
    plannableHours > 0
      ? (projectedCommittedHours / plannableHours) * 100
      : projectedCommittedHours > 0
        ? 200
        : 0;

  const capacitySuitability =
    projectedUtilisation <= 70
      ? 100
      : projectedUtilisation <= 80
        ? 90
        : projectedUtilisation <= 90
          ? 70
          : projectedUtilisation <= 100
            ? 40
            : 0;

  return {
    workingDays,
    weeks: round(weeks, 2),
    hoursPerDay,
    grossHours: round(grossHours),
    leaveHours: round(leaveHours),
    holidayHours: round(holidayHours),
    meetingHours: round(meetingHours),
    supportHours: round(supportHours),
    trainingHours: round(trainingHours),
    otherHours: round(otherHours),
    unavailableHours: round(unavailableHours),
    netAvailableHours: round(netAvailableHours),
    focusFactor: round(focusFactor * 100),
    plannableHours: round(plannableHours),
    committedHours: round(committedHours),
    projectedCommittedHours: round(projectedCommittedHours),
    headroomHours: round(plannableHours - committedHours),
    projectedHeadroomHours: round(
      plannableHours - projectedCommittedHours
    ),
    utilisation: round(utilisation),
    projectedUtilisation: round(projectedUtilisation),
    capacitySuitability,
    activeTaskCount: assignedTasks.length,
    overallocated: projectedUtilisation > 100,
  };
};

const calculateFeedbackMetrics = ({
  member,
  events,
  period,
}) => {
  const memberEvents = events.filter(
    event => event.memberId === member.id
  );

  const feedbackEvents = memberEvents.filter(
    event =>
      event.type === "feedback" ||
      event.type === "feedback_request"
  );

  const checkIns = memberEvents.filter(
    event =>
      event.type === "check_in" ||
      event.type === "checkin" ||
      event.type === "task_update"
  );

  const responseHours = feedbackEvents
    .map(event =>
      differenceHours(
        event.requestedAt || event.createdAt,
        event.respondedAt || event.responseAt
      )
    )
    .filter(value => value !== null);

  const weeks = weeksBetween(period.start, period.end);
  const feedbackFrequency =
    feedbackEvents.length / Math.max(1, weeks);

  const checkInFrequency =
    checkIns.length / Math.max(1, weeks);

  const targetFeedbackPerWeek = Number(
    member.targetFeedbackPerWeek ?? 1
  );

  const frequencyScore = feedbackEvents.length
    ? clamp(
        (feedbackFrequency /
          Math.max(0.1, targetFeedbackPerWeek)) *
          100
      )
    : null;

  const medianResponseHours = median(responseHours);

  const responseScore = scoreLowerIsBetter(
    medianResponseHours,
    8,
    72
  );

  return {
    feedbackCount: feedbackEvents.length,
    checkInCount: checkIns.length,
    feedbackPerWeek: round(feedbackFrequency, 2),
    checkInsPerWeek: round(checkInFrequency, 2),
    targetFeedbackPerWeek,
    frequencyScore:
      frequencyScore === null ? null : round(frequencyScore),
    medianResponseHours:
      medianResponseHours === null
        ? null
        : round(medianResponseHours),
    responseScore,
  };
};

const calculateDeliveryMetrics = ({
  member,
  tasks,
  period,
  benchmarks,
  feedback,
}) => {
  const memberTasks = tasks.filter(
    task => task.assigneeId === member.id
  );

  const completedTasks = memberTasks.filter(task => {
    if (!isCompleted(task)) return false;

    const completedAt = validDate(taskCompletedAt(task));
    const start = validDate(period.start);
    const end = validDate(period.end);

    if (!completedAt || !start || !end) return true;
    return completedAt >= start && completedAt <= end;
  });

  const activeTasks = memberTasks.filter(isActive);

  const cycleTimes = completedTasks
    .map(task =>
      differenceDays(
        taskStartedAt(task),
        taskCompletedAt(task)
      )
    )
    .filter(value => value !== null);

  const medianCycleDays = median(cycleTimes);
  const cycleP85Days = percentile(cycleTimes, 0.85);

  const weeks = weeksBetween(period.start, period.end);

  const completedPoints = completedTasks.reduce(
    (total, task) => total + taskPoints(task),
    0
  );

  const taskThroughput =
    completedTasks.length / Math.max(1, weeks);

  const pointThroughput =
    completedPoints / Math.max(1, weeks);

  const tasksWithDueDates = completedTasks.filter(
    task => validDate(task.dueAt || task.dueDate)
  );

  const delayedTasks = tasksWithDueDates.filter(task => {
    const dueAt = validDate(task.dueAt || task.dueDate);
    const completedAt = validDate(taskCompletedAt(task));

    return dueAt && completedAt && completedAt > dueAt;
  });

  const onTimeRate = tasksWithDueDates.length
    ? ((tasksWithDueDates.length - delayedTasks.length) /
        tasksWithDueDates.length) *
      100
    : null;

  const delayRate = tasksWithDueDates.length
    ? (delayedTasks.length / tasksWithDueDates.length) *
      100
    : null;

  const blockedTasks = memberTasks.filter(
    task =>
      String(task.status || "").toLowerCase() ===
        "blocked" ||
      Number(task.blockedDays || 0) > 0
  );

  const cycleScore =
    medianCycleDays === null ||
    !benchmarks.medianCycleDays
      ? null
      : scoreLowerIsBetter(
          medianCycleDays /
            benchmarks.medianCycleDays,
          1,
          2
        );

  const throughputScore = scoreAgainstBenchmark(
    pointThroughput,
    benchmarks.medianPointThroughput
  );

  const onTimeScore =
    onTimeRate === null ? null : clamp(onTimeRate);

  const deliveryEvidenceScore = weightedAvailableScore([
    { value: cycleScore, weight: 25 },
    { value: throughputScore, weight: 15 },
    { value: onTimeScore, weight: 25 },
    { value: feedback.frequencyScore, weight: 15 },
    { value: feedback.responseScore, weight: 20 },
  ]);

  return {
    completedTaskCount: completedTasks.length,
    activeTaskCount: activeTasks.length,
    blockedTaskCount: blockedTasks.length,
    completedPoints: round(completedPoints),
    taskThroughputPerWeek: round(taskThroughput, 2),
    pointThroughputPerWeek: round(pointThroughput, 2),
    medianCycleDays:
      medianCycleDays === null
        ? null
        : round(medianCycleDays, 2),
    cycleP85Days:
      cycleP85Days === null
        ? null
        : round(cycleP85Days, 2),
    dueDatedTaskCount: tasksWithDueDates.length,
    delayedTaskCount: delayedTasks.length,
    onTimeRate:
      onTimeRate === null ? null : round(onTimeRate),
    delayRate:
      delayRate === null ? null : round(delayRate),
    cycleScore,
    throughputScore,
    onTimeScore,
    deliveryEvidenceScore,
  };
};

const calculateRelevantExperience = ({
  member,
  tasks,
  requirements,
}) => {
  const requirementNames = requirements.map(requirement =>
    String(requirement.name || "").toLowerCase()
  );

  if (!requirementNames.length) {
    return {
      score: null,
      relevantCompletedTasks: 0,
      relevantTaskIds: [],
    };
  }

  const completedTasks = tasks.filter(
    task =>
      task.assigneeId === member.id &&
      isCompleted(task)
  );

  const relevantTasks = completedTasks.filter(task => {
    const taskText = [
      task.name,
      task.title,
      task.type,
      task.subtype,
      ...(task.skills || []),
      ...(task.labels || []),
    ]
      .join(" ")
      .toLowerCase();

    return requirementNames.some(name =>
      taskText.includes(name)
    );
  });

  const relevantPoints = relevantTasks.reduce(
    (total, task) => total + taskPoints(task),
    0
  );

  const taskEvidenceScore = clamp(
    (relevantTasks.length / 8) * 100
  );

  const pointEvidenceScore = clamp(
    (relevantPoints / 40) * 100
  );

  return {
    score: relevantTasks.length
      ? round(
          taskEvidenceScore * 0.7 +
            pointEvidenceScore * 0.3
        )
      : null,
    relevantCompletedTasks: relevantTasks.length,
    relevantCompletedPoints: round(relevantPoints),
    relevantTaskIds: relevantTasks.map(task => task.id),
  };
};

export const calculateTeamBenchmarks = ({
  tasks,
  period,
}) => {
  const completedTasks = tasks.filter(isCompleted);

  const cycleTimes = completedTasks
    .map(task =>
      differenceDays(
        taskStartedAt(task),
        taskCompletedAt(task)
      )
    )
    .filter(value => value !== null);

  const weeks = weeksBetween(period.start, period.end);
  const pointsByMember = {};

  completedTasks.forEach(task => {
    if (!task.assigneeId) return;

    pointsByMember[task.assigneeId] =
      (pointsByMember[task.assigneeId] || 0) +
      taskPoints(task);
  });

  const pointThroughputs = Object.values(
    pointsByMember
  ).map(points => points / Math.max(1, weeks));

  return {
    medianCycleDays: median(cycleTimes),
    medianPointThroughput: median(pointThroughputs),
    focusFactor: 0.8,
  };
};

const calculateWeeklyTrend = ({
  member,
  tasks,
  period,
  capacity,
}) => {
  const startDate = validDate(period.start);
  const endDate = validDate(period.end);

  if (!startDate || !endDate) return [];

  const weekCount = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) /
        (7 * DAY_MS)
    )
  );

  const weeklyCapacity =
    capacity.plannableHours / weekCount;

  return Array.from({ length: weekCount }, (_, index) => {
    const weekStart = new Date(
      startDate.getTime() + index * 7 * DAY_MS
    );

    const weekEnd = new Date(
      Math.min(
        endDate.getTime(),
        weekStart.getTime() + 7 * DAY_MS - 1
      )
    );

    const activeDuringWeek = tasks.filter(task => {
      if (task.assigneeId !== member.id) return false;

      const createdAt =
        validDate(taskStartedAt(task)) || validDate(task.createdAt);

      const completedAt = validDate(taskCompletedAt(task));

      return (
        (!createdAt || createdAt <= weekEnd) &&
        (!completedAt || completedAt >= weekStart)
      );
    });

    const committedHours = activeDuringWeek.reduce(
      (total, task) => total + taskEffortHours(task),
      0
    );

    const completedPoints = tasks
      .filter(task => {
        if (task.assigneeId !== member.id) return false;

        const completedAt = validDate(taskCompletedAt(task));

        return (
          completedAt &&
          completedAt >= weekStart &&
          completedAt <= weekEnd
        );
      })
      .reduce(
        (total, task) => total + taskPoints(task),
        0
      );

    const blocked = activeDuringWeek.filter(
      task =>
        String(task.status || "").toLowerCase() ===
        "blocked"
    ).length;

    return {
      week: weekStart.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      capacity: round(weeklyCapacity),
      committed: round(committedHours),
      utilisation:
        weeklyCapacity > 0
          ? round(
              (committedHours / weeklyCapacity) * 100
            )
          : 0,
      completedPoints: round(completedPoints),
      blocked,
    };
  });
};

const deepFreeze = value => {
  if (
    !value ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  Object.values(value).forEach(deepFreeze);

  return value;
};

export const calculateMemberAnalytics = ({
  member,
  tasks = [],
  events = [],
  requirements = [],
  period,
  teamBenchmarks,
  newTaskEffortHours = 0,
  projectId = null,
  now = new Date(),
}) => {
  const assessmentEvidence = getLatestValidatedAssessment(
    member.assessments || []
  );

  const evidenceMember = assessmentEvidence
    ? {
        ...member,
        skills: {
          ...(member.skills || {}),
          ...(assessmentEvidence.skillScores || {}),
        },
      }
    : member;

  const benchmarks =
    teamBenchmarks ||
    calculateTeamBenchmarks({ tasks, period });

  const capacity = calculateCapacity({
    member: evidenceMember,
    tasks,
    period,
    teamFocusFactor:
      Number(benchmarks.focusFactor || 0.8) * 100,
    newTaskEffortHours,
  });

  const feedback = calculateFeedbackMetrics({
    member: evidenceMember,
    events,
    period,
  });

  const delivery = calculateDeliveryMetrics({
    member: evidenceMember,
    tasks,
    period,
    benchmarks,
    feedback,
  });

  const skillMatch = calculateSkillMatch(
    evidenceMember,
    requirements
  );

  const relevantExperience =
    calculateRelevantExperience({
      member: evidenceMember,
      tasks,
      requirements,
    });

  const memberCreatedAt = validDate(
    member.joinedAt || member.createdAt
  );

  const tenureDays = memberCreatedAt
    ? differenceDays(memberCreatedAt, now)
    : null;

  const isNewEntrant =
    delivery.completedTaskCount < 3 ||
    (tenureDays !== null && tenureDays < 28);

  const projectContinuity = projectId
    ? clamp(
        tasks.filter(
          task =>
            task.assigneeId === member.id &&
            task.projectId === projectId
        ).length * 15
      )
    : null;

  const assignmentFit = weightedAvailableScore([
    { value: skillMatch.score, weight: 40 },
    {
      value: relevantExperience.score,
      weight: 20,
    },
    {
      value: capacity.capacitySuitability,
      weight: 20,
    },
    {
      value: delivery.deliveryEvidenceScore,
      weight: 15,
    },
    {
      value: projectContinuity,
      weight: 5,
    },
  ]);

  const completedEvidence = Math.min(
    1,
    delivery.completedTaskCount / 8
  );

  const metricAvailability = [
    skillMatch.score,
    relevantExperience.score,
    capacity.capacitySuitability,
    delivery.deliveryEvidenceScore,
    projectContinuity,
  ].filter(value => value !== null).length;

  const completeness = metricAvailability / 5;

  const responseEvidence = Math.min(
    1,
    feedback.feedbackCount / 5
  );

  const confidenceScore = clamp(
    completedEvidence * 45 +
      completeness * 35 +
      responseEvidence * 20
  );

  const recommendationStatus = isNewEntrant
    ? assessmentEvidence
      ? "Validated new entrant"
      : "Provisional new entrant"
    : "Established";

  const warnings = [];

  if (capacity.overallocated) {
    warnings.push(
      `Projected utilisation would be ${capacity.projectedUtilisation}%.`
    );
  }

  if (skillMatch.missing.some(skill => skill.mandatory)) {
    warnings.push(
      "One or more mandatory skills are below the required level."
    );
  }

  if (isNewEntrant) {
    warnings.push(
      "New entrant: historical delivery data is limited. Use validated skills assessment, supervised work and manager review."
    );
  }

  if (confidenceScore < 45) {
    warnings.push(
      "The recommendation has low evidence confidence."
    );
  }

  const weeklyTrend = calculateWeeklyTrend({
    member: evidenceMember,
    tasks,
    period,
    capacity,
  });

  const snapshot = {
    id: `${member.id}-${now.getTime()}`,
    formulaVersion: MEMBER_ANALYTICS_VERSION,
    memberId: member.id,
    calculatedAt: now.toISOString(),
    period: {
      start: period.start,
      end: period.end,
    },
    capacity,
    delivery,
    feedback,
    skillMatch,
    relevantExperience,
    assessmentEvidence,
    projectContinuity,
    assignmentFit,
    confidence: {
      score: round(confidenceScore),
      label: confidenceLabel(confidenceScore),
      recommendationStatus,
      isNewEntrant,
      completedEvidenceTasks:
        delivery.completedTaskCount,
    },
    benchmarks: {
      medianCycleDays:
        benchmarks.medianCycleDays === null
          ? null
          : round(benchmarks.medianCycleDays, 2),
      medianPointThroughput:
        benchmarks.medianPointThroughput === null
          ? null
          : round(
              benchmarks.medianPointThroughput,
              2
            ),
      focusFactor: round(
        Number(benchmarks.focusFactor || 0.8) * 100
      ),
    },
    weeklyTrend,
    warnings,
  };

  return deepFreeze(snapshot);
};
