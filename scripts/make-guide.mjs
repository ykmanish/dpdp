// Builds docs/Privacy-Auditor-Guide.pdf with pdfkit (from /server deps).
import { createRequire } from "node:module";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "server", "package.json"));
const PDFDocument = require("pdfkit");

const OUT = path.join(ROOT, "docs", "Privacy-Auditor-Guide.pdf");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const C = { ink: "#17181a", ink2: "#4b4f56", ink3: "#8a8f98", line: "#e9e9e6", soft: "#f5f5f3", accent: "#f26b1d", accentSoft: "#fff1e6",
  red: "#e5484d", redSoft: "#feeceb", amber: "#e5940c", amberSoft: "#fff4dc", green: "#2f9e5b", greenSoft: "#e6f6ea", blue: "#3b6ef5", blueSoft: "#eaf0ff" };

const doc = new PDFDocument({ size: "A4", margins: { top: 64, bottom: 64, left: 56, right: 56 }, bufferPages: true,
  info: { Title: "Privacy Auditor – A Simple Guide", Author: "Privacy Auditor" } });
doc.pipe(fs.createWriteStream(OUT));
doc.registerFont("display", path.join(ROOT, "src/app/fonts/satre.ttf"));
// regular.otf has no punctuation glyphs, so the PDF uses Satre for body text too.
doc.registerFont("body", path.join(ROOT, "src/app/fonts/satre.ttf"));

const W = doc.page.width, H = doc.page.height, L = 56, CW = W - 112;
const BOTTOM = H - 80;

