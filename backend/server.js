// ── server.js ────────────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Main backend server file for the Reshelf web application.
//   Runs using Node.js with Express and handles all API requests.
//
// WHAT IT DOES:
//   Manages backend logic for the entire application including
//   authentication, listings, user profiles, interests, and messaging.
//   It also reads and writes application data using JSON files as storage.
//
// MAIN FEATURES HANDLED IN THIS FILE:
//   Authentication  — Signup, login, password reset
//   Listings        — Create, browse, update, delete listings
//   Profile         — View and update user profiles
//   Interests       — Save and remove interested listings
//   Messaging       — Inbox, conversations, sending messages
//
// HOW THE BACKEND WORKS:
//   1. Frontend sends API requests to routes inside this server
//   2. Express processes the request and validates data
//   3. JSON files act as a lightweight database for storing data
//   4. Server returns JSON responses back to frontend
//   5. Frontend updates the UI using the received data
// ─────────────────────────────────────────────────────────────────────────────



const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const dbPath        = path.join(__dirname, 'users.json');
const messagesPath  = path.join(__dirname, 'messages.json');
const listingsPath  = path.join(__dirname, 'listings.json');
const interestsPath = path.join(__dirname, 'interests.json');

// ── Generic JSON file helpers ────────────────────────────────
async function readJSON(filePath, defaultVal = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.writeFile(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    throw err;
  }
}
async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

const readDB        = () => readJSON(dbPath, []);
const writeDB       = d  => writeJSON(dbPath, d);
const readMessages  = () => readJSON(messagesPath, []);
const writeMessages = d  => writeJSON(messagesPath, d);
const readListings  = () => readJSON(listingsPath, []);
const writeListings = d  => writeJSON(listingsPath, d);
const readInterests = () => readJSON(interestsPath, []);
const writeInterests = d => writeJSON(interestsPath, d);

