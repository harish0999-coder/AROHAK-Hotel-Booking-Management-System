const knowledgeStore = require('../data/knowledgeStore');
const { embedText } = require('./gemini');

/**
 * Splits the raw hotel-knowledge text into sections using the
 * "[SECTION: ...]" markers in backend/data/hotel_knowledge.txt.
 */
function chunkBySections(rawText) {
  const blocks = rawText.split(/\[SECTION:\s*(.+?)\]/g).filter((b) => b.trim().length > 0);
  const chunks = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const title = blocks[i] && blocks[i].trim();
    const content = blocks[i + 1] && blocks[i + 1].trim();
    if (title && content) chunks.push({ sectionTitle: title, content });
  }
  return chunks;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ingests hotel knowledge text for a hotel, replacing any previous chunks for
 * that hotel. Embeddings are generated one chunk at a time via Gemini.
 */
async function ingestHotelKnowledge(hotelId, rawText, sourceDocument) {
  const { db, save } = knowledgeStore;
  db.chunks = db.chunks.filter((c) => c.hotelId !== hotelId);

  const sections = chunkBySections(rawText);
  for (const section of sections) {
    const embedding = await embedText(`${section.sectionTitle}\n${section.content}`);
    db.chunks.push({
      hotelId,
      sectionTitle: section.sectionTitle,
      content: section.content,
      embedding,
      sourceDocument
    });
  }
  save();
  return sections.length;
}

/**
 * Retrieves the top-K most relevant chunks for a hotel given a query string.
 */
async function retrieveRelevantChunks(hotelId, query, topK = 4) {
  const { db } = knowledgeStore;
  const hotelChunks = db.chunks.filter((c) => c.hotelId === hotelId);
  if (hotelChunks.length === 0) return [];

  const queryEmbedding = await embedText(query);
  const scored = hotelChunks.map((c) => ({ chunk: c, score: cosineSimilarity(queryEmbedding, c.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

module.exports = { chunkBySections, cosineSimilarity, ingestHotelKnowledge, retrieveRelevantChunks };
