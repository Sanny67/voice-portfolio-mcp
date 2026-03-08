"use client";

// page.tsx
// Main page: portfolio upload + AI chat interface

import { useState, useRef } from "react";
import Chat from "../components/Chat";

const API_BASE = "http://localhost:3001";

interface Holding {
  symbol: string;
  quantity: number;
  avg_price: number;
}

export default function Home() {
  const [portfolio, setPortfolio] = useState<Holding[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("portfolio", file);

    try {
      const res = await fetch(`${API_BASE}/upload-portfolio`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setPortfolio(data.holdings);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-lg">
            📊
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">
              AI Voice Portfolio Analyzer
            </h1>
            <p className="text-xs text-slate-400">Powered by MCP + Ollama</p>
          </div>
        </div>

        {/* Upload section */}
        <div className="flex items-center gap-3">
          {portfolio && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1">
              ✓ {portfolio.length} holdings loaded
            </span>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
            id="portfolio-upload"
          />
          <label
            htmlFor="portfolio-upload"
            className={`
              cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${uploading
                ? "bg-slate-700 text-slate-400 cursor-wait"
                : portfolio
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }
            `}
          >
            {uploading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {portfolio ? "Re-upload Portfolio" : "Upload Portfolio"}
              </>
            )}
          </label>
        </div>
      </header>

      {uploadError && (
        <div className="mx-6 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          ⚠️ {uploadError}
        </div>
      )}

      {/* ── Portfolio summary strip ──────────────────────────────── */}
      {portfolio && (
        <div className="px-6 py-3 border-b border-slate-700 flex gap-4 overflow-x-auto">
          {portfolio.map((h) => (
            <div
              key={h.symbol}
              className="flex-shrink-0 bg-slate-800 rounded-lg px-4 py-2 border border-slate-700"
            >
              <p className="text-xs font-semibold text-indigo-400">{h.symbol}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {h.quantity} × ₹{h.avg_price.toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Chat ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        {/* No portfolio uploaded state */}
        {!portfolio && !uploading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">📁</div>
            <h2 className="text-lg font-semibold text-white mb-2">No Portfolio Loaded</h2>
            <p className="text-sm text-slate-400 max-w-xs mb-6">
              Upload a JSON file with your stock holdings to get started. You can use the example file in{" "}
              <code className="text-indigo-400">data/portfolio.example.json</code>.
            </p>
            <label
              htmlFor="portfolio-upload"
              className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors"
            >
              Upload Portfolio JSON
            </label>
            <p className="text-xs text-slate-500 mt-4">
              Format: <code>[{"{ symbol, quantity, avg_price }"}]</code>
            </p>
          </div>
        )}

        {/* Chat interface */}
        {(portfolio || uploading) && (
          <div className="h-full">
            <Chat portfolioLoaded={!!portfolio} />
          </div>
        )}
      </main>
    </div>
  );
}
