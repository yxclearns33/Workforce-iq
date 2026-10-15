import { useEffect, useMemo, useState } from "react";
import {
  ahp,
  consensusScore,
  weightedScore,
} from "../../lib/scoring";

const createId = prefix =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const copy = value => JSON.parse(JSON.stringify(value));

const median = values => {
  const numbers = values
    .map(Number)
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  if (!numbers.length) return 0;

  const middle = Math.floor(numbers.length / 2);

  return numbers.length % 2
    ? numbers[middle]
    : (numbers[middle - 1] + numbers[middle]) / 2;
};

const resizePairwiseMatrix = (matrix = [], size) =>
  Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => {
      if (row === column) return 1;
      return Number(matrix?.[row]?.[column]) || 1;
    })
  );

const getAggregateScore = (
  decision,
  alternativeId,
  criterionId
) => {
  const submittedScores = (decision?.submissions || [])
    .map(
      submission =>
        submission.scores?.[alternativeId]?.[criterionId]
    )
    .filter(value => value !== undefined && value !== null);

  if (submittedScores.length) {
    return median(submittedScores);
  }

  const alternative = decision?.alternatives?.find(
    item => item.id === alternativeId
  );

  return Number(alternative?.scores?.[criterionId]) || 0;
};

const seedDecision = {
  id: "decision-1",
  title: "Select authentication approach",
  summary:
    "Select an authentication approach that balances security, delivery speed, cost and long-term maintainability.",
  owner: "Maya Verma",
  approver: "",
  status: "Collecting scores",
  method: "Weighted matrix",
  responseTarget: 3,
  deadline: "",
  linkedTo: "Risk: unauthorised access",
  anonymousResponses: false,

  criteria: [
    {
      id: "criterion-1",
      name: "Security",
      description: "Protection, compliance and identity assurance.",
      weight: 30,
      direction: "high",
      minimum: 7,
    },
    {
      id: "criterion-2",
      name: "Delivery speed",
      description: "How quickly the option can be implemented safely.",
      weight: 25,
      direction: "high",
      minimum: 0,
    },
    {
      id: "criterion-3",
      name: "Cost efficiency",
      description: "Implementation and operating cost.",
      weight: 20,
      direction: "high",
      minimum: 0,
    },
    {
      id: "criterion-4",
      name: "Maintainability",
      description: "Long-term support and operational sustainability.",
      weight: 25,
      direction: "high",
      minimum: 6,
    },
  ],

  alternatives: [
    {
      id: "alternative-1",
      name: "Managed identity provider",
      description: "Use a dedicated enterprise identity platform.",
      scores: {
        "criterion-1": 9,
        "criterion-2": 8,
        "criterion-3": 6,
        "criterion-4": 8,
      },
    },
    {
      id: "alternative-2",
      name: "Supabase Auth",
      description: "Use Supabase authentication and identity services.",
      scores: {
        "criterion-1": 8,
        "criterion-2": 9,
        "criterion-3": 9,
        "criterion-4": 8,
      },
    },
    {
      id: "alternative-3",
      name: "Custom authentication",
      description: "Build and maintain authentication internally.",
      scores: {
        "criterion-1": 6,
        "criterion-2": 4,
        "criterion-3": 5,
        "criterion-4": 6,
      },
    },
  ],

  participants: [
    {
      id: "participant-1",
      name: "Alice Chen",
      email: "alice@example.com",
      type: "Team member",
      expertise: "Security",
      status: "Submitted",
      selected: true,
    },
    {
      id: "participant-2",
      name: "David Kim",
      email: "david@example.com",
      type: "Team member",
      expertise: "Architecture",
      status: "Opened",
      selected: true,
    },
    {
      id: "participant-3",
      name: "External expert",
      email: "expert@example.com",
      type: "External expert",
      expertise: "Compliance",
      status: "Invited",
      selected: true,
    },
  ],

  submissions: [],
  attachments: [],

  pairwise: [
    [1, 2, 3, 2],
    [0.5, 1, 2, 1],
    [1 / 3, 0.5, 1, 0.5],
    [0.5, 1, 2, 1],
  ],

  decisionBrief: "",
  approval: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const createBlankDecision = () => {
  const criterionId = createId("criterion");
  const firstAlternativeId = createId("alternative");
  const secondAlternativeId = createId("alternative");

  return {
    id: createId("decision"),
    title: "Untitled decision",
    summary: "",
    owner: "",
    approver: "",
    status: "Draft",
    method: "Weighted matrix",
    responseTarget: 3,
    deadline: "",
    linkedTo: "",
    anonymousResponses: false,

    criteria: [
      {
        id: criterionId,
        name: "New criterion",
        description: "",
        weight: 100,
        direction: "high",
        minimum: 0,
      },
    ],

    alternatives: [
      {
        id: firstAlternativeId,
        name: "Option A",
        description: "",
        scores: { [criterionId]: 5 },
      },
      {
        id: secondAlternativeId,
        name: "Option B",
        description: "",
        scores: { [criterionId]: 5 },
      },
    ],

    participants: [],
    submissions: [],
    attachments: [],
    pairwise: [[1]],
    decisionBrief: "",
    approval: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const normaliseDecision = savedDecision => {
  const decision = {
    ...copy(seedDecision),
    ...savedDecision,
    criteria:
      savedDecision?.criteria?.length > 0
        ? savedDecision.criteria
        : copy(seedDecision.criteria),
    alternatives:
      savedDecision?.alternatives?.length > 0
        ? savedDecision.alternatives
        : copy(seedDecision.alternatives),
    participants: savedDecision?.participants || [],
    submissions: savedDecision?.submissions || [],
    attachments: savedDecision?.attachments || [],
  };

  if (decision.method === "AHP pairwise") {
    decision.method = "AHP-weighted scoring";
  }

  decision.pairwise = resizePairwiseMatrix(
    decision.pairwise,
    decision.criteria.length
  );

  return decision;
};

export default function DecisionRoom({
  onSendScoreRequests,
}) {
  const [decisions, setDecisions] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("wiq-decisions")
      );

      return saved?.length
        ? saved.map(normaliseDecision)
        : [normaliseDecision(seedDecision)];
    } catch {
      return [normaliseDecision(seedDecision)];
    }
  });

  const [selectedId, setSelectedId] = useState(
    decisions[0]?.id
  );

  const [activeSection, setActiveSection] =
    useState("setup");

  const [showScorePreview, setShowScorePreview] =
    useState(false);

  const [previewCriterionIndex, setPreviewCriterionIndex] =
    useState(0);

  const [previewScores, setPreviewScores] = useState({});
  const [previewConfidence, setPreviewConfidence] =
    useState("Medium");
  const [previewComment, setPreviewComment] = useState("");

  const [participantDraft, setParticipantDraft] = useState({
    name: "",
    email: "",
    type: "External expert",
    expertise: "",
  });

  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "wiq-decisions",
      JSON.stringify(decisions)
    );
  }, [decisions]);

  const decision =
    decisions.find(item => item.id === selectedId) ||
    decisions[0];

  const updateDecision = patch => {
    if (!decision) return;

    setDecisions(current =>
      current.map(item => {
        if (item.id !== decision.id) return item;

        const changes =
          typeof patch === "function"
            ? patch(item)
            : patch;

        return {
          ...item,
          ...changes,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const ahpResult = useMemo(() => {
    return ahp(decision?.pairwise || []);
  }, [decision?.pairwise]);

  const activeCriteria = useMemo(() => {
    if (!decision) return [];

    if (decision.method === "AHP-weighted scoring") {
      return decision.criteria.map((criterion, index) => ({
        ...criterion,
        weight:
          Number(ahpResult.weights?.[index] || 0) * 100,
      }));
    }

    if (decision.method === "Simple expert rating") {
      const equalWeight =
        100 / Math.max(1, decision.criteria.length);

      return decision.criteria.map(criterion => ({
        ...criterion,
        weight: equalWeight,
      }));
    }

    return decision.criteria;
  }, [decision, ahpResult.weights]);

  const ranking = useMemo(() => {
    if (!decision) return [];

    return decision.alternatives
      .map(alternative => {
        const aggregateScores = Object.fromEntries(
          activeCriteria.map(criterion => [
            criterion.id,
            getAggregateScore(
              decision,
              alternative.id,
              criterion.id
            ),
          ])
        );

        const failedCriteria =
          decision.method === "Gated weighted matrix"
            ? activeCriteria.filter(
                criterion =>
                  Number(criterion.minimum) > 0 &&
                  aggregateScores[criterion.id] <
                    Number(criterion.minimum)
              )
            : [];

        return {
          ...alternative,
          aggregateScores,
          failedCriteria,
          eligible: failedCriteria.length === 0,
          total: weightedScore(
            aggregateScores,
            activeCriteria
          ),
        };
      })
      .sort((first, second) => {
        if (first.eligible !== second.eligible) {
          return first.eligible ? -1 : 1;
        }

        return second.total - first.total;
      });
  }, [decision, activeCriteria]);

  const consensus = useMemo(() => {
    if (!decision?.submissions?.length) return 100;

    const cellScores = [];

    decision.alternatives.forEach(alternative => {
      decision.criteria.forEach(criterion => {
        const scores = decision.submissions
          .map(
            submission =>
              submission.scores?.[alternative.id]?.[
                criterion.id
              ]
          )
          .filter(
            value =>
              value !== undefined && value !== null
          );

        if (scores.length > 1) {
          cellScores.push(consensusScore(scores));
        }
      });
    });

    if (!cellScores.length) return 100;

    return Math.round(
      cellScores.reduce(
        (total, value) => total + value,
        0
      ) / cellScores.length
    );
  }, [decision]);

  const selectedParticipants =
    decision?.participants.filter(
      participant => participant.selected
    ) || [];

  const totalWeight = activeCriteria.reduce(
    (total, criterion) =>
      total + Number(criterion.weight || 0),
    0
  );

  const addDecision = () => {
    const nextDecision = createBlankDecision();

    setDecisions(current => [
      ...current,
      nextDecision,
    ]);

    setSelectedId(nextDecision.id);
    setActiveSection("setup");
  };

  const duplicateDecision = () => {
    const nextDecision = {
      ...copy(decision),
      id: createId("decision"),
      title: `${decision.title} — copy`,
      status: "Draft",
      submissions: [],
      approval: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDecisions(current => [
      ...current,
      nextDecision,
    ]);

    setSelectedId(nextDecision.id);
    setActiveSection("setup");
    setNotice("A new decision was created.");
  };

  const addCriterion = () => {
    const criterionId = createId("criterion");

    updateDecision(current => ({
      criteria: [
        ...current.criteria,
        {
          id: criterionId,
          name: "New criterion",
          description: "",
          weight: 0,
          direction: "high",
          minimum: 0,
        },
      ],

      alternatives: current.alternatives.map(
        alternative => ({
          ...alternative,
          scores: {
            ...alternative.scores,
            [criterionId]: 5,
          },
        })
      ),

      pairwise: resizePairwiseMatrix(
        current.pairwise,
        current.criteria.length + 1
      ),
    }));
  };

  const updateCriterion = (criterionId, patch) => {
    updateDecision(current => ({
      criteria: current.criteria.map(criterion =>
        criterion.id === criterionId
          ? { ...criterion, ...patch }
          : criterion
      ),
    }));
  };

  const removeCriterion = criterionId => {
    if (decision.criteria.length <= 1) {
      setNotice(
        "A decision must contain at least one criterion."
      );
      return;
    }

    const criterionIndex =
      decision.criteria.findIndex(
        criterion => criterion.id === criterionId
      );

    updateDecision(current => ({
      criteria: current.criteria.filter(
        criterion => criterion.id !== criterionId
      ),

      alternatives: current.alternatives.map(
        alternative => {
          const scores = { ...alternative.scores };
          delete scores[criterionId];

          return {
            ...alternative,
            scores,
          };
        }
      ),

      pairwise: current.pairwise
        .filter((_, row) => row !== criterionIndex)
        .map(row =>
          row.filter(
            (_, column) =>
              column !== criterionIndex
          )
        ),
    }));
  };

  const normaliseWeights = () => {
    const currentTotal = decision.criteria.reduce(
      (total, criterion) =>
        total + Number(criterion.weight || 0),
      0
    );

    const equalWeight =
      100 / Math.max(1, decision.criteria.length);

    updateDecision(current => ({
      criteria: current.criteria.map(criterion => ({
        ...criterion,
        weight:
          currentTotal > 0
            ? (Number(criterion.weight || 0) /
                currentTotal) *
              100
            : equalWeight,
      })),
    }));

    setNotice("Weights were normalised to 100%.");
  };

  const addAlternative = () => {
    const alternativeId = createId("alternative");

    updateDecision(current => ({
      alternatives: [
        ...current.alternatives,
        {
          id: alternativeId,
          name: `Option ${
            current.alternatives.length + 1
          }`,
          description: "",
          scores: Object.fromEntries(
            current.criteria.map(criterion => [
              criterion.id,
              5,
            ])
          ),
        },
      ],
    }));
  };

  const updateAlternative = (
    alternativeId,
    patch
  ) => {
    updateDecision(current => ({
      alternatives: current.alternatives.map(
        alternative =>
          alternative.id === alternativeId
            ? { ...alternative, ...patch }
            : alternative
      ),
    }));
  };

  const removeAlternative = alternativeId => {
    if (decision.alternatives.length <= 2) {
      setNotice(
        "Keep at least two alternatives for comparison."
      );
      return;
    }

    updateDecision(current => ({
      alternatives: current.alternatives.filter(
        alternative =>
          alternative.id !== alternativeId
      ),
    }));
  };

  const updateManualScore = (
    alternativeId,
    criterionId,
    value
  ) => {
    const score = Math.max(
      1,
      Math.min(10, Number(value) || 1)
    );

    updateDecision(current => ({
      alternatives: current.alternatives.map(
        alternative =>
          alternative.id === alternativeId
            ? {
                ...alternative,
                scores: {
                  ...alternative.scores,
                  [criterionId]: score,
                },
              }
            : alternative
      ),
    }));
  };

  const updatePairwise = (
    row,
    column,
    value
  ) => {
    const comparison = Math.max(
      1 / 9,
      Math.min(9, Number(value) || 1)
    );

    updateDecision(current => {
      const matrix = current.pairwise.map(items => [
        ...items,
      ]);

      matrix[row][column] = comparison;
      matrix[column][row] = 1 / comparison;

      return { pairwise: matrix };
    });
  };

  const addParticipant = event => {
    event.preventDefault();

    if (!participantDraft.email.trim()) {
      setNotice("Enter an email address.");
      return;
    }

    const participant = {
      id: createId("participant"),
      name:
        participantDraft.name.trim() ||
        participantDraft.email.split("@")[0],
      email: participantDraft.email.trim(),
      type: participantDraft.type,
      expertise:
        participantDraft.expertise.trim(),
      status: "Not sent",
      selected: true,
    };

    updateDecision(current => ({
      participants: [
        ...current.participants,
        participant,
      ],
      responseTarget:
        current.participants.length + 1,
    }));

    setParticipantDraft({
      name: "",
      email: "",
      type: "External expert",
      expertise: "",
    });
  };

  const updateParticipant = (
    participantId,
    patch
  ) => {
    updateDecision(current => ({
      participants: current.participants.map(
        participant =>
          participant.id === participantId
            ? { ...participant, ...patch }
            : participant
      ),
    }));
  };

  const removeParticipant = participantId => {
    updateDecision(current => ({
      participants: current.participants.filter(
        participant =>
          participant.id !== participantId
      ),
    }));
  };

  const addAttachment = file => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setNotice("Please select a PDF document.");
      return;
    }

    updateDecision(current => ({
      attachments: [
        ...current.attachments,
        {
          id: createId("attachment"),
          name: file.name,
          size: file.size,
          type: file.type,
        },
      ],
    }));

    setNotice(`${file.name} was attached.`);
  };

  const removeAttachment = attachmentId => {
    updateDecision(current => ({
      attachments: current.attachments.filter(
        attachment =>
          attachment.id !== attachmentId
      ),
    }));
  };

  const openScorePreview = () => {
    const scores = {};

    decision.alternatives.forEach(alternative => {
      scores[alternative.id] = {};

      decision.criteria.forEach(criterion => {
        scores[alternative.id][criterion.id] =
          getAggregateScore(
            decision,
            alternative.id,
            criterion.id
          ) || 5;
      });
    });

    setPreviewScores(scores);
    setPreviewCriterionIndex(0);
    setPreviewConfidence("Medium");
    setPreviewComment("");
    setShowScorePreview(true);
  };

  const sendScoreRequests = async () => {
    if (!selectedParticipants.length) {
      setNotice("Select at least one participant.");
      return;
    }

    if (!decision.summary.trim()) {
      setNotice(
        "Add a short decision write-up first."
      );
      setActiveSection("setup");
      return;
    }

    setSending(true);

    try {
      const request = {
        decisionId: decision.id,
        title: decision.title,
        summary: decision.summary,
        deadline: decision.deadline,
        method: decision.method,
        criteria: decision.criteria,
        alternatives:
          decision.alternatives.map(
            ({
              id,
              name,
              description,
            }) => ({
              id,
              name,
              description,
            })
          ),
        participants: selectedParticipants,
        attachments: decision.attachments,
      };

      if (onSendScoreRequests) {
        await onSendScoreRequests(request);
      }

      updateDecision(current => ({
        status: "Collecting scores",

        participants:
          current.participants.map(
            participant =>
              participant.selected
                ? {
                    ...participant,
                    status: "Invited",
                    invitedAt:
                      new Date().toISOString(),
                  }
                : participant
          ),
      }));

      setNotice(
        `${selectedParticipants.length} scoring request${
          selectedParticipants.length === 1
            ? ""
            : "s"
        } prepared.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The requests could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  const generateDecisionBrief = () => {
    const leadingAlternative =
      ranking.find(item => item.eligible) ||
      ranking[0];

    const failedAlternatives =
      ranking.filter(item => !item.eligible);

    const responseCount =
      decision.submissions.length;

    const brief = [
      `${
        leadingAlternative?.name ||
        "No alternative"
      } currently ranks first with ${
        leadingAlternative?.total?.toFixed(2) ||
        "0.00"
      } out of 10.`,

      `${responseCount} response${
        responseCount === 1 ? " has" : "s have"
      } been recorded, with ${consensus}% consensus.`,

      failedAlternatives.length
        ? `${failedAlternatives.length} alternative${
            failedAlternatives.length === 1
              ? " fails"
              : "s fail"
          } one or more mandatory criteria.`
        : "No alternatives currently fail a mandatory criterion.",

      decision.method ===
      "AHP-weighted scoring"
        ? `The AHP consistency ratio is ${(
            Number(
              ahpResult.consistencyRatio || 0
            ) * 100
          ).toFixed(1)}%.`
        : "The ranking uses the visible scores and criterion weights.",

      "Human review is required before approval.",
    ].join(" ");

    updateDecision({
      decisionBrief: brief,
      status: "Analysis",
    });

    setActiveSection("review");
    setNotice(
      "A decision brief was generated."
    );
  };

  const approveDecision = () => {
    const leadingAlternative =
      ranking.find(item => item.eligible) ||
      ranking[0];

    updateDecision({
      status: "Approved",
      approval: {
        alternativeId:
          leadingAlternative?.id,
        alternativeName:
          leadingAlternative?.name,
        approvedBy:
          decision.approver ||
          decision.owner ||
          "Decision owner",
        approvedAt: new Date().toISOString(),
        calculationMethod: decision.method,
        score: leadingAlternative?.total,
      },
    });

    setNotice(
      "The decision and calculation version were approved."
    );
  };

  if (!decision) return null;

  const previewCriterion =
    decision.criteria[
      Math.min(
        previewCriterionIndex,
        decision.criteria.length - 1
      )
    ];

  return (
    <div className="decision-layout decision-room-v2">
      {notice && (
        <div className="action-toast">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}

      <aside className="decision-list">
        <div>
          <span>DECISIONS</span>
          <button
            type="button"
            onClick={addDecision}
          >
            +
          </button>
        </div>

        {decisions.map(item => (
          <button
            type="button"
            key={item.id}
            className={
              item.id === decision.id
                ? "active"
                : ""
            }
            onClick={() =>
              setSelectedId(item.id)
            }
          >
            <strong>{item.title}</strong>
            <small>
              {item.status} ·{" "}
              {item.submissions?.length || 0}/
              {item.responseTarget}
            </small>
          </button>
        ))}
      </aside>

      <section className="decision-workspace">
        <header className="decision-head">
          <div>
            <span>DECISION ROOM</span>

            <input
              value={decision.title}
              onChange={event =>
                updateDecision({
                  title: event.target.value,
                })
              }
            />

            <p>
              {decision.linkedTo ||
                "Not linked to a project or risk"}
            </p>
          </div>

          <div>
            <button
              type="button"
              className="secondary-button"
              onClick={duplicateDecision}
            >
              Duplicate
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={openScorePreview}
            >
              Preview score form
            </button>

            <button
              type="button"
              className="primary-button"
              disabled={sending}
              onClick={sendScoreRequests}
            >
              {sending
                ? "Sending…"
                : `Request ${
                    selectedParticipants.length || ""
                  } score${
                    selectedParticipants.length === 1
                      ? ""
                      : "s"
                  }`}
            </button>
          </div>
        </header>

        <nav className="decision-tabs">
          {[
            ["setup", "Decision setup"],
            ["model", "Criteria & alternatives"],
            ["participants", "Participants"],
            ["results", "Live results"],
            ["review", "Review & approval"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={
                activeSection === id
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveSection(id)
              }
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="decision-kpis">
          <article>
            <strong>
              {decision.submissions.length}/
              {decision.responseTarget}
            </strong>
            <span>Responses</span>
          </article>

          <article>
            <strong>
              {ranking[0]?.total.toFixed(2) ||
                "—"}
            </strong>
            <span>Leading score</span>
          </article>

          <article>
            <strong>{consensus}%</strong>
            <span>Consensus</span>
          </article>

          <article>
            <strong>
              {decision.method ===
              "AHP-weighted scoring"
                ? `${(
                    Number(
                      ahpResult.consistencyRatio ||
                        0
                    ) * 100
                  ).toFixed(1)}%`
                : `${totalWeight.toFixed(1)}%`}
            </strong>

            <span>
              {decision.method ===
              "AHP-weighted scoring"
                ? "Consistency ratio"
                : "Total weight"}
            </span>
          </article>
        </div>

        {activeSection === "setup" && (
          <section className="decision-panel">
            <div className="section-heading">
              <div>
                <span>DECISION CONTEXT</span>
                <h3>
                  Explain what must be decided
                </h3>
              </div>
            </div>

            <div className="decision-form-grid">
              <label className="wide-field">
                Short decision write-up

                <textarea
                  value={decision.summary}
                  onChange={event =>
                    updateDecision({
                      summary:
                        event.target.value,
                    })
                  }
                  placeholder="Explain the problem, why the decision is needed and what participants should consider."
                />
              </label>

              <label>
                Decision owner

                <input
                  value={decision.owner}
                  onChange={event =>
                    updateDecision({
                      owner: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Approver

                <input
                  value={decision.approver}
                  onChange={event =>
                    updateDecision({
                      approver:
                        event.target.value,
                    })
                  }
                  placeholder="Authorised approver"
                />
              </label>

              <label>
                Linked project, sprint or risk

                <input
                  value={decision.linkedTo}
                  onChange={event =>
                    updateDecision({
                      linkedTo:
                        event.target.value,
                    })
                  }
                  placeholder="Project, sprint, risk or RAID record"
                />
              </label>

              <label>
                Response deadline

                <input
                  type="date"
                  value={decision.deadline}
                  onChange={event =>
                    updateDecision({
                      deadline:
                        event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Response target

                <input
                  type="number"
                  min="1"
                  value={decision.responseTarget}
                  onChange={event =>
                    updateDecision({
                      responseTarget: Math.max(
                        1,
                        Number(
                          event.target.value
                        )
                      ),
                    })
                  }
                />
              </label>

              <label>
                Decision method

                <select
                  value={decision.method}
                  onChange={event =>
                    updateDecision({
                      method:
                        event.target.value,
                    })
                  }
                >
                  <option>
                    Weighted matrix
                  </option>
                  <option>
                    AHP-weighted scoring
                  </option>
                  <option>
                    Gated weighted matrix
                  </option>
                  <option>
                    Simple expert rating
                  </option>
                </select>
              </label>
            </div>

            <div className="attachment-panel">
              <div>
                <strong>
                  Supporting evidence
                </strong>

                <small>
                  Attach a PDF for participants
                  to review before scoring.
                </small>
              </div>

              <label className="attachment-button">
                Attach PDF

                <input
                  hidden
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={event =>
                    addAttachment(
                      event.target.files?.[0]
                    )
                  }
                />
              </label>
            </div>

            {decision.attachments.map(
              attachment => (
                <div
                  className="attachment-row"
                  key={attachment.id}
                >
                  <span>📄</span>

                  <div>
                    <strong>
                      {attachment.name}
                    </strong>

                    <small>
                      {Math.ceil(
                        Number(
                          attachment.size || 0
                        ) / 1024
                      )}{" "}
                      KB
                    </small>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeAttachment(
                        attachment.id
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              )
            )}
          </section>
        )}

        {activeSection === "model" && (
          <>
            <section className="decision-panel">
              <div className="section-heading">
                <div>
                  <span>EDITABLE MODEL</span>
                  <h3>Decision criteria</h3>
                </div>

                <div className="section-actions">
                  {decision.method !==
                    "AHP-weighted scoring" && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={normaliseWeights}
                    >
                      Normalise weights
                    </button>
                  )}

                  <button
                    type="button"
                    className="primary-button"
                    onClick={addCriterion}
                  >
                    + Add criterion
                  </button>
                </div>
              </div>

              <div className="criteria-editor">
                {decision.criteria.map(
                  (criterion, index) => (
                    <article
                      className="criterion-editor"
                      key={criterion.id}
                    >
                      <div className="editor-number">
                        {index + 1}
                      </div>

                      <label>
                        Criterion

                        <input
                          value={criterion.name}
                          onChange={event =>
                            updateCriterion(
                              criterion.id,
                              {
                                name: event
                                  .target.value,
                              }
                            )
                          }
                        />
                      </label>

                      <label className="criterion-description">
                        Description

                        <input
                          value={
                            criterion.description ||
                            ""
                          }
                          onChange={event =>
                            updateCriterion(
                              criterion.id,
                              {
                                description:
                                  event.target
                                    .value,
                              }
                            )
                          }
                        />
                      </label>

                      <label>
                        Weight %

                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          disabled={
                            decision.method ===
                            "AHP-weighted scoring"
                          }
                          value={
                            decision.method ===
                            "AHP-weighted scoring"
                              ? Number(
                                  activeCriteria[
                                    index
                                  ]?.weight || 0
                                ).toFixed(1)
                              : criterion.weight
                          }
                          onChange={event =>
                            updateCriterion(
                              criterion.id,
                              {
                                weight: Number(
                                  event.target
                                    .value
                                ),
                              }
                            )
                          }
                        />
                      </label>

                      <label>
                        Direction

                        <select
                          value={
                            criterion.direction
                          }
                          onChange={event =>
                            updateCriterion(
                              criterion.id,
                              {
                                direction:
                                  event.target
                                    .value,
                              }
                            )
                          }
                        >
                          <option value="high">
                            Higher is better
                          </option>
                          <option value="low">
                            Lower is better
                          </option>
                        </select>
                      </label>

                      <label>
                        Minimum

                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={
                            criterion.minimum || 0
                          }
                          onChange={event =>
                            updateCriterion(
                              criterion.id,
                              {
                                minimum: Number(
                                  event.target
                                    .value
                                ),
                              }
                            )
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="danger-text-button"
                        onClick={() =>
                          removeCriterion(
                            criterion.id
                          )
                        }
                      >
                        Remove
                      </button>
                    </article>
                  )
                )}
              </div>
            </section>

            {decision.method ===
              "AHP-weighted scoring" && (
              <section className="decision-panel">
                <div className="section-heading">
                  <div>
                    <span>
                      AHP PAIRWISE COMPARISON
                    </span>
                    <h3>
                      Compare criterion importance
                    </h3>
                  </div>

                  <strong
                    className={
                      ahpResult.consistent
                        ? "consistency-good"
                        : "consistency-warning"
                    }
                  >
                    CR{" "}
                    {(
                      Number(
                        ahpResult.consistencyRatio ||
                          0
                      ) * 100
                    ).toFixed(1)}
                    %
                  </strong>
                </div>

                <div className="pairwise-table">
                  <div className="pairwise-row pairwise-header">
                    <b>Criterion</b>

                    {decision.criteria.map(
                      criterion => (
                        <span
                          key={criterion.id}
                        >
                          {criterion.name}
                        </span>
                      )
                    )}
                  </div>

                  {decision.criteria.map(
                    (rowCriterion, row) => (
                      <div
                        className="pairwise-row"
                        key={rowCriterion.id}
                      >
                        <b>
                          {rowCriterion.name}
                        </b>

                        {decision.criteria.map(
                          (
                            columnCriterion,
                            column
                          ) => (
                            <input
                              key={
                                columnCriterion.id
                              }
                              type="number"
                              min="0.111"
                              max="9"
                              step="0.01"
                              disabled={
                                row === column ||
                                column < row
                              }
                              value={Number(
                                decision.pairwise[
                                  row
                                ][column]
                              ).toFixed(2)}
                              onChange={event =>
                                updatePairwise(
                                  row,
                                  column,
                                  event.target
                                    .value
                                )
                              }
                            />
                          )
                        )}
                      </div>
                    )
                  )}
                </div>

                <p className="calculation-help">
                  Use 1 for equal importance,
                  3 for moderate preference, 5
                  for strong preference, 7 for
                  very strong preference and 9
                  for extreme preference.
                </p>
              </section>
            )}

            <section className="decision-panel">
              <div className="section-heading">
                <div>
                  <span>OPTIONS</span>
                  <h3>
                    Alternatives and manual scores
                  </h3>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={addAlternative}
                >
                  + Add alternative
                </button>
              </div>

              <div className="alternative-editor-grid">
                {decision.alternatives.map(
                  (alternative, index) => (
                    <article
                      className="alternative-editor"
                      key={alternative.id}
                    >
                      <header>
                        <span>
                          OPTION {index + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeAlternative(
                              alternative.id
                            )
                          }
                        >
                          Remove
                        </button>
                      </header>

                      <input
                        className="alternative-name-input"
                        value={alternative.name}
                        onChange={event =>
                          updateAlternative(
                            alternative.id,
                            {
                              name: event.target
                                .value,
                            }
                          )
                        }
                      />

                      <textarea
                        value={
                          alternative.description ||
                          ""
                        }
                        onChange={event =>
                          updateAlternative(
                            alternative.id,
                            {
                              description:
                                event.target
                                  .value,
                            }
                          )
                        }
                        placeholder="Describe this alternative"
                      />

                      <div className="manual-score-list">
                        {decision.criteria.map(
                          criterion => (
                            <label
                              key={criterion.id}
                            >
                              <span>
                                {criterion.name}
                                <small>1–10</small>
                              </span>

                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={
                                  alternative
                                    .scores[
                                    criterion.id
                                  ] ?? 5
                                }
                                onChange={event =>
                                  updateManualScore(
                                    alternative.id,
                                    criterion.id,
                                    event.target
                                      .value
                                  )
                                }
                              />
                            </label>
                          )
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          </>
        )}

        {activeSection === "participants" && (
          <section className="decision-panel">
            <div className="section-heading">
              <div>
                <span>
                  TEAM AND EXPERT INPUT
                </span>
                <h3>Scoring participants</h3>
              </div>

              <small>
                {selectedParticipants.length}{" "}
                selected
              </small>
            </div>

            <form
              className="participant-add-form"
              onSubmit={addParticipant}
            >
              <input
                value={participantDraft.name}
                onChange={event =>
                  setParticipantDraft(
                    current => ({
                      ...current,
                      name: event.target.value,
                    })
                  )
                }
                placeholder="Name"
              />

              <input
                type="email"
                value={participantDraft.email}
                onChange={event =>
                  setParticipantDraft(
                    current => ({
                      ...current,
                      email:
                        event.target.value,
                    })
                  )
                }
                placeholder="Email address"
              />

              <select
                value={participantDraft.type}
                onChange={event =>
                  setParticipantDraft(
                    current => ({
                      ...current,
                      type: event.target.value,
                    })
                  )
                }
              >
                <option>Team member</option>
                <option>
                  External expert
                </option>
                <option>Client</option>
                <option>Approver</option>
              </select>

              <input
                value={
                  participantDraft.expertise
                }
                onChange={event =>
                  setParticipantDraft(
                    current => ({
                      ...current,
                      expertise:
                        event.target.value,
                    })
                  )
                }
                placeholder="Expertise"
              />

              <button className="primary-button">
                Add participant
              </button>
            </form>

            <div className="participant-table">
              <div className="participant-row participant-header">
                <span>Select</span>
                <span>Participant</span>
                <span>Type</span>
                <span>Expertise</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              {decision.participants.map(
                participant => (
                  <div
                    className="participant-row"
                    key={participant.id}
                  >
                    <span>
                      <input
                        type="checkbox"
                        checked={
                          participant.selected
                        }
                        onChange={event =>
                          updateParticipant(
                            participant.id,
                            {
                              selected:
                                event.target
                                  .checked,
                            }
                          )
                        }
                      />
                    </span>

                    <div>
                      <strong>
                        {participant.name}
                      </strong>
                      <small>
                        {participant.email}
                      </small>
                    </div>

                    <span>
                      {participant.type}
                    </span>

                    <span>
                      {participant.expertise ||
                        "General"}
                    </span>

                    <span>
                      <b className="participant-status">
                        {participant.status}
                      </b>
                    </span>

                    <span>
                      <button
                        type="button"
                        className="danger-text-button"
                        onClick={() =>
                          removeParticipant(
                            participant.id
                          )
                        }
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                )
              )}

              {!decision.participants.length && (
                <div className="empty-state">
                  Add team members, clients or
                  external experts.
                </div>
              )}
            </div>

            <label className="privacy-choice">
              <input
                type="checkbox"
                checked={
                  decision.anonymousResponses
                }
                onChange={event =>
                  updateDecision({
                    anonymousResponses:
                      event.target.checked,
                  })
                }
              />

              Hide participant names in shared
              result views
            </label>
          </section>
        )}

        {activeSection === "results" && (
          <div className="decision-columns">
            <section className="score-matrix">
              <div className="section-heading">
                <div>
                  <span>LIVE CALCULATION</span>
                  <h3>{decision.method}</h3>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={generateDecisionBrief}
                >
                  Summarise decision
                </button>
              </div>

              <div className="matrix-table">
                <div className="matrix-row matrix-header">
                  <b>Alternative</b>

                  {activeCriteria.map(
                    criterion => (
                      <span
                        key={criterion.id}
                      >
                        {criterion.name}
                        <small>
                          {Number(
                            criterion.weight
                          ).toFixed(1)}
                          %
                        </small>
                      </span>
                    )
                  )}

                  <strong>Total</strong>
                </div>

                {ranking.map(
                  (alternative, index) => (
                    <div
                      className="matrix-row"
                      key={alternative.id}
                    >
                      <b>
                        <i>{index + 1}</i>

                        <span>
                          {alternative.name}

                          {!alternative.eligible && (
                            <small className="gate-failed">
                              Failed mandatory
                              criterion
                            </small>
                          )}
                        </span>
                      </b>

                      {activeCriteria.map(
                        criterion => (
                          <span
                            key={criterion.id}
                          >
                            <strong>
                              {Number(
                                alternative
                                  .aggregateScores[
                                  criterion.id
                                ]
                              ).toFixed(1)}
                            </strong>

                            <small>
                              {decision.submissions
                                .length
                                ? "Participant median"
                                : "Manual baseline"}
                            </small>
                          </span>
                        )
                      )}

                      <strong>
                        {alternative.total.toFixed(
                          2
                        )}
                      </strong>
                    </div>
                  )
                )}
              </div>

              <div className="formula-note">
                <strong>Calculation</strong>

                <code>
                  {decision.method ===
                  "AHP-weighted scoring"
                    ? "AHP weights → median participant scores → Σ(score × weight)"
                    : "Median participant score → Σ(score × normalised weight)"}
                </code>

                <span>
                  Manual scores remain the
                  baseline until participant
                  responses are received.
                </span>
              </div>
            </section>

            <aside className="decision-result">
              <span>RECOMMENDATION</span>

              <h3>{ranking[0]?.name}</h3>

              <strong>
                {ranking[0]?.total.toFixed(2)} /
                10
              </strong>

              <p>
                This option currently ranks first
                under the visible criteria,
                weights and evidence.
              </p>

              <div className="result-bars">
                {ranking.map(alternative => (
                  <div key={alternative.id}>
                    <span>
                      {alternative.name}
                      <b>
                        {alternative.total.toFixed(
                          2
                        )}
                      </b>
                    </span>

                    <i>
                      <em
                        style={{
                          width: `${Math.min(
                            100,
                            alternative.total *
                              10
                          )}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={generateDecisionBrief}
              >
                Prepare approval review
              </button>

              <small>
                An authorised person must approve
                the recommendation.
              </small>
            </aside>
          </div>
        )}

        {activeSection === "review" && (
          <section className="decision-panel review-panel">
            <div className="section-heading">
              <div>
                <span>HUMAN REVIEW</span>
                <h3>
                  Decision brief and approval
                </h3>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={generateDecisionBrief}
              >
                Regenerate summary
              </button>
            </div>

            <textarea
              className="decision-brief-editor"
              value={
                decision.decisionBrief || ""
              }
              onChange={event =>
                updateDecision({
                  decisionBrief:
                    event.target.value,
                })
              }
              placeholder="Generate or write the recommendation, evidence, disagreement and assumptions."
            />

            <div className="approval-card">
              <div>
                <span>LEADING OPTION</span>
                <h3>{ranking[0]?.name}</h3>
                <p>
                  {ranking[0]?.total.toFixed(2)} /
                  10 · {consensus}% consensus ·{" "}
                  {decision.submissions.length}{" "}
                  responses
                </p>
              </div>

              <div className="approval-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    updateDecision({
                      status:
                        "Collecting scores",
                    })
                  }
                >
                  Request more input
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    updateDecision({
                      status: "Under review",
                    })
                  }
                >
                  Keep under review
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={approveDecision}
                >
                  Approve decision
                </button>
              </div>
            </div>

            {decision.approval && (
              <div className="approved-record">
                <strong>
                  Approved decision
                </strong>

                <span>
                  {
                    decision.approval
                      .alternativeName
                  }
                </span>

                <small>
                  Approved by{" "}
                  {decision.approval.approvedBy}{" "}
                  on{" "}
                  {new Date(
                    decision.approval.approvedAt
                  ).toLocaleString()}
                </small>
              </div>
            )}
          </section>
        )}
      </section>

      {showScorePreview &&
        previewCriterion && (
          <div
            className="modal-backdrop"
            onClick={() =>
              setShowScorePreview(false)
            }
          >
            <form
              className="score-card participant-preview-card"
              onClick={event =>
                event.stopPropagation()
              }
              onSubmit={event => {
                event.preventDefault();

                if (
                  previewCriterionIndex <
                  decision.criteria.length - 1
                ) {
                  setPreviewCriterionIndex(
                    index => index + 1
                  );
                } else {
                  setShowScorePreview(false);
                  setNotice(
                    "Preview completed. No live response was recorded."
                  );
                }
              }}
            >
              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setShowScorePreview(false)
                }
              >
                ×
              </button>

              <span>
                PARTICIPANT PREVIEW ·{" "}
                {previewCriterionIndex + 1} OF{" "}
                {decision.criteria.length}
              </span>

              <h2>{decision.title}</h2>
              <p>{decision.summary}</p>

              {decision.attachments.length >
                0 && (
                <div className="preview-attachments">
                  {decision.attachments.map(
                    attachment => (
                      <span
                        key={attachment.id}
                      >
                        📄 {attachment.name}
                      </span>
                    )
                  )}
                </div>
              )}

              <div className="preview-criterion">
                <small>CRITERION</small>
                <h3>
                  {previewCriterion.name}
                </h3>
                <p>
                  {
                    previewCriterion.description
                  }
                </p>
              </div>

              {decision.alternatives.map(
                alternative => (
                  <label
                    className="preview-score-row"
                    key={alternative.id}
                  >
                    <span>
                      <strong>
                        {alternative.name}
                      </strong>

                      <small>
                        {
                          alternative.description
                        }
                      </small>
                    </span>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={
                        previewScores?.[
                          alternative.id
                        ]?.[
                          previewCriterion.id
                        ] || 5
                      }
                      onChange={event =>
                        setPreviewScores(
                          current => ({
                            ...current,
                            [alternative.id]: {
                              ...current[
                                alternative.id
                              ],
                              [previewCriterion.id]:
                                Number(
                                  event.target
                                    .value
                                ),
                            },
                          })
                        )
                      }
                    />

                    <output>
                      {previewScores?.[
                        alternative.id
                      ]?.[
                        previewCriterion.id
                      ] || 5}
                    </output>
                  </label>
                )
              )}

              <label>
                Confidence

                <select
                  value={previewConfidence}
                  onChange={event =>
                    setPreviewConfidence(
                      event.target.value
                    )
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>

              <textarea
                value={previewComment}
                onChange={event =>
                  setPreviewComment(
                    event.target.value
                  )
                }
                placeholder="Optional evidence, assumptions or comment"
              />

              <div className="preview-actions">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    previewCriterionIndex === 0
                  }
                  onClick={() =>
                    setPreviewCriterionIndex(
                      index =>
                        Math.max(0, index - 1)
                    )
                  }
                >
                  Previous
                </button>

                <button className="primary-button">
                  {previewCriterionIndex ===
                  decision.criteria.length - 1
                    ? "Finish preview"
                    : "Save and continue"}
                </button>
              </div>
            </form>
          </div>
        )}
    </div>
  );
}