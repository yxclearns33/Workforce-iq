# Verification record

Proposal build version 0.3.0. Tests were run on 12 October 2026.

- ESLint and production compilation passed. The npm run dev command started Vite and the local API process; cross-command localhost HTTP checks were unavailable in this environment.
- Automated suite: 40 tests (including inherited regression helpers). New proposal tests cover skill-overlap/custom-skill matching, eligibility, expected-outcome validation, backup schemas, Excel round-trip and PDF generation.
- Five independently authored synthetic scenarios passed. One changed the recommended member; two abstained. These are controlled rule checks, not business validation or a user study.
- DOM interactions passed: evaluation snapshot, recommendation assignment/persistence, drop-event status movement, separate manager acceptance, custom skill declaration. No physical drag gesture or browser visual rendering is claimed by these tests.
- Sample Excel findings were written, read back and checked against expected data.
- The sample PDF was rendered and both pages inspected; it contains embedded Inter type, readable tables, capacity bars and no cycle-time results.

Not verified: live Gemini service responses, production Supabase/shared-data deployment, or real-browser appearance/animation/responsiveness. The browser download was unavailable in this environment. The user should exercise the full local workflow and capture their own findings. The bundle-size warning remains a performance limitation.

Reports preserve snapshots but localStorage and decision logs are not tamper-proof. Expected answers are separate inputs; a scenario without an expected answer cannot count as passed. Synthetic results cannot establish employee proficiency or real-world gains.

Packaging correction: configuration and production build verified in a source folder without .git. jsdom pinned to 26.1.0; 40 tests and DOM checks passed after the change.
