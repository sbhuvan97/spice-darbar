require('dotenv').config();
const express   = require('express');
const http      = require('http');
const path      = require('path');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const { initWebSocket } = require('./middleware/websocket');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 4000;

// WebSocket
initWebSocket(server);

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin:'*', credentials:true }));

// Rate limiting
app.use('/api/orders', rateLimit({ windowMs:60000, max:30 }));
app.use('/api/voice',  rateLimit({ windowMs:60000, max:30 }));
app.use('/api/',       rateLimit({ windowMs:60000, max:200 }));

// Parsing
app.use(express.json({ limit:'100kb' }));
app.use(morgan(process.env.NODE_ENV==='production'?'combined':'dev'));

// ── Serve frontend static files ──────────────────────────────
// The frontend folder is one level up from backend/
app.use(express.static(path.join(__dirname,'..','frontend')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/menu',   require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/waiter', require('./routes/waiter'));
app.use('/api/voice',  require('./routes/voice'));

app.get('/health', (_, res) => res.json({ status:'ok', time:new Date().toISOString() }));

// Serve customer app for any non-API route (SPA fallback)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
    res.sendFile(path.join(__dirname,'..','frontend','customer','index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error:'Internal server error' });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Spice Darbar running on port ${PORT}`);
  console.log(`   Customer app: http://localhost:${PORT}`);
  console.log(`   Kitchen:      http://localhost:${PORT}/kitchen`);
  console.log(`   Health:       http://localhost:${PORT}/health\n`);
});

module.exports = { app, server };
