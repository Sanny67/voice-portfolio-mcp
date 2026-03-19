"use client";

// Chat.tsx
// Main chat UI: handles message history, text input, voice input, and AI calls.

import { useState, useRef, useEffect } from "react";
import { VoiceInput, speak } from "./VoiceInput";

const API_BASE = "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What is my portfolio value?",
  "Which stock is performing best?",
  "Is my portfolio too risky?",
  "Which sector am I most exposed to?",
];

export default function Chat({ portfolioLoaded }: { portfolioLoaded: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI portfolio analyst. Upload your portfolio and ask me anything — by text or voice! 🎙️",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message and typing indicator.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // Build backend conversation history (excluding the system welcome message)
      const history = updatedMessages.slice(1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
      });

      const data = await res.json();
      const reply = data.response ?? data.error ?? "Something went wrong.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Read response aloud if voice mode is on
      if (voiceEnabled) speak(reply);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Could not reach the server. Is it running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Message list ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold mr-2 mt-1 flex-shrink-0">
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-slate-700 text-slate-100 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
              AI
            </div>
            <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 text-slate-200">
              <div className="text-xs text-slate-300 mb-2">AI is typing</div>
              <span className="flex gap-1 items-center h-2">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggested questions ───────────────────────────────────── */}
      {portfolioLoaded && messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full px-3 py-1 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Input row ─────────────────────────────────────────────── */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-2">
          {/* Voice toggle */}
          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            title={voiceEnabled ? "Disable voice output" : "Enable voice output"}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
              voiceEnabled
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
            }`}
          >
            🔊
          </button>

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={portfolioLoaded ? "Ask about your portfolio…" : "Upload a portfolio first…"}
            disabled={loading || !portfolioLoaded}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />

          {/* Voice input button */}
          <VoiceInput
            onTranscript={(t) => sendMessage(t)}
            disabled={loading || !portfolioLoaded}
          />

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim() || !portfolioLoaded}
            className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
