# Development evidence

## Starting point
The source was supplied as workforce-iq(2).zip in this conversation. It had no .git directory. The local baseline commit records the supplied source and a dependency lockfile produced during initial setup. It is not the original GitHub history. Original dist files were excluded by the project's existing .gitignore.

All new commits are authored as Codex, with actual commit timestamps. They document AI-assisted work and must not be presented as unaided student development. Follow the module's disclosure policy. No GitHub remote has been supplied; nothing has been pushed.

## Decisions
- Preserve the existing React UI, sprints, tasks, member IDs and legacy dashboards.
- Add a separate, clearly labelled recommendation panel in Task → Team & fit.
- Keep story points and hours separate. Never convert points into hours for this engine.
- Filter eligibility before ranking. A history advantage cannot bypass missing skills or capacity.
- Use only accepted Done tasks as experience. Missing history is not a skill failure.
- Rank by relevant accepted task count, mean required skill score, remaining capacity and stable ID. This is a prototype policy requiring literature justification and sensitivity analysis, not a performance probability.
- AI suggests category/skills and history IDs. Manager confirmation is required. Unknown IDs/categories are rejected. API errors preserve the manual flow.
- Completion does not increase declared skills. Reopening or changing completed-task ownership removes acceptance.
- Local development API key is server-side only. The local API is not a production service.

## Validation
Baseline: 8/10 existing tests passed; two failed because local timezone handling changed working-day counts. UTC date handling repaired the failures. The first fix also normalised mixed line endings in that module, explaining its larger diff.

Final checks and results are in VALIDATION.md. AI tests mock the provider: no real API call or key was available. Six controlled scenarios demonstrate the evaluation harness; they are not a completed dissertation evaluation or proof of workplace benefit.

## Next genuine iterations
1. Student reviews this code and records what they understand and change.
2. Run locally; capture screenshots of profile capacity, imported tasks, recommendations, confirmed AI suggestions and accepted completion.
3. Build a separately labelled held-out task/history set and evaluate AI extraction and relevance matching with precision/recall, failure cases, repeated calls, latency and token cost.
4. Test manager journeys in a real browser and record results.
5. Expand literature review and justify ranking policy, task-count bias and capacity assumptions.
6. Apply the update on a branch of the existing GitHub clone. Never replace that clone's .git directory with this new baseline history.
