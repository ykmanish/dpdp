"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { History, LogIn, Globe, Play, ShieldCheck, UserPlus, UserCog, UserMinus, Download, Settings, KeyRound, Trash2, Lock } from "lucide-react";
import { useApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/utils";
import { PageHeader, Card, Avatar, Skeleton, EmptyState, Select } from "@/components/ui";

const META = {
  "auth.login": [LogIn, "signed in"], "auth.register": [LogIn, "created the workspace"], "auth.password_changed": [KeyRound, "changed their password"],
  "site.create": [Globe, "added websites"], "site.demo_loaded": [Globe, "loaded demo websites"], "site.update": [Settings, "updated a website"], "site.delete": [Trash2, "removed a website"],
  "audit.run": [Play, "ran an audit"], "audit.run_all": [Play, "re-scanned all websites"], "finding.decide": [ShieldCheck, "decided on a finding"],
  "member.add": [UserPlus, "added a member"], "member.role_change": [UserCog, "changed a role"], "member.remove": [UserMinus, "removed a member"],
  "report.export": [Download, "exported a report"], "workspace.update": [Settings, "updated workspace settings"],
};

function detail(a) {
  const m = a.meta || {};
  if (a.action === "finding.decide") return `${m.decision || "re-opened"} · ${a.target?.name} (${m.site})`;
  if (a.action === "member.role_change") return `${a.target?.name}: ${m.from} → ${m.to}`;
  if (a.action === "member.add") return `${a.target?.name} as ${m.role}`;
  if (a.action === "site.create") return (m.urls || []).join(", ");
  if (a.action === "report.export") return `${m.format?.toUpperCase() || ""} ${a.target?.name ? "· " + a.target.name : "· portfolio"}`;
  return a.target?.name || "";
}

export default function ActivityPage() {
  const { can } = useAuth();
  const { data, loading } = useApi(can("activity:read") ? "/activity" : null);
  const [filter, setFilter] = useState("");
  if (!can("activity:read")) return <EmptyState icon={Lock} title="Admins only">The activity log is available to workspace owners and admins.</EmptyState>;
  const list = (data?.activity || []).filter((a) => !filter || a.action.startsWith(filter));

  return (
    <div>
      <PageHeader title="Activity log" description="An append-only trail of who did what — useful evidence for DPDP accountability.">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-44 py-0">
          <option value="">All events</option><option value="auth">Sign-ins</option><option value="site">Websites</option><option value="audit">Audits</option><option value="finding">Decisions</option><option value="member">Members</option><option value="report">Exports</option>
        </Select>
      </PageHeader>
      <Card className="p-2" data-tour="ac-list">
        {loading && !data ? <div className="space-y-2 p-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div> :
          list.length === 0 ? <div className="p-4"><EmptyState icon={History} title="No activity yet" /></div> : (
            <ol className="relative">
              {list.map((a, i) => {
                const [I, verb] = META[a.action] || [History, a.action];
                return (
                  <motion.li key={a.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.025 }} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-soft/50">
                    <Avatar name={a.actorName || "System"} size={30} />
                    <div className="min-w-0 flex-1 text-[13px]">
                      <div><b className="font-semibold">{a.actorName || "Watcher"}</b> <span className="text-ink-2">{verb}</span></div>
                      {detail(a) && <div className="truncate text-[12px] text-ink-3">{detail(a)}</div>}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-ink-3"><I className="size-3.5" />{fmtDate(a.at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </motion.li>
                );
              })}
            </ol>
          )}
      </Card>
    </div>
  );
}
