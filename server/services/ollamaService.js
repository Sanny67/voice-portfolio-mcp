const axios = require("axios");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

async function chatWithOllama(messages) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
      model: OLLAMA_MODEL,
      messages,
      stream: false,
    });

    return response.data?.message?.content ?? "";
  } catch (error) {
    const reason = error.response?.data || error.message;
    console.error("Ollama error:", reason);
    throw new Error(typeof reason === "string" ? reason : JSON.stringify(reason));
  }
}

module.exports = { chatWithOllama };
