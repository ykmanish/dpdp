"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Plus, Sparkles, Search, Users, X, Gauge, Tag, Radar, Calendar, Building2, MessageSquareWarning, Clock, Loader2, RefreshCw,
  CircleDot, ShieldAlert, ShieldCheck, Shield, TrendingUp, Eye, AlertTriangle, LayoutGrid, List,
} from "lucide-react";
import { api, useApi, refreshAll } from "@/lib/api";
import { Can, useAuth } from "@/lib/auth";
import { cn, RAG, timeAgo, fmtDate, siteCode, avatarColor } from "@/lib/utils";
import { Button, PageHeader, Card, AvatarStack, SegmentBar, Dropdown, MenuItem, Skeleton, EmptyState, RagPill, ease } from "@/components/ui";
import { AddSitesDialog } from "@/components/audit";

const GROUPS = [
  { key: "red", label: "At risk", icon: ShieldAlert },
  { key: "amber", label: "Needs work", icon: Shield },
  { key: "green", label: "Compliant", icon: ShieldCheck },
  { key: "none", label: "Not scanned", icon: CircleDot },
];

const FIELDS = [
  { key: "rag", label: "Status", icon: Gauge, values: (s) => ["red", "amber", "green"], fmt: (v) => RAG[v]?.short },
  { key: "owner", label: "Owner team", icon: Users, values: (s) => [...new Set(s.map((x) => x.owner).filter(Boolean))] },
  { key: "tag", label: "Tag", icon: Tag, values: (s) => [...new Set(s.flatMap((x) => x.tags || []))] },
  { key: "trackers", label: "Trackers", icon: Radar, values: () => ["none", "1-2", "3+"] },
  { key: "high", label: "High-severity open", icon: AlertTriangle, values: () => ["yes", "no"] },
];

function match(site, f) {
  if (f.key === "rag") return (site.lastRag || "none") === f.value;
  if (f.key === "owner") return site.owner === f.value;
  if (f.key === "tag") return site.tags?.includes(f.value);
  if (f.key === "trackers") { const n = site.trackerCount || 0; return f.value === "none" ? n === 0 : f.value === "1-2" ? n > 0 && n < 3 : n >= 3; }
  if (f.key === "high") return f.value === "yes" ? site.highOpen > 0 : !site.highOpen;
  return true;
}

