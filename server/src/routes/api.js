import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db, insert, update, remove, now } from "../db.js";
import { authenticate, workspace, requirePerm, log, publicUser } from "../auth.js";
import { ROLES, ROLE_META, PERMISSIONS, canAssign } from "../rbac.js";
import { startAudit, normaliseUrl, STAGES, isRunning } from "../scanner/pipeline.js";
import { DEMO_SITES } from "../seed-data.js";

const r = Router();
const SEV_ORDER = { high: 0, medium: 1, low: 2 };
r.use(authenticate, workspace);

const inWs = (req, list) => list.filter((x) => x.workspaceId === req.workspace.id);
const findInWs = (req, coll, idv) => db[coll].find((x) => x.id === idv && x.workspaceId === req.workspace.id);
const latestAudit = (siteId) =>
  db.audits.filter((a) => a.siteId === siteId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;

// ---------------- Overview ----------------
r.get("/overview", (req, res) => {
  const sites = inWs(req, db.sites);
  const findings = inWs(req, db.findings).filter((f) => f.current);
  const scored = sites.filter((s) => typeof s.lastScore === "number");
  const audits = inWs(req, db.audits).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const trackerTally = {};
  for (const s of sites) {
    const a = s.lastAuditId && db.audits.find((x) => x.id === s.lastAuditId);
    for (const t of a?.trackers || []) trackerTally[t.name] = (trackerTally[t.name] || 0) + 1;
  }
  const clauseTally = {};
  for (const s of sites) {
    const a = s.lastAuditId && db.audits.find((x) => x.id === s.lastAuditId);
    for (const c of a?.policyChecks || []) {
      clauseTally[c.key] ??= { key: c.key, title: c.title, section: c.section, met: 0, total: 0 };
      clauseTally[c.key].total++;
      if (c.met) clauseTally[c.key].met++;
    }
  }
  // 6-month trend from audits
  const months = [...Array(6)].map((_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
    return d.toISOString().slice(0, 7);
  });
  const trend = months.map((m) => {
    const inMonth = audits.filter((a) => a.status === "done" && a.finishedAt?.startsWith(m));
    return { month: m, avg: inMonth.length ? Math.round(inMonth.reduce((x, a) => x + a.score, 0) / inMonth.length) : null, scans: inMonth.length };
  });
  res.json({
    totals: {
      sites: sites.length,
      avgScore: scored.length ? Math.round(scored.reduce((a, s) => a + s.lastScore, 0) / scored.length) : null,
      openFindings: findings.filter((f) => !f.decision).length,
      highFindings: findings.filter((f) => f.severity === "high" && !f.decision).length,
      trackers: Object.values(trackerTally).reduce((a, b) => a + b, 0),
      unreadAlerts: inWs(req, db.alerts).filter((a) => !a.read).length,
      scansThisMonth: audits.filter((a) => a.createdAt.startsWith(new Date().toISOString().slice(0, 7))).length,
    },
    rag: { red: sites.filter((s) => s.lastRag === "red").length, amber: sites.filter((s) => s.lastRag === "amber").length, green: sites.filter((s) => s.lastRag === "green").length, unscored: sites.filter((s) => !s.lastRag).length },
    topTrackers: Object.entries(trackerTally).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    clauses: Object.values(clauseTally).sort((a, b) => a.met / a.total - b.met / b.total),
    trend,
    recentAudits: audits.slice(0, 6).map((a) => ({ id: a.id, siteId: a.siteId, siteName: db.sites.find((s) => s.id === a.siteId)?.name, status: a.status, score: a.score, rag: a.rag, trigger: a.trigger, createdAt: a.createdAt, stages: a.stages })),
    recentAlerts: inWs(req, db.alerts).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    stages: STAGES,
  });
});

// ---------------- Sites ----------------
r.get("/sites", (req, res) => {
  const sites = inWs(req, db.sites).map((s) => {
    const cur = db.findings.filter((f) => f.siteId === s.id && f.current);
    return { ...s, running: isRunning(s.id), fixture: undefined, totalFindings: cur.length, decided: cur.filter((f) => f.decision).length, highOpen: cur.filter((f) => f.severity === "high" && !f.decision).length,
      stage: isRunning(s.id) ? latestAudit(s.id)?.stages?.find((x) => x.status === "running")?.label : null };
  });
  res.json({ sites: sites.sort((a, b) => (a.lastScore ?? 101) - (b.lastScore ?? 101)) });
});

r.post("/sites", requirePerm("site:create"), (req, res) => {
  const raw = Array.isArray(req.body?.urls) ? req.body.urls : String(req.body?.urls || "").split(/[\s,]+/);
  if (raw.filter(Boolean).length > 50) return res.status(400).json({ error: "Max 50 URLs at once" });
  const added = [], skipped = [];
  for (const u of raw.filter(Boolean)) {
    const url = normaliseUrl(u);
    if (!url) { skipped.push({ input: u, reason: "Invalid URL" }); continue; }
    if (inWs(req, db.sites).some((s) => s.url === url)) { skipped.push({ input: u, reason: "Already monitored" }); continue; }
    const host = new URL(url).hostname.replace(/^www\./, "");
    const site = insert("sites", { workspaceId: req.workspace.id, url, name: host, owner: req.body?.owner || "", tags: req.body?.tags || [], status: "queued", watch: true, addedBy: req.user.name });
    added.push(site);
  }
  log(req, "site.create", { type: "site" }, { count: added.length, urls: added.map((s) => s.url) });
  if (req.body?.scan !== false) for (const s of added) startAudit(s, { trigger: "manual", actor: req.user });
  res.status(201).json({ added, skipped });
});

r.post("/sites/demo", requirePerm("site:create"), (req, res) => {
  const added = [];
  for (const d of DEMO_SITES) {
    if (inWs(req, db.sites).some((s) => s.url === d.url)) continue;
    const site = insert("sites", { workspaceId: req.workspace.id, ...d, status: "queued", watch: true, addedBy: req.user.name, demo: true });
    added.push(site);
    startAudit(site, { trigger: "manual", actor: req.user });
  }
  log(req, "site.demo_loaded", {}, { count: added.length });
  res.status(201).json({ added });
});

r.get("/sites/:id", (req, res) => {
  const site = findInWs(req, "sites", req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  const audits = db.audits.filter((a) => a.siteId === site.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lastDone = audits.find((a) => a.status === "done");
  res.json({
    site: { ...site, running: isRunning(site.id), fixture: undefined },
    audit: lastDone || null,
    inProgress: audits[0]?.status === "running" ? audits[0] : null,
    latest: audits[0] || null,
    findings: db.findings.filter((f) => f.siteId === site.id && f.current).sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.deduction - a.deduction),
    history: audits.filter((a) => a.status !== "running").map((a) => ({ id: a.id, score: a.score, rag: a.rag, status: a.status, trigger: a.trigger, createdAt: a.createdAt, finishedAt: a.finishedAt, error: a.error })),
    alerts: db.alerts.filter((a) => a.siteId === site.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    stages: STAGES,
  });
});

r.patch("/sites/:id", requirePerm("site:create"), (req, res) => {
  const site = findInWs(req, "sites", req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  const { name, owner, tags, watch } = req.body || {};
  const patch = {};
  if (name?.trim()) patch.name = name.trim();
  if (typeof owner === "string") patch.owner = owner;
  if (Array.isArray(tags)) patch.tags = tags.slice(0, 8);
  if (typeof watch === "boolean") patch.watch = watch;
  log(req, "site.update", { type: "site", id: site.id, name: site.name }, patch);
  res.json({ site: update("sites", site.id, patch) });
});

r.delete("/sites/:id", requirePerm("site:delete"), (req, res) => {
  const site = findInWs(req, "sites", req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  remove("sites", (s) => s.id === site.id);
  for (const c of ["audits", "findings", "alerts"]) remove(c, (x) => x.siteId === site.id);
  log(req, "site.delete", { type: "site", id: site.id, name: site.name });
  res.json({ ok: true });
});

r.post("/sites/:id/scan", requirePerm("audit:run"), (req, res) => {
  const site = findInWs(req, "sites", req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  update("sites", site.id, { status: "scanning" });
  const audit = startAudit(site, { trigger: "manual", actor: req.user });
  log(req, "audit.run", { type: "site", id: site.id, name: site.name });
  res.status(202).json({ audit });
});

r.post("/sites/scan-all", requirePerm("audit:run"), (req, res) => {
  const sites = inWs(req, db.sites);
  sites.forEach((s, i) => setTimeout(() => startAudit(s, { trigger: "manual", actor: req.user }), i * 400));
  log(req, "audit.run_all", {}, { count: sites.length });
  res.status(202).json({ queued: sites.length });
});

r.get("/audits/:id", (req, res) => {
  const a = findInWs(req, "audits", req.params.id);
  if (!a) return res.status(404).json({ error: "Audit not found" });
  res.json({ audit: a });
});

// ---------------- Findings ----------------
r.get("/findings", (req, res) => {
  let list = inWs(req, db.findings).filter((f) => f.current);
  const { severity, type, decision, siteId, q } = req.query;
  if (severity) list = list.filter((f) => f.severity === severity);
  if (type) list = list.filter((f) => f.type === type);
  if (siteId) list = list.filter((f) => f.siteId === siteId);
  if (decision === "open") list = list.filter((f) => !f.decision);
  else if (decision) list = list.filter((f) => f.decision === decision);
  if (q) list = list.filter((f) => (f.title + f.siteName + f.description).toLowerCase().includes(String(q).toLowerCase()));
  const order = { high: 0, medium: 1, low: 2 };
  res.json({ findings: list.sort((a, b) => order[a.severity] - order[b.severity]) });
});

r.patch("/findings/:id", requirePerm("finding:decide"), (req, res) => {
  const f = findInWs(req, "findings", req.params.id);
  if (!f) return res.status(404).json({ error: "Finding not found" });
  const { decision, note } = req.body || {};
  if (![null, "remediate", "accept", "dismiss"].includes(decision ?? null)) return res.status(400).json({ error: "Invalid decision" });
  if (decision === "accept" && !note?.trim()) return res.status(400).json({ error: "Accepting a risk requires a justification note" });
  const row = update("findings", f.id, { decision: decision ?? null, decisionNote: note || "", decidedBy: decision ? req.user.name : null, decidedAt: decision ? now() : null });
  log(req, "finding.decide", { type: "finding", id: f.id, name: f.title }, { decision, site: f.siteName });
  res.json({ finding: row });
});

// ---------------- Alerts ----------------
r.get("/alerts", (req, res) => {
  res.json({ alerts: inWs(req, db.alerts).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
});
r.patch("/alerts/:id", requirePerm("alert:manage"), (req, res) => {
  const a = findInWs(req, "alerts", req.params.id);
  if (!a) return res.status(404).json({ error: "Alert not found" });
  res.json({ alert: update("alerts", a.id, { read: !!req.body?.read }) });
});
r.post("/alerts/read-all", requirePerm("alert:manage"), (req, res) => {
  inWs(req, db.alerts).forEach((a) => (a.read = true));
  update("workspaces", req.workspace.id, {});
  res.json({ ok: true });
});

// ---------------- Members & roles ----------------
r.get("/roles", (req, res) => {
  res.json({ roles: ROLES.map((k) => ({ key: k, ...ROLE_META[k] })), permissions: PERMISSIONS });
});

r.get("/members", requirePerm("member:read"), (req, res) => {
  const members = db.memberships
    .filter((m) => m.workspaceId === req.workspace.id)
    .map((m) => ({ ...publicUser(db.users.find((u) => u.id === m.userId)), role: m.role, joinedAt: m.createdAt }));
  res.json({ members });
});

r.post("/members", requirePerm("member:manage"), async (req, res) => {
  const { name, email, role } = req.body || {};
  if (!ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (!canAssign(req.role, role)) return res.status(403).json({ error: "Only an owner can add another owner" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) return res.status(400).json({ error: "Enter a valid email" });
  const lower = email.toLowerCase();
  let user = db.users.find((u) => u.email === lower);
  let tempPassword = null;
  if (!user) {
    tempPassword = crypto.randomBytes(6).toString("base64url");
    user = insert("users", { name: name?.trim() || lower.split("@")[0], email: lower, passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true, lastWorkspaceId: req.workspace.id });
  }
  if (db.memberships.some((m) => m.userId === user.id && m.workspaceId === req.workspace.id)) return res.status(409).json({ error: "Already a member" });
  insert("memberships", { userId: user.id, workspaceId: req.workspace.id, role });
  log(req, "member.add", { type: "user", id: user.id, name: user.name }, { role });
  res.status(201).json({ member: { ...publicUser(user), role }, tempPassword });
});

r.patch("/members/:userId", requirePerm("member:manage"), (req, res) => {
  const m = db.memberships.find((x) => x.userId === req.params.userId && x.workspaceId === req.workspace.id);
  if (!m) return res.status(404).json({ error: "Member not found" });
  const { role } = req.body || {};
  if (!ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
  if (!canAssign(req.role, role) || !canAssign(req.role, m.role)) return res.status(403).json({ error: "Admins cannot change owners" });
  if (m.role === "owner" && role !== "owner" && db.memberships.filter((x) => x.workspaceId === req.workspace.id && x.role === "owner").length === 1)
    return res.status(400).json({ error: "A workspace needs at least one owner" });
  const from = m.role;
  update("memberships", m.id, { role });
  log(req, "member.role_change", { type: "user", id: m.userId, name: db.users.find((u) => u.id === m.userId)?.name }, { from, to: role });
  res.json({ ok: true });
});

r.delete("/members/:userId", requirePerm("member:manage"), (req, res) => {
  const m = db.memberships.find((x) => x.userId === req.params.userId && x.workspaceId === req.workspace.id);
  if (!m) return res.status(404).json({ error: "Member not found" });
  if (m.userId === req.user.id) return res.status(400).json({ error: "You can't remove yourself" });
  if (!canAssign(req.role, m.role)) return res.status(403).json({ error: "Admins cannot remove owners" });
  remove("memberships", (x) => x.id === m.id);
  log(req, "member.remove", { type: "user", id: m.userId, name: db.users.find((u) => u.id === m.userId)?.name });
  res.json({ ok: true });
});

// ---------------- Activity & workspace ----------------
r.get("/activity", requirePerm("activity:read"), (req, res) => {
  res.json({ activity: inWs(req, db.activity).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200) });
});

r.patch("/workspace", requirePerm("settings:manage"), (req, res) => {
  const { name, settings } = req.body || {};
  const patch = {};
  if (name?.trim()) patch.name = name.trim();
  if (settings) {
    const freq = Number(settings.scanFrequencyDays);
    const thr = Number(settings.alertThreshold);
    patch.settings = { ...req.workspace.settings, ...(freq ? { scanFrequencyDays: Math.min(90, Math.max(1, freq)) } : {}), ...(thr ? { alertThreshold: thr } : {}) };
  }
  log(req, "workspace.update", { type: "workspace", id: req.workspace.id, name: req.workspace.name }, patch);
  res.json({ workspace: update("workspaces", req.workspace.id, patch) });
});

export default r;
