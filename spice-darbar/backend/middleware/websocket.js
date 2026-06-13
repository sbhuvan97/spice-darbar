const WebSocket = require('ws');

let wss = null;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const params = new URL(req.url, 'http://x').searchParams;
    ws.clientType = params.get('type') || 'unknown';
    ws.isAlive = true;
    clients.add(ws);

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  // Keep-alive ping every 25s
  const hb = setInterval(() => {
    clients.forEach(ws => {
      if (!ws.isAlive) { clients.delete(ws); return ws.terminate(); }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25000);

  wss.on('close', () => clearInterval(hb));
}

function broadcast(event, payload, target = null) {
  const msg = JSON.stringify({ event, payload, ts: Date.now() });
  clients.forEach(ws => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (target && ws.clientType !== target) return;
    try { ws.send(msg); } catch (_) {}
  });
}

module.exports = { initWebSocket, broadcast };
