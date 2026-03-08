// server.js
// MCP agent loop — runs the local Ollama model with tool orchestration.

const { TOOLS, executeTool } = require("./tools");
const { chatWithOllama } = require("../services/ollamaService");

const TOOL_NAMES = TOOLS.map((t) => t.function.name);

const TOOL_GUIDE = TOOLS.map(
  (t) => `- ${t.function.name}: ${t.function.description}`
).join("\n");

const SYSTEM_PROMPT = `You are a helpful AI financial assistant that analyzes stock portfolios.
You have access to tools that can fetch live market data and analyze portfolio metrics.
Always use the appropriate tools to get accurate, real-time data before answering.
Be concise, friendly, and provide actionable insights.
Format currency values clearly (e.g., ₹1,23,456).

Available tools:
${TOOL_GUIDE}

When a tool is needed, respond with ONLY valid JSON in this exact shape:
{"tool":"tool_name","arguments":{}}

Rules:
- Use one tool per turn.
- Do not include markdown fences around JSON.
- After receiving a TOOL_RESULT message, either request another tool with JSON or provide the final plain-text answer.`;

function parseToolCall(content) {
  if (!content || typeof content !== "string") return null;

  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  function extractBalancedObject(str, start) {
    if (start < 0 || start >= str.length || str[start] !== "{") return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < str.length; i++) {
      const ch = str[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) return str.slice(start, i + 1);
      }
    }

    return null;
  }

  function normalizeParsedTool(parsed) {
    if (!parsed || typeof parsed !== "object") return null;

    const tool = parsed.tool || parsed.name || parsed.function?.name;
    if (!tool || !TOOL_NAMES.includes(tool)) return null;

    let args = parsed.arguments ?? parsed.args ?? parsed.function?.arguments ?? {};
    if (typeof args === "string") {
      try {
        args = JSON.parse(args);
      } catch {
        args = {};
      }
    }

    return {
      tool,
      arguments: args && typeof args === "object" ? args : {},
    };
  }

  // First try: content is directly a JSON payload.
  try {
    return normalizeParsedTool(JSON.parse(trimmed));
  } catch {
    // continue to mixed-text extraction
  }

  // Second try: extract a balanced JSON object around a "tool" key.
  const toolKeyIndex = trimmed.search(/"tool"|"name"|"function"/i);
  if (toolKeyIndex !== -1) {
    const start = trimmed.lastIndexOf("{", toolKeyIndex);
    if (start !== -1) {
      const candidate = extractBalancedObject(trimmed, start);
      if (candidate) {
        try {
          return normalizeParsedTool(JSON.parse(candidate));
        } catch {
          // continue to lenient fallback
        }
      }
    }
  }

  // Third try (lenient): parse tool + args from loose key/value formatting.
  const toolMatch = trimmed.match(/["']?tool["']?\s*:\s*["']([A-Za-z0-9_]+)["']/i);
  if (!toolMatch) return null;

  const tool = toolMatch[1];
  if (!TOOL_NAMES.includes(tool)) return null;

  let argumentsObject = {};
  const argsKeyMatch = trimmed.match(/["']?(arguments|args)["']?\s*:/i);
  if (argsKeyMatch && typeof argsKeyMatch.index === "number") {
    const fromArgs = trimmed.slice(argsKeyMatch.index + argsKeyMatch[0].length);
    const objStartInSlice = fromArgs.indexOf("{");
    if (objStartInSlice !== -1) {
      const argsCandidate = extractBalancedObject(fromArgs, objStartInSlice);
      if (argsCandidate) {
        try {
          const parsedArgs = JSON.parse(argsCandidate);
          if (parsedArgs && typeof parsedArgs === "object") {
            argumentsObject = parsedArgs;
          }
        } catch {
          // Keep default {}
        }
      }
    }
  }

  return { tool, arguments: argumentsObject };

}

/**
 * Run the agent loop:
 * 1. Send user message + conversation history to the LLM
 * 2. If the model calls a tool, execute it and feed result back
 * 3. Repeat until the model returns a plain text response
 */
async function runAgent(userMessage, history = []) {
  const cleanedHistory = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .filter((m) => {
      if (m.role !== "assistant") return true;
      if (parseToolCall(m.content)) return false;
      if (/TOOL_RESULT/i.test(m.content)) return false;
      return !(/"tool"\s*:|"arguments"\s*:/i.test(m.content));
    });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...cleanedHistory,
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 6; // prevent infinite loops

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const assistantContent = await chatWithOllama(messages);
    messages.push({ role: "assistant", content: assistantContent });

    const toolCall = parseToolCall(assistantContent);
    if (!toolCall) {
      // If model is trying to request a tool but format is wrong, repair in-loop.
      if (/tool|arguments|json|get_\w+/i.test(assistantContent)) {
        messages.push({
          role: "user",
          content:
            'Your previous response was not valid tool-call JSON. If you need a tool, respond with ONLY JSON like {"tool":"get_portfolio_holdings","arguments":{}}. Otherwise provide a final plain-text answer.',
        });
        continue;
      }

      return assistantContent;
    }

    const result = await executeTool(toolCall.tool, toolCall.arguments);
    messages.push({
      role: "user",
      content: `TOOL_RESULT ${toolCall.tool}: ${JSON.stringify(result)}`,
    });
  }

  return "I wasn't able to complete the analysis. Please try again.";
}

module.exports = { runAgent };
