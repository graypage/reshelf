const express = require('express');
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