const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { nanoid } = require('nanoid');
const { stmts } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Auth middleware ---

function requireAdmin(req, res, next) {
  const room = stmts.getRoom.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const token =
    req.query.token ||
    req.cookies[`admin_${room.id}`];

  if (token !== room.admin_token) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Set/refresh cookie so admin doesn't need token in URL anymore
  res.cookie(`admin_${room.id}`, room.admin_token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  req.room = room;
  next();
}

// --- Room routes ---

// Create room
app.post('/api/rooms', (req, res) => {
  const { topic } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const id = nanoid(10);
  const adminToken = nanoid(20);

  stmts.createRoom.run(id, topic.trim(), adminToken);

  res.json({ id, adminToken });
});

// Get room info (public)
app.get('/api/rooms/:roomId', (req, res) => {
  const room = stmts.getRoom.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Public view: topic, status, winner (no token)
  res.json({
    id: room.id,
    topic: room.topic,
    status: room.status,
    winner: room.winner,
  });
});

// Get room info (admin) — also sets the cookie
app.get('/api/rooms/:roomId/admin', requireAdmin, (req, res) => {
  const entries = stmts.getEntries.all(req.room.id);
  res.json({
    id: req.room.id,
    topic: req.room.topic,
    status: req.room.status,
    winner: req.room.winner,
    entries,
  });
});

// Update room status (admin)
app.patch('/api/rooms/:roomId', requireAdmin, (req, res) => {
  const { status, winner } = req.body;

  if (winner !== undefined) {
    stmts.setWinner.run(winner, req.room.id);
  } else if (status) {
    stmts.updateRoomStatus.run(status, req.room.id);
  }

  const updated = stmts.getRoom.get(req.room.id);
  res.json({
    id: updated.id,
    topic: updated.topic,
    status: updated.status,
    winner: updated.winner,
  });
});

// --- Entry routes ---

// Add entry (participant)
app.post('/api/rooms/:roomId/entries', (req, res) => {
  const room = stmts.getRoom.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status !== 'open') {
    return res.status(400).json({ error: 'Room is closed for new entries' });
  }

  const { author, value } = req.body;
  if (!author || !author.trim() || !value || !value.trim()) {
    return res.status(400).json({ error: 'Author and value are required' });
  }

  const result = stmts.addEntry.run(room.id, author.trim(), value.trim());
  res.json({ id: result.lastInsertRowid, author: author.trim(), value: value.trim() });
});

// Get approved entries (public — for result page)
app.get('/api/rooms/:roomId/entries', (req, res) => {
  const room = stmts.getRoom.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const entries = stmts.getApprovedEntries.all(room.id);
  res.json(entries);
});

// Moderate entry (admin)
app.patch('/api/rooms/:roomId/entries/:entryId', requireAdmin, (req, res) => {
  const { approved } = req.body;
  stmts.updateEntryApproval.run(approved ? 1 : 0, req.params.entryId, req.room.id);
  res.json({ ok: true });
});

// Delete entry (admin)
app.delete('/api/rooms/:roomId/entries/:entryId', requireAdmin, (req, res) => {
  stmts.deleteEntry.run(req.params.entryId, req.room.id);
  res.json({ ok: true });
});

// --- SPA fallback: serve HTML pages for room URLs ---

app.get('/room/:roomId/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/room/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'room.html'));
});

app.listen(PORT, () => {
  console.log(`Pickerwheel server running on http://localhost:${PORT}`);
});
