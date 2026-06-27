# re.shelf


## How to run

### Prerequisites

Make sure you have Node.js installed. You can check by running

```
node -v
```

If you don't have it, download it from [httpsnodejs.org](httpsnodejs.org) (use the LTS version).

---

### Step 1 — Install dependencies

Open a terminal, navigate to the `backend` folder, and install the required packages

```
cd reshelfbackend
npm install
```

This only needs to be done once (or again if someone adds a new package).

---

### Step 2 — Start the server

Still inside the `backend` folder, run

```
node server.js
```

You should see

```
Server running on httplocalhost3000
Open httplocalhost3000 in your browser
```

---

### Step 3 — Open the app

Open your browser and go to

```
httplocalhost3000
```

That's it. The backend serves the frontend too, so you only need one terminal and one server running.

---

## Project structure

```
reshelf
├── backend
│   ├── server.js        ← the entire backend API (Express)
│   ├── package.json     ← Node dependencies
│   ├── users.json       ← user accounts (auto-created on first run)
│   ├── listings.json    ← all listings
│   ├── messages.json    ← all messages
│   └── interests.json   ← saved interests
│
├── frontend
│   ├── css             ← stylesheets
│   ├── js              ← one JS file per page
│   └── pages           ← all HTML pages except the homepage
│
└── index.html           ← homepage  browse page
```

---

## Test accounts

 Name    Email                  Password 
-----------------------------------------
 ashwin  kumawat.exe@gmail.com  12345    
 test    test@test.com          123456   
 test1   test1@gmail.com        123456   
 test2   test2@gmail.com        123456   

 The hashed password `$2b$10$P0bjT7uLDxX6nhQlzLmiualA5fpQs3kM9X0phoN4hxb5BiTen.a` corresponds to `12345`.

---

## Stopping the server

Press `Ctrl + C` in the terminal.