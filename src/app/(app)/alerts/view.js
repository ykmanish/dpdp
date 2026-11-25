"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Bell, CheckCheck, TrendingDown, Radar, FileText, Cookie, Activity, Check } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { Can, useAuth } from "@/lib/auth";
import { cn, timeAgo } from "@/lib/utils";
import { PageHeader, Card, Button, EmptyState, Skeleton, Pill } from "@/components/ui";

const iconFor = (t) => /score/i.test(t) ? TrendingDown : /tracker/i.test(t) ? Radar : /policy/i.test(t) ? FileText : /banner/i.test(t) ? Cookie : Activity;
const SEV = { high: ["var(--red)", "var(--red-soft)"], medium: ["var(--amber)", "var(--amber-soft)"], low: ["var(--ink-2)", "var(--soft)"] };

export default function AlertsPage() {
  const { data, loading, setData } = useApi("/alerts");
  const { reload } = useAuth();
  const alerts = data?.alerts || [];
  const unread = alerts.filter((a) => !a.read).length;

  const mark = async (a, read) => {
    setData({ alerts: alerts.map((x) => (x.id === a.id ? { ...x, read } : x)) });
    try { await api(`/alerts/${a.id}`, { method: "PATCH", body: { read } }); reload(); } catch (e) { toast.error(e.message); }
  };
  const all = async () => {
    try { await api("/alerts/read-all", { method: "POST" }); setData({ alerts: alerts.map((x) => ({ ...x, read: true })) }); reload(); toast.success("All alerts marked as read"); } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader title="Alerts" description="The Watcher re-scans every site on schedule and tells you what changed.">
        <Can perm="alert:manage"><Button icon={CheckCheck} onClick={all} disabled={!unread}>Mark all read</Button></Can>
      </PageHeader>
      <div data-tour="al-list" className="space-y-2">
        {loading && !data ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />) :
          alerts.length === 0 ? <EmptyState icon={Bell} title="All quiet">Alerts appear when a re-scan finds a score drop, new tracker, removed banner or changed policy.</EmptyState> : (
            <AnimatePresence initial={false}>
              {alerts.map((a, i) => {
                const I = iconFor(a.title);
                const [c, s] = SEV[a.severity] || SEV.low;
                return (
                  <motion.div key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.035 }}>
                    <Card className={cn("flex items-center gap-3 p-3.5 transition-colors", !a.read && "border-accent/25 bg-accent-soft/25")}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: s, color: c }}><I className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-[13.5px] font-semibold">{a.title}</span><Pill color={c} soft={s}>{a.severity}</Pill>{!a.read && <span className="size-1.5 rounded-full bg-accent" />}</div>
                        <div className="text-[12.5px] text-ink-2">{a.body} <Link href={`/sites/${a.siteId}`} className="text-ink underline-offset-2 hover:underline">Open {a.siteName}</Link></div>
                      </div>
                      <span className="hidden text-[12px] text-ink-3 sm:block">{timeAgo(a.createdAt)}</span>
                      <Can perm="alert:manage">
                        <button onClick={() => mark(a, !a.read)} className="rounded-lg p-2 text-ink-3 hover:bg-soft hover:text-ink" title={a.read ? "Mark unread" : "Mark read"}>
                          {a.read ? <Bell className="size-4" /> : <Check className="size-4" />}
                        </button>
                      </Can>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
      </div>
    </div>
  );
}
