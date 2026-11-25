// Seeds a demo workspace with four role-based users and six fictional sites.
// Run `npm run seed` (in /server) to wipe and re-seed.
//
// Demo accounts (all share the password below — local development only):
//   owner@acme.demo · admin@acme.demo · auditor@acme.demo · viewer@acme.demo
export const DEMO_PASSWORD = "Demo@12345";

import bcrypt from "bcryptjs";
import { db, insert, update, reset, flush, load } from "./db.js";
import { DEMO_SITES } from "./seed-data.js";
import { auditNow, discover, investigate, challenge, score, STAGES } from "./scanner/pipeline.js";

const USERS = [
  { name: "Riya Kapoor", email: "owner@acme.demo", role: "owner" },
  { name: "Dev Malhotra", email: "admin@acme.demo", role: "admin" },
  { name: "Sana Iqbal", email: "auditor@acme.demo", role: "auditor" },
  { name: "Arjun Nair", email: "viewer@acme.demo", role: "viewer" },
];

const monthsAgo = (n, day = 12) => {
  const d = new Date(); d.setDate(day); d.setMonth(d.getMonth() - n); d.setHours(10, 30, 0, 0);
  return d.toISOString();
};

export async function seed() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = USERS.map((u) => insert("users", { name: u.name, email: u.email, passwordHash: hash, onboarded: false }));
  const ws = insert("workspaces", { name: "Acme Digital", ownerId: users[0].id, settings: { scanFrequencyDays: 30, alertThreshold: 5 } });
  const ws2 = insert("workspaces", { name: "Client — Bharat Retail", ownerId: users[1].id, settings: { scanFrequencyDays: 30, alertThreshold: 5 } });
  USERS.forEach((u, i) => {
    insert("memberships", { userId: users[i].id, workspaceId: ws.id, role: u.role });
    update("users", users[i].id, { lastWorkspaceId: ws.id });
  });
  insert("memberships", { userId: users[1].id, workspaceId: ws2.id, role: "owner" });
  insert("memberships", { userId: users[0].id, workspaceId: ws2.id, role: "viewer" });

  // Drift profile per site: [score offset 5 months ago … 1 month ago], dropTracker, policyChanged
  const drift = {
    greenleaf: { offs: [-22, -15, -9, -4, -1], drop: false },
    shopkart: { offs: [14, 12, 10, 9, 8], drop: true },
    paynest: { offs: [-6, -4, -4, -2, 0], drop: false, policy: true },
    mediwell: { offs: [0, 0, 2, 2, 3], drop: false },
    edunova: { offs: [-12, -8, -6, -3, -2], drop: true },
    travelyaar: { offs: [4, 4, 2, 2, 1], drop: false },
  };

  for (const d of DEMO_SITES) {
    const site = insert("sites", { workspaceId: ws.id, ...d, status: "queued", watch: true, addedBy: users[0].name, demo: true, createdAt: monthsAgo(6) });
    // Compute the real result once to shape a believable history.
    const src = await discover(site);
    const inv = investigate(src);
    challenge(inv, src);
    const sc = score(inv.findings);
    const p = drift[d.fixture];
    p.offs.forEach((off, i) => {
      const s = Math.max(5, Math.min(100, sc.score + off));
      const trackers = p.drop && i === p.offs.length - 1 ? inv.trackers.slice(0, -1) : inv.trackers;
      const at = monthsAgo(5 - i);
      insert("audits", {
        workspaceId: ws.id, siteId: site.id, status: "done", trigger: i === 0 ? "manual" : "watcher", actorName: i === 0 ? users[0].name : "Watcher",
        stages: STAGES.map((st) => ({ key: st.key, label: st.label, status: "done" })), createdAt: at, startedAt: at, finishedAt: at,
        score: s, rag: s >= 75 ? "green" : s >= 50 ? "amber" : "red", trackers, banner: inv.banner,
        policyHash: p.policy && i === p.offs.length - 1 ? "previous-version" : null, simulated: true, policyChecks: [], forms: [],
      });
    });
    await auditNow(site, { trigger: "watcher" });
  }

  // A few human decisions so the review workflow has content.
  const f = db.findings.filter((x) => x.workspaceId === ws.id);
  const pick = (pred) => f.find(pred);
  const decide = (row, decision, by, note) => row && update("findings", row.id, { decision, decidedBy: by, decidedAt: monthsAgo(0, 2), decisionNote: note });
  decide(pick((x) => x.siteName === "ShopKart" && x.type === "consent"), "remediate", users[2].name, "Ticket WEB-412 raised with the growth team.");
  decide(pick((x) => x.siteName === "PayNest Finance" && x.key === "policy_retention"), "accept", users[1].name, "RBI mandates 8-year retention; legal has signed off.");
  decide(pick((x) => x.siteName === "GreenLeaf Organics" && x.type === "tracker"), "dismiss", users[2].name, "Tag is blocked by OneTrust until opt-in.");

  for (const [i, a] of [["auth.login", users[0]], ["site.demo_loaded", users[0]], ["member.add", users[1]], ["audit.run", users[2]], ["finding.decide", users[2]], ["report.export", users[3]]].entries())
    insert("activity", { workspaceId: ws.id, actorId: a[1].id, actorName: a[1].name, action: a[0], target: {}, meta: {}, at: monthsAgo(0, 1 + i) });

  flush();
  return { ws, users };
}

export async function seedIfEmpty() {
  load();
  if (db.users.length) return;
  console.log("Seeding demo data…");
  await seed();
  console.log("Seeded demo workspace. Demo accounts are listed in server/src/seed.js");
}

if (process.argv.includes("--reset")) {
  reset();
  await seed();
  console.log("Database reset and re-seeded.");
  setTimeout(() => process.exit(0), 200);
}
