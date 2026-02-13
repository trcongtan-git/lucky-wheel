const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'tantc02-company-sharing.html'));
});

// Ghép vòng quay + game trứng: chia đôi màn hình trái phải
app.get('/split', (req, res) => {
  res.sendFile(path.join(__dirname, 'split-view.html'));
});

function readStore() {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { players: [], results: [] };
  }
}

function writeStore(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/data', (req, res) => {
  try {
    const data = readStore();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const body = req.body || {};
    const current = readStore();
    const next = {
      players: Array.isArray(body.players) ? body.players : current.players,
      results: Array.isArray(body.results) ? body.results : current.results,
    };
    writeStore(next);
    res.json(next);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`LAN:    http://<your-ip>:${PORT}`);
});
