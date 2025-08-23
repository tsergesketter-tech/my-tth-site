import express from "express";
import cors from "cors";
import loyaltyRouter from "./routes/loyalty";
import bookingsRouter from "./routes/bookings";

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());


// Global ping
app.get("/api/__ping", (_req, res) => res.json({ ok: true }));

// MOUNT ROUTERS (these create the final paths)
app.use("/api/loyalty", loyaltyRouter);  // -> POST /api/loyalty/journals/accrual-stay
app.use("/api/bookings", bookingsRouter); // -> POST /api/bookings

export default app;