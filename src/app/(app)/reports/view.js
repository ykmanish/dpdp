"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { FileText, FileSpreadsheet, Download, Layers, Globe } from "lucide-react";
import { useApi, download } from "@/lib/api";
import { RAG, fmtDate } from "@/lib/utils";
import { PageHeader, Card, Button, Skeleton, EmptyState, RagPill } from "@/components/ui";

export default function ReportsPage() {
  const { data, loading } = useApi("/sites");
  const [busy, setBusy] = useState(null);
  const sites = (data?.sites || []).filter((s) => s.lastAuditId);
  const go = async (key, path, name) => {
    setBusy(key);
    try { await download(path, name); toast.success(`${name} downloaded`); } catch (e) { toast.error(e.message); } finally { setBusy(null); }
  };

  const big = [
    { key: "portfolio", tour: "rp-portfolio", icon: Layers, title: "Portfolio report (PDF)", d: "Cover summary of every website plus each site's findings with quoted evidence and fixes. Ready for the board or a client.", path: "/reports/workspace.pdf", name: "dpdp-portfolio-report.pdf" },
    { key: "csv", tour: "rp-csv", icon: FileSpreadsheet, title: "All findings (CSV)", d: "One row per finding with severity, DPDP section, evidence, challenger verdict and decision. Import into Jira, Excel or your GRC tool.", path: "/reports/findings.csv", name: "dpdp-findings.csv" },
  ];

  return (
    <div>
      <PageHeader title="Reports" description="Export evidence packs. Every export is recorded in the activity log." />
      <div className="grid gap-3 md:grid-cols-2">
        {big.map((b, i) => (
          <motion.div key={b.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} data-tour={b.tour}>
            <Card className="group relative h-full overflow-hidden p-5" hover>
              <div className="absolute -right-10 -top-10 size-40 rounded-full bg-accent-soft opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <span className="relative grid size-10 place-items-center rounded-xl bg-ink text-white"><b.icon className="size-5" /></span>
              <h3 className="relative mt-4 font-display text-[17px] font-semibold">{b.title}</h3>
              <p className="relative mt-1 text-[13px] text-ink-2">{b.d}</p>
              <Button className="relative mt-4" variant="primary" icon={Download} loading={busy === b.key} disabled={!sites.length} onClick={() => go(b.key, b.path, b.name)}>Download</Button>
            </Card>
          </motion.div>
        ))}
      </div>

      <h3 className="mb-3 mt-8 font-display text-[17px] font-semibold">Per-website reports</h3>
      <Card className="overflow-hidden" data-tour="rp-sites">
        {loading && !data ? <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div> :
          sites.length === 0 ? <div className="p-4"><EmptyState icon={Globe} title="No audited sites yet">Reports become available after the first completed audit.</EmptyState></div> : (
            <div className="divide-y divide-line-2">
              {sites.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-soft/40">
                  <FileText className="size-4 text-ink-3" />
                  <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-medium">{s.name}</div><div className="text-[12px] text-ink-3">Last audit {fmtDate(s.lastScannedAt)} · {s.totalFindings} findings</div></div>
                  <RagPill rag={s.lastRag} label={`${s.lastScore} · ${RAG[s.lastRag]?.short}`} />
                  <Button size="sm" icon={Download} loading={busy === s.id} onClick={() => go(s.id, `/reports/site/${s.id}.pdf`, `dpdp-audit-${s.name}.pdf`)}>PDF</Button>
                </motion.div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}
