import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { load, db } from "./db.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import reportRoutes from "./routes/reports.js";
import { startAudit } from "./scanner/pipeline.js";
import { seedIfEmpty } from "./seed.js";

const PORT = process.env.PORT || 4000;
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.WEB_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", apiRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

load();
await seedIfEmpty();

// Watcher: re-scan sites whose nextScanAt has passed (checked every 10 minutes).
setInterval(() => {
  const due = db.sites.filter((s) => s.watch !== false && s.nextScanAt && s.nextScanAt < new Date().toISOString());
  due.forEach((s, i) => setTimeout(() => startAudit(s, { trigger: "watcher" }), i * 2000));
}, 10 * 60e3);

app.listen(PORT, () => console.log(`Privacy Auditor API listening on http://localhost:${PORT}`));
