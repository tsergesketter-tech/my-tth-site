// server/src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";

import loyaltyRoutes from "./routes/loyalty";
import staysRoutes from "./routes/stays";

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// ---------- Health ----------
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ---------- API routes ----------
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/stays", staysRoutes);

// ---------- Static assets (public images) ----------
const CLIENT_PUBLIC_IMAGES = path.join(__dirname, "..", "..", "client", "public", "images");
app.use("/images", express.static(CLIENT_PUBLIC_IMAGES));

// ---------- Serve React build ----------
const CLIENT_BUILD_PATH = path.join(__dirname, "..", "..", "client", "build");

// (Optional: quick sanity log)
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

