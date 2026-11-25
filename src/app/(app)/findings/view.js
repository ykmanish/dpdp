"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, AlertTriangle, Wrench, Scale, Search, Inbox } from "lucide-react";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageHeader, Card, Select, Skeleton, EmptyState, CountUp, Tabs } from "@/components/ui";
import { FindingCard, TYPE_META } from "@/components/audit";

export default function FindingsPage() {
  const { data, loading, setData } = useApi("/findings");
  const [decision, setDecision] = useState("open");
  const [severity, setSeverity] = useState("");
  const [type, setType] = useState("");
  const [site, setSite] = useState("");
  const [q, setQ] = useState("");
  const all = data?.findings || [];
  const sites = [...new Set(all.map((f) => f.siteName))];

  const list = useMemo(() => all.filter((f) =>
    (decision === "all" || (decision === "open" ? !f.decision : f.decision === decision)) &&
    (!severity || f.severity === severity) && (!type || f.type === type) && (!site || f.siteName === site) &&
    (!q || (f.title + f.description + f.siteName + f.evidence?.quote).toLowerCase().includes(q.toLowerCase()))
  ), [all, decision, severity, type, site, q]);

  const stats = [
    { label: "Open", value: all.filter((f) => !f.decision).length, icon: Inbox, tone: "accent" },
    { label: "High severity open", value: all.filter((f) => f.severity === "high" && !f.decision).length, icon: AlertTriangle, tone: "red" },
    { label: "Being remediated", value: all.filter((f) => f.decision === "remediate").length, icon: Wrench, tone: "blue" },
    { label: "Risk accepted", value: all.filter((f) => f.decision === "accept").length, icon: Scale, tone: "amber" },
  ];
  const update = (f) => setData({ findings: all.map((x) => (x.id === f.id ? f : x)) });

  return (
    <div>
      <PageHeader title="Findings" description="Every issue across your websites — with quoted evidence and a second opinion. Decide what happens next." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="f-stats">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[12.5px] text-ink-2"><span className="grid size-7 place-items-center rounded-lg" style={{ background: `var(--${s.tone}-soft)`, color: `var(--${s.tone})` }}><s.icon className="size-3.5" /></span>{s.label}</div>
              <div className="mt-2.5 font-display text-[28px] font-semibold leading-none"><CountUp value={s.value} /></div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2" data-tour="f-filters">
        <Tabs id="dec" value={decision} onChange={setDecision} tabs={[
          { value: "open", label: "Open" }, { value: "remediate", label: "Remediate" }, { value: "accept", label: "Accepted" }, { value: "dismiss", label: "Dismissed" }, { value: "all", label: "All" },
        ]} />
        <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="h-9 w-auto py-0"><option value="">All severities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-auto py-0"><option value="">All types</option>{Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        <Select value={site} onChange={(e) => setSite(e.target.value)} className="h-9 w-auto py-0"><option value="">All websites</option>{sites.map((s) => <option key={s}>{s}</option>)}</Select>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search findings & evidence" className="h-9 w-60 rounded-xl border border-line pl-8 pr-3 text-[13px] outline-none focus:border-ink/20" />
        </div>
      </div>

      <div className="mt-4 space-y-2.5" data-tour="f-list">
        {loading && !data ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />) :
          list.length === 0 ? <EmptyState icon={ShieldAlert} title="Nothing here">{decision === "open" ? "No open findings match — nice work." : "No findings match these filters."}</EmptyState> :
          list.map((f, i) => <FindingCard key={f.id} f={f} index={i} showSite onChange={update} />)}
      </div>
    </div>
  );
}
