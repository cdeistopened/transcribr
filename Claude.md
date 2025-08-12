# Transcribr - Podcast RSS Transcription Tool

## Project Overview
Transcribr is a web-based tool for batch transcribing podcast episodes from RSS feeds using AI transcription services. Users can input RSS URLs, select episodes via checkboxes, and get organized markdown transcripts.

## Architecture

### Backend (`/backend/`)
- **Express.js server** on port 4000
- **Deepgram API** for transcription
- **RSS parsing** with rss-parser
- **Streaming responses** for real-time progress
- **File storage** in `transcripts/` as JSON

### Frontend (`/frontend/`)
- **React application** with Create React App
- **Episode selection UI** with checkboxes
- **Real-time progress tracking**
- **Transcript viewing/downloading**
- **Saved transcript management**

### CLI Tool (`podcast-transcribe.js`)
- Command-line interface for David Gornoski's podcast
- Interactive episode selection menu
- Progress tracking and status persistence

## Key Features
- ✅ RSS feed parsing and episode listing
- ✅ Multi-episode selection with checkboxes
- ✅ Real-time transcription progress streaming
- ✅ Transcript storage and retrieval
- ✅ Speaker diarization support
- ✅ Markdown/text export functionality
- ✅ Pagination and year-based grouping

## Development Commands

### Testing Locally
```bash
# Start backend server
cd backend
npm install
npm start  # Runs on port 4000

# Start frontend (separate terminal)
cd frontend
npm install
npm start  # Runs on port 3000
```

### Environment Setup
Create `backend/.env`:
```
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### CLI Usage
```bash
# Root directory CLI tool
npm install
node podcast-transcribe.js
```

## API Endpoints

### POST /api/rss
**Purpose**: Parse RSS feed and return episode metadata
**Body**: `{ "rssUrl": "https://example.com/feed.xml" }`
**Response**: `{ "episodes": [...] }`

### POST /api/transcribe  
**Purpose**: Transcribe audio file with streaming progress
**Body**: `{ "audioUrl": "https://example.com/audio.mp3" }`
**Response**: Streaming JSON updates ending with transcript

### GET /api/transcripts
**Purpose**: Get all saved transcripts
**Response**: `{ "transcripts": [...] }`

### POST /api/transcript/find
**Purpose**: Find specific transcript by audio URL
**Body**: `{ "audioUrl": "..." }`
**Response**: Transcript data or 404

## File Organization

### Current Structure
```
transcripts/           # JSON transcript storage
readable_transcripts/  # Markdown formatted transcripts
frontend/src/          # React components
backend/              # Express server
netlify/              # Deployment functions
```

### Cleanup Needed
- Remove duplicate frontend directories
- Consolidate conversion scripts
- Remove test files and unused directories
- Organize deployment configurations

## Common Use Cases

### Case 1: New RSS Feed Transcription
1. User enters RSS URL in web interface
2. System fetches and displays episodes with checkboxes
3. User selects episodes to transcribe
4. System processes each episode with progress tracking
5. Transcripts are saved and made available for download

### Case 2: Viewing Saved Transcripts
1. User clicks "Show Saved Transcripts"
2. System displays previously transcribed episodes
3. User can view, expand, or download transcripts
4. Transcripts include speaker diarization when available

### Case 3: CLI Batch Processing
1. Developer runs `node podcast-transcribe.js`
2. System loads hardcoded RSS feed (David Gornoski)
3. Interactive menu allows episode selection
4. Batch processing with status tracking
5. Results saved to JSON files

### Case 4: Export and Organization
1. User transcribes multiple episodes
2. System generates organized markdown files
3. Files include episode metadata and clean formatting
4. Exports can be downloaded individually or in batches

## Technical Specifications

### Transcription Service
- **Primary**: Deepgram API with Nova-2 model
- **Features**: Smart formatting, speaker diarization, punctuation
- **Streaming**: Real-time progress updates via HTTP streaming
- **Storage**: Base64-encoded filenames for URL safety

### Frontend Features
- **Pagination**: Configurable episodes per page (20/50/100)
- **Grouping**: Episodes organized by year
- **Progress**: Real-time status updates during transcription
- **Export**: Individual transcript downloads as .txt files
- **Persistence**: Saved transcripts accessible across sessions

### Error Handling
- **Network failures**: Graceful retry mechanisms
- **Audio processing**: Temporary file cleanup
- **Stream interruption**: Progress state preservation
- **API limits**: Rate limiting and queue management

## Deployment Configuration

### Netlify Functions
- `netlify/functions/rss.js` - RSS parsing endpoint
- `netlify/functions/transcribe.js` - Transcription endpoint
- Static frontend hosting with serverless backend

### Local Development
- Backend runs on localhost:4000
- Frontend proxies API calls to backend
- CORS enabled for development

## Development Priorities

### Phase 1: Local Testing & Cleanup
1. **Test current functionality** - Verify backend/frontend integration
2. **Clean project structure** - Remove duplicates and unused files
3. **Environment setup** - Ensure proper API key configuration
4. **Documentation** - Update README with current architecture

### Phase 2: Enhancement
1. **Export organization** - Implement folder structure for batches
2. **Multiple providers** - Add Assembly AI/Whisper support
3. **Batch operations** - Improve multi-episode processing
4. **Error recovery** - Enhanced failure handling

### Phase 3: Production Ready
1. **Deployment optimization** - Streamline Netlify configuration
2. **Performance** - Optimize large feed handling
3. **User management** - Session persistence and preferences
4. **Cost optimization** - Provider selection based on requirements

## Important Notes

### Security
- API keys stored in environment variables only
- No credentials committed to repository
- Audio files processed temporarily and cleaned up

### Performance
- Streaming responses prevent timeouts on long transcriptions
- Pagination handles large RSS feeds efficiently
- Caching of transcripts reduces redundant processing

### Compatibility
- Modern browsers with fetch/streaming support
- Node.js ES modules throughout
- React 18 with functional components and hooks

## Debugging & Troubleshooting

### Common Issues
1. **DEEPGRAM_API_KEY missing** - Check backend/.env file
2. **CORS errors** - Ensure backend running on port 4000
3. **Stream parsing fails** - Check network connectivity and audio URLs
4. **Frontend proxy issues** - Verify package.json proxy setting

### Testing Commands
```bash
# Test backend directly
curl -X POST http://localhost:4000/api/rss -H "Content-Type: application/json" -d '{"rssUrl":"https://example.com/feed.xml"}'

# Check saved transcripts
ls -la backend/transcripts/

# Test CLI tool
node podcast-transcribe.js
```

---
*Last updated: January 2025*