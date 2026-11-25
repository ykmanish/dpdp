import { Router } from "express";
import PDFDocument from "pdfkit";
import { db } from "../db.js";
import { authenticate, workspace, requirePerm, log } from "../auth.js";

const r = Router();
r.use(authenticate, workspace, requirePerm("report:export"));

const RAG = { red: "#dc2626", amber: "#d97706", green: "#16a34a" };
const SEV = { high: "#dc2626", medium: "#d97706", low: "#64748b" };
const ascii = (s) => String(s ?? "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, "-").replace(/…/g, "...").replace(/→/g, "->").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

function header(doc, title, sub) {
  doc.rect(0, 0, doc.page.width, 90).fill("#0f172a");
  doc.fill("#ffffff").fontSize(20).font("Helvetica-Bold").text(ascii(title), 50, 30);
  doc.fontSize(10).font("Helvetica").fill("#cbd5e1").text(ascii(sub), 50, 58);
  doc.moveDown(3).fill("#0f172a");
  doc.y = 110;
}

function siteSection(doc, site, audit, findings) {
  doc.font("Helvetica-Bold").fontSize(15).fill("#0f172a").text(ascii(site.name));
  doc.font("Helvetica").fontSize(9).fill("#64748b").text(`${site.url}   |   Scanned ${audit?.finishedAt?.slice(0, 16).replace("T", " ") || "never"}${audit?.simulated ? "   |   demo fixture" : ""}`);
  doc.moveDown(0.5);
  if (!audit) { doc.fill("#0f172a").fontSize(10).text("No completed audit yet."); return; }
  const y = doc.y;
  doc.roundedRect(50, y, 120, 54, 8).fill(RAG[audit.rag]);
  doc.fill("#fff").font("Helvetica-Bold").fontSize(24).text(String(audit.score), 50, y + 8, { width: 120, align: "center" });
  doc.fontSize(8).text(`${audit.rag.toUpperCase()}  /100`, 50, y + 38, { width: 120, align: "center" });
  doc.fill("#0f172a").font("Helvetica").fontSize(9);
  doc.text(`Trackers: ${audit.trackers.length} (${audit.trackers.filter((t) => !t.gated).length} load before consent)`, 190, y + 4);
  doc.text(`Consent banner: ${audit.banner.present ? `yes${audit.banner.cmp ? ` (${audit.banner.cmp})` : ""}, reject option: ${audit.banner.rejectOption ? "yes" : "no"}` : "not detected"}`, 190, y + 18);
  doc.text(`Privacy notice: ${audit.policyUrl ? `${audit.policyChecks.filter((c) => c.met).length}/${audit.policyChecks.length} DPDP clauses covered` : "not found"}`, 190, y + 32);
  doc.y = y + 68; doc.x = 50;

  doc.font("Helvetica-Bold").fontSize(11).text("Findings");
  doc.moveDown(0.3);
  for (const f of findings) {
    if (doc.y > doc.page.height - 120) doc.addPage();
    const top = doc.y;
    doc.rect(50, top, 3, 12).fill(SEV[f.severity]);
    doc.fill("#0f172a").font("Helvetica-Bold").fontSize(9.5).text(ascii(`${f.title}`), 60, top, { width: 380, continued: false });
    doc.font("Helvetica").fontSize(8).fill("#64748b").text(ascii(`${f.severity.toUpperCase()} - ${f.dpdpRef} - challenger: ${f.challenger?.verdict} (${f.challenger?.confidence})${f.decision ? ` - decision: ${f.decision}` : ""}`), 60);
    doc.fill("#334155").fontSize(8.5).text(ascii(`Evidence: "${f.evidence?.quote}"`), 60, doc.y + 2, { width: 480 });
    doc.fill("#0f766e").text(ascii(`Fix: ${f.recommendation}`), 60, doc.y + 2, { width: 480 });
    doc.moveDown(0.7);
  }
}

r.get("/site/:id.pdf", (req, res) => {
  const site = db.sites.find((s) => s.id === req.params.id && s.workspaceId === req.workspace.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  const audit = db.audits.find((a) => a.id === site.lastAuditId);
  const findings = db.findings.filter((f) => f.siteId === site.id && f.current);
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="dpdp-audit-${site.name.replace(/\W+/g, "-")}.pdf"`);
  doc.pipe(res);
  header(doc, "DPDP Website Privacy Audit", `${req.workspace.name}  |  generated ${new Date().toISOString().slice(0, 10)} by ${req.user.name}`);
  siteSection(doc, site, audit, findings);
  if (audit?.policyChecks?.length) {
    doc.addPage(); doc.font("Helvetica-Bold").fontSize(12).fill("#0f172a").text("Privacy notice - DPDP clause checklist"); doc.moveDown(0.5);
    for (const c of audit.policyChecks) {
      doc.font("Helvetica-Bold").fontSize(9).fill(c.met ? "#16a34a" : "#dc2626").text(`${c.met ? "[MET]    " : "[MISSING]"} ${c.section}  ${ascii(c.title)}`);
      if (c.quote) doc.font("Helvetica-Oblique").fontSize(8).fill("#475569").text(ascii(`"${c.quote}"`), { indent: 20 });
      doc.moveDown(0.3);
    }
  }
  doc.end();
  log(req, "report.export", { type: "site", id: site.id, name: site.name }, { format: "pdf" });
});

r.get("/workspace.pdf", (req, res) => {
  const sites = db.sites.filter((s) => s.workspaceId === req.workspace.id);
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="dpdp-portfolio-report.pdf"`);
  doc.pipe(res);
  header(doc, "DPDP Portfolio Report", `${req.workspace.name}  |  ${sites.length} websites  |  ${new Date().toISOString().slice(0, 10)}`);
  doc.font("Helvetica-Bold").fontSize(12).text("Summary");
  doc.moveDown(0.4);
  for (const s of [...sites].sort((a, b) => (a.lastScore ?? 0) - (b.lastScore ?? 0))) {
    const y = doc.y;
    doc.circle(56, y + 5, 4).fill(RAG[s.lastRag] || "#94a3b8");
    doc.fill("#0f172a").font("Helvetica").fontSize(10).text(ascii(s.name), 68, y, { width: 260 });
    doc.text(s.lastScore != null ? `${s.lastScore}/100` : "-", 330, y, { width: 60 });
    doc.fill("#64748b").fontSize(9).text(`${s.trackerCount ?? 0} trackers, ${s.openFindings ?? 0} findings`, 400, y);
    doc.y = y + 18;
  }
  for (const s of sites) {
    doc.addPage();
    siteSection(doc, s, db.audits.find((a) => a.id === s.lastAuditId), db.findings.filter((f) => f.siteId === s.id && f.current));
  }
  doc.end();
  log(req, "report.export", { type: "workspace" }, { format: "pdf" });
});

r.get("/findings.csv", (req, res) => {
  const rows = db.findings.filter((f) => f.workspaceId === req.workspace.id && f.current);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["site", "severity", "type", "title", "dpdp_ref", "evidence", "challenger", "confidence", "decision", "decided_by", "recommendation"];
  const csv = [head.join(","), ...rows.map((f) => [f.siteName, f.severity, f.type, f.title, f.dpdpRef, f.evidence?.quote, f.challenger?.verdict, f.challenger?.confidence, f.decision, f.decidedBy, f.recommendation].map(esc).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="dpdp-findings.csv"`);
  log(req, "report.export", { type: "workspace" }, { format: "csv" });
  res.send(csv);
});

export default r;
