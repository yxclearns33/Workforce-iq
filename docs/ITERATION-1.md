# Reliability iteration 1

Confirmed source-level problems and fixes:

- Matrix defaulted to the entire catalogue. It now starts with declared skills and offers a full-catalogue toggle.
- Search did not resolve aliases or trim input. CSharp and JS searches now resolve their recognised skills, and empty matches are explained.
- Task skill choices were cut off after 35 entries. All matching catalogue entries are searchable and selected skills stay separate.
- Profile filtering and adding skills shared one input. These are now separate; duplicate additions do not overwrite proficiency.
- Nested screen-component definitions changed identity after state updates. The hook-free screen renderers now preserve their DOM through inline edits and drag start.
- Cancelling a new task left a persisted draft. New tasks only enter storage on Save.
- Validation used blocking alerts or appeared behind dialogs. Task/profile messages stay inline, and import failures appear in the import dialog.
- A selected recommendation could become stale after changing task inputs. Recorded signatures now invalidate that snapshot.

Regression verification includes declared-only columns, alias searches, empty results, DOM identity at drag start, cancelled draft cleanup, persisted assignment/status/acceptance, and custom skill saving. These are DOM simulations, not physical browser gesture or visual tests. The full suite contains 40 automated tests and continues to pass.

User browser issues that have not been reproduced cannot be declared resolved. This is the first reliability iteration, not a claim that every workflow is error-free.