function FilterBar({ sites, filters, setFilters, q, setQ }) {
  const [field, setField] = useState(null);
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2" data-tour="sites-filter">
      <button onClick={() => { setFilters([]); setQ(""); }} title="Clear filters" className="grid size-8 place-items-center rounded-xl border border-line bg-white text-accent hover:bg-accent-soft transition">
        <Sparkles className="size-4" />
      </button>
      <AnimatePresence initial={false}>
        {filters.map((f, i) => {
          const F = FIELDS.find((x) => x.key === f.key);
          return (
            <motion.div key={f.key + f.value} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex h-8 items-center overflow-hidden rounded-xl border border-line bg-white text-[12.5px]">
              <span className="flex items-center gap-1.5 px-2.5 text-ink"><F.icon className="size-3.5 text-ink-2" />{F.label}</span>
              <span className="border-x border-line bg-soft px-2 py-1.5 font-mono text-[11.5px] text-ink-2">is</span>
              <span className="px-2.5 font-medium">{F.fmt ? F.fmt(f.value) : f.value}</span>
              <button onClick={() => setFilters(filters.filter((_, j) => j !== i))} className="grid h-full w-7 place-items-center border-l border-line text-ink-3 hover:bg-soft hover:text-ink"><X className="size-3.5" /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
      <Dropdown width={230} trigger={({ toggle }) => (
        <button onClick={() => { setField(null); setSearch(""); toggle(); }} className="flex h-8 items-center gap-1.5 rounded-xl border border-dashed border-line px-2.5 text-[12.5px] text-ink-3 hover:text-ink hover:border-ink/20 transition">
          <Plus className="size-3.5" /> Filter
        </button>
      )}>
        <div className="flex items-center gap-2 border-b border-line px-2.5 pb-2 pt-1">
          <Search className="size-3.5 text-ink-3" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={field ? `Search ${field.label.toLowerCase()}…` : "Search…"} className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-3" autoFocus />
        </div>
        <div className="pt-1 max-h-64 overflow-y-auto">
          {!field && FIELDS.filter((f) => f.label.toLowerCase().includes(search.toLowerCase())).map((f) => (
            <button key={f.key} onClick={() => { setField(f); setSearch(""); }} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-soft hover:text-ink">
              <f.icon className="size-4" strokeWidth={1.7} />{f.label}
            </button>
          ))}
          {field && field.values(sites).filter((v) => String(field.fmt ? field.fmt(v) : v).toLowerCase().includes(search.toLowerCase())).map((v) => (
            <MenuItem key={v} onClick={() => setFilters([...filters.filter((x) => x.key !== field.key), { key: field.key, value: v }])}>
              {field.key === "rag" && <span className="mr-2 inline-block size-2 rounded-full" style={{ background: RAG[v].color }} />}{field.fmt ? field.fmt(v) : v}
            </MenuItem>
          ))}
          {field && field.values(sites).length === 0 && <div className="px-3 py-4 text-center text-[12px] text-ink-3">No values yet</div>}
        </div>
      </Dropdown>
      <div className="relative ml-auto">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search websites" className="h-8 w-48 rounded-xl border border-line bg-white pl-8 pr-3 text-[12.5px] outline-none focus:border-ink/20" />
      </div>
    </div>
  );
}

function SiteIcon({ name }) {
  return (
    <span className="grid size-8 place-items-center rounded-full text-[13px] font-bold text-white shadow-sm" style={{ background: avatarColor(name) }}>
      {name?.[0]?.toUpperCase()}
    </span>
  );
}

function SiteCard({ s, i, tour }) {
  const rag = RAG[s.lastRag] || RAG.none;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4, ease }} className="w-[290px] shrink-0 snap-start" data-tour={tour}>
      <Link href={`/sites/${s.id}`} className="group relative block rounded-2xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_rgba(16,24,40,.28)]">
        <div className="flex items-start justify-between">
          <SiteIcon name={s.name} />
          {s.running ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"><Loader2 className="size-3 animate-spin" />{s.stage || "Queued"}</span>
          ) : s.status === "error" ? (
            <span className="rounded-full bg-red-soft px-2 py-0.5 text-[11px] font-medium text-red">Scan failed</span>
          ) : s.lastScore != null ? (
            <span className="font-display text-[20px] font-semibold leading-none" style={{ color: rag.color }}>{s.lastScore}</span>
          ) : null}
        </div>
        <div className="mt-3 truncate text-[15px] font-semibold group-hover:text-ink">{s.name}</div>
        <div className="font-mono text-[11.5px] text-ink-3">{siteCode(s.id)}</div>
        <div className="mt-3 space-y-2 rounded-xl bg-soft/80 p-3 text-[12.5px]">
          <Row icon={Building2} k="Owner" v={s.owner || "—"} />
          <Row icon={Gauge} k="Status" v={<span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: rag.color }} />{rag.label}</span>} />
          <Row icon={Calendar} k="Next scan" v={s.nextScanAt ? fmtDate(s.nextScanAt) : "—"} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-[12px] text-ink-3">
          <span className="inline-flex items-center gap-1" title="Open findings"><MessageSquareWarning className="size-3.5" />{(s.totalFindings || 0) - (s.decided || 0)}</span>
          <span className="inline-flex items-center gap-1" title="Trackers"><Radar className="size-3.5" />{s.trackerCount ?? 0}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{s.lastScannedAt ? timeAgo(s.lastScannedAt) : "never"}</span>
          {s.demo && <span className="ml-auto rounded-md bg-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">demo</span>}
        </div>
        {s.status === "error" && s.error && <p className="mt-2 truncate text-[11.5px] text-red" title={s.error}>{s.error}</p>}
      </Link>
    </motion.div>
  );
}
const Row = ({ icon: Icon, k, v }) => (
  <div className="flex items-center gap-2"><Icon className="size-3.5 text-ink-3" strokeWidth={1.8} /><span className="w-[70px] text-ink-3">{k}</span><span className="min-w-0 truncate font-medium text-ink">{v}</span></div>
);

