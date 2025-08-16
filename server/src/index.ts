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

// CORS: wide-open in dev; lock to your origin(s) for prod
app.use(cors({ origin: true }));

// ---------- Health ----------
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ---------- API routes ----------
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/stays", staysRoutes);

// ---------- Static assets from client/public (images, etc.) ----------
// When the server is compiled, __dirname => server/dist
// This maps /images/* to client/public/images/*
const CLIENT_PUBLIC_IMAGES = path.join(__dirname, "..", "..", "client", "public", "images");
app.use("/images", express.static(CLIENT_PUBLIC_IMAGES));

// ---------- Serve React build (client/build) ----------
const CLIENT_BUILD_PATH = path.join(__dirname, "..", "..", "client", "build");
app.use(express.static(CLIENT_BUILD_PATH));

// Catch-all for non-API routes → React index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "Not found" });
  }
  res.sendFile(path.join(CLIENT_BUILD_PATH, "index.html"));
});

// ---------- Start server ----------
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
