// Thin wrapper around Google's Gemini REST API (Node 18+ native fetch, no extra deps).
// Docs: https://ai.google.dev/gemini-api/docs
// Requires GEMINI_API_KEY in .env (create one at https://aistudio.google.com/apikey)
//
// Model names change fairly often on Google's side. If you see a 404 error
// mentioning a model is "no longer available", the error message itself
// usually names the replacement — just update GEMINI_CHAT_MODEL /
// GEMINI_EMBED_MODEL in your .env to match.

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function requireKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    const err = new Error(
      'GEMINI_API_KEY is not configured. Add it to backend/.env to enable the AI chatbot features.'
    );
    err.statusCode = 500;
    throw err;
  }
  return key;
}

/**
 * Calls Gemini generateContent with optional function-calling tools.
 * @param {Array} contents - Gemini "contents" array: [{ role: "user"|"model", parts: [...] }]
 *   Note: function/tool results are sent back with role "user" too — Gemini's
 *   current API does not accept a "function" role on this endpoint.
 * @param {Object} [options]
 * @param {Array} [options.tools] - Gemini tool/function declarations
 * @param {String} [options.systemInstruction]
 * @param {String} [options.model]
 */
async function generateContent(contents, options = {}) {
  const key = requireKey();
  const model = options.model || process.env.GEMINI_CHAT_MODEL || 'gemini-3.6-flash';
  const url = `${API_BASE}/models/${model}:generateContent?key=${key}`;

  const body = {
    contents,
    ...(options.systemInstruction && {
      systemInstruction: { role: 'system', parts: [{ text: options.systemInstruction }] }
    }),
    ...(options.tools && { tools: options.tools }),
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 1024
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Gemini API error (${res.status}): ${text}`);
    err.statusCode = 502;
    throw err;
  }

  return res.json();
}

function extractParts(geminiResponse) {
  return geminiResponse?.candidates?.[0]?.content?.parts || [];
}

function extractText(geminiResponse) {
  return extractParts(geminiResponse)
    .filter((p) => typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n')
    .trim();
}

function extractFunctionCalls(geminiResponse) {
  return extractParts(geminiResponse)
    .filter((p) => p.functionCall)
    .map((p) => p.functionCall);
}

/**
 * Generates an embedding vector for a piece of text, used by the RAG pipeline.
 */
async function embedText(text) {
  const key = requireKey();
  const model = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
  const url = `${API_BASE}/models/${model}:embedContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini embedding error (${res.status}): ${errText}`);
    err.statusCode = 502;
    throw err;
  }

  const data = await res.json();
  return data.embedding.values; // array of floats
}

module.exports = { generateContent, extractText, extractFunctionCalls, embedText };
