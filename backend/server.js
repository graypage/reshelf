const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "users.json");
const messagesPath = path.join(__dirname, "messages.json");
const listingsPath = path.join(__dirname, "listings.json");
const interestsPath = path.join(__dirname, "interests.json");

//zeshaan
// Settings data will be stored in this JSON file
const settingsPath = path.join(__dirname, "settings.json");

// Create settings.json if it does not already exist
async function ensureSettingsFile() {
  try {
    await fs.access(settingsPath);
  } catch (err) {
    const initialSettings = {
      profile: {},
      account: {},
      preferences: {},
    };

    await fs.writeFile(settingsPath, JSON.stringify(initialSettings, null, 2));
  }
}

// Read saved settings from settings.json
async function readSettingsFile() {
  try {
    const data = await fs.readFile(settingsPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return {
      profile: {},
      account: {},
      preferences: {},
    };
  }
}

// Write updated settings back to settings.json
async function writeSettingsFile(settingsData) {
  await fs.writeFile(settingsPath, JSON.stringify(settingsData, null, 2));
}
//zeshaan

// Helper to initialize and read DB
async function readDB() {
  try {
    const data = await fs.readFile(dbPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      // File doesn't exist, create it with empty array
      await fs.writeFile(dbPath, "[]");
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
    const data = await fs.readFile(messagesPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(messagesPath, "[]");
      return [];
    }
    throw err;
  }
}

async function writeMessages(data) {
  await fs.writeFile(messagesPath, JSON.stringify(data, null, 2));
}
async function readListings() {
  try {
    const data = await fs.readFile(listingsPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(listingsPath, "[]");
      return [];
    }
    throw err;
  }
}

async function writeListings(data) {
  await fs.writeFile(listingsPath, JSON.stringify(data, null, 2));
}
async function readInterests() {
  try {
    const data = await fs.readFile(interestsPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(interestsPath, "[]");
      return [];
    }
    throw err;
  }
}

async function writeInterests(data) {
  await fs.writeFile(interestsPath, JSON.stringify(data, null, 2));
}
// Signup Route
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const users = await readDB();

    // Check if user already exists
    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Auto-increment ID
    const newId =
      users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;

    const newUser = { id: newId, name, email, password: hashedPassword };
    users.push(newUser);
    await writeDB(users);

    res
      .status(201)
      .json({ message: "User created successfully", userId: newId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login Route
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const users = await readDB();
    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- MESSAGING ENDPOINTS ---

// Simple auth middleware
async function requireAuthHeader(req, res, next) {
  const email = req.headers["x-user-email"];
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const users = await readDB();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
}

// Get all threads for the logged-in user
app.get("/api/messages", requireAuthHeader, async (req, res) => {
  try {
    const messages = await readMessages();
    const myMessages = messages.filter(
      (m) => m.fromUserId === req.user.id || m.toUserId === req.user.id,
    );

    // Group by conversation partner
    const threadsMap = {};
    for (const msg of myMessages) {
      const otherId =
        msg.fromUserId === req.user.id ? msg.toUserId : msg.fromUserId;
      if (
        !threadsMap[otherId] ||
        new Date(msg.timestamp) > new Date(threadsMap[otherId].timestamp)
      ) {
        threadsMap[otherId] = msg;
      }
    }

    const users = await readDB();
    const threads = Object.keys(threadsMap).map((otherId) => {
      const otherUser = users.find((u) => u.id === parseInt(otherId));
      return {
        otherUser: otherUser
          ? { id: otherUser.id, name: otherUser.name }
          : { id: otherId, name: "Unknown" },
        latestMessage: threadsMap[otherId],
      };
    });

    // Sort by latest message
    threads.sort(
      (a, b) =>
        new Date(b.latestMessage.timestamp) -
        new Date(a.latestMessage.timestamp),
    );
    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get messages for a specific conversation
app.get("/api/messages/:otherId", requireAuthHeader, async (req, res) => {
  try {
    const otherId = parseInt(req.params.otherId);
    const messages = await readMessages();
    const convo = messages.filter(
      (m) =>
        (m.fromUserId === req.user.id && m.toUserId === otherId) ||
        (m.fromUserId === otherId && m.toUserId === req.user.id),
    );

    const users = await readDB();
    const otherUser = users.find((u) => u.id === otherId) || {
      id: otherId,
      name: "Unknown User",
    };

    res.json({
      otherUser: { id: otherUser.id, name: otherUser.name },
      messages: convo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Send a message
app.post("/api/messages", requireAuthHeader, async (req, res) => {
  try {
    const { toUserId, text, listingId, listingTitle } = req.body;
    if (!toUserId || !text)
      return res.status(400).json({ error: "Missing toUserId or text" });

    const messages = await readMessages();
    const newId =
      messages.length > 0 ? Math.max(...messages.map((m) => m.id)) + 1 : 1;

    const newMessage = {
      id: newId,
      fromUserId: req.user.id,
      toUserId: parseInt(toUserId),
      text,
      timestamp: new Date().toISOString(),
      listingId: listingId || null,
      listingTitle: listingTitle || null,
    };

    messages.push(newMessage);
    await writeMessages(messages);

    res.status(201).json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/profile", requireAuthHeader, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      university: req.user.university || "",
      location: req.user.location || "",
      bio: req.user.bio || "",
      joined: req.user.joined || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/profile/listings", requireAuthHeader, async (req, res) => {
  try {
    const listings = await readListings();

    const myListings = listings.filter(
      (listing) =>
        listing.sellerId === req.user.id && listing.status === "active",
    );

    res.json(myListings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/my-listings", requireAuthHeader, async (req, res) => {
  try {
    const listings = await readListings();

    const myListings = listings.filter(
      (listing) => listing.sellerId === req.user.id,
    );

    const active = myListings.filter((listing) => listing.status === "active");

    const old = myListings.filter((listing) => listing.status !== "active");

    res.json({
      active,
      old,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/interests", requireAuthHeader, async (req, res) => {
  try {
    const interests = await readInterests();
    const listings = await readListings();

    const myInterests = interests.filter(
      (interest) => interest.userId === req.user.id,
    );

    const interestedListings = myInterests
      .map((interest) =>
        listings.find((listing) => listing.id === interest.listingId),
      )
      .filter(Boolean);

    res.json(interestedListings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/interests", requireAuthHeader, async (req, res) => {
  try {
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({
        error: "listingId required",
      });
    }

    const interests = await readInterests();

    const exists = interests.find(
      (interest) =>
        interest.userId === req.user.id &&
        interest.listingId === Number(listingId),
    );

    if (exists) {
      return res.status(400).json({
        error: "Already interested",
      });
    }

    const newInterest = {
      id:
        interests.length > 0 ? Math.max(...interests.map((i) => i.id)) + 1 : 1,
      userId: req.user.id,
      listingId: Number(listingId),
      dateAdded: new Date().toISOString(),
    };

    interests.push(newInterest);

    await writeInterests(interests);

    res.status(201).json(newInterest);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});
app.delete("/api/interests/:listingId", requireAuthHeader, async (req, res) => {
  try {
    const listingId = Number(req.params.listingId);

    let interests = await readInterests();

    interests = interests.filter(
      (interest) =>
        !(interest.userId === req.user.id && interest.listingId === listingId),
    );

    await writeInterests(interests);

    res.json({
      message: "Interest removed",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
});

//zeshaan
// ---------------- SETTINGS ENDPOINTS ----------------

// Get saved settings for one section: profile, account, or preferences
app.get("/api/settings/:section", async (req, res) => {
  const { section } = req.params;

  try {
    const settings = await readSettingsFile();

    if (!Object.prototype.hasOwnProperty.call(settings, section)) {
      return res.status(404).json({
        error: `Unknown settings section: ${section}`,
      });
    }

    res.json(settings[section] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Save or update settings for one section
app.post("/api/settings/:section", async (req, res) => {
  const { section } = req.params;
  const newData = req.body;

  if (typeof newData !== "object" || Array.isArray(newData)) {
    return res.status(400).json({
      error: "Request body must be a JSON object",
    });
  }

  try {
    const settings = await readSettingsFile();

    if (!Object.prototype.hasOwnProperty.call(settings, section)) {
      return res.status(404).json({
        error: `Unknown settings section: ${section}`,
      });
    }

    // Merge existing saved settings with new form data
    settings[section] = {
      ...(settings[section] || {}),
      ...newData,
    };

    await writeSettingsFile(settings);

    res.json({
      message: `${section} settings updated successfully.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
//zeshaan

// Start checking DB and listen
Promise.all([
  readDB(),
  readMessages(),
  readListings(),
  readInterests(),
  ensureSettingsFile(),
])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });
