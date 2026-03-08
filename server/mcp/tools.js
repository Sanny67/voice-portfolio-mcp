// tools.js
// Defines MCP-style tool schemas and their implementations.

const { getPortfolio } = require("../services/portfolioService");
const { getStockPrice, getMultipleStockPrices } = require("../services/marketService");

// ─── Static sector map ────────────────────────────────────────────────────────
const SECTOR_MAP = {
  INFY: "IT",
  TCS: "IT",
  WIPRO: "IT",
  HCLTECH: "IT",
  TECHM: "IT",
  TATAMOTORS: "AUTO",
  MARUTI: "AUTO",
  BAJAJ_AUTO: "AUTO",
  HEROMOTOCO: "AUTO",
  RELIANCE: "ENERGY",
  ONGC: "ENERGY",
  NTPC: "ENERGY",
  HDFCBANK: "FINANCE",
  ICICIBANK: "FINANCE",
  SBIN: "FINANCE",
  KOTAKBANK: "FINANCE",
  AXISBANK: "FINANCE",
  SUNPHARMA: "PHARMA",
  DRREDDY: "PHARMA",
  CIPLA: "PHARMA",
  HINDUNILVR: "FMCG",
  ITC: "FMCG",
};

function getSector(symbol) {
  const normalized = String(symbol || "")
    .toUpperCase()
    .replace(/\.(NS|BO)$/i, "");
  return SECTOR_MAP[normalized] ?? "OTHER";
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function tool_get_portfolio_holdings() {
  const holdings = getPortfolio();
  if (!holdings.length) return { error: "No portfolio uploaded yet." };
  return { holdings };
}

async function tool_get_stock_price({ symbol }) {
  return await getStockPrice(symbol);
}

async function tool_get_multiple_stock_prices({ symbols }) {
  return await getMultipleStockPrices(symbols);
}

async function tool_calculate_portfolio_value() {
  const holdings = getPortfolio();
  if (!holdings.length) return { error: "No portfolio uploaded yet." };

  const symbols = holdings.map((h) => h.symbol);
  const prices = await getMultipleStockPrices(symbols);
  const priceMap = Object.fromEntries(prices.map((p) => [p.symbol, p]));

  let totalCurrentValue = 0;
  let totalInvestedValue = 0;
  let totalDailyChange = 0;

  const breakdown = holdings.map((h) => {
    const quote = priceMap[h.symbol] ?? {};
    const currentPrice = quote.price ?? h.avg_price;
    const currentValue = currentPrice * h.quantity;
    const investedValue = h.avg_price * h.quantity;
    const dailyChange = (quote.change ?? 0) * h.quantity;

    totalCurrentValue += currentValue;
    totalInvestedValue += investedValue;
    totalDailyChange += dailyChange;

    return {
      symbol: h.symbol,
      quantity: h.quantity,
      avg_price: h.avg_price,
      current_price: currentPrice,
      current_value: Math.round(currentValue),
      invested_value: Math.round(investedValue),
      pnl: Math.round(currentValue - investedValue),
      pnl_percent: (((currentValue - investedValue) / investedValue) * 100).toFixed(2),
    };
  });

  return {
    total_value: Math.round(totalCurrentValue),
    total_invested: Math.round(totalInvestedValue),
    total_pnl: Math.round(totalCurrentValue - totalInvestedValue),
    total_pnl_percent: (
      ((totalCurrentValue - totalInvestedValue) / totalInvestedValue) *
      100
    ).toFixed(2),
    daily_change: Math.round(totalDailyChange),
    breakdown,
  };
}

async function tool_analyze_sector_allocation() {
  const holdings = getPortfolio();
  if (!holdings.length) return { error: "No portfolio uploaded yet." };

  const symbols = holdings.map((h) => h.symbol);
  const prices = await getMultipleStockPrices(symbols);
  const priceMap = Object.fromEntries(prices.map((p) => [p.symbol, p]));

  const sectorValues = {};
  let totalValue = 0;

  for (const h of holdings) {
    const price = priceMap[h.symbol]?.price ?? h.avg_price;
    const value = price * h.quantity;
    const sector = getSector(h.symbol);
    sectorValues[sector] = (sectorValues[sector] ?? 0) + value;
    totalValue += value;
  }

  const allocation = Object.entries(sectorValues).map(([sector, value]) => ({
    sector,
    value: Math.round(value),
    percent: ((value / totalValue) * 100).toFixed(1),
  }));

  allocation.sort((a, b) => b.value - a.value);

  return { total_value: Math.round(totalValue), sector_allocation: allocation };
}

async function tool_analyze_portfolio_risk() {
  const sectorData = await tool_analyze_sector_allocation();
  if (sectorData.error) return sectorData;

  const { sector_allocation } = sectorData;
  const topSectorPercent = parseFloat(sector_allocation[0]?.percent ?? 0);
  const numSectors = sector_allocation.length;

  let risk_level, reason;

  if (topSectorPercent > 70 || numSectors === 1) {
    risk_level = "HIGH";
    reason = `Over 70% concentrated in ${sector_allocation[0].sector} sector. Very low diversification.`;
  } else if (topSectorPercent > 50 || numSectors <= 2) {
    risk_level = "MEDIUM";
    reason = `Moderate concentration in ${sector_allocation[0].sector} sector (${topSectorPercent}%). Consider diversifying.`;
  } else {
    risk_level = "LOW";
    reason = `Well diversified across ${numSectors} sectors. Largest sector is ${sector_allocation[0].sector} at ${topSectorPercent}%.`;
  }

  return { risk_level, reason, sector_allocation };
}

// ─── Tool registry (JSON schema metadata) ─────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_portfolio_holdings",
      description: "Returns the user's uploaded stock portfolio holdings.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stock_price",
      description: "Fetches the live market price for a single stock symbol.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock ticker symbol, e.g. INFY" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_multiple_stock_prices",
      description: "Fetches live prices for multiple stock symbols in one call.",
      parameters: {
        type: "object",
        properties: {
          symbols: {
            type: "array",
            items: { type: "string" },
            description: "Array of ticker symbols",
          },
        },
        required: ["symbols"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_portfolio_value",
      description:
        "Calculates the total current value of the portfolio, daily change, P&L, and per-stock breakdown.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_sector_allocation",
      description: "Returns portfolio allocation broken down by market sector with percentages.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_portfolio_risk",
      description:
        "Assesses portfolio risk as LOW / MEDIUM / HIGH based on sector concentration.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

async function executeTool(name, args) {
  switch (name) {
    case "get_portfolio_holdings":
      return tool_get_portfolio_holdings();
    case "get_stock_price":
      return tool_get_stock_price(args);
    case "get_multiple_stock_prices":
      return tool_get_multiple_stock_prices(args);
    case "calculate_portfolio_value":
      return tool_calculate_portfolio_value();
    case "analyze_sector_allocation":
      return tool_analyze_sector_allocation();
    case "analyze_portfolio_risk":
      return tool_analyze_portfolio_risk();
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

module.exports = { TOOLS, executeTool };
