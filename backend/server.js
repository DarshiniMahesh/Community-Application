// Community-Application\backend\server.js
const path = require('path');         // ← must come first
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') }); // .env is right next to server.js

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'loaded ✓' : 'MISSING ✗');

const express = require("express");
const cors = require("cors");

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
const adminRoutes  = require('./src/routes/admin');
const authRoutes   = require("./src/routes/auth");
const userRoutes   = require("./src/routes/users");
const sanghaRoutes = require("./src/routes/sangha");
const userschlRoutes = require('./src/routes/userschl');

console.log('userschl routes loaded ✓');
const adminSchlRoutes = require('./src/routes/adminschl');



app.use('/api/admin',  adminRoutes);
app.use("/api/auth",   authRoutes);
app.use("/api/users",  userRoutes);
app.use("/api/sangha", sanghaRoutes);
app.use('/api/userschl', userschlRoutes);
app.use('/api/admin',    adminSchlRoutes);


// ─── HEALTH CHECK ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── 404 HANDLER ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

// ─── DATE TYPE FIX ────────────────────────────────────────────
const pg = require('pg');
pg.types.setTypeParser(1082, val => val);

// ─── START ────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Census API running on http://localhost:${PORT}`);
  });
}

module.exports = app;