function ensure(h) { if (doc.y + h > BOTTOM) doc.addPage(); }
function h1(text, kicker) {
  if (kicker) { doc.font("body").fontSize(10).fillColor(C.accent).text(kicker.toUpperCase(), L, doc.y, { characterSpacing: 1.2 }); doc.moveDown(0.3); }
  doc.font("display").fontSize(26).fillColor(C.ink).text(text, L, doc.y, { width: CW }); doc.moveDown(0.5);
}
function h2(text) { ensure(60); doc.font("display").fontSize(16).fillColor(C.ink).text(text, L, doc.y, { width: CW }); doc.moveDown(0.35); }
function p(text, opts = {}) {
  doc.font("body").fontSize(opts.size || 11).fillColor(opts.color || C.ink2).text(text, opts.x || L, doc.y, { width: opts.width || CW, lineGap: 3.5, ...opts });
  doc.moveDown(opts.gap ?? 0.7);
}
function bullets(items) {
  for (const it of items) {
    ensure(30);
    const y = doc.y;
    doc.circle(L + 4, y + 7, 2.6).fill(C.accent);
    doc.font("body").fontSize(11).fillColor(C.ink2).text(it, L + 16, y, { width: CW - 16, lineGap: 2.5 });
    doc.moveDown(0.25);
  }
  doc.moveDown(0.4);
}
// Card with coloured left bar, title and lines of text.
function card({ title, tag, body, list, color = C.accent, soft = C.soft, x = L, width = CW }) {
  doc.font("body").fontSize(11);
  const inner = width - 36;
  let h = 22 + doc.heightOfString(title, { width: inner }) + 8;
  if (body) h += doc.heightOfString(body, { width: inner, lineGap: 3 }) + 6;
  if (list) for (const l of list) h += doc.heightOfString(l, { width: inner - 14, lineGap: 2.5 }) + 5;
  h += 12;
  ensure(h + 10);
  const y = doc.y;
  doc.roundedRect(x, y, width, h, 12).fill(soft);
  doc.roundedRect(x, y, 5, h, 2.5).fill(color);
  let cy = y + 16;
  doc.font("display").fontSize(14).fillColor(C.ink).text(title, x + 20, cy, { width: inner });
  if (tag) {
    doc.font("body").fontSize(9);
    const tw = doc.widthOfString(tag) + 14;
    doc.roundedRect(x + width - tw - 14, y + 14, tw, 17, 8.5).fill("#ffffff");
    doc.fillColor(color).text(tag, x + width - tw - 7, y + 18.5);
  }
  cy = doc.y + 6;
  if (body) { doc.font("body").fontSize(11).fillColor(C.ink2).text(body, x + 20, cy, { width: inner, lineGap: 3 }); cy = doc.y + 6; }
  if (list) for (const l of list) {
    doc.circle(x + 24, cy + 6.5, 2.2).fill(color);
    doc.font("body").fontSize(11).fillColor(C.ink2).text(l, x + 34, cy, { width: inner - 14, lineGap: 2.5 });
    cy = doc.y + 5;
  }
  doc.y = y + h + 12; doc.x = L;
}
function numberedStep(n, title, text, color = C.accent) {
  doc.font("body").fontSize(11);
  const h = Math.max(46, 26 + doc.heightOfString(text, { width: CW - 70, lineGap: 3 }));
  ensure(h + 8);
  const y = doc.y;
  doc.circle(L + 17, y + 17, 17).fill(color);
  doc.font("display").fontSize(15).fillColor("#fff").text(String(n), L, y + 8, { width: 34, align: "center" });
  doc.font("display").fontSize(14).fillColor(C.ink).text(title, L + 50, y + 2, { width: CW - 50 });
  doc.font("body").fontSize(11).fillColor(C.ink2).text(text, L + 50, doc.y + 3, { width: CW - 60, lineGap: 3 });
  doc.y = Math.max(doc.y, y + h) + 8;
}
// Dark terminal-style box for commands.
function code(lines, x = L, width = CW) {
  const h = 16 + lines.length * 15;
  ensure(h + 8);
  const y = doc.y;
  doc.roundedRect(x, y, width, h, 9).fill("#15171c");
  lines.forEach((l, i) => {
    const comment = l.startsWith("#");
    doc.font("Courier").fontSize(10).fillColor(comment ? "#8a919c" : "#f1f3f5").text(comment ? l : `> ${l}`, x + 12, y + 9 + i * 15, { width: width - 24, lineBreak: false });
  });
  doc.y = y + h + 8; doc.x = L;
}
// Numbered step with optional command box underneath.
function setupStep(n, title, text, cmds) {
  doc.font("body").fontSize(11);
  const textH = doc.heightOfString(text, { width: CW - 60, lineGap: 3 });
  ensure(26 + textH + (cmds ? 24 + cmds.length * 15 : 0));
  const y = doc.y;
  doc.circle(L + 13, y + 12, 13).fill(C.accent);
  doc.font("display").fontSize(12).fillColor("#fff").text(String(n), L, y + 5, { width: 26, align: "center" });
  doc.font("display").fontSize(13.5).fillColor(C.ink).text(title, L + 40, y + 2, { width: CW - 40 });
  doc.font("body").fontSize(11).fillColor(C.ink2).text(text, L + 40, doc.y + 2, { width: CW - 40, lineGap: 3 });
  doc.y += 6;
  if (cmds) code(cmds, L + 40, CW - 40);
  doc.y += 6; doc.x = L;
}
function rowTable(rows, keyW = 170, mono = true) {
  for (const [k, v] of rows) {
    doc.font("body").fontSize(10.5);
    const h = Math.max(16, doc.heightOfString(v, { width: CW - keyW - 10, lineGap: 2 }));
    ensure(h + 10);
    const y = doc.y;
    doc.font(mono ? "Courier-Bold" : "display").fontSize(mono ? 9.5 : 11).fillColor(C.ink).text(k, L, y + (mono ? 1.5 : 0), { width: keyW - 8 });
    doc.font("body").fontSize(10.5).fillColor(C.ink2).text(v, L + keyW, y, { width: CW - keyW, lineGap: 2 });
    doc.y = Math.max(doc.y, y + h) + 6;
    doc.moveTo(L, doc.y - 2).lineTo(L + CW, doc.y - 2).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.y += 4;
  }
  doc.moveDown(0.4);
}

