// server/src/index.ts
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
const cookieSession = require("cookie-session");

import loyaltyRoutes from "./routes/loyalty";
import staysRoutes from "./routes/stays";
import authRoutes from "./routes/auth";
import bookingsRoutes from "./routes/bookings";

// ---------- .env loading (repo root + server/.env override) ----------
function findRepoRoot(startDir: string): string {
  let cur = path.resolve(startDir);
  for (let i = 0; i < 6; i++) {
    const hasClient = fs.existsSync(path.join(cur, "client", "package.json"));
    const hasServer = fs.existsSync(path.join(cur, "server", "package.json"));
    if (hasClient && hasServer) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  // fallback (dist/src -> repo)
  return path.resolve(startDir, "../../..");
}

const REPO_ROOT = findRepoRoot(__dirname);

// Load repo-level .env first (optional)
dotenv.config({ path: path.join(REPO_ROOT, ".env") });
// Load server/.env and let it override
dotenv.config({ path: path.join(REPO_ROOT, "server", ".env"), override: true });

console.log("ENV check — SF_LOYALTY_PROGRAM:", process.env.SF_LOYALTY_PROGRAM ?? "(not set)");

// ---------- App setup ----------
const app = express();

// CORS (enable cookies)
app.use(
  cors({
    origin: true,       // or explicit origins
    credentials: true,  // REQUIRED for cookies
  })
);

// Security headers
app.use((_req, res, next) => {
  // Content Security Policy - Allow Evergage/MCP domains
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.evgnet.com cdn.evergage.com *.evgnet.com *.evergage.com *.us-7.evergage.com; " +
    "style-src 'self' 'unsafe-inline' cdn.evgnet.com cdn.evergage.com *.evgnet.com *.evergage.com *.us-7.evergage.com; " +
    "img-src 'self' data: https: cdn.evgnet.com cdn.evergage.com *.evgnet.com *.evergage.com *.us-7.evergage.com; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https: cdn.evgnet.com cdn.evergage.com *.evgnet.com *.evergage.com *.us-7.evergage.com wss:; " +
    "frame-ancestors 'none'"
  );
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Demo site disclaimer header
  res.setHeader('X-Demo-Site', 'This is a Salesforce demo application. Do not enter real credentials.');
  
  next();
});

// Body parsing
app.use(express.json());

// Session cookies
app.use(
  cookieSession({
    name: "sess",
    keys: [process.env.SESSION_SECRET || "dev_secret"],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
);

// Optional: attach member from session to req
app.use((req, _res, next) => {
  // cookie-session provides req.session as a plain object
  // @ts-ignore augment as needed
  req.member = req.session?.member || null;
  next();
});

// Health
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/stays", staysRoutes);
app.use("/api/bookings", bookingsRoutes);

// Routes inspector (debug)
app.get("/api/__routes", (_req, res) => {
  const list: Array<{ method: string; path: string }> = [];
  const stack = (app as any)._router?.stack || [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods)
        .filter(Boolean)
        .map((m) => m.toUpperCase());
      list.push({ method: methods.join(","), path: layer.route.path });
    } else if (layer.name === "router" && layer.handle?.stack) {
      const baseMatch = layer.regexp?.toString().match(/^\/\^\\\/(.+?)\\\//);
      const base = baseMatch ? `/${baseMatch[1].replace(/\\\//g, "/")}` : "";
      for (const rl of layer.handle.stack) {
        if (rl.route) {
          const methods = Object.keys(rl.route.methods)
            .filter(Boolean)
            .map((m) => m.toUpperCase());
          list.push({ method: methods.join(","), path: `${base}${rl.route.path}` });
        }
      }
    }
  }
  res.json({ routes: list });
});

// ---------- Static assets (images) ----------
const IMAGES_DIR = path.join(REPO_ROOT, "client", "public", "images");
if (fs.existsSync(IMAGES_DIR)) {
  app.use("/images", express.static(IMAGES_DIR));
  console.log("Serving /images from:", IMAGES_DIR);
}

// ---------- Serve React (CRA) or Vite build ----------
const CLIENT_DIR = path.join(REPO_ROOT, "client");
const CRA_BUILD = path.join(CLIENT_DIR, "build");
const VITE_DIST = path.join(CLIENT_DIR, "dist");

const hasIndex = (dir: string) => fs.existsSync(path.join(dir, "index.html"));

const CLIENT_BUILD_PATH =
  (process.env.CLIENT_BUILD_PATH && hasIndex(process.env.CLIENT_BUILD_PATH)
    ? process.env.CLIENT_BUILD_PATH
    : hasIndex(CRA_BUILD)
    ? CRA_BUILD
    : hasIndex(VITE_DIST)
    ? VITE_DIST
    : null);

if (CLIENT_BUILD_PATH) {
  console.log("Serving client from:", CLIENT_BUILD_PATH);
  app.use(express.static(CLIENT_BUILD_PATH));
  // SPA fallback for all non-API paths
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(CLIENT_BUILD_PATH!, "index.html"));
  });
} else {
  console.warn("No client build found at client/build or client/dist. API-only mode.");
  app.get("/", (_req, res) => {
    res
      .status(200)
      .type("html")
      .send(
        `<html><body style="font-family:system-ui">
           <h1>API server running</h1>
           <p>No client build detected. Build it with:</p>
           <pre>cd client && npm run build</pre>
           <p>or set <code>CLIENT_BUILD_PATH</code> to an absolute folder containing index.html</p>
           <ul>
             <li><a href="/api/__routes">/api/__routes</a></li>
             <li><a href="/healthz">/healthz</a></li>
           </ul>
         </body></html>`
      );
  });
}

// ---------- Start server ----------
const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Check:  curl http://localhost:${PORT}/api/__routes`);
  console.log(`Check:  curl http://localhost:${PORT}/api/loyalty/__ping`);
  console.log(`Check:  curl http://localhost:${PORT}/api/bookings/__ping`);
});

export default app;
