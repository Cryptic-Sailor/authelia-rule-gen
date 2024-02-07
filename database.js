const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./autheliaFields.db');

db.serialize(() => {
  // Create table for saving fields
  db.run(`CREATE TABLE IF NOT EXISTS fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fieldName TEXT,
    fieldValue TEXT
  )`);
});

module.exports = db;
