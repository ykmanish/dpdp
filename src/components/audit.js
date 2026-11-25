"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Globe, Search, ShieldAlert, Gauge, Eye, Check, X, Loader2, Quote, Wrench, Scale, ChevronDown, CheckCircle2, Ban, ShieldQuestion,
  Radar, Cookie, FileText, Link2, FormInput, Lock, Plus, Sparkles,
} from "lucide-react";
import { api, refreshAll } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, DECISIONS, SEVERITY, timeAgo, RAG } from "@/lib/utils";
import { Button, Modal, Pill, SeverityPill, Textarea, Field, ease } from "./ui";

export const STAGE_ICONS = { discovery: Globe, investigator: Search, challenger: ShieldAlert, scoring: Gauge, watcher: Eye };
export const TYPE_META = {
  policy: { label: "Privacy notice", icon: FileText },
  consent: { label: "Consent", icon: Cookie },
  tracker: { label: "Tracker", icon: Radar },
  transport: { label: "Security", icon: Lock },
  form: { label: "Data collection", icon: FormInput },
};

// Horizontal agent pipeline with live state.
export function Pipeline({ stages, compact }) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-5" : "grid-cols-1 sm:grid-cols-5")}>
      {stages.map((s, i) => {
        const Icon = STAGE_ICONS[s.key] || Globe;
        const state = s.status || "done";
        return (
          <motion.div key={s.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease }}
            className={cn("relative rounded-2xl border p-3 transition-colors", state === "running" ? "border-accent/40 bg-accent-soft/60" : state === "failed" ? "border-red/30 bg-red-soft/60" : "border-line bg-white")}>
            <div className="flex items-center gap-2">
              <span className={cn("grid size-7 place-items-center rounded-lg", state === "done" ? "bg-ink text-white" : state === "running" ? "bg-accent text-white pulse-ring" : state === "failed" ? "bg-red text-white" : "bg-soft text-ink-3")}>
                {state === "running" ? <Loader2 className="size-3.5 animate-spin" /> : state === "failed" ? <X className="size-3.5" /> : <Icon className="size-3.5" />}
              </span>
              <span className="text-[13px] font-semibold">{s.label}</span>
              {state === "done" && <Check className="ml-auto size-3.5 text-green" />}
            </div>
            {!compact && <p className="mt-2 text-[12px] leading-snug text-ink-2 min-h-[32px]">{s.summary || s.description || (state === "pending" ? "Waiting…" : "")}</p>}
            {i < stages.length - 1 && <span className="absolute -right-[7px] top-1/2 z-10 hidden h-px w-3 bg-line sm:block" />}
          </motion.div>
        );
      })}
    </div>
  );
}