// ---------------- Cover ----------------
doc.rect(0, 0, W, H).fill("#13151a");
doc.circle(W - 40, 80, 190).fillOpacity(0.25).fill(C.accent).fillOpacity(1);
doc.circle(60, H - 60, 220).fillOpacity(0.16).fill(C.blue).fillOpacity(1);
doc.roundedRect(L, 92, 46, 46, 12).fill("#ffffff");
doc.font("display").fontSize(22).fillColor(C.ink).text("PA", L, 104, { width: 46, align: "center" });
doc.font("body").fontSize(12).fillColor("#cbd2dc").text("PRIVACY AUDITOR  ·  DPDP ACT, 2023", L + 62, 109, { characterSpacing: 1.2 });
doc.font("display").fontSize(46).fillColor("#ffffff").text("Is your website\nDPDP-ready?", L, 250, { width: CW, lineGap: 2 });
doc.font("body").fontSize(15).fillColor("#c9ced6").text("A simple guide to what this platform is, the problem it solves, and what every part of it does.", L, doc.y + 18, { width: CW - 60, lineGap: 4 });
const chips = ["Find trackers", "Check cookie banner", "Read privacy policy", "Score Red · Amber · Green", "Watch every month"];
let cx = L, cyy = doc.y + 34;
doc.font("body").fontSize(10.5);
for (const c of chips) {
  const w = doc.widthOfString(c) + 24;
  if (cx + w > L + CW) { cx = L; cyy += 32; }
  doc.roundedRect(cx, cyy, w, 24, 12).fillOpacity(0.1).fill("#ffffff").fillOpacity(1);
  doc.fillColor("#e8ebf0").text(c, cx + 12, cyy + 6.5);
  cx += w + 8;
}
doc.font("body").fontSize(10).fillColor("#8a919c").text("Written in plain words – no legal or technical background needed.", L, H - 100, { width: CW });

// ---------------- 1. What is it ----------------
doc.addPage();
h1("What is Privacy Auditor?", "In one minute");
p("Privacy Auditor is like a health check-up for your website – but for privacy. You give it a website link. It visits the site the way a new visitor would, looks at what the site does with people's personal data, and tells you clearly what is fine and what needs fixing.", { size: 12 });
p("It checks your website against India's new privacy law, the Digital Personal Data Protection Act, 2023 (the \"DPDP Act\").", { size: 12 });

h2("The problem it solves");
p("Most company websites quietly do things with visitors' data that the owners don't even know about:");
bullets([
  "Trackers run in the background – tools from Google, Facebook, Hotjar and others watch what visitors do, often from the very first second.",
  "There is no proper \"cookie banner\", or the banner only has an \"Accept\" button and no easy way to say \"No\".",
  "The privacy policy is missing, very short, or doesn't say the things the law now requires – like how to delete your data or whom to complain to.",
  "Forms ask for name, phone or email without telling people why.",
]);
p("Under the DPDP Act, this can mean heavy penalties. But checking every page by hand is slow, boring and easy to get wrong – especially when a company has many websites, or an agency looks after websites for many clients.");

// ---------------- 1b. How it helps ----------------
doc.addPage();
h1("How Privacy Auditor helps", "The answer");
card({ title: "Paste a link, get answers", color: C.green, soft: C.greenSoft, list: [
  "Finds every tracker and tells you if it runs before the visitor agrees.",
  "Checks the cookie banner – is it there, and can people say \"No\"?",
  "Reads the privacy policy and ticks off 15 things the DPDP Act asks for.",
  "Shows proof for every problem – the exact line of text or code it found.",
  "Gives one simple score out of 100, plus a colour: Red, Amber or Green.",
  "Tells you exactly how to fix each problem, and checks again every month.",
] });

h2("Who is it for?");
p("Small and mid-size companies, digital agencies that manage client websites, and compliance or legal teams who need proof that their sites follow the law.");
doc.moveDown(0.4);
h2("What the colours mean");
const bands = [["Green", "75 – 100", "Good shape. Small fixes at most.", C.green, C.greenSoft], ["Amber", "50 – 74", "Needs work. Some important things are missing.", C.amber, C.amberSoft], ["Red", "below 50", "At risk. Fix these first.", C.red, C.redSoft]];
ensure(80);
const by = doc.y, bw = (CW - 16) / 3;
bands.forEach(([n, r, d, c, s], i) => {
  const x = L + i * (bw + 8);
  doc.roundedRect(x, by, bw, 96, 12).fill(s);
  doc.circle(x + 18, by + 20, 5).fill(c);
  doc.font("display").fontSize(15).fillColor(C.ink).text(n, x + 30, by + 12);
  doc.font("body").fontSize(10).fillColor(c).text(r, x + 14, by + 36);
  doc.font("body").fontSize(10).fillColor(C.ink2).text(d, x + 14, by + 51, { width: bw - 24, lineGap: 1.5 });
});
doc.y = by + 110;
p("People stay in charge: the platform finds and explains problems, but a human decides what to do about each one.", { color: C.ink3, size: 10.5 });

