// A lightweight Node.js server that serves the front‑end static files
// and provides API endpoints to persist settings in a JSON file.  This
// version does not depend on external libraries like Express, making
// it suitable for environments where you cannot install packages.

const http = require('http');
const fs = require('fs');
const path = require('path');

// Directory containing the settings JSON file
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Directory from which to serve static files (your front‑end).  The
// extracted archive has a top‑level "frontend" folder containing
// index.html and a nested "frontend" directory with assets.  We
// serve the top‑level directory so that requests like /index.html
// and /pages/settings.html resolve correctly.
const STATIC_DIR = path.join(__dirname, '..', 'frontend');

// Ensure the data directory and settings file exist
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    const initialData = {
      profile: {},
      account: {},
      preferences: {},
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { profile: {}, account: {}, preferences: {} };
  }
}

function writeSettings(settings) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// Determine content type from file extension
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    case '.json':
      return 'application/json';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

// Serve a static file from the front‑end directory
function serveStatic(req, res) {
  // Remove query parameters and decode URI components
  let filePath = decodeURIComponent(req.url.split('?')[0]);
  if (filePath === '/' || filePath === '') {
    filePath = '/index.html';
  }
  // remove any leading slash before joining so path.join does not
  // override STATIC_DIR when filePath is absolute
  const safePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  const fullPath = path.join(STATIC_DIR, safePath);
  fs.stat(fullPath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    let finalPath = fullPath;
    if (stats.isDirectory()) {
      finalPath = path.join(fullPath, 'index.html');
    }
    fs.readFile(finalPath, (err2, data) => {
      if (err2) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': getContentType(finalPath) });
      res.end(data);
    });
  });
}

// Handle API request for settings
function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean); // remove empty strings
  // Expecting /api/settings/{section}
  if (parts.length !== 3 || parts[0] !== 'api' || parts[1] !== 'settings') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid API endpoint' }));
    return;
  }
  const section = parts[2];
  const settings = readSettings();
  if (!settings.hasOwnProperty(section)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Unknown settings section: ${section}` }));
    return;
  }
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(settings[section] || {}));
    return;
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body || '{}');
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      // Merge new data into existing section
      settings[section] = Object.assign({}, settings[section], data);
      writeSettings(settings);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `${section} updated successfully.` }));
    });
    return;
  }
  // Unsupported method
  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

// Main HTTP server
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/settings/')) {
    handleApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

// Start the server
ensureDataFile();
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});