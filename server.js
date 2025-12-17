const express = require("express");
const path = require("path");
const compression = require("compression");

const app = express();
const PORT = process.env.PORT || 20310;
const DIST_PATH = path.join(__dirname, "dist");

// Enable gzip compression
app.use(compression());

// Set headers for SharedArrayBuffer (required for WASM multi-threading)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

// Serve static files
app.use(express.static(DIST_PATH));

// SPA fallback - serve index.html for all routes
app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_PATH, "index.html"));
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).send("Internal Server Error");
});

// Start server
app.listen(PORT, () => {
  console.log(`Babylon MMD Cafe running on http://localhost:${PORT}`);
  console.log(`SharedArrayBuffer headers enabled for WASM multi-threading`);
});
