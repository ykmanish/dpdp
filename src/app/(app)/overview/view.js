"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { Globe, Gauge, ShieldAlert, Radar, ArrowUpRight, Bell, Plus, Sparkles, TrendingUp, Clock } from "lucide-react";
import { useApi } from "@/lib/api";
import { useAuth, Can } from "@/lib/auth";
import { RAG, timeAgo, cn } from "@/lib/utils";
import { Card, PageHeader, CountUp, Skeleton, RagPill, Button, EmptyState, stagger, ease } from "@/components/ui";
import { Pipeline, Donut, TrendChart, AddSitesDialog } from "@/components/audit";
import { useState } from "react";
import { api, refreshAll } from "@/lib/api";
import { toast } from "sonner";

function Kpi({ icon: Icon, label, value, suffix, hint, tone = "ink" }) {
  return (
    <motion.div variants={stagger.item}>
      <Card className="p-4 h-full" hover>
        <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
          <span className={cn("grid size-7 place-items-center rounded-lg", tone === "red" ? "bg-red-soft text-red" : tone === "accent" ? "bg-accent-soft text-accent" : "bg-soft text-ink-2")}><Icon className="size-3.5" strokeWidth={2} /></span>
          {label}
        </div>
        <div className="mt-3 font-display text-[30px] font-semibold leading-none"><CountUp value={value} suffix={suffix} /></div>
        {hint && <div className="mt-1.5 text-[12px] text-ink-3">{hint}</div>}
      </Card>
    </motion.div>
  );
}

