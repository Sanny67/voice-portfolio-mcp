// marketService.js
// Fetches live stock data from Yahoo Finance

const axios = require("axios");
const yahooFinance = require("yahoo-finance2").default;

const NSE_CLIENT = axios.create({
  timeout: 10000,
  headers: {
    "user-agent": "Mozilla/5.0",
    accept: "application/json,text/plain,*/*",
    "accept-language": "en-US,en;q=0.9",
    referer: "https://www.nseindia.com/",
  },
});

function normalizeIndianSymbol(symbol) {
  return String(symbol || "")
    .toUpperCase()
    .replace(/\.(NS|BO)$/i, "")
    .trim();
}

async function getPriceFromNSE(symbol) {
  const baseSymbol = normalizeIndianSymbol(symbol);
  if (!baseSymbol) return null;

  try {
    const response = await NSE_CLIENT.get("https://www.nseindia.com/api/quote-equity", {
      params: { symbol: baseSymbol },
    });

    const info = response.data?.info || {};
    const priceInfo = response.data?.priceInfo || {};
    const latest = priceInfo.lastPrice;
    const prevClose = priceInfo.previousClose;

    if (typeof latest !== "number") return null;

    const change =
      typeof priceInfo.change === "number"
        ? priceInfo.change
        : typeof prevClose === "number"
          ? latest - prevClose
          : 0;

    const changePercent =
      typeof priceInfo.pChange === "number"
        ? priceInfo.pChange
        : typeof prevClose === "number" && prevClose !== 0
          ? (change / prevClose) * 100
          : 0;

    return {
      symbol,
      ticker: `${baseSymbol}.NS`,
      price: latest,
      change,
      changePercent,
      currency: "INR",
      name: info.companyName ?? baseSymbol,
      source: "NSE",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the current price for a single stock symbol.
 * Yahoo Finance appends ".NS" for NSE-listed Indian stocks automatically
 * if the base symbol fails — we try both.
 */
async function getStockPrice(symbol) {
  // Try NSE suffix first for Indian stocks, then raw symbol
  const variants = [symbol, `${symbol}.NS`, `${symbol}.BO`];

  for (const ticker of variants) {
    try {
      const quote = await yahooFinance.quote(ticker);
      if (quote && quote.regularMarketPrice) {
        return {
          symbol,
          ticker,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange ?? 0,
          changePercent: quote.regularMarketChangePercent ?? 0,
          currency: quote.currency ?? "INR",
          name: quote.longName ?? quote.shortName ?? symbol,
        };
      }
    } catch (_) {
      // Try next variant
    }
  }

  // Yahoo can return Unauthorized for some regions/IPs; use NSE fallback for Indian symbols.
  const nseQuote = await getPriceFromNSE(symbol);
  if (nseQuote) return nseQuote;

  // Return a placeholder if all lookups fail (e.g. market closed / bad symbol)
  return {
    symbol,
    ticker: symbol,
    price: null,
    change: 0,
    changePercent: 0,
    currency: "INR",
    name: symbol,
    error: "Price unavailable",
  };
}

/**
 * Fetch prices for multiple symbols in parallel.
 */
async function getMultipleStockPrices(symbols) {
  const results = await Promise.all(symbols.map(getStockPrice));
  return results;
}

module.exports = { getStockPrice, getMultipleStockPrices };
