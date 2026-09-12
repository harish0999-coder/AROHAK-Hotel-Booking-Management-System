const express = require('express');
const fs = require('fs');
const path = require('path');
const store = require('../data/store');
const { authenticate, authorize } = require('../middleware/auth');
const { retrieveRelevantChunks, ingestHotelKnowledge } = require('../services/rag');
const { generateContent, extractText } = require('../services/gemini');

const router = express.Router();

const SYSTEM_INSTRUCTION = `You are a hotel information assistant. Answer the guest's question STRICTLY using
the provided CONTEXT, which was retrieved from the hotel's official information document.
- Do not invent policies, prices, amenities, or timings that are not present in the CONTEXT.
- If the CONTEXT does not contain the answer, reply exactly: "That information isn't available in the hotel's
  provided document. Please contact the hotel directly for details." Do not guess.
- Keep answers short and directly address the question.
- When helpful, mention which section of the hotel document the answer came from.`;

// POST /api/rag/hotel-info  (public - anonymous visitors can ask too)
// body: { hotelId: string, question: string }
router.post('/hotel-info', async (req, res, next) => {
  try {
    const { hotelId, question } = req.body || {};
    if (!question) return res.status(400).json({ message: 'question is required.' });
    if (!hotelId) return res.status(400).json({ message: 'hotelId is required.' });

    const { db } = store;
    const hotel = db.hotels.find((h) => h.id === hotelId);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });

    const topChunks = await retrieveRelevantChunks(hotelId, question, 4);

    if (topChunks.length === 0) {
      return res.json({
        answer: "This hotel's knowledge base hasn't been ingested yet. Run `npm run ingest` in the backend first.",
        sources: []
      });
    }

    const contextText = topChunks
      .map((r, i) => `[${i + 1}] (${r.chunk.sectionTitle}) ${r.chunk.content}`)
      .join('\n\n');

    const prompt = `CONTEXT:\n${contextText}\n\nQUESTION: ${question}\n\nAnswer using only the CONTEXT above.`;

    const response = await generateContent([{ role: 'user', parts: [{ text: prompt }] }], {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1
    });

    const answer = extractText(response) || "That information isn't available in the hotel's provided document.";

    res.json({
      answer,
      sources: topChunks.map((r) => ({ section: r.chunk.sectionTitle, relevance: Number(r.score.toFixed(3)) }))
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/rag/ingest/:hotelId  (Admin only - re-run ingestion of hotel_knowledge.txt)
router.post('/ingest/:hotelId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { db } = store;
    const hotel = db.hotels.find((h) => h.id === req.params.hotelId);
    if (!hotel) return res.status(404).json({ message: 'Hotel not found.' });

    const filePath = path.join(__dirname, '..', 'data', 'hotel_knowledge.txt');
    const rawText = fs.readFileSync(filePath, 'utf-8');
    const count = await ingestHotelKnowledge(hotel.id, rawText, 'AROHAK_Hotel_Information_For_RAG.pdf');

    res.json({ message: `Ingested ${count} knowledge chunks for ${hotel.name}.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
