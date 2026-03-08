// index.js
// Express backend — handles portfolio upload and AI agent queries.

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { setPortfolio, hasPortfolio } = require("./services/portfolioService");
const { runAgent } = require("./mcp/server");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true }));

// ─── Upload portfolio ─────────────────────────────────────────────────────────
app.post("/upload-portfolio", upload.single("portfolio"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const raw = req.file.buffer.toString("utf-8");
    const holdings = JSON.parse(raw);

    if (!Array.isArray(holdings) || holdings.length === 0) {
      return res.status(400).json({ error: "Portfolio must be a non-empty JSON array." });
    }

    // Validate each holding has required fields
    for (const h of holdings) {
      if (!h.symbol || typeof h.quantity !== "number" || typeof h.avg_price !== "number") {
        return res.status(400).json({
          error: "Each holding must have: symbol (string), quantity (number), avg_price (number).",
        });
      }
    }

    setPortfolio(holdings);
    res.json({ ok: true, count: holdings.length, holdings });
  } catch (err) {
    res.status(400).json({ error: "Invalid JSON file: " + err.message });
  }
});

// ─── Ask the AI agent ─────────────────────────────────────────────────────────
app.post("/ask", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (!hasPortfolio()) {
      return res.json({
        response: "Please upload your portfolio JSON file first before asking questions.",
      });
    }

    const response = await runAgent(message, history);
    res.json({ response });
  } catch (err) {
    console.error("Agent error:", err.message);
    res.status(500).json({ error: "Agent failed: " + err.message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`✅ MCP Portfolio Server running on http://localhost:${PORT}`);
});
