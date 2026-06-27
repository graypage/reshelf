// ═══════════════════════════════════════════════════════════════════════════════
// server.js — Reshelf Backend API
// ═══════════════════════════════════════════════════════════════════════════════
//
// This is the entire backend for the Reshelf application. It runs as a Node.js
// server using the Express framework and handles every request the frontend
// makes — from logging in to sending messages to creating listings.
//
// HOW THE BACKEND FITS INTO THE PROJECT:
//
//   Browser (frontend HTML/JS)
//         │
//         │  HTTP requests (fetch calls in utils.js → apiFetch)
//         ▼
//   server.js  ◄── you are here
//         │
//         │  reads and writes
//         ▼
//   JSON files (users.json, listings.json, messages.json, interests.json)
//
// Instead of a real database like MySQL or MongoDB, this project stores all
// data in plain JSON files on disk. This is fine for a university project but
// would not scale to a real production app with many users.
//
// WHAT THIS FILE CONTAINS (in order):
//   1. Imports and app setup
//   2. File path constants
//   3. JSON helper functions (read/write)
//   4. Auth middleware (requireAuth)
//   5. Auth routes      — POST /api/auth/signup, /login, /reset-password
//   6. Listing routes   — GET/POST/PUT/PATCH/DELETE /api/listings
//   7. Profile routes   — GET/PUT /api/profile, PUT /api/profile/password
//   8. User routes      — GET /api/users/:id
//   9. My-listings      — GET /api/my-listings
//  10. Interest routes  — GET/POST/DELETE /api/interests
//  11. Message routes   — GET/POST /api/messages
//  12. Boot / startup
//
// ═══════════════════════════════════════════════════════════════════════════════


// ── 1. IMPORTS AND APP SETUP ──────────────────────────────────────────────────

// express  — the web framework. Handles routing, middleware, request/response
// cors     — allows the frontend (on a different port) to call this API
// bcrypt   — hashes passwords so we never store them in plain text
// fs       — Node's built-in filesystem module, used to read/write JSON files
// path     — Node's built-in path module, used to build file paths safely
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcrypt');
const fs      = require('fs').promises;
const path    = require('path');

// Create the Express app — this is the object we attach all our routes to
const app  = express();
const PORT = 3000; // the server listens on http://localhost:3000

// ── Middleware ────────────────────────────────────────────────────────────────
// Middleware runs on EVERY request before it hits a route handler.
// Think of it as a pipeline each request passes through.

// cors() — without this, the browser blocks fetch() calls from a different
// port (e.g. frontend on :5500 calling the API on :3000). CORS = Cross-Origin
// Resource Sharing. This tells the browser "yes, any origin is allowed."
app.use(cors());

// express.json() — automatically parses the JSON body of incoming POST/PUT
// requests and makes it available as req.body. Without this, req.body is undefined.
app.use(express.json());

// express.static() — serves the frontend HTML/CSS/JS files directly from this
// server. path.join(__dirname, '..') means "go up one folder from backend/ to
// the reshelf/ root". So http://localhost:3000/ serves reshelf/index.html,
// http://localhost:3000/frontend/pages/listing.html serves that HTML file, etc.
// This means you only need ONE server running — no separate frontend server needed.
app.use(express.static(path.join(__dirname, '..')));


// ── 2. FILE PATH CONSTANTS ────────────────────────────────────────────────────
// __dirname is always the folder this file lives in (reshelf/backend/).
// We build absolute paths to each JSON file so Node can find them regardless
// of which directory the server was started from.

const dbPath        = path.join(__dirname, 'users.json');     // all user accounts
const messagesPath  = path.join(__dirname, 'messages.json');  // all messages
const listingsPath  = path.join(__dirname, 'listings.json');  // all listings
const interestsPath = path.join(__dirname, 'interests.json'); // all interests


// ── 3. JSON FILE HELPERS ──────────────────────────────────────────────────────
// These two functions are the entire "database layer". Every route that needs
// data calls one of these instead of talking to a real database.

