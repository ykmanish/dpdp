// Guided tours powered by driver.js. Elements are tagged with data-tour="…".
const t = (key, title, description, side = "bottom", align = "start") => ({
  element: `[data-tour="${key}"]`,
  popover: { title, description, side, align },
});
const intro = (title, description) => ({ popover: { title, description } });

export const TOURS = {
  platform: {
    title: "Platform tour",
    summary: "A 90-second walk through every module and where things live.",
    steps: [
      intro("Welcome to Privacy Auditor", "Feed it website URLs. AI-style agents read each site's <b>trackers</b>, <b>cookie banner</b> and <b>privacy notice</b>, check them against India's <b>DPDP Act, 2023</b>, quote the proof, double-check it, and score it Red / Amber / Green. Let's look around."),
      t("brand", "Workspaces", "Each client or business unit gets its own workspace. Switch between them here — your role can be different in each.", "right"),
      t("nav-overview", "Overview", "Your portfolio at a glance: average score, RAG split, the agent pipeline and which DPDP clauses are most often missing.", "right"),
      t("nav-sites", "Websites", "Add URLs (one or a whole list), run audits, and see every site grouped by risk.", "right"),
      t("nav-findings", "Findings", "Every issue the agents found, with quoted evidence and the challenger's verdict. This is where people decide: remediate, accept, or dismiss.", "right"),
      t("nav-alerts", "Alerts", "The Watcher re-scans every month and raises alerts when scores drop, new trackers appear or a policy changes.", "right"),
      t("nav-reports", "Reports", "Export board-ready PDF reports per site or for the whole portfolio, plus CSV for your ticketing tools.", "right"),
      t("nav-team", "Team & roles", "Invite colleagues as Owner, Admin, Auditor or Viewer. What you can see and do across the app follows your role.", "right"),
      t("search", "Quick search", "Press <b>Ctrl / ⌘ + K</b> anywhere to jump to any site or page.", "bottom"),
      t("help", "Help is always here", "Re-run this tour, take a tour of just the current page, or open the full guide whenever you need it.", "bottom", "end"),
      t("user", "Your account & role", "Your role in this workspace is shown here. Sign out or edit your profile from Settings.", "right", "end"),
      intro("You're ready", "Start on <b>Websites</b> → <b>Add websites</b>, or load the demo sites to see a full audit in action. Tip: every page has its own tour in the help menu."),
    ],
  },
  overview: {
    title: "Overview tour",
    summary: "Read the portfolio dashboard.",
    steps: [
      t("ov-kpis", "Key numbers", "Sites monitored, average compliance score, open high-severity findings and trackers found. Numbers update after every scan."),
      t("ov-rag", "Red / Amber / Green", "Score ≥ 75 is Green, 50–74 Amber, below 50 Red. Click a band to jump to those sites.", "right"),
      t("ov-pipeline", "The agent pipeline", "Every audit runs five steps: Discovery → Investigator → Challenger → Risk score → Watcher. Live scans animate here.", "top"),
      t("ov-trend", "Score trend", "Average score per month across all scans — proof that remediation is working.", "top"),
      t("ov-clauses", "DPDP clause coverage", "Which notice requirements your sites most often miss, with the Act section. Start fixing from the top.", "left"),
      t("ov-recent", "Recent audits & alerts", "Latest scans and Watcher alerts. Click any row to drill in.", "top"),
    ],
  },
  sites: {
    title: "Websites tour",
    summary: "Add sites, filter, and read the risk board.",
    steps: [
      t("sites-add", "Add websites", "Paste one URL or a whole list (one per line). Each new site is scanned immediately.", "bottom", "end"),
      t("sites-demo", "Try the demo", "No URLs handy? Load six fictional demo sites that run through the exact same pipeline.", "bottom", "end"),
      t("sites-filter", "Filters", "Combine filters — status, owner, tag or tracker count. Use the sparkle to reset.", "bottom"),
      t("sites-group", "Grouped by risk", "Sites are grouped by RAG band. The counter shows how many findings in that group have a decision.", "bottom"),
      t("sites-card", "Site card", "Owner team, score, trackers and last scan. Click to open the full audit with evidence.", "right"),
    ],
  },
  site: {
    title: "Audit detail tour",
    summary: "Read evidence and make decisions.",
    steps: [
      t("sd-score", "Compliance score", "Calculated as 100 minus deductions for each finding, weighted by the challenger's confidence.", "right"),
      t("sd-actions", "Re-scan & export", "Run a fresh audit any time, or download this site's PDF report.", "bottom", "end"),
      t("sd-pipeline", "How this score was made", "Each agent's step with its summary. The Challenger notes show what it overturned or downgraded.", "top"),
      t("sd-tabs", "Evidence by area", "Findings, trackers, cookie banner and the privacy-notice clause checklist — each with quoted proof.", "bottom"),
      t("sd-finding", "A finding", "Severity, the DPDP section, the quote the agent found, the challenger's verdict and a concrete fix.", "top"),
      t("sd-decision", "Let people decide", "Auditors and above can mark Remediate, Accept risk (needs a note) or Dismiss. Decisions carry over to future scans.", "left"),
      t("sd-history", "Scan history", "Every scan, including monthly Watcher runs.", "left"),
    ],
  },
  findings: {
    title: "Findings tour",
    summary: "Triage every finding across sites.",
    steps: [
      t("f-stats", "Triage at a glance", "Open, high severity, being remediated and accepted risks."),
      t("f-filters", "Filter", "Narrow by severity, type, decision or search across sites."),
      t("f-list", "Evidence first", "Every finding carries a quote from the site or policy, so reviewers never have to take the agent's word for it.", "top"),
    ],
  },
  alerts: { title: "Alerts tour", summary: "What the Watcher noticed.", steps: [t("al-list", "Change alerts", "Score drops, RAG changes, new trackers, removed banners and policy edits — newest first. Mark them read once handled.", "top")] },
  reports: {
    title: "Reports tour",
    summary: "Export evidence packs.",
    steps: [
      t("rp-portfolio", "Portfolio PDF", "A cover summary of every site followed by each site's findings with evidence."),
      t("rp-csv", "Findings CSV", "Drop into Jira, Excel or your GRC tool."),
      t("rp-sites", "Per-site PDFs", "A focused report for one website, including the DPDP clause checklist.", "top"),
    ],
  },
  team: {
    title: "Team & roles tour",
    summary: "Members and permissions.",
    steps: [
      t("tm-invite", "Invite people", "Admins and owners can add members and pick their role.", "bottom", "end"),
      t("tm-members", "Members", "Change roles inline. There must always be at least one owner.", "top"),
      t("tm-roles", "What each role can do", "The full permission matrix — enforced by the API, not just hidden in the UI.", "top"),
    ],
  },
  activity: { title: "Activity tour", summary: "The audit trail.", steps: [t("ac-list", "Audit trail", "Every sign-in, scan, decision, role change and export is logged with who and when.", "top")] },
  settings: {
    title: "Settings tour",
    summary: "Workspace and profile.",
    steps: [
      t("st-workspace", "Workspace", "Rename the workspace and set how often the Watcher re-scans.", "top"),
      t("st-profile", "Your profile", "Update your name and password.", "top"),
    ],
  },
  guide: {
    title: "Guide tour",
    summary: "Find your way around the guide.",
    steps: [
      t("g-start", "Getting started checklist", "Ticks itself off as you use the platform.", "bottom"),
      t("g-modules", "Module tours", "Every module has its own short tour — launch one from here.", "top"),
      t("g-score", "How scoring works", "The exact formula, so every number is explainable.", "top"),
    ],
  },
};

