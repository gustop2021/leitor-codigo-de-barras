const Database = require('better-sqlite3');

const db = new Database('estoque.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0
  )
`);

module.exports = db;