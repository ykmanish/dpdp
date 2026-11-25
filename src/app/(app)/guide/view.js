"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass, Check, Globe, ShieldAlert, Bell, FileText, Users, History, Settings, LayoutDashboard, PlayCircle, ChevronDown,
  Search, Gauge, Eye, BookOpen, Sparkles, ArrowRight, Calculator, Scale, Lightbulb,
} from "lucide-react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTour } from "@/components/shell";
import { TOURS } from "@/lib/tours";
import { cn } from "@/lib/utils";
import { Card, Button, PageHeader, Pill, ease } from "@/components/ui";
import { STAGE_ICONS } from "@/components/audit";

const MODULES = [
  { key: "overview", icon: LayoutDashboard, title: "Overview", d: "Portfolio KPIs, risk split, score trend and DPDP clause coverage." },
  { key: "sites", icon: Globe, title: "Websites", d: "Add URLs, filter the risk board and open any site's audit." },
  { key: "findings", icon: ShieldAlert, title: "Findings", d: "Triage issues with evidence; remediate, accept or dismiss." },
  { key: "alerts", icon: Bell, title: "Alerts", d: "Changes the Watcher detected between scans." },
  { key: "reports", icon: FileText, title: "Reports", d: "PDF evidence packs and CSV exports." },
  { key: "team", icon: Users, title: "Team & roles", d: "Members, roles and the permission matrix." },
  { key: "activity", icon: History, title: "Activity log", d: "Audit trail of every action.", perm: "activity:read" },
  { key: "settings", icon: Settings, title: "Settings", d: "Workspace schedule and your profile." },
];

const PIPELINE = [
  { key: "discovery", t: "Discovery", d: "Fetches the homepage like a first-time visitor (no consent given), records cookies set on the first response, finds the privacy-notice link (or tries /privacy-policy and /privacy) and downloads it." },
  { key: "investigator", t: "Investigator", d: "Matches every script, pixel and iframe against 24 known tracker signatures, detects consent managers and cookie-banner wording, checks forms that collect personal data, and reads the notice against 15 DPDP requirements — saving the exact sentence it relied on." },
  { key: "challenger", t: "Challenger", d: "A second, sceptical pass. It re-reads the raw source to confirm each quote, overturns clauses that are negations (“we do not offer erasure”), downgrades weak or generic matches, and lowers confidence on JavaScript-rendered pages." },
  { key: "scoring", t: "Risk score", d: "Applies a transparent formula (below) and assigns Red / Amber / Green." },
  { key: "watcher", t: "Watcher", d: "Stores the result as a baseline. On every scheduled re-scan it compares with the previous one and raises alerts for score drops, band changes, new trackers, a removed banner or an edited policy." },
];

const CLAUSES = [
  ["S.5(1)(i)", "Notice: personal data & purpose", "Itemised data collected and the purpose of each."],
  ["S.5(1)(ii)–(iii)", "How to exercise rights & complain", "Including the right to complain to the Data Protection Board of India."],
  ["S.6(1)", "Valid consent", "Free, specific, informed, unconditional, unambiguous, by clear affirmative action."],
  ["S.6(4)", "Withdrawal", "As easy to withdraw as to give consent."],
  ["S.8(5)–(6)", "Security & breach intimation", "Reasonable safeguards; notify the Board and affected people."],
  ["S.8(7)", "Retention & erasure", "Erase once the purpose is served."],
  ["S.8(9)", "Contact person / DPO", "Publish the business contact of who answers questions."],
  ["S.9", "Children", "Verifiable parental consent; no tracking or targeted ads at children."],
  ["S.11–12", "Access, correction & erasure", "Summary of data; correct, complete, update or erase."],
  ["S.13", "Grievance redressal", "A readily available grievance mechanism."],
  ["S.14", "Nomination", "Nominate someone to exercise rights on death or incapacity."],
  ["S.16", "Cross-border transfers", "Transfers outside India, subject to Government restrictions."],
];

const FAQ = [
  ["Is this legal advice?", "No. The auditor gives evidence-backed signals and a prioritised to-do list. A qualified professional should review high-risk sites before you rely on them."],
  ["Why might a tracker be missed?", "Tags injected later by JavaScript or a tag manager may not appear in the initial HTML. The challenger flags client-rendered pages with lower confidence so a human can verify."],
  ["What happens to my decisions on the next scan?", "Decisions are carried forward by finding type, so an accepted risk stays accepted on monthly re-scans unless someone re-opens it."],
  ["What are the demo sites?", "Six fictional websites with built-in HTML so you can see the full pipeline without network access. They run through the exact same code as real URLs."],
  ["Who can accept a risk?", "Owners, admins and auditors. Accepting always requires a written justification, which is stored in the activity log."],
];

