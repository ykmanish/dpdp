"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  RefreshCw, Download, Trash2, ExternalLink, Radar, Cookie, FileText, ShieldAlert, Check, X, Lock, Unlock, Clock, Bell, Globe,
  Quote, Info, Eye, EyeOff, ArrowLeft, Building2,
} from "lucide-react";
import { api, useApi, download, refreshAll } from "@/lib/api";
import { Can, useAuth } from "@/lib/auth";
import { cn, RAG, timeAgo, fmtDate, siteCode } from "@/lib/utils";
import { Button, Card, ScoreRing, RagPill, Tabs, Skeleton, Pill, Modal, EmptyState, ease } from "@/components/ui";
import { Pipeline, FindingCard, TYPE_META } from "@/components/audit";
import { useCrumb } from "@/components/shell";

const CAT_COLOR = { advertising: "var(--red)", "session-replay": "var(--red)", analytics: "var(--amber)", marketing: "var(--blue)", "tag-manager": "var(--ink-3)" };

export default function SitePage() {
  const { id } = useParams();
  const router = useRouter();
  const { can } = useAuth();
  const [poll, setPoll] = useState(0);
  const { data, loading, error, reload, setData } = useApi(`/sites/${id}`, { poll });
  const [tab, setTab] = useState("findings");
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  useCrumb(data?.site?.name);

  const running = data?.inProgress;
  useEffect(() => setPoll(running ? 1200 : 0), [running]);

  if (error) return <EmptyState icon={Globe} title="Site not found" action={<Link href="/sites"><Button icon={ArrowLeft}>Back to websites</Button></Link>}>It may have been removed, or it belongs to another workspace.</EmptyState>;
  if (loading && !data) return <div className="space-y-3"><Skeleton className="h-36" /><Skeleton className="h-28" /><Skeleton className="h-80" /></div>;

  const { site, audit, findings, history, alerts, stages } = data;
  const rag = RAG[audit?.rag] || RAG.none;

  const rescan = async () => {
    try { await api(`/sites/${site.id}/scan`, { method: "POST" }); toast.success("Audit started"); reload(); setPoll(1200); } catch (e) { toast.error(e.message); }
  };
  const exportPdf = async () => {
    setBusy(true);
    try { await download(`/reports/site/${site.id}.pdf`, `dpdp-audit-${site.name}.pdf`); toast.success("Report downloaded"); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const del = async () => {
    try { await api(`/sites/${site.id}`, { method: "DELETE" }); toast.success(`${site.name} removed`); refreshAll(); router.push("/sites"); } catch (e) { toast.error(e.message); }
  };
  const toggleWatch = async () => {
    try { const r = await api(`/sites/${site.id}`, { method: "PATCH", body: { watch: !site.watch } }); setData({ ...data, site: { ...site, ...r.site } }); toast.success(r.site.watch ? "Monthly watch on" : "Monthly watch paused"); } catch (e) { toast.error(e.message); }
  };
  const updateFinding = (f) => setData({ ...data, findings: findings.map((x) => (x.id === f.id ? f : x)) });

  const pipelineStages = (running || data.latest)?.stages?.map((s) => ({ ...s, description: stages.find((x) => x.key === s.key)?.description })) || stages;
  const open = findings.filter((f) => !f.decision).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href="/sites" className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl border border-line hover:bg-soft" aria-label="Back"><ArrowLeft className="size-4" /></Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[26px] font-semibold leading-tight">{site.name}</h1>
              <RagPill rag={audit?.rag} />
              {site.demo && <Pill>Demo fixture</Pill>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
              <a href={site.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">{site.url}<ExternalLink className="size-3" /></a>
              <span className="font-mono">{siteCode(site.id)}</span>
              {site.owner && <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{site.owner}</span>}
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />Scanned {timeAgo(site.lastScannedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" data-tour="sd-actions">
          <Can perm="site:create"><Button size="md" icon={site.watch ? Eye : EyeOff} onClick={toggleWatch}>{site.watch ? "Watching monthly" : "Watch paused"}</Button></Can>
          <Can perm="report:export"><Button icon={Download} loading={busy} onClick={exportPdf} disabled={!audit}>PDF report</Button></Can>
          <Can perm="audit:run"><Button variant="primary" icon={RefreshCw} onClick={rescan} disabled={!!running}>{running ? "Scanning…" : "Re-scan"}</Button></Can>
        </div>
      </div>

      {/* Score + summary */}
      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <Card className="flex items-center gap-5 p-5" data-tour="sd-score">
          <ScoreRing score={audit?.score} rag={audit?.rag} size={120} />
          <div className="space-y-1.5">
            <div className="text-[12px] text-ink-3">Compliance score</div>
            <div className="font-display text-[18px] font-semibold" style={{ color: rag.color }}>{rag.label}</div>
            {audit?.breakdown && (
              <div className="space-y-0.5 text-[11.5px] text-ink-3">
                {Object.entries(audit.breakdown).filter(([, v]) => v > 0).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="capitalize">{TYPE_META[k]?.label || k}</span><span className="tabular-nums text-red">−{v}</span></div>)}
              </div>
            )}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: ShieldAlert, label: "Open findings", value: open, sub: `${findings.length - open} decided`, tone: open ? "red" : "green" },
            { icon: Radar, label: "Trackers", value: audit?.trackers?.length ?? "—", sub: audit ? `${audit.trackers.filter((t) => !t.gated).length} before consent` : "", tone: audit?.trackers?.some((t) => !t.gated) ? "amber" : "green" },
            { icon: Cookie, label: "Consent banner", value: audit ? (audit.banner.present ? "Yes" : "No") : "—", sub: audit?.banner?.cmp || (audit?.banner?.present ? (audit.banner.rejectOption ? "Has reject option" : "No reject option") : "Not detected"), tone: audit?.banner?.present ? (audit.banner.rejectOption ? "green" : "amber") : "red" },
            { icon: FileText, label: "Notice clauses", value: audit?.policyChecks?.length ? `${audit.policyChecks.filter((c) => c.met).length}/${audit.policyChecks.length}` : "—", sub: audit?.policyUrl ? "DPDP requirements met" : "No notice found", tone: audit?.policyUrl ? "amber" : "red" },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full p-4">
                <div className="flex items-center gap-2 text-[12px] text-ink-2"><k.icon className="size-3.5" />{k.label}</div>
                <div className="mt-2 font-display text-[24px] font-semibold leading-none">{k.value}</div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-3"><span className="size-1.5 rounded-full" style={{ background: `var(--${k.tone})` }} />{k.sub}</div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <Card className="mt-3 p-5" data-tour="sd-pipeline">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-[16px] font-semibold">{running ? "Audit in progress" : "How this score was made"}</h3>
          <span className="text-[12px] text-ink-3">{running ? "Live" : data.latest ? `${data.latest.trigger === "watcher" ? "Watcher" : "Manual"} scan · ${fmtDate(data.latest.finishedAt || data.latest.createdAt, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</span>
        </div>
        <Pipeline stages={pipelineStages} />
        {data.latest?.stages?.find((s) => s.key === "challenger")?.notes?.length > 0 && !running && (
          <div className="mt-3 rounded-xl bg-amber-soft/60 p-3 text-[12.5px]">
            <b className="font-semibold">Challenger notes:</b> {data.latest.stages.find((s) => s.key === "challenger").notes.join(" ")}
          </div>
        )}
        {data.latest?.status === "failed" && <div className="mt-3 rounded-xl bg-red-soft p-3 text-[12.5px] text-red"><b>Scan failed:</b> {data.latest.error}. Check the URL is public and reachable, then re-scan.</div>}
        {audit?.clientRendered && <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-soft p-3 text-[12.5px] text-ink-2"><Info className="mt-0.5 size-3.5 text-blue" />This page is rendered by JavaScript. Trackers or banners injected at runtime may not be visible to the scanner — the challenger lowered confidence accordingly.</div>}
      </Card>

      {/* Evidence */}
      <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_300px]">
        <div>
          <div data-tour="sd-tabs" className="w-fit max-w-full">
            <Tabs id="site-tabs" value={tab} onChange={setTab} tabs={[
              { value: "findings", label: "Findings", icon: ShieldAlert, count: findings.length },
              { value: "trackers", label: "Trackers", icon: Radar, count: audit?.trackers?.length ?? 0 },
              { value: "consent", label: "Consent", icon: Cookie },
              { value: "policy", label: "Privacy notice", icon: FileText },
            ]} />
          </div>
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className="mt-3">
            {!audit && !running && <EmptyState icon={ShieldAlert} title="No completed audit yet">Run a scan to see evidence.</EmptyState>}
            {!audit && running && <EmptyState icon={RefreshCw} title="Agents are reading the site…">Evidence will appear here when the audit completes.</EmptyState>}

            {audit && tab === "findings" && (
              <div className="space-y-2.5">
                {findings.length === 0 && <EmptyState icon={Check} title="No findings">This site passed every check.</EmptyState>}
                {findings.map((f, i) => <FindingCard key={f.id} f={f} index={i} tourFirst={i === 0} onChange={updateFinding} />)}
              </div>
            )}

            {audit && tab === "trackers" && (
              <Card className="overflow-hidden">
                {audit.trackers.length === 0 ? <div className="p-8 text-center text-[13px] text-ink-3">No known third-party trackers detected in the page source.</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-[13px]">
                      <thead className="bg-soft/60 text-left text-[12px] text-ink-3"><tr>{["Tracker", "Category", "Processed in", "Before consent?", "Evidence"].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
                      <tbody>
                        {audit.trackers.map((t, i) => (
                          <motion.tr key={t.name} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="border-t border-line-2 align-top">
                            <td className="px-4 py-3"><div className="font-medium">{t.name}</div><div className="text-[11.5px] text-ink-3">{t.vendor}</div></td>
                            <td className="px-4 py-3"><Pill color={CAT_COLOR[t.category]} soft="var(--soft)" dot>{t.category}</Pill></td>
                            <td className="px-4 py-3">{t.country === "IN" ? "India" : <span className="text-amber">{t.country} · cross-border</span>}</td>
                            <td className="px-4 py-3">{t.gated ? <span className="inline-flex items-center gap-1 text-green"><Lock className="size-3.5" />Blocked until consent</span> : <span className="inline-flex items-center gap-1 text-red"><Unlock className="size-3.5" />Loads immediately</span>}</td>
                            <td className="px-4 py-3"><code className="block max-w-[260px] truncate rounded-md bg-soft px-2 py-1 text-[11px]" title={t.evidence}>{t.evidence}</code></td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {audit && tab === "consent" && (
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { ok: audit.banner.present, t: "Cookie / consent banner", d: audit.banner.present ? `Detected${audit.banner.cmp ? ` — ${audit.banner.cmp} consent manager` : ""}` : "No banner or consent manager found on the homepage." },
                  { ok: audit.banner.rejectOption, t: "Reject option", d: audit.banner.rejectOption ? "A reject / decline / manage option is visible." : "No equally prominent way to refuse." },
                  { ok: !audit.trackers.some((t) => !t.gated), t: "Trackers wait for consent", d: `${audit.trackers.filter((t) => !t.gated).length} of ${audit.trackers.length} tracker tags load before any choice.` },
                  { ok: audit.https, t: "Secure transport (HTTPS)", d: audit.https ? "Served over TLS." : "Served over plain HTTP." },
                  { ok: !audit.forms?.some((f) => !f.consentNotice), t: "Notice at data collection", d: audit.forms?.length ? `${audit.forms.filter((f) => f.consentNotice).length}/${audit.forms.length} forms show a notice or consent checkbox.` : "No personal-data forms on the homepage." },
                ].map((c, i) => (
                  <motion.div key={c.t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="flex gap-3 p-4">
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", c.ok ? "bg-green-soft text-green" : "bg-red-soft text-red")}>{c.ok ? <Check className="size-4" /> : <X className="size-4" />}</span>
                      <div><div className="text-[13.5px] font-semibold">{c.t}</div><div className="text-[12.5px] text-ink-2">{c.d}</div></div>
                    </Card>
                  </motion.div>
                ))}
                {audit.banner.evidence && (
                  <Card className="p-4 md:col-span-2"><div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3"><Quote className="size-3" />Banner evidence</div><p className="font-mono text-[12px]">“{audit.banner.evidence}”</p></Card>
                )}
              </div>
            )}

            {audit && tab === "policy" && (
              !audit.policyUrl ? <EmptyState icon={FileText} title="No privacy notice found">We looked for a “Privacy” link on the homepage and at /privacy-policy and /privacy.</EmptyState> : (
                <Card className="p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[12.5px] text-ink-3">
                    <a href={audit.policyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">{audit.policyUrl}<ExternalLink className="size-3" /></a>
                    <span>{audit.policyWords} words scanned</span>
                  </div>
                  <div className="divide-y divide-line-2">
                    {audit.policyChecks.map((c, i) => (
                      <motion.div key={c.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }} className="flex gap-3 px-3 py-3">
                        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg", c.met ? "bg-green-soft text-green" : "bg-red-soft text-red")}>{c.met ? <Check className="size-3.5" /> : <X className="size-3.5" />}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">{c.title}<span className="font-mono text-[11px] text-ink-3">DPDP {c.section}</span>{c.challenger && c.met && <Pill color={c.challenger.confidence === "high" ? "var(--green)" : "var(--amber)"} soft="var(--soft)">{c.challenger.confidence} confidence</Pill>}</div>
                          {c.quote ? <p className="mt-1 text-[12.5px] italic text-ink-2">“{c.quote}”</p> : <p className="mt-1 text-[12.5px] text-ink-3">No matching language found.</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )
            )}
          </motion.div>
        </div>

        {/* Side: history & alerts */}
        <div className="space-y-3">
          <Card className="p-4" data-tour="sd-history">
            <h4 className="font-display text-[15px] font-semibold">Scan history</h4>
            <div className="mt-3 flex h-16 items-end gap-1.5">
              {[...history].reverse().slice(-12).map((h, i) => (
                <motion.div key={h.id} title={`${h.score ?? "failed"} · ${fmtDate(h.createdAt)}`} initial={{ height: 0 }} animate={{ height: `${Math.max(8, h.score ?? 8)}%` }} transition={{ delay: i * 0.05, duration: 0.5, ease }}
                  className="flex-1 rounded-t-md" style={{ background: h.status === "failed" ? "var(--line)" : RAG[h.rag]?.color }} />
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {history.slice(0, 6).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-2">{fmtDate(h.createdAt, { day: "2-digit", month: "short", year: "2-digit" })} <span className="text-ink-3 capitalize">· {h.trigger}</span></span>
                  {h.status === "failed" ? <span className="text-red">failed</span> : <span className="font-semibold tabular-nums" style={{ color: RAG[h.rag]?.color }}>{h.score}</span>}
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">Next Watcher scan: <b className="text-ink-2">{site.watch ? fmtDate(site.nextScanAt) : "paused"}</b></div>
          </Card>
          <Card className="p-4">
            <h4 className="font-display text-[15px] font-semibold">Alerts</h4>
            {alerts.length === 0 ? <p className="mt-2 text-[12.5px] text-ink-3">No changes detected between scans yet.</p> : (
              <div className="mt-2 space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="flex gap-2 text-[12.5px]">
                    <Bell className={cn("mt-0.5 size-3.5 shrink-0", a.severity === "high" ? "text-red" : a.severity === "medium" ? "text-amber" : "text-ink-3")} />
                    <div><div className="font-medium">{a.title}</div><div className="text-[11.5px] text-ink-3">{timeAgo(a.createdAt)}</div></div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Can perm="site:delete">
            <Button variant="danger" icon={Trash2} className="w-full" onClick={() => setConfirmDel(true)}>Remove website</Button>
          </Can>
        </div>
      </div>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title={`Remove ${site.name}?`} description="This deletes the site, all its audits, findings and alerts. This cannot be undone."
        footer={<><Button variant="ghost" onClick={() => setConfirmDel(false)}>Cancel</Button><Button variant="danger" icon={Trash2} onClick={del}>Remove permanently</Button></>}>
        <p className="text-[13px] text-ink-2">Exported reports already downloaded are not affected.</p>
      </Modal>
    </div>
  );
}