// readJSON — reads a JSON file from disk and returns it as a JavaScript array/object.
// If the file doesn't exist yet (ENOENT error), it creates it with the defaultVal
// so the app doesn't crash on first run.
async function readJSON(filePath, defaultVal = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data); // convert the raw text string into a JS object
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File doesn't exist — create it with an empty array and return that
      await fs.writeFile(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    throw err; // any other error (e.g. permission denied) should crash loudly
  }
}

// writeJSON — takes a JS array/object and writes it back to disk as formatted JSON.
// null, 2 means "pretty-print with 2-space indentation" so the files are readable.
async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Shorthand helpers — instead of typing readJSON(dbPath, []) everywhere,
// routes can just call readDB() or writeDB(updatedUsers).
const readDB         = ()  => readJSON(dbPath, []);
const writeDB        = (d) => writeJSON(dbPath, d);
const readMessages   = ()  => readJSON(messagesPath, []);
const writeMessages  = (d) => writeJSON(messagesPath, d);
const readListings   = ()  => readJSON(listingsPath, []);
const writeListings  = (d) => writeJSON(listingsPath, d);
const readInterests  = ()  => readJSON(interestsPath, []);
const writeInterests = (d) => writeJSON(interestsPath, d);


// ── 4. AUTH MIDDLEWARE ────────────────────────────────────────────────────────
// requireAuth is a middleware function used to protect routes that need a
// logged-in user. Add it as the second argument to any route that requires login:
//   app.post('/api/listings', requireAuth, async (req, res) => { ... })
//
// HOW IT WORKS:
//   The frontend (utils.js → apiFetch) sends the logged-in user's email in a
//   custom HTTP header called 'x-user-email' on every API request. This function
//   reads that header, looks up the user, and attaches them to req.user so the
//   route handler can use them (e.g. req.user.id to know who is posting).
//
//   If the header is missing or the email doesn't match any user, it immediately
//   sends a 401 Unauthorized response and stops — the route handler never runs.
//   If authentication passes, next() is called to pass control to the route.
//
// NOTE: This is simplified auth for a university project. A production app would
// use signed JWT tokens or server-side sessions instead of passing the raw email,
// because a malicious user could fake the header and impersonate someone else.

async function requireAuth(req, res, next) {
  const email = req.headers['x-user-email'];

  // No email header sent — the request is not authenticated
  if (!email) return res.status(401).json({ error: 'Unauthorized' });

  const users = await readDB();
  const user  = users.find(u => u.email === email);

  // Email doesn't match any account
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Attach the full user object to the request so route handlers can use it
  req.user = user;

  // Call next() to hand off to the actual route handler
  next();
}


