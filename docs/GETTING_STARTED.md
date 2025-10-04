# Getting Started - Running Transcribr Locally

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed
- AssemblyAI API key (or Deepgram API key)

### Step 1: Set Up Environment Variables

Create `.env` file in `apps/backend/`:
```bash
cd apps/backend
cat > .env << 'EOF'
ASSEMBLYAI_API_KEY=your_api_key_here
PORT=4000
EOF
```

**Where to get API keys:**
- AssemblyAI: https://www.assemblyai.com/dashboard/signup
- Deepgram: https://console.deepgram.com/signup

### Step 2: Install Dependencies

```bash
# Install backend dependencies
cd apps/backend
npm install

# Install frontend dependencies (in new terminal)
cd apps/frontend
npm install
```

### Step 3: Start Backend Server

```bash
cd apps/backend
node server.js
```

You should see: `Server running on port 4000`

### Step 4: Start Frontend (in new terminal)

```bash
cd apps/frontend
npm start
```

Browser should open automatically to `http://localhost:3000`

## Architecture Overview

```
Your Setup:
┌─────────────────┐         ┌──────────────────┐
│   Frontend      │────────>│    Backend       │
│  React App      │  HTTP   │  Express API     │
│  Port 3000      │<────────│  Port 4000       │
└─────────────────┘         └──────────────────┘
                                     │
                                     ↓
                            ┌──────────────────┐
                            │  AssemblyAI API  │
                            │  (Cloud Service) │
                            └──────────────────┘
```

## How It Works

### Programming Concepts:

**1. Frontend (Client-Side)**
- **What:** React application running in your browser
- **Where:** `apps/frontend/`
- **Port:** 3000
- **Role:** User interface (what you see and click)

**2. Backend (Server-Side)**
- **What:** Express.js server running on your computer
- **Where:** `apps/backend/`
- **Port:** 4000
- **Role:** Handles requests, talks to APIs, stores data

**3. API Proxy Pattern**
- Frontend talks to Backend
- Backend talks to AssemblyAI
- Why? Keep API keys secret, handle complex logic

### Data Flow:

```
User clicks "Transcribe" button
         ↓
React sends HTTP POST to backend
         ↓
Backend receives request
         ↓
Backend downloads audio from RSS feed
         ↓
Backend uploads to AssemblyAI
         ↓
AssemblyAI processes audio
         ↓
Backend receives transcript
         ↓
Backend saves to output/transcripts/raw/
         ↓
Backend sends response to React
         ↓
User sees completed transcript
```

## Troubleshooting

### Backend won't start

**Error:** `Error: Cannot find module 'express'`
```bash
cd apps/backend
npm install
```

**Error:** `Port 4000 already in use`
```bash
# Find process on port 4000
lsof -ti:4000

# Kill it
kill -9 $(lsof -ti:4000)
```

**Error:** `ASSEMBLYAI_API_KEY is not defined`
```bash
# Check .env file exists
ls apps/backend/.env

# Create it if missing
cd apps/backend
echo "ASSEMBLYAI_API_KEY=your_key_here" > .env
```

### Frontend won't start

**Error:** `Cannot connect to backend`
- Make sure backend is running first
- Check backend is on port 4000

**Error:** `Port 3000 already in use`
- Choose a different port when prompted
- Or kill process: `kill -9 $(lsof -ti:3000)`

### Browser Console Errors

**`Failed to fetch`**
- Backend isn't running
- CORS issue (shouldn't happen with proxy)

**`Network Error`**
- Check internet connection
- AssemblyAI API might be down

## Development Workflow

### Making Changes

**Editing Frontend:**
1. Edit files in `apps/frontend/src/`
2. Save - hot reload happens automatically
3. See changes immediately in browser

**Editing Backend:**
1. Edit `apps/backend/server.js`
2. Save
3. Restart server: `Ctrl+C` then `node server.js`

### Testing RSS Feed

Use the Ray Peat podcast feed:
```
https://www.toxinless.com/peat/podcast.rss
```

Or any other podcast RSS URL.

## Project Structure Reference

```
transcribr/
├── apps/
│   ├── backend/          ← Start server here
│   │   ├── server.js     ← Main backend code
│   │   ├── .env          ← API keys (create this)
│   │   └── package.json
│   └── frontend/         ← Start React here
│       ├── src/
│       │   └── App.js    ← Main UI component
│       └── package.json
│
├── output/               ← Generated transcripts appear here
│   └── transcripts/
│       └── raw/          ← API outputs saved here
│
└── scripts/              ← Batch processing tools
    └── transcription/    ← Run these separately
```

## Next Steps

Once running:
1. Paste RSS URL into input field
2. Browse episodes
3. Select episodes to transcribe
4. Click "Transcribe Selected"
5. Watch progress in real-time
6. View completed transcripts

## Programming Terms Quick Reference

**Port:** Number that identifies a network service (4000, 3000)
**HTTP Request:** Browser/app asking server for something
**API:** Application Programming Interface - how programs talk
**REST API:** Type of API using HTTP (GET, POST, etc.)
**Environment Variables:** Configuration stored outside code
**Hot Reload:** Code changes appear without restarting
**Proxy:** Frontend forwards requests through backend
**CORS:** Cross-Origin Resource Sharing (security thing)
**Package.json:** Lists project dependencies
**node_modules/:** Where npm installs dependencies

## Help

Still stuck? Check:
- `docs/Claude.md` - Original development notes
- `apps/backend/server.js` - See API endpoints
- `apps/frontend/src/App.js` - See UI logic

