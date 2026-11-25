# Privacy Auditor — DPDP

Website Privacy Auditor (idea #2 from *Next Project Ideas*). Feed it website URLs; an agent pipeline reads each site's **trackers**, **cookie banner** and **privacy notice**, checks them against India's **Digital Personal Data Protection Act, 2023**, quotes the evidence, double-checks it, scores it Red / Amber / Green, lets people decide, and re-scans every month.

## Run it

```bash
npm install          # also installs /server deps
npm run dev          # API on :4000 + Next.js on :3000
```

Open http://localhost:3000. On first start the API seeds a demo workspace (**Acme Digital**) with six fictional websites and four users — one per role. The demo accounts and their shared password are in [`server/src/seed.js`](server/src/seed.js), and the login page has one-click buttons for each role (dev only).

`npm run seed` wipes `server/data/db.json` and re-seeds.

## Stack

| Layer | What |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), Tailwind v4, `motion` animations, `lucide-react` icons, `driver.js` tours, `sonner` toasts |
| Fonts | `satre.ttf` (display) and `regular.otf` (body) via `next/font/local` |
| Backend | Express 5 (`/server`), JWT in an httpOnly cookie, bcrypt, cheerio for HTML parsing, pdfkit for reports |
| Storage | JSON file (`server/data/db.json`) behind small helpers in `server/src/db.js` — swap for Postgres/Mongo there |

Next.js proxies `/api/*` to Express (see `next.config.mjs`) so the session cookie is first-party. `src/proxy.js` does an optimistic redirect to `/login`; the API is the real authority.

## Features

- **Auth** — register (creates a workspace, you're owner), login with rate limiting, logout, profile & password change.
- **Workspaces & RBAC** — per-workspace roles: Owner, Admin, Auditor, Viewer. Permissions live in `server/src/rbac.js` and are enforced on every API route; the UI hides what you can't do. The Team page shows the full matrix.
- **Agent pipeline** (`server/src/scanner/pipeline.js`)
  1. **Discovery** – fetches the homepage, first-response cookies and the privacy notice.
  2. **Investigator** – 24 tracker signatures, 10 consent managers, banner/reject wording, personal-data forms, 15 DPDP notice clauses — each with a quoted sentence as proof.
  3. **Challenger** – re-reads the source, overturns negated clauses, downgrades weak matches and JS-rendered pages.
  4. **Risk score** – `100 − Σ(deduction × confidence)`; Green ≥ 75, Amber 50–74, Red < 50.
  5. **Watcher** – diffs against the previous scan → alerts (score drop, RAG change, new tracker, banner removed, policy changed). Re-scans run on the workspace schedule (default monthly).
- **Decisions** — Remediate / Accept risk (justification required) / Dismiss; carried forward to future scans.
- **Reports** — per-site PDF, portfolio PDF, findings CSV.
- **Activity log** — sign-ins, scans, decisions, role changes and exports.
- **Guidance** — welcome modal on first login, a platform tour and a tour for every page (driver.js), a Help menu (tour this page, guide, DPDP primer, shortcuts), a Guide page with a self-ticking getting-started checklist, and a ⌘/Ctrl-K command palette.

Signals only — not legal advice.
