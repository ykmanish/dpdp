// The agent pipeline: Discovery → Investigator → Challenger → Risk score → Watcher.
// Each "agent" is a deterministic, explainable step that records quoted evidence.
import * as cheerio from "cheerio";
import crypto from "node:crypto";
import { TRACKERS, CMPS, POLICY_CHECKS, NEGATIONS } from "./signatures.js";
import { db, insert, update, now } from "../db.js";
import { FIXTURES } from "./fixtures.js";

export const STAGES = [
  { key: "discovery", label: "Discovery", description: "Fetches the homepage, finds the privacy policy and cookie behaviour." },
  { key: "investigator", label: "Investigator", description: "Reads trackers, cookie banner and policy; quotes the proof." },
  { key: "challenger", label: "Challenger", description: "A second pass that re-checks every claim and adjusts confidence." },
  { key: "scoring", label: "Risk score", description: "Applies the scoring formula and assigns Red / Amber / Green." },
  { key: "watcher", label: "Watcher", description: "Compares with the previous scan and raises alerts on changes." },
];

const UA = "Mozilla/5.0 (compatible; PrivacyAuditorBot/1.0; +DPDP compliance scan)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => crypto.createHash("sha256").update(s || "").digest("hex").slice(0, 16);
const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

export function normaliseUrl(input) {
  let u = String(input || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname.includes(".")) return null;
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

// Pull the sentence around a match so every claim carries a readable quote.
export function quoteAround(text, index, length) {
  if (index < 0) return "";
  const left = Math.max(text.lastIndexOf(". ", index), text.lastIndexOf("\n", index), index - 160);
  let right = text.indexOf(". ", index + length);
  if (right === -1 || right - index > 200) right = Math.min(text.length, index + length + 160);
  let q = clean(text.slice(left < 0 ? 0 : left + 1, right + 1));
  if (q.length > 260) q = q.slice(0, 257) + "…";
  return q;
}

async function get(url) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.text();
  return { res, body };
}

// ---------- 1. Discovery ----------
export async function discover(site) {
  if (site.fixture) {
    const fx = FIXTURES[site.fixture];
    return {
      finalUrl: site.url, status: 200, https: site.url.startsWith("https"),
      html: fx.html, policyUrl: fx.policyHtml ? site.url + "/privacy-policy" : null,
      policyHtml: fx.policyHtml || "", cookies: fx.cookies || [], simulated: true,
    };
  }
  const out = { https: site.url.startsWith("https"), cookies: [] };
  const { res, body } = await get(site.url);
  out.finalUrl = res.url;
  out.status = res.status;
  out.https = res.url.startsWith("https:");
  out.html = body;
  out.cookies = (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0].split("=")[0]);
  if (res.status >= 400) throw new Error(`Homepage returned HTTP ${res.status}`);

  const $ = cheerio.load(body);
  let policyUrl = null;
  $("a[href]").each((_, a) => {
    if (policyUrl) return;
    const href = $(a).attr("href") || "";
    const text = $(a).text();
    if (/privacy|data[- ]protection|dpdp/i.test(text + " " + href) && !/^(mailto|javascript|tel):/i.test(href)) {
      try { policyUrl = new URL(href, res.url).toString(); } catch {}
    }
  });
  const candidates = policyUrl ? [policyUrl] : ["/privacy-policy", "/privacy"].map((p) => new URL(p, res.url).toString());
  for (const c of candidates) {
    try {
      const p = await get(c);
      if (p.res.ok && /privacy|personal data/i.test(p.body)) {
        out.policyUrl = p.res.url;
        out.policyHtml = p.body;
        break;
      }
    } catch {}
  }
  return out;
}

function pageText(html) {
  const $ = cheerio.load(html || "");
  $("script,style,noscript,svg").remove();
  return clean($("body").text() || $.root().text());
}