// ---------------- 2. How it works ----------------
doc.addPage();
h1("How it works", "Five helpers, one after another");
p("When you add a website, five \"helpers\" (we call them agents) work on it in order. Think of it as a small team: one collects, one investigates, one double-checks, one scores, and one keeps watch.");
doc.moveDown(0.3);
numberedStep(1, "Discovery – the collector", "Opens your website like a first-time visitor (who has not clicked \"Accept\" on anything). Notes which cookies get saved straight away and finds your privacy policy page.");
numberedStep(2, "Investigator – the detective", "Looks for known trackers, the cookie banner and its buttons, and forms that ask for personal details. Reads the privacy policy line by line. For everything it finds, it saves the exact sentence or code as proof.");
numberedStep(3, "Challenger – the second opinion", "A careful checker that does not simply trust the detective. It re-reads the proof, throws out mistakes (for example \"we do NOT let you delete your data\" is not a yes), and marks weak proof as less certain.");
numberedStep(4, "Risk score – the judge", "Starts at 100 and takes points off for each problem. Bigger problems lose more points; less-certain problems lose fewer. The final number becomes a colour.");
numberedStep(5, "Watcher – the guard", "Saves today's result and re-checks the site every month (or as often as you choose). If the score drops, a new tracker appears, the banner disappears or the policy changes, it sends an alert.");

// ---------------- 3. Modules ----------------
doc.addPage();
h1("What each part does", "The modules, one by one");
p("The menu on the left of the app has these sections. Here is what you will find in each, in plain words.");
const mods = [
  { title: "Overview", tag: "Home", color: C.accent, soft: C.accentSoft, body: "Your dashboard – the big picture in one screen.",
    list: ["How many websites you watch and their average score.", "A donut chart of how many sites are Red, Amber and Green.", "A line showing whether your scores are getting better month by month.", "The five helpers, shown live while a scan is running.", "Which privacy-policy rules your sites miss most often."] },
  { title: "Websites", tag: "Add & browse", color: C.blue, soft: C.blueSoft, body: "The list of all your websites, grouped into At risk, Needs work and Compliant.",
    list: ["Add one link or paste a whole list – each is checked right away.", "Try six ready-made demo sites to see how it works.", "Filter by colour, owner team, tag or number of trackers.", "Switch between card view and a simple table."] },
  { title: "Website page (audit details)", tag: "Deep dive", color: C.ink, soft: C.soft, body: "Click any website to see its full report.",
    list: ["The score, and exactly where points were lost.", "Tabs for Findings, Trackers, Consent (cookie banner) and Privacy notice.", "Proof for every item, plus a clear \"how to fix it\".", "Buttons to re-check now, download a PDF, or pause monthly checks.", "A history of past scans and alerts for this site."] },
  { title: "Findings", tag: "To-do list", color: C.red, soft: C.redSoft, body: "Every problem from every website in one place – your privacy to-do list.",
    list: ["Each item shows how serious it is (High, Medium, Low) and which part of the law it relates to.", "Decide what happens: Remediate (we will fix it), Accept risk (with a written reason) or Dismiss.", "Decisions are remembered on the next scan, so you never repeat work."] },
  { title: "Alerts", tag: "What changed", color: C.amber, soft: C.amberSoft, body: "Messages from the Watcher when something changes between checks – for example a score drop, a new tracker, a missing banner or an edited policy." },
  { title: "Reports", tag: "Downloads", color: C.green, soft: C.greenSoft, body: "Download proof to share with your boss, client or lawyer.",
    list: ["One PDF for the whole company (all websites).", "One PDF per website, with the full checklist.", "A spreadsheet (CSV) of all findings for Excel or Jira."] },
  { title: "Team & roles", tag: "People", color: C.blue, soft: C.blueSoft, body: "Invite colleagues and choose what each person is allowed to do. The table on this page shows every permission for every role." },
  { title: "Activity log", tag: "History", color: C.ink3, soft: C.soft, body: "A diary of who did what and when – logins, scans, decisions, role changes and downloads. Useful proof that your company takes privacy seriously. Only Owners and Admins can see it." },
  { title: "Settings", tag: "Setup", color: C.ink3, soft: C.soft, body: "Rename your workspace, choose how often sites are re-checked (weekly, monthly, quarterly), update your name and password, and replay the welcome tour." },
  { title: "Guide & Help", tag: "Learn", color: C.accent, soft: C.accentSoft, body: "You are never lost.",
    list: ["A welcome screen on your first login.", "Guided tours that point at each part of the screen – one for the whole platform and one for every page.", "A Help button with \"tour this page\", a 2-minute DPDP summary and keyboard shortcuts.", "A Guide page with a getting-started checklist that ticks itself off.", "Press Ctrl + K anywhere to search and jump to any page or website."] },
];
for (const m of mods) card(m);
doc.moveDown(0.4);
ensure(260);
h2("Words you will see");
const gloss = [
  ["Tracker", "A small piece of code from another company that watches what visitors do."],
  ["Cookie banner", "The pop-up that asks visitors if they agree to cookies and tracking."],
  ["Consent", "A visitor's clear \"yes\". Under DPDP it must be free, informed, and as easy to take back as to give."],
  ["Privacy notice / policy", "The page that tells people what data you collect, why, and what their rights are."],
  ["Finding", "One problem the platform found, with proof and a suggested fix."],
];
for (const [k, v] of gloss) {
  ensure(30);
  const y = doc.y;
  doc.font("display").fontSize(11.5).fillColor(C.ink).text(k, L, y, { width: 140 });
  doc.font("body").fontSize(11).fillColor(C.ink2).text(v, L + 150, y, { width: CW - 150, lineGap: 2.5 });
  doc.y = Math.max(doc.y, y + 16) + 7;
}
doc.moveDown(0.6);
p("Note: Privacy Auditor gives clear, proof-backed signals and a to-do list. It is not legal advice – for high-risk sites, ask a privacy professional to review.", { size: 10, color: C.ink3 });


