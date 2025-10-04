# Transcribr 🎙️

> Full-featured podcast transcription tool with episode selection and queue management

A web-based tool for batch transcribing podcast episodes from RSS feeds using AI transcription services.

![Transcription Demo](https://img.shields.io/badge/Status-Active-green)
![License](https://img.shields.io/badge/License-ISC-blue)
![Node](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)

## Features ✨

- 📡 **RSS Feed Parsing** - Input any podcast RSS URL
- ☑️ **Episode Selection** - Choose episodes with checkboxes
- 🤖 **AI Transcription** - Powered by Deepgram API with speaker diarization
- 📊 **Real-time Progress** - Streaming updates during transcription
- 💾 **Smart Storage** - Organized JSON and markdown outputs
- 📄 **Export Options** - Download individual transcripts
- 🗓️ **Year Grouping** - Episodes organized chronologically
- 🔄 **CLI Support** - Command-line interface for automation

## Quick Start 🚀

### Prerequisites
- Node.js 18+
- Deepgram API key ([Get one here](https://deepgram.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/transcribr.git
cd transcribr

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Configuration

Create `backend/.env`:
```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Running Locally

```bash
# Terminal 1: Start backend server
cd backend
npm start  # Runs on port 4000

# Terminal 2: Start frontend
cd frontend  
npm start  # Runs on port 3000
```

Visit `http://localhost:3000` to use the web interface.

### CLI Usage

```bash
# Run the command-line interface
node podcast-transcribe.js
```

## Usage 📖

### Web Interface
1. Enter any podcast RSS feed URL
2. Browse episodes with pagination and year grouping
3. Select episodes using checkboxes
4. Click "Transcribe Selected" to start processing
5. Monitor real-time progress updates
6. View and download completed transcripts

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rss` | POST | Parse RSS feed and return episodes |
| `/api/transcribe` | POST | Transcribe audio with streaming progress |
| `/api/transcripts` | GET | Get all saved transcripts |
| `/api/transcript/find` | POST | Find specific transcript by audio URL |

## Architecture 🏗️

```
transcribr/
├── backend/           # Express.js server
│   ├── server.js      # Main server file
│   ├── transcripts/   # JSON transcript storage
│   └── package.json
├── frontend/          # React application
│   ├── src/
│   │   ├── App.js     # Main React component
│   │   └── ...
│   └── package.json
├── netlify/           # Deployment functions
├── podcast-transcribe.js  # CLI tool
└── CLAUDE.md         # Development documentation
```

## Technology Stack 🛠️

**Backend:**
- Express.js - Web server
- Deepgram API - AI transcription
- RSS Parser - Feed parsing
- Streaming responses - Real-time updates

**Frontend:**
- React 18 - User interface
- Fetch API - HTTP client
- Responsive design - Mobile-friendly

**CLI:**
- Node.js readline - Interactive prompts
- Axios - HTTP requests
- JSON storage - Progress persistence

## Development 👨‍💻

### Testing
```bash
# Test RSS parsing
curl -X POST http://localhost:4000/api/rss \
  -H "Content-Type: application/json" \
  -d '{"rssUrl":"https://example.com/feed.xml"}'

# Check saved transcripts
ls -la backend/transcripts/
```

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Deployment 🚀

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
# Build frontend
cd frontend && npm run build

# Deploy backend to your preferred hosting service
```

## Configuration ⚙️

### Environment Variables
- `DEEPGRAM_API_KEY` - Your Deepgram API key (required)
- `PORT` - Backend server port (default: 4000)

### Customization
- Modify transcription parameters in `backend/server.js`
- Adjust pagination settings in `frontend/src/App.js`
- Configure RSS URL in `podcast-transcribe.js` for CLI

## Troubleshooting 🔧

### Common Issues

**Backend not starting:**
- Check if port 4000 is available: `lsof -ti:4000`
- Verify Deepgram API key in `.env` file

**Frontend proxy errors:**
- Ensure backend is running on port 4000
- Check `package.json` proxy setting

**Transcription failures:**
- Verify audio URL accessibility
- Check Deepgram API key validity
- Monitor network connectivity

### Debug Commands
```bash
# Check backend logs
tail -f backend/server.log

# Test API directly
curl http://localhost:4000/api/transcripts
```

## License 📝

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- [Deepgram](https://deepgram.com) for AI transcription services
- [RSS Parser](https://www.npmjs.com/package/rss-parser) for feed parsing
- React community for excellent documentation

## Support 💬

For questions, issues, or feature requests:
- Open an [issue](https://github.com/yourusername/transcribr/issues)
- Check existing [documentation](CLAUDE.md)
- Review [troubleshooting](#troubleshooting-) section

---

Built with ❤️ for podcast transcription automation# transcribr
# transcribr
