// Tiny JSON-file datastore. Good enough for a demo / single-node deployment.
// Swap for Postgres/Mongo by re-implementing these helpers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data", "db.json");

const EMPTY = {
  users: [],
  workspaces: [],
  memberships: [],
  sites: [],
  audits: [],
  findings: [],
  alerts: [],
  activity: [],
};

let state = null;

export function load() {
  if (state) return state;
  try {
    state = { ...EMPTY, ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) };
  } catch {
    state = structuredClone(EMPTY);
  }
  return state;
}

let writeTimer = null;
export function save() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, 50);
}

export function flush() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

export function reset() {
  state = structuredClone(EMPTY);
  flush();
  return state;
}

export const db = new Proxy(
  {},
  { get: (_, key) => load()[key] }
);

export const id = (prefix = "") =>
  prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 12);

export const now = () => new Date().toISOString();

export function insert(collection, doc) {
  const row = { id: id(collection.slice(0, 3) + "_"), createdAt: now(), ...doc };
  load()[collection].push(row);
  save();
  return row;
}

export function update(collection, rowId, patch) {
  const row = load()[collection].find((r) => r.id === rowId);
  if (!row) return null;
  Object.assign(row, patch, { updatedAt: now() });
  save();
  return row;
}

export function remove(collection, predicate) {
  const list = load()[collection];
  const keep = list.filter((r) => !predicate(r));
  const removed = list.length - keep.length;
  load()[collection] = keep;
  save();
  return removed;
}
