// A small sibling store to data/store.js, kept separate so it doesn't require
// any migration of an existing db.json. Holds hotel-knowledge chunks and their
// embedding vectors for the RAG chatbot.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'knowledge.json');

function load() {
  if (!fs.existsSync(FILE)) {
    const initial = { chunks: [] };
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  } catch {
    const initial = { chunks: [] };
    fs.writeFileSync(FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

let db = load();

function save() {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

module.exports = {
  get db() {
    return db;
  },
  save,
  reload() {
    db = load();
    return db;
  }
};
