const express = require('express');
<<<<<<< HEAD
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'users.json');
const messagesPath = path.join(__dirname, 'messages.json');

// Helper to initialize and read DB
async function readDB() {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, create it with empty array
      await fs.writeFile(dbPath, '[]');
      return [];
    }
    throw err;
  }
}

// Helper to write DB
async function writeDB(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

// Helpers for messages
async function readMessages() {
  try {
    const data = await fs.readFile(messagesPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(messagesPath, '[]');
      return [];
    }
    throw err;
  }
}

async function writeMessages(data) {
  await fs.writeFile(messagesPath, JSON.stringify(data, null, 2));
}

// Signup Route
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const users = await readDB();
    
    // Check if user already exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Auto-increment ID
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

    const newUser = { id: newId, name, email, password: hashedPassword };
    users.push(newUser);
    await writeDB(users);

    res.status(201).json({ message: 'User created successfully', userId: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const users = await readDB();
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- MESSAGING ENDPOINTS ---

// Simple auth middleware
async function requireAuthHeader(req, res, next) {
  const email = req.headers['x-user-email'];
  if (!email) return res.status(401).json({ error: 'Unauthorized' });
  const users = await readDB();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

// Get all threads for the logged-in user
app.get('/api/messages', requireAuthHeader, async (req, res) => {
  try {
    const messages = await readMessages();
    const myMessages = messages.filter(m => m.fromUserId === req.user.id || m.toUserId === req.user.id);
    
    // Group by conversation partner
    const threadsMap = {};
    for (const msg of myMessages) {
      const otherId = msg.fromUserId === req.user.id ? msg.toUserId : msg.fromUserId;
      if (!threadsMap[otherId] || new Date(msg.timestamp) > new Date(threadsMap[otherId].timestamp)) {
        threadsMap[otherId] = msg;
      }
    }
    
    const users = await readDB();
    const threads = Object.keys(threadsMap).map(otherId => {
      const otherUser = users.find(u => u.id === parseInt(otherId));
      return {
        otherUser: otherUser ? { id: otherUser.id, name: otherUser.name } : { id: otherId, name: 'Unknown' },
        latestMessage: threadsMap[otherId]
      };
    });
    
    // Sort by latest message
    threads.sort((a, b) => new Date(b.latestMessage.timestamp) - new Date(a.latestMessage.timestamp));
    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages for a specific conversation
app.get('/api/messages/:otherId', requireAuthHeader, async (req, res) => {
  try {
    const otherId = parseInt(req.params.otherId);
    const messages = await readMessages();
    const convo = messages.filter(m => 
      (m.fromUserId === req.user.id && m.toUserId === otherId) || 
      (m.fromUserId === otherId && m.toUserId === req.user.id)
    );
    
    const users = await readDB();
    const otherUser = users.find(u => u.id === otherId) || { id: otherId, name: 'Unknown User' };

    res.json({ otherUser: { id: otherUser.id, name: otherUser.name }, messages: convo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send a message
app.post('/api/messages', requireAuthHeader, async (req, res) => {
  try {
    const { toUserId, text, listingId, listingTitle } = req.body;
    if (!toUserId || !text) return res.status(400).json({ error: 'Missing toUserId or text' });

    const messages = await readMessages();
    const newId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;
    
    const newMessage = {
      id: newId,
      fromUserId: req.user.id,
      toUserId: parseInt(toUserId),
      text,
      timestamp: new Date().toISOString(),
      listingId: listingId || null,
      listingTitle: listingTitle || null
    };
    
    messages.push(newMessage);
    await writeMessages(messages);
    
    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start checking DB and listen
Promise.all([readDB(), readMessages()]).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
});
=======
const fs = require('fs');
const path = require('path');

// Create an Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

/*
 * Path to the JSON file where settings are stored.  The directory
 * `data` is created on first write if it does not already exist.  You
 * can adjust this path if you want to store user data somewhere else.
 */
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

/**
 * Ensure the data directory exists.  If it doesn't, create it.  If the
 * settings file does not exist, seed it with empty sections for
 * "profile", "account", and "preferences".  This helper runs once
 * when the server starts.
 */
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

/**
 * Read the entire settings JSON file.  If the file is missing or
 * malformed, return an object with empty sections.  Synchronous reads
 * simplify error handling for a lightweight API; in a larger project
 * you may wish to use asynchronous versions instead.
 */
function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // If anything goes wrong, return an empty structure
    return {
      profile: {},
      account: {},
      preferences: {},
    };
  }
}

/**
 * Write the provided settings object to disk.  Creates the data
 * directory if needed.  Synchronous writes are used here for
 * simplicity; in production you may choose to use asynchronous
 * versions and proper error handling.
 */
function writeSettings(settings) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * GET /api/settings/:section
 *
 * Returns a JSON object representing the requested settings section.
 *
 * For example:
 *   GET /api/settings/profile
 *   -> { "displayName": "John", "university": "UoS", ... }
 *
 * If the section does not exist, the server responds with a 404.
 */
app.get('/api/settings/:section', (req, res) => {
  const { section } = req.params;
  const settings = readSettings();

  if (!settings.hasOwnProperty(section)) {
    return res.status(404).json({ error: `Unknown settings section: ${section}` });
  }
  res.json(settings[section]);
});

/**
 * POST /api/settings/:section
 *
 * Update a particular settings section with the provided JSON body.  The
 * body should be a JSON object containing the keys relevant to the
 * section.  The server merges this data into the existing settings and
 * persists it to disk.
 *
 * Example request body for the profile section:
 * {
 *   "displayName": "Jane Doe",
 *   "university": "University of Sharjah",
 *   "major": "Computer Science",
 *   "bio": "I love books"
 * }
 */
app.post('/api/settings/:section', (req, res) => {
  const { section } = req.params;
  const newData = req.body;
  const settings = readSettings();

  if (!settings.hasOwnProperty(section)) {
    return res.status(404).json({ error: `Unknown settings section: ${section}` });
  }
  if (typeof newData !== 'object' || Array.isArray(newData)) {
    return res.status(400).json({ error: 'Request body must be a JSON object' });
  }

  // Merge new data into existing section
  settings[section] = { ...settings[section], ...newData };
  writeSettings(settings);
  res.json({ message: `${section} settings updated successfully.` });
});

// Initialise the data file when the server starts
ensureDataFile();

// Start listening for incoming requests
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
>>>>>>> zeshaan_backend
