# WorkForce IQ 🧠

> **An Intelligent Rule-Based Skill-Fit Allocation System for Agile Project Management**

WorkForce IQ replaces intuition-driven sprint planning with a probabilistic scoring engine that computes the best team member for every task — in real time, with a plain-English reason for every recommendation.

![Board View](public/screenshots/Board%20view%20.jpeg)

---

## 🎯 The Problem

Existing tools like Jira, Linear, and Monday.com have an assignee dropdown. That's it. Who gets assigned is based on gut feel, availability, and familiarity — not skill fit, workload capacity, or historical performance. The result: skill mismatches, blocked tasks, burnout, and sprint failures.

## 💡 The Solution

WorkForce IQ introduces a **five-variable deterministic scoring algorithm** that evaluates every team member against every task:

```
Fit% = round( (min(5, Skill + CompletionBoost) / 5) × Complexity × Effort × Workload × 100 )
```

| Variable | Description |
|---|---|
| **Skill Score** | 1–5 rating per skill type from the team's skill matrix |
| **Completion Boost** | +0.2 per completed task of matching type (capped at 5) |
| **Complexity Multiplier** | Low=1.00, Medium=0.90, High=0.75, Critical=0.60 |
| **Effort Penalty** | 1–3pts=1.00, 5pts=0.95, 8pts=0.88, 13pts=0.78 |
| **Workload Factor** | >90%=0.60, >75%=0.80, >60%=0.92, else=1.00 |

Every recommendation comes with a risk classification (Low / Medium / High / Critical) and a plain-English reason — fully explainable, fully auditable.

---

## 📸 Screenshots

### Sign In
![Sign In](public/screenshots/Log%20in%20Page.png)

### Workspace Setup
![Setup](public/screenshots/Setup%20work%20station.jpeg)

### Board — Swim Lane View
![Board](public/screenshots/Board%20view%20.jpeg)

### Task Drawer — Ranked Assignment Suggestions
![Task Drawer](public/screenshots/task%20drawer.jpeg)

### Skill Matrix
![Skill Matrix](public/screenshots/skill%20Matrix.jpeg)

### Team View
![Team](public/screenshots/team%20view.jpeg)

### Risk Register
![Risk Register](public/screenshots/risk%20register.jpeg)

---

## ✨ Features

- **Swim Lane Board** — each row is a developer, columns are task statuses. Workload visible at a glance
- **Ranked Assignment Suggestions** — every candidate scored and ranked with skill, load, completions and reason
- **Completion History Boost** — skill scores update dynamically as tasks are completed, improving recommendations over time
- **What's Next** — suggests logical follow-on tasks based on proven completion history
- **Risk Register** — auto-calculated risk per task and per member, with composite member risk scores
- **Skill Matrix** — upload from Excel/CSV or build manually, with percentile rankings across the team
- **Multi-Template Support** — Software Dev, Marketing, Creative Agency, Sales, Construction, Custom
- **Full Auth & Onboarding** — sign up, workspace creation, template selection, account types
- **Real-time Sync** — Supabase backend with live updates across team members

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Custom design system (inline tokens) |
| Backend | Supabase (PostgreSQL + Auth) |
| Algorithm | Deterministic rule-based scoring engine |
| Deployment | Vercel (frontend) + Supabase (backend) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### Installation

```bash
git clone https://github.com/yxclearns33/Workforce-iq.git
cd Workforce-iq
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🧮 Algorithm — Worked Example

**Scenario:** Alice (Frontend skill 4/5, 2 completed Frontend tasks, 72% workload) evaluated for a High complexity, 5-point Frontend task.

```
Skill = 4,  Boost = 2 × 0.2 = 0.4,  Effective = min(5, 4.4) = 4.4
Complexity = 0.75,  Effort = 0.95,  Workload = 0.92

Fit% = round( (4.4/5) × 0.75 × 0.95 × 0.92 × 100 ) = 58% → Medium Risk
```

**Recommendation displayed:** *"Alice has completed 2 Frontend tasks — proven fit. 4/5 skill · 72% load (moderate) · 58% fit"*

---

## 📚 Academic Context

WorkForce IQ was developed as the primary artefact for an MSc dissertation in IT Project Management, using **Design Science Research (DSR)** methodology. The scoring algorithm represents an original contribution to the field of skill-aware resource allocation in agile project management.

**Research Question:** *To what extent can a rule-based skill-fit scoring algorithm improve task allocation decisions in agile project management teams?*

---

## 🗺 Roadmap

- [ ] GitHub integration — auto-close tasks when PR merges
- [ ] Slack daily digest — team health score notification
- [ ] Sprint planning copilot — AI-guided optimal sprint composition
- [ ] Longitudinal skill validation — infer skill accuracy from completion patterns
- [ ] Enterprise multi-team workspaces

---

## 👤 Author

**Samuel Adebusoye**
MSc IT Project Management

[![GitHub](https://img.shields.io/badge/GitHub-yxclearns33-181717?style=flat&logo=github)](https://github.com/yxclearns33)

---

## 📄 Licence

MIT — free to use, modify and distribute with attribution.