// ---------------- 4. Roles + getting started ----------------
doc.addPage();
h1("Who can do what", "Roles");
p("Every person in a workspace has one role. A workspace is one company or one client, and you can belong to several, with a different role in each.");
const roles = [
  ["Owner", "Everything, including deleting the workspace.", C.accent],
  ["Admin", "Invite people, change settings, manage all websites and scans.", C.blue],
  ["Auditor", "Add websites, run scans and make decisions on findings.", C.green],
  ["Viewer", "Look only – dashboards, findings and reports, no changes.", C.ink3],
];
for (const [r, d, c] of roles) {
  ensure(40);
  const y = doc.y;
  doc.roundedRect(L, y, CW, 36, 10).fill(C.soft);
  doc.roundedRect(L + 12, y + 9, 70, 18, 9).fill(c);
  doc.font("body").fontSize(10).fillColor("#fff").text(r, L + 12, y + 13.5, { width: 70, align: "center" });
  doc.font("body").fontSize(11).fillColor(C.ink2).text(d, L + 96, y + 11.5, { width: CW - 110 });
  doc.y = y + 44;
}
p("These rules are checked by the server, not just hidden on screen – so a Viewer truly cannot change anything.", { size: 10.5, color: C.ink3 });

doc.moveDown(0.3);
h2("Getting started in 5 steps");
const start = [
  ["Sign in", "Create a workspace, or use a demo account on the login page."],
  ["Take the tour", "Click \"Take the tour\" on the welcome screen, or Help → Start platform tour."],
  ["Add websites", "Go to Websites → Add websites and paste your links (or load the demo sites)."],
  ["Read and decide", "Open a website, read the proof, and mark each finding Remediate, Accept or Dismiss."],
  ["Share and relax", "Download a PDF report. The Watcher re-checks every month and alerts you to changes."],
];
start.forEach(([t, d], i) => numberedStep(i + 1, t, d, C.ink));

// ---------------- 5. Run it yourself ----------------
doc.addPage();
h1("Run it on your computer", "For developers · from GitHub to running");
p("About 5 minutes. Steps 1–3 are needed only the first time. Type each command into a terminal (PowerShell on Windows, Terminal on Mac) and press Enter.");
card({ title: "Before you start", color: C.blue, soft: C.blueSoft, list: [
  "Node.js version 20 or newer – download the LTS version from nodejs.org.",
  "Git – from git-scm.com.",
  "Ports 3000 (website) and 4000 (API) free on your computer.",
] });

