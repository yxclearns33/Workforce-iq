import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

const TYPES = ["Risk", "Assumption", "Issue", "Dependency"];
const CATEGORIES = [
  "Delivery",
  "Technical",
  "People",
  "Supplier",
  "Security",
  "Financial",
  "Operational",
  "Compliance",
];

const TREATMENTS = ["Avoid", "Reduce", "Transfer", "Accept"];
const STATUSES = ["Draft", "Open", "Monitoring", "Accepted", "Closed"];

const INITIAL_PROJECTS = [
  {
    id: "rp1",
    name: "WorkForce IQ",
    description: "Primary product delivery",
    status: "Active",
  },
];

const INITIAL_RISKS = [
  {
    id: "risk-1",
    projectId: "rp1",
    sprintId: "s2",
    recordType: "Risk",
    title: "Authentication delivery delay",
    cause: "Authentication requirements remain unresolved",
    event: "Authentication development exceeds the sprint",
    impactStatement: "The release date could be delayed",
    category: "Delivery",
    ownerId: "m2",
    likelihood: 4,
    impact: 4,
    controlEffectiveness: 60,
    treatment: "Reduce",
    status: "Open",
    kri: "Blocked days",
    threshold: "> 3 days",
    reviewDate: "",
    notes: "",
    createdAt: new Date().toISOString(),
  },
];

