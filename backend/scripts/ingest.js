require('dotenv').config();
const fs = require('fs');
const path = require('path');
const store = require('../data/store');
const { ingestHotelKnowledge } = require('../services/rag');

async function run() {
  const { db } = store;
  const hotel = db.hotels[0];
  if (!hotel) {
    console.error('[ingest] No hotel found in backend/data/db.json. Start the server once first to seed it.');
    process.exit(1);
  }

  const filePath = path.join(__dirname, '..', 'data', 'hotel_knowledge.txt');
  const rawText = fs.readFileSync(filePath, 'utf-8');

  console.log(`[ingest] Chunking & embedding hotel knowledge for ${hotel.name} via Gemini...`);
  try {
    const count = await ingestHotelKnowledge(hotel.id, rawText, 'AROHAK_Hotel_Information_For_RAG.pdf');
    console.log(`[ingest] Done. Stored ${count} knowledge chunks for hotelId=${hotel.id}`);
  } catch (err) {
    console.error('[ingest] Failed:', err.message);
    process.exit(1);
  }
}

run();
