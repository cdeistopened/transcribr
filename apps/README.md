# `/apps` - Application Code

## Purpose
This directory contains the **deployable application code** - the actual software that users interact with.

## Programming Terminology
- **Application Code** = The software you deploy and run in production
- **Source Code** = Code you write and maintain (version controlled)
- **Monorepo** = Single repository containing multiple related applications

## Contents

### `backend/`
**Express.js REST API Server**
- Handles HTTP requests from frontend
- Integrates with AssemblyAI/Deepgram transcription APIs
- Serves transcription results
- Manages RSS feed parsing

**Key Files:**
- `server.js` - Main Express server
- `package.json` - Backend dependencies

**To Run:**
```bash
cd backend
npm install
node server.js
```

### `frontend/`
**React Web Application**
- User interface for selecting episodes
- Displays transcription progress
- Shows completed transcripts

**Key Files:**
- `src/App.js` - Main React component
- `package.json` - Frontend dependencies

**To Run:**
```bash
cd frontend
npm install
npm start
```

## Best Practices

✅ **DO:**
- Keep this directory focused on application code only
- Version control everything in this directory
- Use environment variables for configuration (`.env`)
- Document API endpoints and component structure

❌ **DON'T:**
- Put generated transcripts here (use `output/`)
- Put utility scripts here (use `scripts/`)
- Put documentation here (use `docs/`)
- Commit `node_modules/` (already in `.gitignore`)

## Related Directories
- `/scripts` - Utility scripts for batch processing
- `/output` - Generated transcripts (not in apps/)
- `/docs` - Project documentation

