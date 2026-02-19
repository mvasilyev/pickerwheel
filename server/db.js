const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'pickerwheel.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    admin_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    winner TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    author_name TEXT NOT NULL,
    value TEXT NOT NULL,
    approved INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const stmts = {
  createRoom: db.prepare(
    'INSERT INTO rooms (id, topic, admin_token) VALUES (?, ?, ?)'
  ),
  getRoom: db.prepare('SELECT * FROM rooms WHERE id = ?'),
  updateRoomStatus: db.prepare(
    'UPDATE rooms SET status = ? WHERE id = ?'
  ),
  setWinner: db.prepare(
    'UPDATE rooms SET status = \'finished\', winner = ? WHERE id = ?'
  ),

  addEntry: db.prepare(
    'INSERT INTO entries (room_id, author_name, value) VALUES (?, ?, ?)'
  ),
  getEntries: db.prepare(
    'SELECT * FROM entries WHERE room_id = ? ORDER BY created_at'
  ),
  getApprovedEntries: db.prepare(
    'SELECT * FROM entries WHERE room_id = ? AND approved = 1 ORDER BY created_at'
  ),
  updateEntryApproval: db.prepare(
    'UPDATE entries SET approved = ? WHERE id = ? AND room_id = ?'
  ),
  deleteEntry: db.prepare(
    'DELETE FROM entries WHERE id = ? AND room_id = ?'
  ),
};

module.exports = { db, stmts };
