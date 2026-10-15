# Synthetic-only proposal dataset

The easiest complete setup is the app's **Load synthetic test set** button on Analytics & Evaluation. It supplies IDs, skills, two sprints, capacities, task history and predefined expected outcomes without manual entry.

For restoration, use synthetic-workspace.json through the header's Restore backup control. For expected-answer import, use 03-expected-outcomes.xlsx after the matching synthetic IDs exist. Those identifiers are fixed intentionally.

01-skill-matrix.xlsx illustrates exact-name skill declarations. 02-task-records.xlsx is a reference/optional import of positive-estimate records; split history and current rows into their correct sprint when importing. Import chooses a sprint in the app and does not consume the reference Sprint column. The unknown-estimate scenario is supplied through the full dataset/backup; positive-estimate imports deliberately reject it. Duplicate existing task IDs are rejected.

The fictional data has five independent expected scenarios: experience changes the winner; capacity blocks an experienced member; a newcomer remains eligible; an unknown estimate abstains; missing skills yield no candidate. Existing SQL workload is included in descriptive comparisons but has no expected answer. Automated sample exports in evaluation/ are rule checks, not the student's observed findings.

Do not import this test pack into a real production workspace. The app backs up before replacement. This dataset cannot validate real employee competence or business performance.