setupStep(1, "Check your tools", "Both commands should print a version number. Node must be v20 or higher. If you see \"not recognised\", install the tool and open a new terminal.", ["node -v", "git --version"]);
setupStep(2, "Download the code", "This copies the project from GitHub into a new folder called dpdp, then moves you into it.", ["git clone https://github.com/ykmanish/dpdp.git", "cd dpdp"]);
setupStep(3, "Install everything", "Installs the website and, automatically, the API server inside the server folder. Takes 1–3 minutes the first time.", ["npm install"]);
setupStep(4, "Start the app", "Starts two programs together in one window: the API (lines marked \"api\", port 4000) and the website (lines marked \"web\", port 3000). On the very first start it creates a demo workspace with sample websites. Leave this window open while you use the app.", ["npm run dev"]);
setupStep(5, "Open it in your browser", "When you see \"Ready\" in the terminal, go to this address:", ["http://localhost:3000"]);
setupStep(6, "Sign in", "Click one of the demo buttons – Owner, Admin, Auditor or Viewer – to try each role. Or click \"Create a workspace\" to start fresh as an owner. (Demo account details are listed in server/src/seed.js.)");
setupStep(7, "Take the tour", "Click \"Take the tour\" on the welcome screen. Later you can re-open it from Help (top right) → Start platform tour.");
setupStep(8, "Scan a real website", "Go to Websites → Add websites, paste a link such as example.com, and watch the five helpers work live. The demo sites work even without internet.");
setupStep(9, "Stop and start again", "Press Ctrl + C in the terminal to stop. Next time, just open a terminal in the dpdp folder and run npm run dev again – your data is kept in server/data/db.json.", ["# stop: press Ctrl + C", "cd dpdp", "npm run dev"]);

h2("Handy commands");
rowTable([
  ["npm run dev", "Start the API and website together for development."],
  ["npm run seed", "Wipe all data and re-create the demo workspace. Run while the app is stopped."],
  ["npm run docs:guide", "Re-build this PDF (docs/Privacy-Auditor-Guide.pdf)."],
  ["npm run lint", "Check the code for common mistakes."],
  ["npm run build\nnpm start", "Build and run the website in production mode (port 3000)."],
  ["npm --prefix server start", "Run the API in production mode (port 4000). Run it alongside npm start."],
]);

h2("Optional settings");
p("The app works without any setup. For a real deployment, set these environment variables before starting:", { gap: 0.4 });
rowTable([
  ["JWT_SECRET", "A long random text used to sign logins. Always change it for production."],
  ["PORT", "Port for the API (default 4000)."],
  ["WEB_ORIGIN", "Website address allowed to call the API (default http://localhost:3000)."],
  ["API_ORIGIN", "Where the website finds the API (default http://localhost:4000)."],
]);
p("Example in PowerShell:", { gap: 0.3 });
code(["$env:JWT_SECRET=\"my-long-random-secret\"; npm run dev"]);
p("On Mac / Linux:", { gap: 0.3 });
code(["JWT_SECRET=\"my-long-random-secret\" npm run dev"]);

ensure(340);
h2("If something goes wrong");
rowTable([
  ["\"npm\" is not recognised", "Node.js is not installed, or the terminal was open before installing. Install Node.js and open a new terminal."],
  ["Port already in use", "An old copy is still running. Close that terminal (or press Ctrl + C in it) and run npm run dev again."],
  ["Stuck on \"Loading your workspace…\"", "The API is not running. Look for red error lines marked \"api\" in the terminal and restart with npm run dev."],
  ["Login says incorrect password", "Use the demo buttons, or reset demo data with npm run seed and try again."],
  ["A website scan failed", "The site may be down or may block automated visitors. Check the link opens in your browser; the demo sites always work."],
  ["Want a clean start", "Stop the app, run npm run seed, then npm run dev."],
], 190, false);

// Footers (skip cover)
const range = doc.bufferedPageRange();
for (let i = 1; i < range.count; i++) {
  doc.switchToPage(i);
  doc.page.margins.bottom = 0;
  doc.moveTo(L, H - 50).lineTo(W - L, H - 50).lineWidth(0.6).strokeColor(C.line).stroke();
  doc.font("body").fontSize(9).fillColor(C.ink3).text("Privacy Auditor  ·  A simple guide", L, H - 42, { width: CW / 2, lineBreak: false });
  doc.text(`${i + 1} / ${range.count}`, L + CW / 2, H - 42, { width: CW / 2, align: "right", lineBreak: false });
}
doc.end();
console.log("wrote", OUT);