// ═══════════════════════════════════════════════════════════════════════════════
// ── 5. AUTH ROUTES ────────────────────────────────────────────────────────────
// These routes handle account creation, login, and password reset.
// They live at /api/auth/* and do NOT require authentication (obviously —
// the user doesn't have an account yet or has forgotten their password).
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/signup
// Called by: auth.js → handleSignup()
// Creates a new user account.
//
// Request body: { name, email, password }
// Response:     { message, userId }   on success
//               { error }             on failure
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Validate that all three fields were sent
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const users = await readDB();

    // Check no other account already uses this email (emails must be unique)
    if (users.find(u => u.email === email))
      return res.status(400).json({ error: 'Email already in use' });

    // Hash the password before storing it.
    // bcrypt.hash(password, 10) — the 10 is the "salt rounds", controlling how
    // computationally expensive the hashing is. 10 is a standard safe value.
    // NEVER store plain-text passwords — if the JSON file is ever leaked,
    // hashed passwords cannot be reversed.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate the next available ID. Math.max(...ids) + 1 finds the highest
    // existing ID and adds 1. If there are no users yet, start at 1.
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

    // Build the new user object. Profile fields start empty — the user can
    // fill them in later via the settings page.
    const newUser = {
      id: newId,
      name,
      email,
      password: hashedPassword,
      university: '',
      location: '',
      bio: '',
      joined: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    };

    users.push(newUser);
    await writeDB(users); // persist the updated array back to users.json

    // 201 Created — the resource was successfully created
    res.status(201).json({ message: 'User created successfully', userId: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/auth/login
// Called by: auth.js → handleLogin()
// Verifies email + password and returns the user's basic info to the frontend.
// The frontend then stores this in localStorage (via setCurrentUser in utils.js)
// so it knows who is logged in.
//
// Request body: { email, password }
// Response:     { message, user: { id, name, email } }   on success
//               { error }                                 on failure
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const users = await readDB();

    // Look up the user by email
    const user = users.find(u => u.email === email);

    // Deliberately use the same generic error message for "wrong email" and
    // "wrong password" — this prevents attackers from knowing which is wrong
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // bcrypt.compare checks the plain-text password against the stored hash.
    // It cannot reverse the hash — it re-hashes the input and compares.
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Only send back safe fields — never send the hashed password to the client
    res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/auth/reset-password
// Called by: auth.js → handleReset()
// Simplified password reset — looks the user up by email and overwrites the
// password directly. In a real app this would send an email with a secure
// one-time token instead of allowing a direct reset without verification.
//
// Request body: { email, newPassword }
// Response:     { message }   on success
//               { error }     on failure
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword)
    return res.status(400).json({ error: 'Email and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });

  try {
    const users = await readDB();
    const idx   = users.findIndex(u => u.email === email);

    if (idx === -1) return res.status(404).json({ error: 'No account found with that email' });

    // Hash and overwrite the password
    users[idx].password = await bcrypt.hash(newPassword, 10);
    await writeDB(users);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// ── 6. LISTING ROUTES ─────────────────────────────────────────────────────────
// Listings are the core of the app — textbooks and resources for sale.
// These routes handle browsing, searching, creating, editing, and deleting them.
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/listings
// Called by: index.js → loadListings()
// Returns all active listings, with optional filtering by search query,
// university, subject, and type. Only logged-out users or buyers see this —
// sellers manage their own listings via /api/my-listings.
//
// Query params: ?q=calculus  ?uni=AUS  ?subject=Engineering  ?type=Textbook
// Response: Array of listing objects, each with sellerName attached
app.get('/api/listings', async (req, res) => {
  try {
    const listings = await readListings();
    const { q, uni, subject, type } = req.query;

    // Start with only active listings — sold items shouldn't show on the browse page
    let results = listings.filter(l => l.status === 'active');

    // Apply search filter across title, author, and ISBN
    if (q) {
      const query = q.toLowerCase();
      results = results.filter(l =>
        l.title.toLowerCase().includes(query)         ||
        (l.author || '').toLowerCase().includes(query) ||
        (l.isbn   || '').includes(query)
      );
    }

    // Apply dropdown filters (exact match)
    if (uni)     results = results.filter(l => l.university === uni);
    if (subject) results = results.filter(l => l.subject === subject);
    if (type)    results = results.filter(l => l.type === type);

    // Join in the seller's name from users.json so the frontend can display
    // "Sold by Ahmed" without needing a separate API call per listing.
    // This is called "denormalisation" — embedding data from another entity.
    const users = await readDB();
    results = results.map(l => {
      const seller = users.find(u => u.id === l.sellerId);
      return { ...l, sellerName: seller ? seller.name : 'Unknown' };
    });

    // Sort newest first so recent listings appear at the top
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/listings/:id
// Called by: listing.js (on the listing detail page)
// Returns a single listing by its ID, including the seller's name and join date.
// :id is a URL parameter — /api/listings/3 means id = "3"
//
// Response: Single listing object with sellerName and sellerJoined attached
app.get('/api/listings/:id', async (req, res) => {
  try {
    const listings = await readListings();

    // parseInt converts the URL string "3" to the number 3 for comparison
    const listing = listings.find(l => l.id === parseInt(req.params.id));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const users  = await readDB();
    const seller = users.find(u => u.id === listing.sellerId);

    // Spread the listing fields and add seller info on top
    res.json({
      ...listing,
      sellerName:   seller ? seller.name         : 'Unknown',
      sellerJoined: seller ? seller.joined || '' : ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/listings
// Called by: create-listing.js → handleCreateListing()
// Creates a new listing. requireAuth ensures only logged-in users can post.
// req.user is available because requireAuth ran first and attached it.
//
// Request body: { title, author, isbn, university, subject, type, condition, price, description, image }
// Response: The newly created listing object (201 Created)
app.post('/api/listings', requireAuth, async (req, res) => {
  try {
    const { title, author, isbn, university, subject, type, condition, price, description, image } = req.body;

    // title and price are the only truly required fields
    if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });

    const listings = await readListings();
    const newId    = listings.length > 0 ? Math.max(...listings.map(l => l.id)) + 1 : 1;

    const newListing = {
      id:          newId,
      sellerId:    req.user.id,       // set automatically from the logged-in user
      title:       title.trim(),
      author:      (author || '').trim(),
      isbn:        (isbn   || '').trim(),
      university:  university  || '',
      subject:     subject     || '',
      type:        type        || 'Textbook',
      condition:   condition   || 'Good',
      price:       parseFloat(price), // ensure it's stored as a number, not a string
      description: (description || '').trim(),
      image:       image || null,     // base64 string or null if no photo uploaded
      status:      'active',          // all new listings start as active
      createdAt:   new Date().toISOString()
    };

    listings.push(newListing);
    await writeListings(listings);
    res.status(201).json(newListing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// PUT /api/listings/:id
// Called by: edit-listing.js → handleSave()
// Updates an existing listing. Two checks before allowing the edit:
//   1. The listing must exist
//   2. The logged-in user must be the seller (req.user.id === listing.sellerId)
//
// Uses a partial update pattern — only fields that were sent get overwritten.
// Fields not included in the request body keep their existing values.
//
// Request body: any subset of listing fields
// Response: The updated listing object
app.put('/api/listings/:id', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();
    const idx      = listings.findIndex(l => l.id === parseInt(req.params.id));

    if (idx === -1) return res.status(404).json({ error: 'Listing not found' });

    // 403 Forbidden — the listing exists but this user doesn't own it
    if (listings[idx].sellerId !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { title, author, isbn, university, subject, type, condition, price, description, image } = req.body;

    // Spread the existing listing first, then overwrite only the provided fields.
    // The !== undefined checks mean "only update this field if it was actually sent".
    listings[idx] = {
      ...listings[idx],
      title:       title       || listings[idx].title,
      author:      author      !== undefined ? author.trim()      : listings[idx].author,
      isbn:        isbn        !== undefined ? isbn.trim()        : listings[idx].isbn,
      university:  university  !== undefined ? university         : listings[idx].university,
      subject:     subject     !== undefined ? subject            : listings[idx].subject,
      type:        type        || listings[idx].type,
      condition:   condition   || listings[idx].condition,
      price:       price       !== undefined ? parseFloat(price)  : listings[idx].price,
      description: description !== undefined ? description.trim() : listings[idx].description,
      // Special case: 'image' in req.body checks if the key exists at all,
      // so sending image: null intentionally clears the photo
      image:       'image' in req.body ? (image || null) : listings[idx].image
    };

    await writeListings(listings);
    res.json(listings[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// PATCH /api/listings/:id/status
// Called by: edit-listing.js → handleMarkSold()
// Changes only the status field of a listing ('active' ↔ 'sold').
// Uses PATCH (partial update) rather than PUT (full replacement) since we're
// only changing one field.
//
// Request body: { status: 'sold' } or { status: 'active' }
// Response: The updated listing object
app.patch('/api/listings/:id/status', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();
    const idx      = listings.findIndex(l => l.id === parseInt(req.params.id));

    if (idx === -1) return res.status(404).json({ error: 'Listing not found' });
    if (listings[idx].sellerId !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    const { status } = req.body;

    // Only allow the two valid status values — reject anything else
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


// DELETE /api/listings/:id
// Called by: edit-listing.js → handleDelete()
// Permanently removes a listing. The seller must be the logged-in user.
// Uses Array.filter to produce a new array without the deleted listing,
// then overwrites the file.
//
// Response: { message: 'Listing deleted' }
app.delete('/api/listings/:id', requireAuth, async (req, res) => {
  try {
    let listings = await readListings();
    const listing = listings.find(l => l.id === parseInt(req.params.id));

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.sellerId !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    // Filter out the deleted listing and save the rest
    listings = listings.filter(l => l.id !== parseInt(req.params.id));
    await writeListings(listings);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// ── 7. PROFILE ROUTES ─────────────────────────────────────────────────────────
// These routes let a user view and update their own account.
// All require authentication — you can only edit your own profile.
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/profile
// Called by: profile.js, settings.js → loadProfileFromBackend()
// Returns the logged-in user's own profile data.
// req.user is already available from requireAuth — no extra DB read needed.
//
// Response: { id, name, email, university, location, bio, joined }
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    // Return safe fields only — password hash is never sent to the client
    res.json({
      id:         req.user.id,
      name:       req.user.name,
      email:      req.user.email,
      university: req.user.university || '',
      location:   req.user.location   || '',
      bio:        req.user.bio        || '',
      joined:     req.user.joined     || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// PUT /api/profile
// Called by: settings.js (profile form submit)
// Updates the logged-in user's display name, university, location, and bio.
// Does NOT allow changing email (would need extra verification) or password
// (that has its own dedicated route below).
//
// Request body: { name, university, location, bio }  (all optional)
// Response: Updated profile object
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const users = await readDB();
    const idx   = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    const { name, university, location, bio } = req.body;

    // Only update fields that were actually sent in the request
    if (name       !== undefined) users[idx].name       = name.trim();
    if (university !== undefined) users[idx].university = university.trim();
    if (location   !== undefined) users[idx].location   = location.trim();
    if (bio        !== undefined) users[idx].bio        = bio.trim();

    await writeDB(users);

    // Return the updated profile (without password)
    res.json({
      id:         users[idx].id,
      name:       users[idx].name,
      email:      users[idx].email,
      university: users[idx].university || '',
      location:   users[idx].location   || '',
      bio:        users[idx].bio        || '',
      joined:     users[idx].joined     || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// PUT /api/profile/password
// Called by: settings.js (password form submit)
// Changes the logged-in user's password. Requires the current password to be
// correct first — this prevents someone who left their browser open from having
// their password changed by someone else.
//
// Request body: { currentPassword, newPassword }
// Response: { message: 'Password updated' }
app.put('/api/profile/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both fields required' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const users = await readDB();
    const idx   = users.findIndex(u => u.id === req.user.id);

    // Verify the current password against the stored hash before allowing the change
    const match = await bcrypt.compare(currentPassword, users[idx].password);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    // Hash the new password and save it
    users[idx].password = await bcrypt.hash(newPassword, 10);
    await writeDB(users);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/profile/listings
// Called by: profile.js
// Returns only the active listings belonging to the logged-in user,
// for display on their own profile page.
//
// Response: Array of listing objects
app.get('/api/profile/listings', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();
    res.json(listings.filter(l => l.sellerId === req.user.id && l.status === 'active'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// ── 8. USER ROUTES ────────────────────────────────────────────────────────────
// Public profile lookup — no login required.
// Anyone can view another user's name, bio, and active listings.
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/users/:id
// Called by: profile.js (when viewing someone else's profile)
// Returns a user's public profile. Deliberately excludes email and password.
// Also attaches their active listings so the profile page can show them
// without a second API call.
//
// Response: { id, name, university, location, bio, joined, listings[] }
app.get('/api/users/:id', async (req, res) => {
  try {
    const users = await readDB();
    const user  = users.find(u => u.id === parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const listings     = await readListings();
    const userListings = listings.filter(l => l.sellerId === user.id && l.status === 'active');

    // Return only public fields — email and password are private
    res.json({
      id:         user.id,
      name:       user.name,
      university: user.university || '',
      location:   user.location   || '',
      bio:        user.bio        || '',
      joined:     user.joined     || '',
      listings:   userListings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// ── 9. MY LISTINGS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/my-listings
// Called by: my-listings.js
// Returns ALL listings belonging to the logged-in user, split into two groups:
//   active — currently visible on the browse page
//   old    — sold or otherwise no longer active
// Splitting them server-side avoids the frontend having to filter them itself.
//
// Response: { active: [...], old: [...] }
app.get('/api/my-listings', requireAuth, async (req, res) => {
  try {
    const listings = await readListings();

    // Get every listing this user has ever posted
    const mine = listings.filter(l => l.sellerId === req.user.id);

    res.json({
      active: mine.filter(l => l.status === 'active'),
      old:    mine.filter(l => l.status !== 'active')
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// ── 10. INTEREST ROUTES ───────────────────────────────────────────────────────
// Interests are a user's saved/bookmarked listings. Stored in interests.json
// as { id, userId, listingId, dateAdded }.
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/interests
// Called by: interests.js
// Returns all listings the logged-in user has marked as interested in.
// Joins the interest records with listing data so the frontend gets full
// listing objects (not just IDs).
//
// Response: Array of full listing objects
app.get('/api/interests', requireAuth, async (req, res) => {
  try {
    const interests = await readInterests();
    const listings  = await readListings();

    // Find all interest records belonging to this user
    const mine = interests.filter(i => i.userId === req.user.id);

    // Map each interest to its full listing object.
    // .filter(Boolean) removes nulls for any listing that was deleted after
    // the user marked interest (the listing is gone but the interest record remains)
    const result = mine.map(i => listings.find(l => l.id === i.listingId)).filter(Boolean);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/interests
// Called by: listing.js → handleInterested()
// Marks the logged-in user as interested in a listing.
// Two rules enforced:
//   1. You cannot mark interest in your own listing
//   2. You can't mark interest twice (duplicates blocked)
//
// Request body: { listingId }
// Response: The new interest record (201 Created)
app.post('/api/interests', requireAuth, async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId required' });

    const listings = await readListings();
    const listing  = listings.find(l => l.id === Number(listingId));

    // Prevent sellers from marking interest in their own listings
    if (listing && listing.sellerId === req.user.id)
      return res.status(400).json({ error: 'Cannot be interested in your own listing' });

    const interests = await readInterests();

    // Prevent duplicate interests
    const exists = interests.find(i => i.userId === req.user.id && i.listingId === Number(listingId));
    if (exists) return res.status(400).json({ error: 'Already interested' });

    const newInterest = {
      id:        interests.length > 0 ? Math.max(...interests.map(i => i.id)) + 1 : 1,
      userId:    req.user.id,
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


// DELETE /api/interests/:listingId
// Called by: interests.js → removeInterest()
// Removes a user's interest in a specific listing.
// Uses Array.filter to keep all interests EXCEPT the one being removed.
//
// Response: { message: 'Interest removed' }
app.delete('/api/interests/:listingId', requireAuth, async (req, res) => {
  try {
    const listingId = Number(req.params.listingId);
    let interests   = await readInterests();

    // Keep every interest that is NOT (this user + this listing)
    interests = interests.filter(i => !(i.userId === req.user.id && i.listingId === listingId));
    await writeInterests(interests);
    res.json({ message: 'Interest removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/interests/:listingId
// Called by: listing.js (to check whether to disable the "I'm interested" button)
// Checks if the logged-in user has already marked interest in a specific listing.
// Returns a boolean rather than the full interest record.
//
// Response: { interested: true } or { interested: false }
app.get('/api/interests/:listingId', requireAuth, async (req, res) => {
  try {
    const interests = await readInterests();
    const exists    = interests.some(
      i => i.userId === req.user.id && i.listingId === Number(req.params.listingId)
    );
    res.json({ interested: exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// ── 11. MESSAGE ROUTES ────────────────────────────────────────────────────────
// Messages are stored as individual records in messages.json.
// Each message has fromUserId and toUserId. A "conversation" (thread) is the
// set of all messages between two specific users.
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/messages
// Called by: inbox.js
// Returns the inbox view — one entry per conversation thread, showing only
// the most recent message from each thread.
//
// HOW THREAD GROUPING WORKS:
//   For each message the logged-in user is involved in, we figure out who the
//   OTHER person is. We then keep only the most recent message per other-person.
//   The result is a list of unique conversations, sorted newest first.
//
// Response: Array of { otherUser: { id, name }, latestMessage }
app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    const messages = await readMessages();

    // Get every message where the logged-in user is either the sender or recipient
    const myMessages = messages.filter(
      m => m.fromUserId === req.user.id || m.toUserId === req.user.id
    );

    // Build a map of { otherId → latestMessage } — one entry per conversation
    const threadsMap = {};
    for (const msg of myMessages) {
      // The "other" person is whoever isn't the logged-in user
      const otherId = msg.fromUserId === req.user.id ? msg.toUserId : msg.fromUserId;

      // Keep this message only if it's newer than the one we already have for this thread
      if (!threadsMap[otherId] || new Date(msg.timestamp) > new Date(threadsMap[otherId].timestamp)) {
        threadsMap[otherId] = msg;
      }
    }

    // Enrich each thread entry with the other user's name from users.json
    const users   = await readDB();
    const threads = Object.keys(threadsMap).map(otherId => {
      const otherUser = users.find(u => u.id === parseInt(otherId));
      return {
        otherUser:     otherUser ? { id: otherUser.id, name: otherUser.name } : { id: otherId, name: 'Unknown' },
        latestMessage: threadsMap[otherId]
      };
    });

    // Sort threads so the most recently active conversation appears first
    threads.sort((a, b) => new Date(b.latestMessage.timestamp) - new Date(a.latestMessage.timestamp));
    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/messages/:otherId
// Called by: conversation.js
// Returns the full message history between the logged-in user and one other user.
// Also returns the other user's name so the conversation page can display it.
//
// Response: { otherUser: { id, name }, messages: [...] }
app.get('/api/messages/:otherId', requireAuth, async (req, res) => {
  try {
    const otherId  = parseInt(req.params.otherId);
    const messages = await readMessages();

    // Include messages sent in either direction between these two users
    const convo = messages.filter(m =>
      (m.fromUserId === req.user.id && m.toUserId   === otherId) ||
      (m.fromUserId === otherId      && m.toUserId   === req.user.id)
    );

    const users     = await readDB();
    const otherUser = users.find(u => u.id === otherId) || { id: otherId, name: 'Unknown User' };

    res.json({
      otherUser: { id: otherUser.id, name: otherUser.name },
      messages:  convo
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/messages
// Called by: conversation.js (send button)
// Sends a message from the logged-in user to another user.
// Optionally references a listing — when a buyer first messages from a listing
// page, listingId and listingTitle are included so the conversation can show
// context ("about: Calculus textbook").
//
// Request body: { toUserId, text, listingId?, listingTitle? }
// Response: The new message object (201 Created)
app.post('/api/messages', requireAuth, async (req, res) => {
  try {
    const { toUserId, text, listingId, listingTitle } = req.body;
    if (!toUserId || !text) return res.status(400).json({ error: 'Missing toUserId or text' });

    const messages = await readMessages();
    const newId    = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;

    const newMessage = {
      id:           newId,
      fromUserId:   req.user.id,
      toUserId:     parseInt(toUserId),
      text,
      timestamp:    new Date().toISOString(),
      listingId:    listingId    ? parseInt(listingId) : null,  // null if not about a listing
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


// ═══════════════════════════════════════════════════════════════════════════════
// ── 12. BOOT / STARTUP ────────────────────────────────────────────────────────
// Before starting the server, we pre-read all four JSON files.
// This ensures they exist on disk (readJSON creates them if missing) and
// catches any file permission errors early — before a real request hits them.
// Promise.all runs all four reads in parallel so startup is faster.
// ═══════════════════════════════════════════════════════════════════════════════

Promise.all([readDB(), readMessages(), readListings(), readInterests()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser`);
    });
  })
  .catch(err => {
    console.error('Failed to initialise — check your JSON files:', err);
  });