const emptyRisk = (projectId, sprintId = "") => ({
  projectId,
  sprintId,
  recordType: "Risk",
  title: "",
  cause: "",
  event: "",
  impactStatement: "",
  category: "Delivery",
  ownerId: "",
  likelihood: 3,
  impact: 3,
  controlEffectiveness: 0,
  treatment: "Reduce",
  status: "Draft",
  kri: "",
  threshold: "",
  reviewDate: "",
  notes: "",
});

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID?.() || Date.now()}`;
}

function numberBetween(value, minimum, maximum) {
  const number = Number(value);
  if (Number.isNaN(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, number));
}

function inherentScore(risk) {
  return Number(risk.likelihood || 0) * Number(risk.impact || 0);
}

function residualScore(risk) {
  const inherent = inherentScore(risk);
  const control = numberBetween(risk.controlEffectiveness, 0, 100);

  return Math.max(0, Math.round(inherent * (1 - control / 100)));
}

function rating(score) {
  if (score >= 15) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

function normaliseHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function valueFrom(row, names) {
  const entries = Object.entries(row);
  const wanted = names.map(normaliseHeader);

  const match = entries.find(([header]) =>
    wanted.includes(normaliseHeader(header)),
  );

  return match?.[1] ?? "";
}

export default function RiskCenter({
  tasks = [],
  members = [],
  sprints = [],
  calcRisk,
}) {
  const fileRef = useRef(null);

  const [tab, setTab] = useState("register");
  const [projects, setProjects] = useState(() =>
    load("wiq-risk-projects", INITIAL_PROJECTS),
  );
  const [risks, setRisks] = useState(() =>
    load("wiq-risk-records-v2", INITIAL_RISKS),
  );
  const [activeProjectId, setActiveProjectId] = useState(() =>
    localStorage.getItem("wiq-active-risk-project") || INITIAL_PROJECTS[0].id,
  );
  const [projectName, setProjectName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [matrixFilter, setMatrixFilter] = useState(null);
  const [notice, setNotice] = useState("");

  const defaultSprint =
    sprints.find((sprint) => sprint.status === "Active")?.id ||
    sprints[0]?.id ||
    "";

  const [draft, setDraft] = useState(() =>
    emptyRisk(activeProjectId, defaultSprint),
  );

  useEffect(() => {
    localStorage.setItem("wiq-risk-projects", JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("wiq-risk-records-v2", JSON.stringify(risks));
  }, [risks]);

  useEffect(() => {
    localStorage.setItem("wiq-active-risk-project", activeProjectId);
    setDraft((current) => ({
      ...current,
      projectId: activeProjectId,
    }));
  }, [activeProjectId]);

  const activeProject =
    projects.find((project) => project.id === activeProjectId) || projects[0];

  const projectRisks = useMemo(
    () =>
      risks.filter(
        (risk) =>
          risk.projectId === activeProjectId &&
          (!matrixFilter ||
            (risk.likelihood === matrixFilter.likelihood &&
              risk.impact === matrixFilter.impact)),
      ),
    [risks, activeProjectId, matrixFilter],
  );

  const openRisks = projectRisks.filter((risk) => risk.status !== "Closed");

  const totalResidual = openRisks.reduce(
    (total, risk) => total + residualScore(risk),
    0,
  );

  const averageControl = openRisks.length
    ? Math.round(
        openRisks.reduce(
          (total, risk) => total + Number(risk.controlEffectiveness || 0),
          0,
        ) / openRisks.length,
      )
    : 0;

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4000);
  }

  function createProject() {
    const name = projectName.trim();

    if (!name) {
      showNotice("Enter a project name first.");
      return;
    }

    const project = {
      id: makeId("project"),
      name,
      description: "",
      status: "Active",
    };

    setProjects((current) => [...current, project]);
    setActiveProjectId(project.id);
    setProjectName("");
    showNotice(`${name} created.`);
  }

  function updateRisk(id, patch) {
    setRisks((current) =>
      current.map((risk) => (risk.id === id ? { ...risk, ...patch } : risk)),
    );
  }

  function deleteRisk(id) {
    if (!window.confirm("Delete this risk record?")) return;

    setRisks((current) => current.filter((risk) => risk.id !== id));
    showNotice("Risk deleted.");
  }

  function saveRisk(event) {
    event.preventDefault();

    if (!draft.title.trim()) {
      showNotice("Enter a risk title.");
      return;
    }

    const risk = {
      ...draft,
      id: makeId("risk"),
      title: draft.title.trim(),
      likelihood: Number(draft.likelihood),
      impact: Number(draft.impact),
      controlEffectiveness: Number(draft.controlEffectiveness),
      createdAt: new Date().toISOString(),
    };

    setRisks((current) => [...current, risk]);
    setDraft(emptyRisk(activeProjectId, defaultSprint));
    setShowForm(false);
    showNotice("Risk added to the register.");
  }

  async function importRiskLog(file) {
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        throw new Error("The selected sheet contains no risk records.");
      }

      const nextProjects = [...projects];

      function resolveProject(rawName) {
        const name = String(rawName || "").trim();

        if (!name) return activeProjectId;

        let project = nextProjects.find(
          (item) => item.name.toLowerCase() === name.toLowerCase(),
        );

        if (!project) {
          project = {
            id: makeId("project"),
            name,
            description: "Created during risk-log import",
            status: "Active",
          };

          nextProjects.push(project);
        }

        return project.id;
      }

      function resolveSprint(rawSprint) {
        const value = String(rawSprint || "").trim().toLowerCase();

        if (!value) return "";

        return (
          sprints.find(
            (sprint) =>
              String(sprint.id).toLowerCase() === value ||
              sprint.name.toLowerCase() === value ||
              sprint.name.toLowerCase().includes(value),
          )?.id || ""
        );
      }

      function resolveOwner(rawOwner) {
        const value = String(rawOwner || "").trim().toLowerCase();

        if (!value) return "";

        return (
          members.find(
            (member) =>
              member.name.toLowerCase() === value ||
              member.name.toLowerCase().includes(value),
          )?.id || ""
        );
      }

      const imported = rows
        .map((row) => {
          const title = String(
            valueFrom(row, [
              "Risk title",
              "Risk",
              "Title",
              "Description",
              "Risk description",
            ]),
          ).trim();

          if (!title) return null;

          const projectId = resolveProject(
            valueFrom(row, ["Project", "Project name"]),
          );

          return {
            id: makeId("risk"),
            projectId,
            sprintId: resolveSprint(
              valueFrom(row, ["Sprint", "Sprint name", "Iteration"]),
            ),
            recordType:
              valueFrom(row, ["Record type", "RAID type", "Type"]) || "Risk",
            title,
            cause: valueFrom(row, ["Cause", "Risk cause"]),
            event: valueFrom(row, ["Event", "Risk event"]),
            impactStatement: valueFrom(row, [
              "Impact statement",
              "Consequence",
              "Risk impact",
            ]),
            category:
              valueFrom(row, ["Category", "Risk category"]) || "Delivery",
            ownerId: resolveOwner(
              valueFrom(row, ["Owner", "Risk owner", "Assignee"]),
            ),
            likelihood: numberBetween(
              valueFrom(row, ["Likelihood", "Probability"]),
              1,
              5,
            ),
            impact: numberBetween(
              valueFrom(row, ["Impact", "Severity"]),
              1,
              5,
            ),
            controlEffectiveness: numberBetween(
              valueFrom(row, [
                "Control effectiveness",
                "Control %",
                "Control",
              ]),
              0,
              100,
            ),
            treatment:
              valueFrom(row, ["Treatment", "Response strategy"]) || "Reduce",
            status: valueFrom(row, ["Status", "Risk status"]) || "Open",
            kri: valueFrom(row, ["KRI", "Indicator", "Key risk indicator"]),
            threshold: valueFrom(row, ["Threshold", "Trigger"]),
            reviewDate: valueFrom(row, [
              "Review date",
              "Next review",
              "Due date",
            ]),
            notes: valueFrom(row, ["Notes", "Comments"]),
            createdAt: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      setProjects(nextProjects);
      setRisks((current) => [...current, ...imported]);

      const firstProject = imported[0]?.projectId;
      if (firstProject) setActiveProjectId(firstProject);

      showNotice(`${imported.length} risk records imported.`);
    } catch (error) {
      showNotice(error.message || "The risk log could not be imported.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function applyTemplate() {
    const templateRisks = [
      {
        title: "Critical skill dependency",
        category: "People",
        kri: "Single-person dependency count",
        threshold: "> 2 critical tasks",
      },
      {
        title: "Unplanned scope growth",
        category: "Delivery",
        kri: "Scope change percentage",
        threshold: "> 15%",
      },
      {
        title: "Third-party service failure",
        category: "Supplier",
        kri: "SLA breach count",
        threshold: "> 1",
      },
    ].map((item) => ({
      ...emptyRisk(activeProjectId, defaultSprint),
      ...item,
      id: makeId("risk"),
      status: "Draft",
      createdAt: new Date().toISOString(),
    }));

    setRisks((current) => [...current, ...templateRisks]);
    setTab("register");
    showNotice("Software delivery template added.");
  }

  return (
    <div className="risk-centre risk-centre-v2">
      {notice && <div className="action-toast">{notice}</div>}

      <header className="risk-head">
        <div>
          <span>RISK INTELLIGENCE</span>
          <h2>Risk Centre</h2>
          <p>
            Create projects, import risk logs and connect risks to delivery
            sprints.
          </p>
        </div>

        <div className="risk-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(event) => importRiskLog(event.target.files?.[0])}
          />

          <button
            className="secondary-button"
            onClick={() => fileRef.current?.click()}
          >
            Import risk log
          </button>

          <button
            className="primary-button"
            onClick={() => setShowForm((current) => !current)}
          >
            + New risk
          </button>
        </div>
      </header>

      <section className="risk-project-bar">
        <div>
          <label>Current project</label>

          <select
            value={activeProjectId}
            onChange={(event) => {
              setActiveProjectId(event.target.value);
              setMatrixFilter(null);
            }}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div className="new-risk-project">
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createProject();
            }}
            placeholder="New project name"
          />

          <button onClick={createProject}>Create project</button>
        </div>

        <span>
          {activeProject?.description || "No project description"}
        </span>
      </section>

      {showForm && (
        <form className="risk-entry-form" onSubmit={saveRisk}>
          <div className="risk-form-heading">
            <div>
              <span>MANUAL ENTRY</span>
              <h3>Add a risk record</h3>
            </div>

            <button type="button" onClick={() => setShowForm(false)}>
              ×
            </button>
          </div>

          <label className="wide">
            Risk title
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              placeholder="What could affect delivery?"
            />
          </label>

          <label>
            RAID type
            <select
              value={draft.recordType}
              onChange={(event) =>
                setDraft({ ...draft, recordType: event.target.value })
              }
            >
              {TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            Category
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value })
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            Sprint
            <select
              value={draft.sprintId}
              onChange={(event) =>
                setDraft({ ...draft, sprintId: event.target.value })
              }
            >
              <option value="">No sprint</option>

              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Risk owner
            <select
              value={draft.ownerId}
              onChange={(event) =>
                setDraft({ ...draft, ownerId: event.target.value })
              }
            >
              <option value="">Unassigned</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cause
            <textarea
              value={draft.cause}
              onChange={(event) =>
                setDraft({ ...draft, cause: event.target.value })
              }
            />
          </label>

          <label>
            Event
            <textarea
              value={draft.event}
              onChange={(event) =>
                setDraft({ ...draft, event: event.target.value })
              }
            />
          </label>

          <label className="wide">
            Impact statement
            <textarea
              value={draft.impactStatement}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  impactStatement: event.target.value,
                })
              }
            />
          </label>

          <label>
            Likelihood
            <select
              value={draft.likelihood}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  likelihood: Number(event.target.value),
                })
              }
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Impact
            <select
              value={draft.impact}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  impact: Number(event.target.value),
                })
              }
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Control effectiveness %
            <input
              type="number"
              min="0"
              max="100"
              value={draft.controlEffectiveness}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  controlEffectiveness: numberBetween(
                    event.target.value,
                    0,
                    100,
                  ),
                })
              }
            />
          </label>

          <label>
            Treatment
            <select
              value={draft.treatment}
              onChange={(event) =>
                setDraft({ ...draft, treatment: event.target.value })
              }
            >
              {TREATMENTS.map((treatment) => (
                <option key={treatment}>{treatment}</option>
              ))}
            </select>
          </label>

          <label>
            KRI
            <input
              value={draft.kri}
              onChange={(event) =>
                setDraft({ ...draft, kri: event.target.value })
              }
              placeholder="Blocked days"
            />
          </label>

          <label>
            Trigger threshold
            <input
              value={draft.threshold}
              onChange={(event) =>
                setDraft({ ...draft, threshold: event.target.value })
              }
              placeholder="> 3 days"
            />
          </label>

          <label>
            Review date
            <input
              type="date"
              value={draft.reviewDate}
              onChange={(event) =>
                setDraft({ ...draft, reviewDate: event.target.value })
              }
            />
          </label>

          <label>
            Status
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft({ ...draft, status: event.target.value })
              }
            >
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <div className="risk-form-preview wide">
            <span>
              Inherent: <b>{inherentScore(draft)}</b>
            </span>

            <span>
              Residual: <b>{residualScore(draft)}</b>
            </span>

            <span>
              Rating: <b>{rating(residualScore(draft))}</b>
            </span>
          </div>

          <button className="primary-button wide">Save risk</button>
        </form>
      )}

      <section className="risk-kpis">
        <article>
          <strong>{openRisks.length}</strong>
          <span>Open records</span>
        </article>

        <article>
          <strong>
            {
              openRisks.filter((risk) =>
                ["High", "Critical"].includes(rating(inherentScore(risk))),
              ).length
            }
          </strong>
          <span>High inherent risk</span>
        </article>

        <article>
          <strong>{averageControl}%</strong>
          <span>Average controls</span>
        </article>

        <article>
          <strong>{totalResidual}</strong>
          <span>Residual exposure</span>
        </article>
      </section>

      <nav className="subnav">
        {[
          ["register", "Risk register"],
          ["matrix", "Heatmap"],
          ["controls", "Controls & KRIs"],
          ["templates", "Templates"],
          ["raid", "RAID view"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {matrixFilter && (
        <div className="risk-filter-banner">
          Showing likelihood {matrixFilter.likelihood} and impact{" "}
          {matrixFilter.impact}.
          <button onClick={() => setMatrixFilter(null)}>Clear filter</button>
        </div>
      )}

      {tab === "register" && (
        <section className="risk-register-wrap">
          <table className="risk-register-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Type</th>
                <th>Sprint</th>
                <th>Owner</th>
                <th>L</th>
                <th>I</th>
                <th>Inherent</th>
                <th>Controls</th>
                <th>Residual</th>
                <th>Treatment</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {!projectRisks.length && (
                <tr>
                  <td colSpan="12" className="risk-empty">
                    No risks for this project. Add one manually or import a risk
                    log.
                  </td>
                </tr>
              )}

              {projectRisks.map((risk) => {
                const sprint = sprints.find(
                  (item) => item.id === risk.sprintId,
                );

                const owner = members.find(
                  (member) => member.id === risk.ownerId,
                );

                const inherent = inherentScore(risk);
                const residual = residualScore(risk);

                return (
                  <tr key={risk.id}>
                    <td>
                      <input
                        className="risk-title-input"
                        value={risk.title}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            title: event.target.value,
                          })
                        }
                      />

                      <small>{risk.category}</small>
                    </td>

                    <td>
                      <select
                        value={risk.recordType}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            recordType: event.target.value,
                          })
                        }
                      >
                        {TYPES.map((type) => (
                          <option key={type}>{type}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={risk.sprintId || ""}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            sprintId: event.target.value,
                          })
                        }
                      >
                        <option value="">No sprint</option>

                        {sprints.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>

                      {sprint && <small>{sprint.status}</small>}
                    </td>

                    <td>
                      <select
                        value={risk.ownerId || ""}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            ownerId: event.target.value,
                          })
                        }
                      >
                        <option value="">Unassigned</option>

                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>

                      <small>{owner?.role}</small>
                    </td>

                    <td>
                      <select
                        value={risk.likelihood}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            likelihood: Number(event.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={risk.impact}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            impact: Number(event.target.value),
                          })
                        }
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <b
                        className={`risk-pill ${rating(
                          inherent,
                        ).toLowerCase()}`}
                      >
                        {inherent} · {rating(inherent)}
                      </b>
                    </td>

                    <td>
                      <input
                        className="control-input"
                        type="number"
                        min="0"
                        max="100"
                        value={risk.controlEffectiveness}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            controlEffectiveness: numberBetween(
                              event.target.value,
                              0,
                              100,
                            ),
                          })
                        }
                      />
                      %
                    </td>

                    <td>
                      <b
                        className={`risk-pill ${rating(
                          residual,
                        ).toLowerCase()}`}
                      >
                        {residual} · {rating(residual)}
                      </b>
                    </td>

                    <td>
                      <select
                        value={risk.treatment}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            treatment: event.target.value,
                          })
                        }
                      >
                        {TREATMENTS.map((treatment) => (
                          <option key={treatment}>{treatment}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={risk.status}
                        onChange={(event) =>
                          updateRisk(risk.id, {
                            status: event.target.value,
                          })
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <button
                        className="delete-risk"
                        onClick={() => deleteRisk(risk.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === "matrix" && (
        <section className="risk-panel">
          <div className="section-heading">
            <div>
              <span>LIKELIHOOD × IMPACT</span>
              <h3>Interactive exposure matrix</h3>
            </div>

            <small>Select a cell to filter the register</small>
          </div>

          <div className="large-heatmap">
            {[5, 4, 3, 2, 1].flatMap((impact) =>
              [1, 2, 3, 4, 5].map((likelihood) => {
                const count = risks.filter(
                  (risk) =>
                    risk.projectId === activeProjectId &&
                    risk.likelihood === likelihood &&
                    risk.impact === impact,
                ).length;

                return (
                  <button
                    key={`${likelihood}-${impact}`}
                    className={rating(likelihood * impact).toLowerCase()}
                    onClick={() => {
                      setMatrixFilter({ likelihood, impact });
                      setTab("register");
                    }}
                  >
                    <b>{likelihood * impact}</b>
                    <span>{count ? `${count} record(s)` : ""}</span>
                  </button>
                );
              }),
            )}
          </div>
        </section>
      )}

      {tab === "controls" && (
        <section className="risk-panel">
          <div className="section-heading">
            <div>
              <span>CONTROL ASSURANCE</span>
              <h3>Controls and key risk indicators</h3>
            </div>
          </div>

          {projectRisks.map((risk) => (
            <article className="control-card" key={risk.id}>
              <div>
                <strong>{risk.title}</strong>
                <small>
                  {risk.kri || "No KRI"} ·{" "}
                  {risk.threshold || "No threshold"}
                </small>
              </div>

              <div>
                <span>Effectiveness</span>
                <i>
                  <em
                    style={{
                      width: `${risk.controlEffectiveness}%`,
                    }}
                  />
                </i>
                <b>{risk.controlEffectiveness}%</b>
              </div>

              <button
                onClick={() => {
                  setTab("register");
                  showNotice("Open the register row to update this control.");
                }}
              >
                Review
              </button>
            </article>
          ))}
        </section>
      )}

      {tab === "templates" && (
        <section className="template-grid">
          <article>
            <span>PROFESSIONAL PLAYBOOK</span>
            <h3>Software delivery</h3>
            <p>
              Adds capacity, scope and supplier risks with suggested KRIs.
            </p>
            <button onClick={applyTemplate}>Use template</button>
          </article>
        </section>
      )}

      {tab === "raid" && (
        <section className="risk-panel">
          <div className="section-heading">
            <div>
              <span>PROJECT RAID</span>
              <h3>{activeProject?.name}</h3>
            </div>
          </div>

          {projectRisks.map((risk) => (
            <article className="raid-line" key={risk.id}>
              <b>{risk.title}</b>
              <span>{risk.recordType}</span>
              <span>
                {members.find((member) => member.id === risk.ownerId)?.name ||
                  "Unassigned"}
              </span>
              <b
                className={`risk-pill ${rating(
                  residualScore(risk),
                ).toLowerCase()}`}
              >
                {rating(residualScore(risk))}
              </b>
            </article>
          ))}

          {tasks
            .filter(
              (task) =>
                task.sprint &&
                ["High", "Critical"].includes(calcRisk(task, members)),
            )
            .map((task) => (
              <article className="raid-line" key={`task-${task.id}`}>
                <b>{task.name}</b>
                <span>Delivery signal</span>
                <span>
                  {members.find((member) => member.id === task.assigneeId)
                    ?.name || "Unassigned"}
                </span>
                <b
                  className={`risk-pill ${calcRisk(
                    task,
                    members,
                  ).toLowerCase()}`}
                >
                  {calcRisk(task, members)}
                </b>
              </article>
            ))}
        </section>
      )}
    </div>
  );
}