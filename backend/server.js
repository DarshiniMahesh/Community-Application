const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────
const adminRoutes = require('./src/routes/admin');
const authRoutes   = require("./src/routes/auth");
const userRoutes   = require("./src/routes/users");
const sanghaRoutes = require("./src/routes/sangha");

app.use('/api/admin', adminRoutes);
app.use("/api/auth",   authRoutes);
app.use("/api/users",  userRoutes);
app.use("/api/sangha", sanghaRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 HANDLER ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Census API running on http://localhost:${PORT}`);
});