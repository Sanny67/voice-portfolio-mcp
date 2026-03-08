# 🎙️ AI Voice Portfolio Analyzer (MCP POC)

A minimal, production-quality proof-of-concept demonstrating **MCP (Model Context Protocol)** + **local Ollama (llama3)** + **Web Speech API** for analyzing stock portfolios with voice.

---

## ✨ Features

- 📁 Upload a JSON portfolio file
- 🗣️ Ask questions by voice or text
- 🤖 AI agent uses MCP tools to fetch live market data
- 📊 Portfolio value, P&L, sector allocation, risk analysis
- 🔊 AI speaks answers back to you

---

## 🗂️ Project Structure

```
voice-portfolio-mcp/
├── client/                  # Next.js 14 frontend
│   ├── app/page.tsx         # Main page (upload + chat)
│   ├── components/
│   │   ├── Chat.tsx         # Chat UI with text + voice
│   │   └── VoiceInput.tsx   # Web Speech API integration
│
├── server/                  # Node.js + Express backend
│   ├── index.js             # API routes: /upload-portfolio, /ask
│   ├── mcp/
│   │   ├── server.js        # Ollama agent loop (tool orchestration)
│   │   └── tools.js         # MCP tool definitions + implementations
│   ├── services/
│   │   ├── portfolioService.js   # In-memory portfolio store
│   │   └── marketService.js      # Yahoo Finance data fetching
│
├── data/
│   └── portfolio.example.json    # Sample portfolio
│
└── .env.example
```

---

## 🚀 Quick Start

### POC Note

This project is a **POC** and runs fully locally.
It uses **Ollama + llama3** instead of a production hosted LLM (for example, OpenAI API keys).
You do **not** need any paid API key to run this demo.

### 1. Prerequisites

- Node.js 18+
- Ollama installed: https://ollama.com

### 2. Clone & Install

```bash
# Install all dependencies
npm run install:all
```

### 3. Configure Environment

```bash
cd server
cp ../.env.example .env
# Edit .env if needed
```

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
PORT=3001
```

### 4. Start Ollama Model

Keep this terminal running while you use the app.

```bash
ollama run llama3
```

### 5. Run App

```bash
# From the project root directory — starts both server and client
npm run dev
```

If Ollama is not running, `/ask` responses will fail.

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

## 💬 Usage

1. **Open** http://localhost:3000
2. **Upload** `data/portfolio.example.json` (or your own portfolio)
3. **Ask questions** by typing or clicking the 🎙️ mic button:
   - *"What is my portfolio value?"*
   - *"Which stock is performing best?"*
   - *"Is my portfolio too risky?"*
   - *"Which sector am I most exposed to?"*
4. **Enable 🔊 voice output** to hear responses read aloud

---

## 📁 Portfolio JSON Format

```json
[
  { "symbol": "INFY",       "quantity": 10, "avg_price": 1500 },
  { "symbol": "TCS",        "quantity": 5,  "avg_price": 3400 },
  { "symbol": "TATAMOTORS", "quantity": 12, "avg_price": 500  }
]
```

---

## 🛠️ MCP Tools

| Tool | Description |
|------|-------------|
| `get_portfolio_holdings` | Returns uploaded holdings |
| `get_stock_price` | Fetches live price for a symbol (Yahoo Finance) |
| `get_multiple_stock_prices` | Batch price fetch |
| `calculate_portfolio_value` | Total value, P&L, daily change |
| `analyze_sector_allocation` | Sector breakdown with percentages |
| `analyze_portfolio_risk` | LOW / MEDIUM / HIGH risk assessment |

---

## 🏗️ Architecture

```
Browser (Next.js)
  │  voice → text (Web Speech API)
  │  POST /ask
  ▼
Express Server
  │  runAgent(message)
  ▼
Local Ollama llama3
  │  calls MCP tools
  ▼
MCP Tools → Yahoo Finance / portfolio store
  │  results
  ▼
Final response → browser → speechSynthesis
```

---

## Notes

- Indian NSE stocks are automatically resolved with `.NS` suffix
- All portfolio data is stored in-memory (resets on server restart)
- Voice input requires Chrome or Edge (Web Speech API support)