export function tourForPath(pathname) {
  if (/^\/sites\/[^/]+/.test(pathname)) return "site";
  const seg = pathname.split("/")[1];
  return TOURS[seg] ? seg : "platform";
}

export const TOUR_PATHS = {
  overview: "/overview", sites: "/sites", findings: "/findings", alerts: "/alerts", reports: "/reports",
  team: "/team", activity: "/activity", settings: "/settings", guide: "/guide",
};

export async function runTour(key, { onDone } = {}) {
  const tour = TOURS[key];
  if (!tour) return;
  const { driver } = await import("driver.js");
  // Only keep steps whose element is on screen (role-gated buttons may be hidden).
  const steps = tour.steps.filter((s) => !s.element || document.querySelector(s.element));
  if (!steps.length) return;
  const d = driver({
    steps,
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Finish",
    popoverClass: "pa-tour",
    overlayColor: "#0f1320",
    overlayOpacity: 0.45,
    stagePadding: 6,
    stageRadius: 14,
    smoothScroll: true,
    animate: true,
    allowClose: true,
    onPopoverRender: (popover) => {
      const chip = document.createElement("div");
      chip.className = "pa-tour-chip";
      chip.textContent = tour.title;
      popover.title.parentElement.insertBefore(chip, popover.title);
    },
    onDestroyed: () => onDone?.(),
  });
  d.drive();
  return d;
}
