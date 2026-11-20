const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static('public'));
app.get('/healthz', (_, res) => res.send('ok'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const TAG_DIST = 0.3;     // meters between any "it" point and any target point
const IMMUNE_MS = 3000;   // old "it" can't be re-tagged right away
const TICK_MS = 50;       // 20 Hz

const rooms = new Map();  // code -> { players: Map, sockets: Map }
let nextId = 1;

const pts = p => [p.h, p.l, p.r];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const vec = v => (Array.isArray(v) && v.length === 3 && v.every(Number.isFinite) ? v : null);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  const code = (url.searchParams.get('room') || 'lobby')
    .toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'lobby';
  if (!rooms.has(code)) rooms.set(code, { players: new Map(), sockets: new Map() });
  const room = rooms.get(code);

  const id = nextId++;
  const p = { id, h: [0, 1.6, 0], l: [0, 1, 0], r: [0, 1, 0], it: false, immune: 0, ready: false };
  room.players.set(id, p);
  room.sockets.set(id, ws);
  ws.send(JSON.stringify({ t: 'hi', id, room: code }));

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t !== 'p') return;
    const h = vec(m.h), l = vec(m.l), r = vec(m.r);
    if (h && l && r) { p.h = h; p.l = l; p.r = r; p.ready = !!m.c; }
  });
  ws.on('close', () => {
    room.players.delete(id);
    room.sockets.delete(id);
    if (!room.players.size) rooms.delete(code);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const list = [...room.players.values()];
    if (list.length < 2) list.forEach(p => (p.it = false));
    else if (!list.some(p => p.it)) list[Math.floor(Math.random() * list.length)].it = true;

    for (const s of list.filter(p => p.it && p.ready)) {
      for (const t of list) {
        if (t.it || !t.ready || t.immune > now) continue;
        if (pts(s).some(a => pts(t).some(b => dist(a, b) < TAG_DIST))) {
          t.it = true; s.it = false; s.immune = now + IMMUNE_MS;
          room.sockets.get(t.id)?.send(JSON.stringify({ t: 'tagged' }));
          break;
        }
      }
    }

    const msg = JSON.stringify({
      t: 's',
      p: list.map(p => ({ id: p.id, h: p.h, l: p.l, r: p.r, it: p.it, imm: p.immune > now, c: p.ready }))
    });
    for (const ws of room.sockets.values()) if (ws.readyState === 1) ws.send(msg);
  }
}, TICK_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('listening on ' + PORT));