export function Donut({ data, size = 148, stroke = 18, center }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offsets = data.map((_, i) => data.slice(0, i).reduce((a, d) => a + (d.value / total) * c, 0));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const off = offsets[i];
          return d.value ? (
            <motion.circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 3)} ${c}`} initial={{ strokeDashoffset: -off + len, opacity: 0 }} animate={{ strokeDashoffset: -off, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.8, ease }} strokeLinecap="butt" />
          ) : null;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
    </div>
  );
}

export function TrendChart({ points, height = 170 }) {
  const w = 560, h = height, pad = 26;
  const valid = points.filter((p) => p.avg != null);
  if (!valid.length) return <div className="grid h-[170px] place-items-center text-[13px] text-ink-3">No scans yet</div>;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v) => h - pad - (v / 100) * (h - pad * 2);
  const pts = points.map((p, i) => (p.avg == null ? null : [x(i), y(p.avg)])).filter(Boolean);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const area = `${line} L${pts.at(-1)[0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".22" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
      </defs>
      {[25, 50, 75].map((v) => (
        <g key={v}>
          <line x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={4} y={y(v) + 4} fontSize="10" fill="var(--ink-3)">{v}</text>
        </g>
      ))}
      <motion.path d={area} fill="url(#tg)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} />
      <motion.path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease }} />
      {points.map((p, i) => (
        <g key={p.month}>
          {p.avg != null && <motion.circle cx={x(i)} cy={y(p.avg)} r="4" fill="#fff" stroke="var(--accent)" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.08 }} />}
          {p.avg != null && <text x={x(i)} y={y(p.avg) - 10} fontSize="10.5" textAnchor="middle" fill="var(--ink-2)" fontWeight="600">{p.avg}</text>}
          <text x={x(i)} y={h - 6} fontSize="10.5" textAnchor="middle" fill="var(--ink-3)">{new Date(p.month + "-01").toLocaleDateString("en", { month: "short" })}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------- Findings ----------
export function DecisionBadge({ decision }) {
  if (!decision) return <Pill color="var(--accent)" soft="var(--accent-soft)" dot>Open</Pill>;
  const d = DECISIONS[decision];
  return <Pill color={d.color} soft={d.soft} dot>{d.label}</Pill>;
}

function ChallengerBadge({ c }) {
  if (!c) return null;
  const map = {
    upheld: { icon: CheckCircle2, color: "var(--green)", soft: "var(--green-soft)", label: "Upheld" },
    downgraded: { icon: ShieldQuestion, color: "var(--amber)", soft: "var(--amber-soft)", label: "Downgraded" },
    overturned: { icon: Ban, color: "var(--ink-3)", soft: "var(--soft)", label: "Overturned" },
  }[c.verdict];
  return <Pill icon={map.icon} color={map.color} soft={map.soft}>{map.label} · {c.confidence}</Pill>;
}

export function DecisionDialog({ finding, decision, onClose, onSaved }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const meta = { remediate: "Mark for remediation", accept: "Accept this risk", dismiss: "Dismiss finding" }[decision];
  const save = async () => {
    setLoading(true);
    try {
      const { finding: f } = await api(`/findings/${finding.id}`, { method: "PATCH", body: { decision, note } });
      toast.success(`${DECISIONS[decision].label}: ${finding.title}`);
      onSaved?.(f);
      onClose();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  return (
    <Modal open={!!finding} onClose={onClose} title={meta} description={finding?.title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={loading} onClick={save}>Confirm</Button></>}>
      <Field label={decision === "accept" ? "Justification (required)" : "Note (optional)"} hint={decision === "accept" ? "Explain why this risk is acceptable — recorded in the audit trail." : "Ticket number, owner or context."}>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={decision === "accept" ? "e.g. Legal approved: retention mandated by RBI KYC rules" : "e.g. JIRA-1234 assigned to web team"} autoFocus />
      </Field>
    </Modal>
  );
}

export function FindingCard({ f, onChange, showSite, tourFirst, index = 0 }) {
  const { can } = useAuth();
  const [open, setOpen] = useState(index < 2);
  const [dlg, setDlg] = useState(null);
  const T = TYPE_META[f.type] || TYPE_META.policy;
  const sev = SEVERITY[f.severity];
  const reopen = async () => {
    try {
      const { finding } = await api(`/findings/${f.id}`, { method: "PATCH", body: { decision: null } });
      onChange?.(finding); toast("Finding re-opened");
    } catch (e) { toast.error(e.message); }
  };
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04, ease }}
      data-tour={tourFirst ? "sd-finding" : undefined}
      className={cn("rounded-2xl border border-line bg-white overflow-hidden", (f.decision === "dismiss") && "opacity-70")}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-soft/40 transition-colors">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl" style={{ background: sev.soft, color: sev.color }}><T.icon className="size-4" strokeWidth={1.8} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold leading-snug">{f.title}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
            {showSite && <span className="font-medium text-ink-2">{f.siteName}</span>}
            {showSite && <span>·</span>}
            <span>{T.label}</span><span>·</span><span className="inline-flex items-center gap-1"><Scale className="size-3" />{f.dpdpRef}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
          <SeverityPill severity={f.severity} />
          <DecisionBadge decision={f.decision} />
          <ChevronDown className={cn("size-4 text-ink-3 transition-transform hidden sm:block", open && "rotate-180")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line-2 px-4 pb-4 pt-3">
              <p className="text-[13px] text-ink-2">{f.description}</p>
              <div className="rounded-xl bg-soft p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3"><Quote className="size-3" /> Evidence · {f.evidence?.source}</div>
                <p className="font-mono text-[12px] leading-relaxed text-ink break-words">“{f.evidence?.quote}”</p>
                {f.evidence?.url && <a href={f.evidence.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-blue hover:underline"><Link2 className="size-3" />{f.evidence.url}</a>}
              </div>
              <div className="flex flex-wrap items-start gap-2 text-[12.5px]">
                <span className="inline-flex items-center gap-1 font-medium text-ink-2"><ShieldAlert className="size-3.5" />Challenger:</span>
                <ChallengerBadge c={f.challenger} />
                <span className="text-ink-3">{f.challenger?.note}</span>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-green/20 bg-green-soft/50 p-3 text-[12.5px]">
                <Wrench className="mt-0.5 size-3.5 shrink-0 text-green" /><span><b className="font-semibold">Recommended fix:</b> {f.recommendation}</span>
              </div>
              {f.decision && (
                <div className="text-[12px] text-ink-3">
                  {DECISIONS[f.decision].label} by <b className="text-ink-2">{f.decidedBy}</b> {timeAgo(f.decidedAt)}{f.decisionNote && <> — “{f.decisionNote}”</>}
                </div>
              )}
              {can("finding:decide") && (
                <div className="flex flex-wrap gap-2 pt-1" data-tour={tourFirst ? "sd-decision" : undefined}>
                  {f.decision ? (
                    <Button size="sm" variant="secondary" onClick={reopen}>Re-open</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="primary" icon={Wrench} onClick={() => setDlg("remediate")}>Remediate</Button>
                      <Button size="sm" variant="secondary" icon={Scale} onClick={() => setDlg("accept")}>Accept risk</Button>
                      <Button size="sm" variant="ghost" icon={Ban} onClick={() => setDlg("dismiss")}>Dismiss</Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <DecisionDialog finding={dlg ? f : null} decision={dlg} onClose={() => setDlg(null)} onSaved={(x) => onChange?.(x)} />
    </motion.div>
  );
}

// ---------- Add sites ----------
export function AddSitesDialog({ open, onClose, onAdded }) {
  const [text, setText] = useState("");
  const [owner, setOwner] = useState("");
  const [loading, setLoading] = useState(false);
  const urls = text.split(/[\s,]+/).filter(Boolean);
  const submit = async () => {
    setLoading(true);
    try {
      const r = await api("/sites", { method: "POST", body: { urls, owner } });
      if (r.added.length) toast.success(`Added ${r.added.length} site${r.added.length > 1 ? "s" : ""} — audits started`);
      r.skipped.forEach((s) => toast.warning(`${s.input}: ${s.reason}`));
      setText(""); onAdded?.(r); onClose();
      refreshAll();
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add websites" description="Paste one URL or a list — one per line. Each site is audited right away." width={560}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" icon={Sparkles} loading={loading} disabled={!urls.length} onClick={submit}>Audit {urls.length || ""} site{urls.length === 1 ? "" : "s"}</Button></>}>
      <div className="space-y-3">
        <Field label="Website URLs" hint="Up to 50 at once. We fetch the homepage and its privacy notice; nothing is stored beyond what's needed as evidence.">
          <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"example.com\nhttps://www.yourcompany.in\nshop.yourbrand.in"} className="font-mono text-[12.5px]" autoFocus />
        </Field>
        <Field label="Owner team (optional)"><input className="w-full rounded-xl border border-line px-3 py-2 text-[13.5px] outline-none focus:border-ink/30" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Marketing, Growth, IT…" /></Field>
        <AnimatePresence>
          {urls.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden">
              {urls.slice(0, 12).map((u, i) => <motion.span key={u + i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-[11.5px] text-ink-2"><Globe className="size-3" />{u}</motion.span>)}
              {urls.length > 12 && <span className="text-[11.5px] text-ink-3">+{urls.length - 12} more</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

export const ragOf = (s) => RAG[s] || RAG.none;