// ── Auth middleware ──────────────────────────────────────────
async function requireAuth(req, res, next) {
  const email = req.headers['x-user-email'];
  if (!email) return res.status(401).json({ error: 'Unauthorized' });
  const users = await readDB();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

// ── Auth: Signup ─────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const users = await readDB();
    if (users.find(u => u.email === email))
      return res.status(400).json({ error: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: newId, name, email, password: hashedPassword,
      university: '', location: '', bio: '',
      joined: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    };
    users.push(newUser);
    await writeDB(users);
    res.status(201).json({ message: 'User created successfully', userId: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Auth: Login ──────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const users = await readDB();
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Auth: Reset password (dummy project — no token/email verification) ──────
// Looks the user up by email and overwrites their password directly.
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res.status(400).json({ error: 'Email and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });

  try {
    const users = await readDB();
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) return res.status(404).json({ error: 'No account found with that email' });

    users[idx].password = await bcrypt.hash(newPassword, 10);
    await writeDB(users);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Listings: Browse / Search ────────────────────────────────
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await readListings();
    const { q, uni, subject, type } = req.query;

    let results = listings.filter(l => l.status === 'active');

    if (q) {
      const query = q.toLowerCase();
      results = results.filter(l =>
        l.title.toLowerCase().includes(query) ||
        (l.author || '').toLowerCase().includes(query) ||
        (l.isbn || '').includes(query)
      );
    }
    if (uni)     results = results.filter(l => l.university === uni);
    if (subject) results = results.filter(l => l.subject === subject);
    if (type)    results = results.filter(l => l.type === type);

    // Attach seller name
    const users = await readDB();
    results = results.map(l => {
      const seller = users.find(u => u.id === l.sellerId);
      return { ...l, sellerName: seller ? seller.name : 'Unknown' };
    });

    // Newest first
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Listings: Get single listing ─────────────────────────────
app.get('/api/listings/:id', async (req, res) => {
  try {
    const listings = await readListings();
    const listing = listings.find(l => l.id === parseInt(req.params.id));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const users = await readDB();
    const seller = users.find(u => u.id === listing.sellerId);
    res.json({
      ...listing,
      sellerName: seller ? seller.name : 'Unknown',
      sellerJoined: seller ? seller.joined || '' : ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Listings: Create ─────────────────────────────────────────
app.post('/api/listings', requireAuth, async (req, res) => {
  try {
    const { title, author, isbn, university, subject, type, condition, price, description, image } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });

    const listings = await readListings();
    const newId = listings.length > 0 ? Math.max(...listings.map(l => l.id)) + 1 : 1;

    const newListing = {
      id: newId,
      sellerId: req.user.id,
      title: title.trim(),
      author: (author || '').trim(),
      isbn: (isbn || '').trim(),
      university: university || '',
      subject: subject || '',
      type: type || 'Textbook',
      condition: condition || 'Good',
      price: parseFloat(price),
      description: (description || '').trim(),
      image: image || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    listings.push(newListing);
    await writeListings(listings);
    res.status(201).json(newListing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Listings: Update ─────────────────────────────────────────
app.put('/api/listings/:id', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();
    const idx = listings.findIndex(l => l.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Listing not found' });
    if (listings[idx].sellerId !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { title, author, isbn, university, subject, type, condition, price, description, image } = req.body;
    listings[idx] = {
      ...listings[idx],
      title: title || listings[idx].title,
      author: author !== undefined ? author.trim() : listings[idx].author,
      isbn: isbn !== undefined ? isbn.trim() : listings[idx].isbn,
      university: university !== undefined ? university : listings[idx].university,
      subject: subject !== undefined ? subject : listings[idx].subject,
      type: type || listings[idx].type,
      condition: condition || listings[idx].condition,
      price: price !== undefined ? parseFloat(price) : listings[idx].price,
      description: description !== undefined ? description.trim() : listings[idx].description,
      image: 'image' in req.body ? (image || null) : listings[idx].image
    };

    await writeListings(listings);
    res.json(listings[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Listings: Update status (mark sold / reactivate) ─────────
app.patch('/api/listings/:id/status', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();
    const idx = listings.findIndex(l => l.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Listing not found' });
    if (listings[idx].sellerId !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { status } = req.body;
    if (!['active', 'sold'].includes(status))
      return res.status(400).json({ error: 'Status must be active or sold' });

    listings[idx].status = status;
    await writeListings(listings);
    res.json(listings[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Listings: Delete ─────────────────────────────────────────
app.delete('/api/listings/:id', requireAuth, async (req, res) => {
  try {
    let listings = await readListings();
    const listing = listings.find(l => l.id === parseInt(req.params.id));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.sellerId !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    listings = listings.filter(l => l.id !== parseInt(req.params.id));
    await writeListings(listings);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Profile: Get own profile ─────────────────────────────────
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      university: req.user.university || '',
      location: req.user.location || '',
      bio: req.user.bio || '',
      joined: req.user.joined || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Profile: Update own profile ──────────────────────────────
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const users = await readDB();
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const { name, university, location, bio } = req.body;
    if (name !== undefined) users[idx].name = name.trim();
    if (university !== undefined) users[idx].university = university.trim();
    if (location !== undefined) users[idx].location = location.trim();
    if (bio !== undefined) users[idx].bio = bio.trim();

    await writeDB(users);
    res.json({
      id: users[idx].id,
      name: users[idx].name,
      email: users[idx].email,
      university: users[idx].university || '',
      location: users[idx].location || '',
      bio: users[idx].bio || '',
      joined: users[idx].joined || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Profile: Change password ─────────────────────────────────
app.put('/api/profile/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both fields required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const users = await readDB();
    const idx = users.findIndex(u => u.id === req.user.id);
    const match = await bcrypt.compare(currentPassword, users[idx].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    users[idx].password = await bcrypt.hash(newPassword, 10);
    await writeDB(users);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Profile: Get own active listings ─────────────────────────
app.get('/api/profile/listings', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();
    res.json(listings.filter(l => l.sellerId === req.user.id && l.status === 'active'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Users: Get public profile ────────────────────────────────
app.get('/api/users/:id', async (req, res) => {
  try {
    const users = await readDB();
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const listings = await readListings();
    const userListings = listings.filter(l => l.sellerId === user.id && l.status === 'active');

    res.json({
      id: user.id,
      name: user.name,
      university: user.university || '',
      location: user.location || '',
      bio: user.bio || '',
      joined: user.joined || '',
      listings: userListings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── My Listings (active + old) ───────────────────────────────
app.get('/api/my-listings', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();
    const mine = listings.filter(l => l.sellerId === req.user.id);
    res.json({
      active: mine.filter(l => l.status === 'active'),
      old: mine.filter(l => l.status !== 'active')
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Interests ────────────────────────────────────────────────
app.get('/api/interests', requireAuth, async (req, res) => {
  try {
    const interests = await readInterests();
    const listings = await readListings();
    const mine = interests.filter(i => i.userId === req.user.id);
    const result = mine.map(i => listings.find(l => l.id === i.listingId)).filter(Boolean);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/interests', requireAuth, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId required' });

    // Can't be interested in your own listing
    const listings = await readListings();
    const listing = listings.find(l => l.id === Number(listingId));
    if (listing && listing.sellerId === req.user.id)
      return res.status(400).json({ error: 'Cannot be interested in your own listing' });

    const interests = await readInterests();
    const exists = interests.find(i => i.userId === req.user.id && i.listingId === Number(listingId));
    if (exists) return res.status(400).json({ error: 'Already interested' });

    const newInterest = {
      id: interests.length > 0 ? Math.max(...interests.map(i => i.id)) + 1 : 1,
      userId: req.user.id,
      listingId: Number(listingId),
      dateAdded: new Date().toISOString()
    };
    interests.push(newInterest);
    await writeInterests(interests);
    res.status(201).json(newInterest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/interests/:listingId', requireAuth, async (req, res) => {
  try {
    const listingId = Number(req.params.listingId);
    let interests = await readInterests();
    interests = interests.filter(i => !(i.userId === req.user.id && i.listingId === listingId));
    await writeInterests(interests);
    res.json({ message: 'Interest removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if interested in a listing
app.get('/api/interests/:listingId', requireAuth, async (req, res) => {
  try {
    const interests = await readInterests();
    const exists = interests.some(i => i.userId === req.user.id && i.listingId === Number(req.params.listingId));
    res.json({ interested: exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Messages ─────────────────────────────────────────────────
app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    const messages = await readMessages();
    const myMessages = messages.filter(m => m.fromUserId === req.user.id || m.toUserId === req.user.id);

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
    threads.sort((a, b) => new Date(b.latestMessage.timestamp) - new Date(a.latestMessage.timestamp));
    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/messages/:otherId', requireAuth, async (req, res) => {
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

app.post('/api/messages', requireAuth, async (req, res) => {
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
      listingId: listingId ? parseInt(listingId) : null,
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

// ── Boot ─────────────────────────────────────────────────────
Promise.all([readDB(), readMessages(), readListings(), readInterests()])
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('Failed to initialize:', err));
