import clsx from "clsx";

export const cn = (...a) => clsx(...a);

export function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const fut = s < 0;
  const a = Math.abs(s);
  const v = a < 60 ? `${a}s` : a < 3600 ? `${Math.floor(a / 60)}m` : a < 86400 ? `${Math.floor(a / 3600)}hr` : `${Math.floor(a / 86400)}d`;
  return fut ? `in ${v}` : `${v} ago`;
}

export function fmtDate(iso, opts = { month: "short", day: "2-digit", year: "numeric" }) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", opts);
}

export const RAG = {
  red: { label: "At risk", short: "Red", color: "var(--red)", soft: "var(--red-soft)", text: "text-red", bg: "bg-red-soft" },
  amber: { label: "Needs work", short: "Amber", color: "var(--amber)", soft: "var(--amber-soft)", text: "text-amber", bg: "bg-amber-soft" },
  green: { label: "Compliant", short: "Green", color: "var(--green)", soft: "var(--green-soft)", text: "text-green", bg: "bg-green-soft" },
  none: { label: "Not scanned", short: "—", color: "var(--ink-3)", soft: "var(--soft)", text: "text-ink-3", bg: "bg-soft" },
};

export const SEVERITY = {
  high: { label: "High", color: "var(--red)", soft: "var(--red-soft)" },
  medium: { label: "Medium", color: "var(--amber)", soft: "var(--amber-soft)" },
  low: { label: "Low", color: "var(--ink-3)", soft: "var(--soft)" },
};

export const DECISIONS = {
  remediate: { label: "Remediate", color: "var(--blue)", soft: "var(--blue-soft)" },
  accept: { label: "Risk accepted", color: "var(--amber)", soft: "var(--amber-soft)" },
  dismiss: { label: "Dismissed", color: "var(--ink-3)", soft: "var(--soft)" },
};

export const initials = (name = "") => name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

const AVATAR_COLORS = ["#f26b1d", "#3b6ef5", "#2f9e5b", "#a855f7", "#e5484d", "#0ea5e9", "#d97706"];
export const avatarColor = (s = "") => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export const siteCode = (id = "") => "#DP-" + id.replace(/^sit_/, "").slice(0, 4).toUpperCase();
