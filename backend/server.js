const express = require('express');
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