export default function GuidePage() {
  const { can, session } = useAuth();
  const { start } = useTour();
  const { data: ov } = useApi("/overview");
  const { data: fd } = useApi("/findings");
  const { data: mem } = useApi("/members");
  const [faq, setFaq] = useState(0);

  const checklist = [
    { t: "Take the platform tour", done: session?.user?.onboarded, action: () => start("platform"), cta: "Start tour" },
    { t: "Add your first website", done: (ov?.totals?.sites || 0) > 0, href: "/sites?add=1", cta: "Add website" },
    { t: "Open an audit and read the evidence", done: (ov?.totals?.scansThisMonth || 0) > 0, href: "/sites", cta: "Open websites" },
    { t: "Decide on a finding", done: (fd?.findings || []).some((f) => f.decision), href: "/findings", cta: "Review findings" },
    { t: "Invite a teammate", done: (mem?.members?.length || 0) > 1, href: "/team", cta: "Invite", perm: "member:manage" },
    { t: "Export a report", done: false, href: "/reports", cta: "Export" },
  ].filter((c) => !c.perm || can(c.perm));
  const done = checklist.filter((c) => c.done).length;

  return (
    <div>
      <PageHeader title="Guide" description="Everything you need to run DPDP website audits with confidence.">
        <Button variant="primary" icon={Compass} onClick={() => start("platform")}>Platform tour</Button>
      </PageHeader>

      {/* Getting started */}
      <Card className="relative overflow-hidden p-5" data-tour="g-start">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-accent-soft blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-display text-[18px] font-semibold"><Sparkles className="size-4 text-accent" />Getting started</div>
            <p className="text-[12.5px] text-ink-3">{done} of {checklist.length} done — ticks itself off as you go.</p>
          </div>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-soft">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(done / checklist.length) * 100}%` }} transition={{ duration: 0.8, ease }} className="h-full rounded-full bg-accent" />
          </div>
        </div>
        <div className="relative mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {checklist.map((c, i) => (
            <motion.div key={c.t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={cn("flex items-center gap-3 rounded-xl border p-3", c.done ? "border-green/20 bg-green-soft/40" : "border-line bg-white")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", c.done ? "border-green bg-green text-white" : "border-line text-ink-3")}>{c.done ? <Check className="size-3.5" /> : <span className="text-[11px] font-semibold">{i + 1}</span>}</span>
              <span className={cn("flex-1 text-[13px]", c.done && "text-ink-3 line-through")}>{c.t}</span>
              {!c.done && (c.href ? <Link href={c.href} className="text-[12px] font-medium text-accent hover:underline">{c.cta}</Link> : <button onClick={c.action} className="text-[12px] font-medium text-accent hover:underline">{c.cta}</button>)}
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Module tours */}
      <h2 className="mb-3 mt-8 font-display text-[19px] font-semibold">Module tours</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-tour="g-modules">
        {MODULES.filter((m) => !m.perm || can(m.perm)).map((m, i) => (
          <motion.button key={m.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }}
            onClick={() => start(m.key)} className="group rounded-2xl border border-line bg-white p-4 text-left transition-shadow hover:shadow-[0_16px_36px_-18px_rgba(16,24,40,.25)]">
            <div className="flex items-center justify-between">
              <span className="grid size-9 place-items-center rounded-xl bg-soft text-ink-2 transition-colors group-hover:bg-ink group-hover:text-white"><m.icon className="size-4" /></span>
              <PlayCircle className="size-4 text-ink-3 transition-colors group-hover:text-accent" />
            </div>
            <div className="mt-3 text-[14px] font-semibold">{m.title}</div>
            <div className="mt-0.5 text-[12.5px] text-ink-3">{m.d}</div>
            <div className="mt-3 text-[11.5px] font-medium text-ink-2">{TOURS[m.key].steps.length} steps · {TOURS[m.key].summary}</div>
          </motion.button>
        ))}
      </div>

      {/* Pipeline */}
      <h2 className="mb-3 mt-10 font-display text-[19px] font-semibold">How an audit works</h2>
      <Card className="p-5">
        <ol className="relative space-y-5 before:absolute before:left-[17px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-line">
          {PIPELINE.map((p, i) => {
            const I = STAGE_ICONS[p.key];
            return (
              <motion.li key={p.key} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="relative flex gap-4">
                <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-white"><I className="size-4" /></span>
                <div><div className="text-[14px] font-semibold">{i + 1}. {p.t}</div><p className="mt-0.5 text-[13px] text-ink-2">{p.d}</p></div>
              </motion.li>
            );
          })}
        </ol>
      </Card>

      {/* Scoring */}
      <h2 className="mb-3 mt-10 font-display text-[19px] font-semibold">How scoring works</h2>
      <Card className="grid gap-5 p-5 lg:grid-cols-2" data-tour="g-score">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-semibold"><Calculator className="size-4" />The formula</div>
          <div className="mt-2 rounded-xl bg-ink p-4 font-mono text-[13px] text-white">score = 100 − Σ (deduction × confidence)</div>
          <p className="mt-2 text-[12.5px] text-ink-2">Confidence comes from the Challenger: <b>high ×1</b>, <b>medium ×0.75</b>, <b>low ×0.5</b>. Tracker deductions are capped at 20 points.</p>
          <div className="mt-3 flex gap-2"><Pill dot color="var(--green)" soft="var(--green-soft)">Green ≥ 75</Pill><Pill dot color="var(--amber)" soft="var(--amber-soft)">Amber 50–74</Pill><Pill dot color="var(--red)" soft="var(--red-soft)">Red &lt; 50</Pill></div>
        </div>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-[12.5px]">
            <tbody className="divide-y divide-line-2">
              {[["No privacy notice found", "−45"], ["Each missing notice clause", "up to −45 total, by weight"], ["Trackers with no consent banner", "−20"], ["Trackers loading before consent", "−3 each (max −12)"], ["Banner without a ‘Reject’ option", "−8"], ["Advertising / session-replay tracker", "−4 / −5 (×0.4 if gated)"], ["Not served over HTTPS", "−10"], ["Form collecting data with no notice", "−5"]].map(([k, v]) => (
                <tr key={k}><td className="px-3 py-2 text-ink-2">{k}</td><td className="px-3 py-2 text-right font-mono text-red">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DPDP */}
      <h2 id="dpdp" className="mb-3 mt-10 scroll-mt-6 font-display text-[19px] font-semibold">DPDP Act clauses we check</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {CLAUSES.map(([s, t, d], i) => (
          <motion.div key={s} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 6) * 0.04 }}>
            <Card className="flex gap-3 p-3.5">
              <span className="h-fit shrink-0 rounded-lg bg-soft px-2 py-1 font-mono text-[11px] font-semibold text-ink-2">{s}</span>
              <div><div className="text-[13.5px] font-semibold">{t}</div><div className="text-[12.5px] text-ink-3">{d}</div></div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Roles */}
      <h2 className="mb-3 mt-10 font-display text-[19px] font-semibold">Roles in one line</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[["Owner", "Everything, including deleting the workspace."], ["Admin", "Manage members, settings, sites and all audits."], ["Auditor", "Add sites, run audits, decide on findings."], ["Viewer", "Read-only dashboards, findings and reports."]].map(([r, d]) => (
          <Card key={r} className={cn("p-4", session?.role === r.toLowerCase() && "border-accent/40 bg-accent-soft/30")}>
            <div className="flex items-center justify-between text-[14px] font-semibold">{r}{session?.role === r.toLowerCase() && <Pill color="var(--accent)" soft="var(--accent-soft)">You</Pill>}</div>
            <p className="mt-1 text-[12.5px] text-ink-3">{d}</p>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <h2 className="mb-3 mt-10 font-display text-[19px] font-semibold">FAQ</h2>
      <Card className="divide-y divide-line-2">
        {FAQ.map(([q, a], i) => (
          <div key={q}>
            <button onClick={() => setFaq(faq === i ? -1 : i)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-[13.5px] font-medium hover:bg-soft/40">
              <span className="flex items-center gap-2"><Lightbulb className="size-4 text-accent" />{q}</span>
              <ChevronDown className={cn("size-4 text-ink-3 transition-transform", faq === i && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {faq === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }} className="overflow-hidden"><p className="px-5 pb-4 pl-11 text-[13px] text-ink-2">{a}</p></motion.div>}
            </AnimatePresence>
          </div>
        ))}
      </Card>
      <p className="mt-6 text-center text-[12px] text-ink-3">Signals only — not legal advice. Review high-risk findings with your counsel.</p>
    </div>
  );
}