export default function SitesPage() {
  const [poll, setPoll] = useState(0);
  const { data, loading, reload } = useApi("/sites", { poll });
  const { can } = useAuth();
  const [filters, setFilters] = useState([]);
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const [view, setView] = useState("board");
  const sites = data?.sites || [];

  useEffect(() => setPoll(sites.some((s) => s.running || s.status === "queued") ? 2000 : 0), [sites]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("rag")) setFilters([{ key: "rag", value: p.get("rag") }]);
    if (p.get("add") && can("site:create")) setAdd(true);
  }, [can]);

  const filtered = useMemo(() => sites.filter((s) => filters.every((f) => match(s, f)) && (!q || (s.name + s.url).toLowerCase().includes(q.toLowerCase()))), [sites, filters, q]);
  const firstGroup = GROUPS.find((g) => filtered.some((s) => (s.lastRag || "none") === g.key))?.key;
  const owners = [...new Set(sites.map((s) => s.addedBy).filter(Boolean))];

  const loadDemo = async () => {
    try { const r = await api("/sites/demo", { method: "POST" }); toast.success(r.added.length ? `Loaded ${r.added.length} demo sites` : "Demo sites already loaded"); reload(); refreshAll(); } catch (e) { toast.error(e.message); }
  };
  const scanAll = async () => {
    try { const r = await api("/sites/scan-all", { method: "POST" }); toast.success(`Re-scanning ${r.queued} sites`); setTimeout(reload, 600); } catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader title="Website portfolio" description="Every website you monitor, grouped by DPDP risk.">
        <Can perm="audit:run"><Button icon={RefreshCw} onClick={scanAll} disabled={!sites.length}>Re-scan all</Button></Can>
        <Can perm="site:create"><Button icon={Sparkles} onClick={loadDemo} data-tour="sites-demo">Demo sites</Button></Can>
        <Can perm="site:create"><Button variant="primary" icon={Plus} onClick={() => setAdd(true)} data-tour="sites-add">Add websites</Button></Can>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-1.5 text-[13px]"><Users className="size-4 text-ink-2" />Added by</span>
        <AvatarStack names={owners} />
        <div className="ml-auto flex rounded-xl bg-soft p-0.5">
          {[["board", LayoutGrid], ["list", List]].map(([v, I]) => (
            <button key={v} onClick={() => setView(v)} className={cn("relative grid size-8 place-items-center rounded-[10px] text-ink-3", view === v && "text-ink")} aria-label={v}>
              {view === v && <motion.span layoutId="view-toggle" className="absolute inset-0 rounded-[10px] bg-white shadow-sm" />}
              <I className="relative size-4" />
            </button>
          ))}
        </div>
      </div>

      <FilterBar sites={sites} filters={filters} setFilters={setFilters} q={q} setQ={setQ} />

      {loading && !data ? (
        <div className="mt-6 space-y-6">{[0, 1].map((i) => <div key={i} className="flex gap-3"><Skeleton className="h-60 w-[290px]" /><Skeleton className="h-60 w-[290px]" /><Skeleton className="h-60 w-[290px]" /></div>)}</div>
      ) : sites.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={Search} title="Start with a URL" action={<Can perm="site:create"><div className="flex gap-2"><Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>Add websites</Button><Button icon={Sparkles} onClick={loadDemo}>Load demo sites</Button></div></Can>}>
            Paste a list of your company&apos;s websites. Each one is audited for trackers, consent and the privacy notice.
          </EmptyState>
        </div>
      ) : view === "list" ? (
        <Card className="mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead className="bg-soft/60 text-left text-[12px] text-ink-3"><tr>{["Website", "Status", "Score", "Trackers", "Open findings", "Owner", "Last scan"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-t border-line-2 hover:bg-soft/40">
                    <td className="px-4 py-3"><Link href={`/sites/${s.id}`} className="flex items-center gap-2.5"><SiteIcon name={s.name} /><span><span className="block font-medium">{s.name}</span><span className="block text-[11.5px] text-ink-3">{s.url}</span></span></Link></td>
                    <td className="px-4 py-3">{s.running ? <span className="inline-flex items-center gap-1 text-accent"><Loader2 className="size-3.5 animate-spin" />{s.stage}</span> : <RagPill rag={s.lastRag} />}</td>
                    <td className="px-4 py-3 font-display text-[15px] font-semibold">{s.lastScore ?? "—"}</td>
                    <td className="px-4 py-3">{s.trackerCount ?? 0}</td>
                    <td className="px-4 py-3">{(s.totalFindings || 0) - (s.decided || 0)}</td>
                    <td className="px-4 py-3 text-ink-2">{s.owner || "—"}</td>
                    <td className="px-4 py-3 text-ink-3">{timeAgo(s.lastScannedAt)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          {GROUPS.map((g, gi) => {
            const list = filtered.filter((s) => (s.lastRag || "none") === g.key);
            if (!list.length && g.key === "none") return null;
            const rag = RAG[g.key];
            const total = list.reduce((a, s) => a + (s.totalFindings || 0), 0);
            const decided = list.reduce((a, s) => a + (s.decided || 0), 0);
            return (
              <motion.section key={g.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.08, ease }} data-tour={gi === 0 ? "sites-group" : undefined}>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-medium" style={{ background: rag.soft, color: "var(--ink)" }}>
                    <g.icon className="size-4" style={{ color: rag.color }} />{g.label}
                  </span>
                  <Can perm="site:create"><button onClick={() => setAdd(true)} className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-soft" aria-label="Add"><Plus className="size-4" /></button></Can>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="font-display text-[22px] font-semibold leading-none">{decided}/{total}</span>
                  <span className="inline-flex items-center gap-0.5 text-[12px] text-green"><TrendingUp className="size-3.5" />{list.length} site{list.length === 1 ? "" : "s"}</span>
                  <span className="text-[12px] text-ink-3">findings decided</span>
                </div>
                <div className="mt-2"><SegmentBar value={decided} total={total} color="var(--accent)" /></div>
                <div className="-mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-3 scrollbar-thin">
                  {list.length ? list.map((s, i) => <SiteCard key={s.id} s={s} i={i} tour={g.key === firstGroup && i === 0 ? "sites-card" : undefined} />)
                    : <div className="grid h-24 w-full place-items-center rounded-2xl border border-dashed border-line text-[12.5px] text-ink-3">No sites in this group{filters.length ? " for the current filters" : ""}</div>}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}
      <AddSitesDialog open={add} onClose={() => setAdd(false)} onAdded={() => { reload(); setPoll(2000); }} />
    </div>
  );
}
