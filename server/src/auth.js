import jwt from "jsonwebtoken";
import { db, insert, now } from "./db.js";
import { can, permissionsFor } from "./rbac.js";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me-dpdp-auditor";
export const COOKIE = "pa_session";

export function issue(res, user) {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 3600 * 1000,
    path: "/",
  });
}

export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

// Attach req.user from cookie or bearer token.
export function authenticate(req, res, next) {
  const bearer = req.headers.authorization?.replace(/^Bearer /, "");
  const token = req.cookies?.[COOKIE] || bearer;
  if (!token) return res.status(401).json({ error: "Not signed in" });
  try {
    const { sub } = jwt.verify(token, JWT_SECRET);
    const user = db.users.find((u) => u.id === sub);
    if (!user || user.disabled) return res.status(401).json({ error: "Session invalid" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Session expired" });
  }
}

// Resolve the active workspace (x-workspace-id header) and the user's role in it.
export function workspace(req, res, next) {
  const wsId = req.headers["x-workspace-id"] || req.user.lastWorkspaceId;
  const memberships = db.memberships.filter((m) => m.userId === req.user.id);
  const m = memberships.find((x) => x.workspaceId === wsId) || memberships[0];
  if (!m) return res.status(403).json({ error: "You are not a member of any workspace" });
  req.workspace = db.workspaces.find((w) => w.id === m.workspaceId);
  req.role = m.role;
  req.permissions = permissionsFor(m.role);
  req.user.lastWorkspaceId = m.workspaceId;
  next();
}

export const requirePerm = (perm) => (req, res, next) =>
  can(req.role, perm)
    ? next()
    : res.status(403).json({ error: `Your role (${req.role}) cannot do this — requires ${perm}` });

export function log(req, action, target = {}, meta = {}) {
  insert("activity", {
    workspaceId: req.workspace?.id,
    actorId: req.user?.id,
    actorName: req.user?.name,
    action,
    target,
    meta,
    ip: req.ip,
    at: now(),
  });
}
