# WorkForce IQ — proposal build

A local software-team planning prototype based on the former WorkForce IQ app. It implements the agreed proposal: specific declared skills, sprint capacity, accepted experience, explained task recommendations, an interactive board, analytics and automatic Excel/PDF evaluation reports.

## Open in VS Code

Use Node.js 24. From the extracted app folder:

    npm ci
    npm run dev

Open the localhost address printed in the terminal. Without Supabase configuration, the sign-in screen is a local demonstration: enter a fictional email and any password of eight or more characters. Complete the existing onboarding as Project manager to enter the management workspace. This is not production authentication. Supabase configuration does not make task storage multi-user: planning data remains in this browser.

## First evaluation — no manual counting

1. Open **Analytics & Evaluation**.
2. Click **Load synthetic test set**. A workspace backup downloads before replacement; confirm the action.
3. The selected synthetic sprint contains five authored test scenarios, three fictional members and accepted/unaccepted history. The expected answers are supplied independently of the engine.
4. Review the comparison: five expected scenarios should pass; the additional existing-workload task has no expected outcome and is not counted as a pass. One recommendation changes; two scenarios have no eligible candidate.
5. Enter your actual observations in the findings box. Moving cards or changing capacity can change subsequent results; a synthetic rule pass does not mean you have tested every interface workflow.
6. Click **Capture findings snapshot**, then **Export evaluation · Excel** and **Export evaluation · PDF**. Unchanged inputs use the same timestamped snapshot for both exports. Changed inputs cause the next export to capture a new snapshot.

The workbook includes metadata, findings, every candidate's eligibility and evidence, capacity, status, skills, task/member/sprint input records, predefined expectations and decision history. The PDF contains a readable summary, capacity chart, comparisons, candidate evidence and skill coverage. It is generated directly, without a print-dialog dependency. Exported analytics are descriptive; no expected answers means “Not specified”, never Pass.

## Planning workflows

- **Skill Matrix:** search columns, import XLSX/CSV, or click a member. Profile editor searches/adds catalogue or custom skills and records numeric declarations from 0–100. Imported names match exactly; new names create profiles. Invalid rows reject the import atomically. Scores are not inferred competence.
- **Tasks:** create a task, describe it, choose specific skills, set the minimum declaration threshold and confirm requirements. Enter positive estimated hours under Team & fit. Choose a sprint.
- **Member profile:** enter net sprint capacity hours. Existing unfinished tasks reserve estimated/remaining hours. Unknown estimates/capacity abstain; points are never converted to hours.
- **Team & fit:** compare experience on/off, inspect evidence and choose an eligible candidate. Manual selection needs a reason. Manager makes the final decision.
- **Sprint Board:** drag between states/member lanes. Keyboard-friendly arrow buttons move status; manual cross-member movement asks for a reason. Unassigned work cannot be marked Done. Done does not mean accepted.
- **Completed work:** open the task, Team & fit, then check manager acceptance and save. Reopening or changing its owner/name/description/skills clears acceptance. Accepted records sharing at least one required skill count once, even when multiple skills overlap.
- **Backup/restore:** controls are in the header. Restore validates a schemaVersion 3 backup and downloads the current workspace first.

Declared proficiency and accepted experience remain separate. Missing history does not make a suitable newcomer ineligible. Aliases such as CSharp/C# and JS/JavaScript are normalised. The catalogue includes more than 90 entries; custom skills need no code change.

## Optional AI

Copy `.env.example` to `.env.local` and set GEMINI_API_KEY. Restart npm run dev. The Team & fit action asks Gemini to suggest a category and required technical skills; the manager confirms them. AI does not determine ranking, proficiency or assignment. It only receives the task text on request; only fictional text should be used for evaluation. No live provider response has been verified in this environment. Manual entry works without a key. CV extraction is outside this build's core scope.

## Data and scope boundaries

New planning data uses proposal-wiq-* localStorage keys. On first access, existing wiq-* planning data is copied as a compatibility starting point; original keys are not overwritten. Evaluation configuration uses wiq-eval-* keys. Decision records are local, editable prototype data, not a tamper-proof audit service. Download and retain your own evidence.

The former app's check-ins, risk and decision modules remain available as inherited tools. They are not evaluated by the dissertation feature; legacy fit indices are not predictions. Cycle-time displays were removed from the task recommendation workflow and excluded from evaluation exports. Legacy helper tests remain separately as regression coverage.

The prototype needs further security, shared persistence and deployment work before company use. It does not establish productivity gains, competence, fairness or savings. Synthetic-only evaluation and the ethics declaration need supervisor agreement. No secondary dataset is required.

## Verification

    npm run lint
    npm test
    npm run test:ui
    npm run fixtures
    npm run build

UI tests simulate DOM interactions rather than a real browser. Read docs/VALIDATION.md for actual verification and limitations. The build currently reports a large bundle; optimisation is future work.

## Git history

The supplied bundle contains actual source history and this feature branch. Read docs/VERSION-CONTROL.md before integrating it into your GitHub repository. No remote has been pushed or fabricated. Inter is bundled under its SIL Open Font License.

## Reliability iteration 1

The matrix starts with declared skills, supports alias searches and separate member filtering, and explains empty results. Profile filtering and skill creation are separate. Required-skill searches no longer truncate the catalogue at 35 entries. Tasks and profile validation stays visible; failed imports show errors inside the dialog. Cancelled new tasks are not persisted. Screen identity stays stable when drag state or inline edits update, and stale recommendation snapshots are discarded after input changes.

GitHub original main uses a 1–5 declaration scale; this proposal branch uses 0–100. Review old declarations explicitly before recommendation testing. Do not interpret 1–5 values as validated 0–100 scores or silently multiply them.