export default function OverviewPage() {
  const { session } = useAuth();
  const { data, loading } = useApi("/overview", { poll: 5000 });
  const [add, setAdd] = useState(false);
  const live = data?.recentAudits?.find((a) => a.status === "running");
  const loadDemo = async () => {
    try { const r = await api("/sites/demo", { method: "POST" }); toast.success(`Loaded ${r.added.length} demo sites`); refreshAll(); } catch (e) { toast.error(e.message); }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <div className="grid gap-3 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64 lg:col-span-2" /></div>
      </div>
    );
  }
  const t = data?.totals || {};
  const hello = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader title={`${hello}, ${session?.user?.name?.split(" ")[0]}`} description={`Here's how ${session?.workspace?.name}'s websites stand against the DPDP Act today.`}>
        <Can perm="site:create"><Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>Add websites</Button></Can>
      </PageHeader>

      {t.sites === 0 ? (
        <EmptyState icon={Globe} title="No websites yet" action={<Can perm="site:create" fallback={<p className="text-[12.5px] text-ink-3">Ask an admin or auditor to add websites.</p>}><div className="flex gap-2"><Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>Add websites</Button><Button icon={Sparkles} onClick={loadDemo}>Load demo sites</Button></div></Can>}>
          Add your first URL — agents will audit trackers, the cookie banner and the privacy notice within seconds.
        </EmptyState>
      ) : (
        <>
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="ov-kpis">
            <Kpi icon={Globe} label="Websites monitored" value={t.sites} hint={`${t.scansThisMonth} scans this month`} />
            <Kpi icon={Gauge} label="Average score" value={t.avgScore} suffix="" hint="out of 100 across all sites" tone="accent" />
            <Kpi icon={ShieldAlert} label="High-severity open" value={t.highFindings} hint={`${t.openFindings} findings need action`} tone="red" />
            <Kpi icon={Radar} label="Third-party trackers" value={t.trackers} hint="across latest scans" />
          </motion.div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Card className="p-5" data-tour="ov-rag">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-[16px] font-semibold">Risk split</h3>
                <Link href="/sites" className="text-[12px] text-ink-3 hover:text-ink inline-flex items-center gap-0.5">All sites <ArrowUpRight className="size-3" /></Link>
              </div>
              <div className="mt-4 flex items-center gap-5">
                <Donut data={["red", "amber", "green"].map((k) => ({ label: k, value: data.rag[k], color: RAG[k].color }))}
                  center={<div><div className="font-display text-[26px] font-semibold leading-none">{t.sites}</div><div className="text-[11px] text-ink-3">sites</div></div>} />
                <div className="flex-1 space-y-2">
                  {["red", "amber", "green"].map((k, i) => (
                    <motion.div key={k} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                      <Link href={`/sites?rag=${k}`} className="flex items-center justify-between rounded-xl px-2.5 py-2 hover:bg-soft transition">
                        <span className="flex items-center gap-2 text-[13px]"><span className="size-2.5 rounded-full" style={{ background: RAG[k].color }} />{RAG[k].label}</span>
                        <span className="font-display text-[15px] font-semibold">{data.rag[k]}</span>
                      </Link>
                    </motion.div>
                  ))}
                  <p className="px-2.5 text-[11px] text-ink-3">Green ≥ 75 · Amber 50–74 · Red &lt; 50</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 lg:col-span-2" data-tour="ov-trend">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-[16px] font-semibold">Average score trend</h3>
                  <p className="text-[12px] text-ink-3">Mean of all completed scans per month</p>
                </div>
                {(() => {
                  const v = data.trend.filter((p) => p.avg != null);
                  const d = v.length > 1 ? v.at(-1).avg - v[0].avg : 0;
                  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium", d >= 0 ? "bg-green-soft text-green" : "bg-red-soft text-red")}><TrendingUp className={cn("size-3.5", d < 0 && "rotate-180")} />{d >= 0 ? "+" : ""}{d} pts</span>;
                })()}
              </div>
              <div className="mt-2"><TrendChart points={data.trend} /></div>
            </Card>
          </div>

          <Card className="mt-3 p-5" data-tour="ov-pipeline">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-[16px] font-semibold">Agent pipeline</h3>
                <p className="text-[12px] text-ink-3">{live ? <>Scanning <b className="text-ink-2">{live.siteName}</b> right now…</> : "How every audit is produced — evidence first, then a second opinion, then a score."}</p>
              </div>
              {live && <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-medium text-accent"><span className="size-1.5 rounded-full bg-accent animate-pulse" />Live</span>}
            </div>
            <Pipeline stages={live ? live.stages.map((s) => ({ ...s, description: data.stages.find((x) => x.key === s.key)?.description })) : data.stages.map((s) => ({ ...s, status: "idle" }))} />
          </Card>

          <div className="mt-3 grid gap-3 lg:grid-cols-5">
            <Card className="p-5 lg:col-span-3" data-tour="ov-clauses">
              <h3 className="font-display text-[16px] font-semibold">DPDP notice coverage</h3>
              <p className="text-[12px] text-ink-3">Share of sites whose privacy notice covers each requirement — weakest first</p>
              <div className="mt-4 space-y-2.5">
                {data.clauses.slice(0, 8).map((c, i) => {
                  const pct = Math.round((c.met / c.total) * 100);
                  return (
                    <div key={c.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,240px)_1fr_auto]">
                      <div className="truncate text-[12.5px] text-ink-2" title={c.title}><span className="mr-1.5 font-mono text-[10.5px] text-ink-3">{c.section}</span>{c.title}</div>
                      <div className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-soft sm:order-none sm:col-span-1">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.2 + i * 0.05, duration: 0.8, ease }} className="h-full rounded-full" style={{ background: pct >= 75 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)" }} />
                      </div>
                      <div className="text-right text-[12px] font-semibold tabular-nums">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5 lg:col-span-2" data-tour="ov-recent">
              <h3 className="font-display text-[16px] font-semibold">Recent activity</h3>
              <div className="mt-3 space-y-1">
                {data.recentAlerts.slice(0, 3).map((a) => (
                  <Link key={a.id} href="/alerts" className="flex items-start gap-3 rounded-xl p-2 hover:bg-soft transition">
                    <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", a.severity === "high" ? "bg-red-soft text-red" : a.severity === "medium" ? "bg-amber-soft text-amber" : "bg-soft text-ink-2")}><Bell className="size-3.5" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{a.title}</span><span className="block text-[11.5px] text-ink-3">{a.siteName} · {timeAgo(a.createdAt)}</span></span>
                  </Link>
                ))}
                {data.recentAudits.slice(0, 4).map((a) => (
                  <Link key={a.id} href={`/sites/${a.siteId}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-soft transition">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-soft text-ink-2"><Clock className="size-3.5" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{a.siteName}</span><span className="block text-[11.5px] text-ink-3 capitalize">{a.trigger} scan · {timeAgo(a.createdAt)}</span></span>
                    {a.status === "done" ? <RagPill rag={a.rag} label={String(a.score)} /> : <span className="text-[12px] capitalize text-ink-3">{a.status}</span>}
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
      <AddSitesDialog open={add} onClose={() => setAdd(false)} />
    </div>
  );
}
