import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, insert, update, now } from "../db.js";
import { authenticate, workspace, issue, publicUser, COOKIE, log } from "../auth.js";
import { ROLE_META } from "../rbac.js";

const r = Router();
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");

// naive in-memory rate limit for login
const attempts = new Map();
function limited(key) {
  const t = Date.now();
  const list = (attempts.get(key) || []).filter((x) => t - x < 10 * 60e3);
  list.push(t);
  attempts.set(key, list);
  return list.length > 10;
}

r.post("/register", async (req, res) => {
  const { name, email, password, workspaceName } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "Name is required" });
  if (!emailOk(email)) return res.status(400).json({ error: "Enter a valid email" });
  if ((password || "").length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const lower = email.toLowerCase();
  if (db.users.some((u) => u.email === lower)) return res.status(409).json({ error: "An account with this email already exists" });

  const user = insert("users", { name: name.trim(), email: lower, passwordHash: await bcrypt.hash(password, 10), onboarded: false });
  const ws = insert("workspaces", { name: workspaceName?.trim() || `${name.trim().split(" ")[0]}'s workspace`, ownerId: user.id, settings: { scanFrequencyDays: 30, alertThreshold: 5 } });
  insert("memberships", { userId: user.id, workspaceId: ws.id, role: "owner" });
  user.lastWorkspaceId = ws.id;
  issue(res, user);
  req.user = user; req.workspace = ws;
  log(req, "auth.register");
  res.status(201).json({ user: publicUser(user) });
});

r.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (limited(req.ip + (email || ""))) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
  const user = db.users.find((u) => u.email === (email || "").toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ error: "Incorrect email or password" });
  if (user.disabled) return res.status(403).json({ error: "This account is disabled" });
  update("users", user.id, { lastLoginAt: now() });
  issue(res, user);
  req.user = user; req.workspace = db.workspaces.find((w) => w.id === user.lastWorkspaceId);
  log(req, "auth.login");
  res.json({ user: publicUser(user) });
});

r.post("/logout", (req, res) => {
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});

r.get("/me", authenticate, workspace, (req, res) => {
  const workspaces = db.memberships
    .filter((m) => m.userId === req.user.id)
    .map((m) => ({ ...db.workspaces.find((w) => w.id === m.workspaceId), role: m.role }));
  res.json({
    user: publicUser(req.user), workspace: req.workspace, role: req.role, roleMeta: ROLE_META[req.role],
    permissions: req.permissions, workspaces,
    unreadAlerts: db.alerts.filter((a) => a.workspaceId === req.workspace.id && !a.read).length,
  });
});

r.patch("/me", authenticate, workspace, async (req, res) => {
  const { name, currentPassword, newPassword, onboarded } = req.body || {};
  const patch = {};
  if (name?.trim()) patch.name = name.trim();
  if (typeof onboarded === "boolean") patch.onboarded = onboarded;
  if (newPassword) {
    if (!(await bcrypt.compare(currentPassword || "", req.user.passwordHash))) return res.status(400).json({ error: "Current password is incorrect" });
    if (newPassword.length < 8) return res.status(400).json({ error: "New password must be at least 8 characters" });
    patch.passwordHash = await bcrypt.hash(newPassword, 10);
    patch.mustChangePassword = false;
    log(req, "auth.password_changed");
  }
  res.json({ user: publicUser(update("users", req.user.id, patch)) });
});

r.post("/switch", authenticate, (req, res) => {
  const m = db.memberships.find((x) => x.userId === req.user.id && x.workspaceId === req.body?.workspaceId);
  if (!m) return res.status(403).json({ error: "Not a member of that workspace" });
  update("users", req.user.id, { lastWorkspaceId: m.workspaceId });
  res.json({ ok: true });
});

export default r;
