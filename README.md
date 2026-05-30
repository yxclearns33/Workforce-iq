# WorkForce IQ 🧠

> **Intelligent Skill-Fit Allocation for Modern Teams**

WorkForce IQ replaces gut-feel sprint planning with a probabilistic scoring engine that ranks every team member against every task in real time — with a plain-English reason for every recommendation.

![Board View](public/screenshots/Board%20view%20.jpeg)

---

## 🎯 The Problem

Jira, Linear, and Monday.com give you an assignee dropdown. That's it. Who gets the work is decided by familiarity, availability, and instinct — not skill fit, workload capacity, or proven performance. The result: wrong people on wrong tasks, blocked sprints, and burnout.

## 💡 The Solution

WorkForce IQ introduces a **five-variable deterministic scoring algorithm** that evaluates every team member against every task:

```
Fit% = round( (min(5, Skill + CompletionBoost) / 5) × Complexity × Effort × Workload × 100 )
```

| Variable | Description |
|---|---|
| **Skill Score** | 1–5 rating per skill type from the team skill matrix |
| **Completion Boost** | +0.2 per completed task of matching type — system gets smarter over time |
| **Complexity Multiplier** | Low=1.00 · Medium=0.90 · High=0.75 · Critical=0.60 |
| **Effort Penalty** | 1–3pts=1.00 · 5pts=0.95 · 8pts=0.88 · 13pts=0.78 |
| **Workload Factor** | >90%=0.60 · >75%=0.80 · >60%=0.92 · else=1.00 |

Every recommendation includes a risk classification (Low / Medium / High / Critical) and a plain-English justification — explainable, auditable, and trustworthy.

---

## 📸 Screenshots

### Sign In
![Sign In](public/screenshots/Log%20in%20Page.png)

### Workspace Setup & Template Selection
![Setup](public/screenshots/Setup%20work%20station.jpeg)

### Board — Team Swim Lane View
![Board](public/screenshots/Board%20view%20.jpeg)

### Task Drawer — Ranked Assignment Suggestions
![Task Drawer](public/screenshots/task%20drawer.jpeg)

### Skill Matrix
![Skill Matrix](public/screenshots/skill%20Matrix.jpeg)

### Team Profiles
![Team](public/screenshots/team%20view.jpeg)

### Risk Register
![Risk Register](public/screenshots/risk%20register.jpeg)

---

## ✨ Features

- **Swim Lane Board** — each row is a team member, columns are task statuses. Workload visible at a glance
- **Ranked Assignment Engine** — every candidate scored and ranked with skill level, workload, completion history, and a plain-English reason
- **Completion Boost** — skill scores update dynamically as tasks are completed, making recommendations more accurate over time
- **What's Next** — suggests logical follow-on tasks based on proven completion history per member
- **Risk Register** — auto-calculated risk per task and per member with composite risk scoring
- **Skill Matrix** — upload from Excel/CSV or build manually with percentile rankings across the team
- **Multi-Template Architecture** — Software Dev, Marketing, Creative Agency, Sales, Construction, Custom — same engine, different skill vocabularies
- **Full Auth & Onboarding** — sign up, profile creation, workspace setup, template selection, account types (Solo / Team / Company)
- **Real-time Backend** — Supabase PostgreSQL with live sync

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Design System | Custom token-based inline styling |
| Backend | Supabase (PostgreSQL + Auth + Real-time) |
| Algorithm | Deterministic rule-based scoring engine |
| Deployment | Vercel + Supabase |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase project — [supabase.com](https://supabase.com)

### Installation

```bash
git clone https://github.com/yxclearns33/Workforce-iq.git
cd Workforce-iq
npm install
```

### Environment

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

**Alice** · Frontend 4/5 · 2 completed Frontend tasks · 72% workload  
**Task** · Frontend · High complexity · 5 story points

```
Effective Skill = min(5, 4 + 2×0.2) = 4.4
Fit% = round( (4.4/5) × 0.75 × 0.95 × 0.92 × 100 ) = 58% → Medium Risk
```

**Displayed as:** *"Alice has completed 2 Frontend tasks — proven fit. 4/5 skill · 72% load · 58% fit"*

---

## 🗺 Roadmap

- [ ] GitHub integration — auto-close tasks on PR merge
- [ ] Slack digest — daily team health score
- [ ] Sprint planning copilot — optimal sprint composition engine
- [ ] Predictive risk — delivery forecasting across sprints
- [ ] Enterprise multi-team workspaces

---

## 👤 Author

**Samuel Adebusoye**  
Full Stack Developer · Product Builder

[![GitHub](https://img.shields.io/badge/GitHub-yxclearns33-181717?style=flat&logo=github)](https://github.com/yxclearns33)

---

## 📄 Licence

Copyright © 2026 Samuel Adebusoye. All rights reserved.  
This source code is shared for portfolio and demonstration purposes only. Commercial use, copying, or distribution without explicit written consent from the author is strictly prohibited.