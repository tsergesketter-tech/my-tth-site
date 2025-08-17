// server/src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import cookieSession from "cookie-session";

import loyaltyRoutes from "./routes/loyalty";
import staysRoutes from "./routes/stays";
import authRoutes from "./routes/auth"; // <— you'll add this file (mock login/me/logout)

const app = express();

// ---------- CORS (allow cookies) ----------
app.use(
  cors({
    origin: true,          // or explicit: 'http://localhost:3000'
    credentials: true,     // <— REQUIRED for cookies
  })
);

// ---------- Body parsing ----------
app.use(express.json());

// ---------- Session cookies (HttpOnly) ----------
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

// Optional helper: expose member from session on req
app.use((req, _res, next) => {
  // cookie-session provides req.session as a plain object
  // @ts-ignore
  req.member = req.session?.member || null;
  next();
});

// ---------- Health ----------
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ---------- API routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/stays", staysRoutes);

// ---------- Static assets (public images) ----------
const CLIENT_PUBLIC_IMAGES = path.join(__dirname, "..", "..", "client", "public", "images");
app.use("/images", express.static(CLIENT_PUBLIC_IMAGES));

// ---------- Serve React build ----------
const CLIENT_BUILD_PATH = path.join(__dirname, "..", "..", "client", "build");
console.log("Serving client from:", CLIENT_BUILD_PATH);
app.use(express.static(CLIENT_BUILD_PATH));

// SPA fallback ONLY for HTML page requests and NON-API paths
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const accept = req.headers.accept ?? "";
  if (accept.includes("text/html")) {
    return res.sendFile(path.join(CLIENT_BUILD_PATH, "index.html"));
  }
  return next();
});

// ---------- Start server ----------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