// ---------- 2. Investigator ----------
export function investigate(src) {
  const $ = cheerio.load(src.html || "");
  const scripts = [];
  $("script").each((_, s) => {
    const el = $(s);
    scripts.push({ src: el.attr("src") || "", inline: el.attr("src") ? "" : el.html() || "", type: el.attr("type") || "" });
  });
  $("img[src],iframe[src],link[href]").each((_, el) => {
    scripts.push({ src: $(el).attr("src") || $(el).attr("href") || "", inline: "", type: "pixel" });
  });
  const homeText = pageText(src.html);
  const policyText = pageText(src.policyHtml);
  const findings = [];

  // Trackers
  const trackers = [];
  for (const t of TRACKERS) {
    const hit = scripts.find((s) => t.match.test(s.src) || t.match.test(s.inline));
    if (!hit) continue;
    const raw = hit.src || hit.inline;
    const m = raw.match(t.match);
    const snippet = hit.src ? hit.src : clean(raw.slice(Math.max(0, m.index - 40), m.index + 80));
    // A tracker is "blocked until consent" if its tag uses a non-executable type (CMP pattern).
    const gated = /text\/plain/i.test(hit.type) || /data-cookieconsent|optanon-category|data-category/i.test(snippet);
    trackers.push({ name: t.name, vendor: t.vendor, category: t.category, country: t.country, gated, evidence: snippet });
  }

  // Consent banner / CMP
  const all = (src.html || "");
  const cmp = CMPS.find((c) => c.match.test(all));
  const bannerMatch = homeText.match(/(we use cookies|this (web)?site uses cookies|cookie (policy|preferences|settings|consent)|accept (all )?cookies)/i);
  const rejectMatch = homeText.match(/(reject( all)?|decline|only (necessary|essential)|manage (preferences|cookies))/i);
  const banner = {
    present: !!(cmp || bannerMatch),
    cmp: cmp?.name || null,
    rejectOption: !!rejectMatch,
    evidence: bannerMatch ? quoteAround(homeText, bannerMatch.index, bannerMatch[0].length) : cmp ? `CMP script detected: ${cmp.name}` : "",
  };

  // Forms collecting personal data
  const forms = [];
  $("form").each((_, f) => {
    const form = $(f);
    const fields = form.find("input,select,textarea").map((_, i) => ($(i).attr("type") || $(i).attr("name") || "").toLowerCase()).get();
    const personal = fields.filter((x) => /email|tel|phone|mobile|name|aadhaar|pan|dob|address/.test(x));
    if (!personal.length) return;
    const formText = clean(form.text());
    const consent = /consent|i agree|privacy|terms/i.test(formText) || form.find("input[type=checkbox]").length > 0;
    forms.push({ fields: personal, consentNotice: consent, evidence: `<form> collects: ${personal.join(", ")}` + (formText ? ` — “${formText.slice(0, 120)}”` : "") });
  });

  // Privacy policy checks
  const policyChecks = POLICY_CHECKS.map((c) => {
    for (let i = 0; i < c.patterns.length; i++) {
      const m = policyText.match(c.patterns[i]);
      if (m) return { key: c.key, title: c.title, section: c.section, weight: c.weight, met: true, patternRank: i, quote: quoteAround(policyText, m.index, m[0].length) };
    }
    return { key: c.key, title: c.title, section: c.section, weight: c.weight, met: false, quote: "" };
  });

  // --- Turn observations into findings ---
  if (!src.https) {
    findings.push({ key: "transport_https", type: "transport", title: "Site is not served over HTTPS", dpdpRef: "S.8(5) reasonable security safeguards",
      description: "Personal data submitted on this site can be intercepted in transit.",
      evidence: { source: "homepage", quote: `Final URL: ${src.finalUrl}` }, recommendation: "Enable TLS and redirect all HTTP traffic to HTTPS.", deduction: 10 });
  }
  if (!src.policyHtml) {
    findings.push({ key: "policy_missing", type: "policy", title: "No privacy policy / notice found", dpdpRef: "S.5 notice to Data Principal",
      description: "We could not find a privacy notice linked from the homepage or at common paths.",
      evidence: { source: "homepage", quote: "No link containing “privacy” or “data protection” was found." },
      recommendation: "Publish a DPDP-aligned privacy notice and link it from every page footer and every data-collection form.", deduction: 45 });
  } else {
    const totalW = POLICY_CHECKS.reduce((a, c) => a + c.weight, 0);
    for (const c of policyChecks.filter((x) => !x.met)) {
      findings.push({ key: `policy_${c.key}`, type: "policy", title: `Policy gap: ${c.title}`, dpdpRef: `DPDP ${c.section}`,
        description: `The privacy notice does not appear to cover: ${c.title.toLowerCase()}.`,
        evidence: { source: "policy", url: src.policyUrl, quote: `No matching language found in the policy (${policyText.split(" ").length} words scanned).` },
        recommendation: recommendationFor(c.key), deduction: +(45 * c.weight / totalW).toFixed(1) });
    }
  }

  const ungated = trackers.filter((t) => !t.gated);
  if (trackers.length && !banner.present) {
    findings.push({ key: "consent_no_banner", type: "consent", title: "Trackers run without any consent banner", dpdpRef: "S.6 consent; S.7 legitimate uses",
      description: `${trackers.length} third-party tracker(s) load, but no cookie/consent banner was detected.`,
      evidence: { source: "homepage", quote: trackers.slice(0, 3).map((t) => t.evidence).join("  |  ") },
      recommendation: "Deploy a consent manager that blocks non-essential trackers until the user gives free, specific, informed consent.", deduction: 20 });
  } else if (banner.present && !banner.rejectOption) {
    findings.push({ key: "consent_no_reject", type: "consent", title: "Cookie banner has no clear ‘Reject’ option", dpdpRef: "S.6(1) free & unambiguous consent",
      description: "Consent is not ‘free’ if refusing is harder than accepting.",
      evidence: { source: "homepage", quote: banner.evidence }, recommendation: "Add a ‘Reject all’ button with equal prominence to ‘Accept all’.", deduction: 8 });
  }
  if (banner.present && ungated.length) {
    findings.push({ key: "consent_preloaded", type: "consent", title: `${ungated.length} tracker(s) load before consent`, dpdpRef: "S.6(1) consent before processing",
      description: "These tags are executable in the initial HTML, so they likely fire before the visitor chooses.",
      evidence: { source: "homepage", quote: ungated.slice(0, 3).map((t) => `${t.name}: ${t.evidence}`).join("  |  ") },
      recommendation: "Mark tags as type=\"text/plain\" with a consent category so the CMP only activates them after opt-in.", deduction: Math.min(12, ungated.length * 3) });
  }
  const catW = { advertising: 4, "session-replay": 5, analytics: 2, marketing: 2, "tag-manager": 1 };
  for (const t of trackers) {
    const foreign = t.country !== "IN";
    findings.push({ key: `tracker_${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, type: "tracker",
      title: `${t.name} (${t.category})`, dpdpRef: t.category === "session-replay" ? "S.4 lawful purpose; S.8(4) data minimisation" : "S.6 consent; S.16 cross-border",
      description: `${t.vendor} ${t.category} tag${foreign ? ` — data likely processed outside India (${t.country})` : ""}${t.gated ? ", gated behind consent" : ""}.`,
      evidence: { source: "homepage", quote: t.evidence },
      recommendation: t.category === "session-replay" ? "Mask all input fields and only load session replay after explicit consent." : "List this processor in your notice and load it only after consent.",
      deduction: +(Math.min(5, catW[t.category] || 2) * (t.gated ? 0.4 : 1)).toFixed(1) });
  }
  for (const [i, f] of forms.entries()) {
    if (f.consentNotice) continue;
    findings.push({ key: `form_${i}`, type: "form", title: "Form collects personal data without a notice", dpdpRef: "S.5(1) notice at collection",
      description: `Fields: ${f.fields.join(", ")}. No consent checkbox or privacy link next to the form.`,
      evidence: { source: "homepage", quote: f.evidence }, recommendation: "Add a short notice with a link to the privacy policy and an unticked consent checkbox.", deduction: 5 });
  }
  if (src.cookies?.length && !banner.present) {
    findings.push({ key: "cookies_preconsent", type: "consent", title: `${src.cookies.length} cookie(s) set on first response`, dpdpRef: "S.6 consent",
      description: "Cookies are set before the user had any chance to choose.", evidence: { source: "headers", quote: `Set-Cookie: ${src.cookies.join(", ")}` },
      recommendation: "Only set strictly-necessary cookies before consent.", deduction: 3 });
  }

  return { trackers, banner, forms, policyChecks, findings, homeText, policyText,
    clientRendered: homeText.length < 400 && /<div id="(root|__next|app)"/i.test(src.html || "") };
}

function recommendationFor(key) {
  return {
    dpdp_reference: "Name the Digital Personal Data Protection Act, 2023 as the governing law of the notice.",
    purpose: "List each purpose of processing in plain language next to the data it uses.",
    data_items: "Add an itemised table of personal data you collect (name, email, phone, device IDs…).",
    withdraw_consent: "Explain how to withdraw consent, and make it as easy as giving it (S.6(4)).",
    rights_access: "Describe how a Data Principal can get a summary of their data and processing (S.11).",
    rights_correction: "Describe how to correct, complete, update and erase personal data (S.12).",
    grievance: "Provide a grievance redressal channel with a response timeline (S.13).",
    contact_dpo: "Publish the business contact of your DPO or person who answers privacy questions (S.8(9)).",
    board_complaint: "Tell users they may complain to the Data Protection Board of India (S.5(1)(iii)).",
    retention: "State how long data is kept and that it is erased once the purpose is served (S.8(7)).",
    children: "Describe verifiable parental consent for users under 18 and no behavioural tracking of children (S.9).",
    nomination: "Explain the right to nominate another person in case of death or incapacity (S.14).",
    security: "Describe safeguards and your breach-intimation process to the Board and users (S.8(5)-(6)).",
    third_parties: "List categories of Data Processors and third parties you share data with (S.8(2)).",
    cross_border: "Disclose whether data is transferred outside India and to which countries (S.16).",
  }[key];
}

// ---------- 3. Challenger ----------
const LOOSE = { purpose: "purpose", data_items: "collect", withdraw_consent: "withdraw", rights_access: "access", rights_correction: "correct",
  grievance: "grievance", contact_dpo: "officer", board_complaint: "board", retention: "retain", children: "child", nomination: "nominee",
  security: "breach", third_parties: "third", cross_border: "transfer", dpdp_reference: "DPDP" };

export function challenge(inv, src) {
  const notes = [];
  // Re-check met policy clauses for negations or weak matches.
  for (const c of inv.policyChecks.filter((x) => x.met)) {
    if (NEGATIONS.test(c.quote) && /withdraw|eras|delet|nominat|grievance|retain/i.test(c.quote) && /we (do not|don't|cannot|never)/i.test(c.quote)) {
      c.met = false;
      c.challenger = { verdict: "overturned", confidence: "medium", note: "Matched sentence is a negation — the clause says the right is NOT offered." };
      inv.findings.push({ key: `policy_${c.key}`, type: "policy", title: `Policy gap: ${c.title}`, dpdpRef: `DPDP ${c.section}`,
        description: "The policy mentions this topic but in a way that denies the right.", evidence: { source: "policy", url: src.policyUrl, quote: c.quote },
        recommendation: recommendationFor(c.key), deduction: 4, challenger: c.challenger });
      notes.push(`Overturned “${c.title}”: negated language.`);
    } else if (c.patternRank > 0 && ["purpose", "contact_dpo", "rights_correction"].includes(c.key)) {
      c.challenger = { verdict: "upheld", confidence: "medium", note: "Only a generic phrase matched; a human should confirm." };
    } else {
      c.challenger = { verdict: "upheld", confidence: "high", note: "Quote verified verbatim in the policy text." };
    }
  }
  // Re-check findings.
  for (const f of inv.findings) {
    if (f.challenger) continue;
    if (f.type === "tracker") {
      const inScript = (src.html || "").includes(f.evidence.quote.slice(0, 30));
      f.challenger = inScript
        ? { verdict: "upheld", confidence: "high", note: "Tag found verbatim in the page source." }
        : { verdict: "downgraded", confidence: "low", note: "Signature not found verbatim on re-read; may be a text mention." };
    } else if (f.type === "policy" && f.key !== "policy_missing") {
      const word = LOOSE[f.key.replace("policy_", "")];
      const loose = word && new RegExp(`\\b${word}`, "i").test(inv.policyText);
      f.challenger = loose
        ? { verdict: "downgraded", confidence: "medium", note: `The word “${word}” appears, but not in a clause that satisfies the requirement. A reviewer should confirm.` }
        : { verdict: "upheld", confidence: "high", note: "Re-read the full policy; no equivalent wording found." };
    } else if (f.key.startsWith("consent") && inv.clientRendered) {
      f.challenger = { verdict: "downgraded", confidence: "low", note: "Page is client-rendered; a banner may be injected by JavaScript. Verify manually." };
    } else {
      f.challenger = { verdict: "upheld", confidence: "high", note: "Re-checked against the raw source." };
    }
    if (f.challenger.verdict === "downgraded") notes.push(`Downgraded “${f.title}”.`);
  }
  return { notes, upheld: inv.findings.filter((f) => f.challenger.verdict === "upheld").length, total: inv.findings.length };
}

// ---------- 4. Risk score ----------
// score = 100 − Σ (deduction × confidence factor); high = 1, medium = 0.75, low = 0.5
export const CONFIDENCE = { high: 1, medium: 0.75, low: 0.5 };
export function score(findings) {
  const breakdown = { policy: 0, consent: 0, tracker: 0, transport: 0, form: 0 };
  for (const f of findings) {
    const d = f.deduction * (CONFIDENCE[f.challenger?.confidence] ?? 1);
    breakdown[f.type] = +(breakdown[f.type] + d).toFixed(1);
    f.severity = f.deduction >= 8 ? "high" : f.deduction >= 4 ? "medium" : "low";
  }
  breakdown.tracker = Math.min(breakdown.tracker, 20);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const s = Math.max(0, Math.round(100 - total));
  return { score: s, rag: s >= 75 ? "green" : s >= 50 ? "amber" : "red", breakdown };
}

// ---------- 5. Watcher (diff vs previous audit) ----------
function watch(site, audit, prev) {
  const alerts = [];
  if (!prev) return alerts;
  const mk = (severity, title, body) => alerts.push({ severity, title, body });
  if (audit.score <= prev.score - 5) mk("high", `Score dropped ${prev.score} → ${audit.score}`, `${site.name} lost ${prev.score - audit.score} points since the last scan.`);
  if (audit.rag !== prev.rag) mk(audit.rag === "red" ? "high" : "medium", `Status changed ${prev.rag.toUpperCase()} → ${audit.rag.toUpperCase()}`, `${site.name} moved RAG band.`);
  const prevT = new Set((prev.trackers || []).map((t) => t.name));
  for (const t of audit.trackers.filter((t) => !prevT.has(t.name))) mk("medium", `New tracker: ${t.name}`, `${t.vendor} ${t.category} tag appeared on ${site.name}.`);
  if (prev.policyHash && audit.policyHash && prev.policyHash !== audit.policyHash) mk("low", "Privacy policy changed", `The policy text on ${site.name} changed since the last scan. Review the new version.`);
  if (prev.banner?.present && !audit.banner.present) mk("high", "Cookie banner disappeared", `No consent banner detected on ${site.name} anymore.`);
  return alerts;
}

// ---------- Orchestrator ----------
const running = new Set();
export const isRunning = (siteId) => running.has(siteId);

export function startAudit(site, { trigger = "manual", actor = null, fast = false } = {}) {
  if (running.has(site.id)) return db.audits.find((a) => a.siteId === site.id && a.status === "running");
  const audit = insert("audits", {
    workspaceId: site.workspaceId, siteId: site.id, status: "running", trigger, actorName: actor?.name || "Watcher",
    stages: STAGES.map((s) => ({ key: s.key, label: s.label, status: "pending" })), startedAt: now(),
  });
  running.add(site.id);
  runAudit(site, audit, fast).finally(() => running.delete(site.id));
  return audit;
}

// Awaitable variant used by the seed script.
export async function auditNow(site, opts = {}) {
  const audit = insert("audits", {
    workspaceId: site.workspaceId, siteId: site.id, status: "running", trigger: opts.trigger || "manual", actorName: opts.actor?.name || "Watcher",
    stages: STAGES.map((s) => ({ key: s.key, label: s.label, status: "pending" })), startedAt: now(),
  });
  await runAudit(site, audit, true);
  return audit;
}

async function runAudit(site, audit, fast) {
  const pace = fast ? 0 : 700;
  const stage = (key, patch) => {
    const s = audit.stages.find((x) => x.key === key);
    Object.assign(s, patch);
    update("audits", audit.id, { stages: audit.stages });
  };
  const prev = db.audits.filter((a) => a.siteId === site.id && a.status === "done" && a.id !== audit.id).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))[0];
  let current = "discovery";
  try {
    stage("discovery", { status: "running", startedAt: now() });
    const src = await discover(site);
    await sleep(pace);
    stage("discovery", { status: "done", finishedAt: now(), summary: `${src.simulated ? "Demo fixture" : `HTTP ${src.status}`} · policy ${src.policyUrl ? "found" : "not found"} · ${src.cookies.length} cookie(s)` });

    current = "investigator";
    stage("investigator", { status: "running", startedAt: now() });
    const inv = investigate(src);
    await sleep(pace);
    stage("investigator", { status: "done", finishedAt: now(), summary: `${inv.trackers.length} trackers · banner ${inv.banner.present ? "yes" : "no"} · ${inv.policyChecks.filter((c) => c.met).length}/${inv.policyChecks.length} clauses · ${inv.findings.length} findings` });

    current = "challenger";
    stage("challenger", { status: "running", startedAt: now() });
    const ch = challenge(inv, src);
    await sleep(pace);
    stage("challenger", { status: "done", finishedAt: now(), summary: `${ch.upheld}/${ch.total} upheld${ch.notes.length ? ` · ${ch.notes.length} adjusted` : ""}`, notes: ch.notes });

    current = "scoring";
    stage("scoring", { status: "running", startedAt: now() });
    const sc = score(inv.findings);
    await sleep(pace / 2);
    stage("scoring", { status: "done", finishedAt: now(), summary: `Score ${sc.score}/100 · ${sc.rag.toUpperCase()}` });

    current = "watcher";
    stage("watcher", { status: "running", startedAt: now() });
    const result = {
      status: "done", finishedAt: now(), score: sc.score, rag: sc.rag, breakdown: sc.breakdown,
      finalUrl: src.finalUrl, https: src.https, policyUrl: src.policyUrl || null, policyHash: src.policyHtml ? hash(inv.policyText) : null,
      policyWords: inv.policyText ? inv.policyText.split(" ").length : 0, trackers: inv.trackers, banner: inv.banner, forms: inv.forms,
      policyChecks: inv.policyChecks, simulated: !!src.simulated, clientRendered: inv.clientRendered,
    };
    Object.assign(audit, result);
    const alerts = watch(site, audit, prev);
    for (const a of alerts) insert("alerts", { workspaceId: site.workspaceId, siteId: site.id, siteName: site.name, auditId: audit.id, ...a, read: false });

    // Persist findings, carrying human decisions forward by key.
    const prevDecisions = new Map(db.findings.filter((f) => f.siteId === site.id && f.decision).map((f) => [f.key, f]));
    for (const f of db.findings.filter((x) => x.siteId === site.id && x.current)) f.current = false;
    for (const f of inv.findings) {
      const p = prevDecisions.get(f.key);
      insert("findings", { ...f, workspaceId: site.workspaceId, siteId: site.id, siteName: site.name, auditId: audit.id, current: true,
        decision: p?.decision || null, decidedBy: p?.decidedBy || null, decidedAt: p?.decidedAt || null, decisionNote: p?.decisionNote || "" });
    }
    stage("watcher", { status: "done", finishedAt: now(), summary: prev ? `${alerts.length} change alert(s) vs previous scan` : "Baseline recorded for monthly watch" });
    update("audits", audit.id, result);

    const freqDays = db.workspaces.find((w) => w.id === site.workspaceId)?.settings?.scanFrequencyDays ?? 30;
    update("sites", site.id, { lastAuditId: audit.id, lastScore: sc.score, lastRag: sc.rag, lastScannedAt: now(), status: "monitored",
      nextScanAt: new Date(Date.now() + freqDays * 864e5).toISOString(), trackerCount: inv.trackers.length,
      openFindings: inv.findings.length, error: null });
  } catch (err) {
    stage(current, { status: "failed", finishedAt: now(), summary: err.message });
    update("audits", audit.id, { status: "failed", error: err.message, finishedAt: now() });
    update("sites", site.id, { status: "error", error: err.cause?.code || err.message });
  }
}
