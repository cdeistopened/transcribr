import express from 'express';
import cors from 'cors';
import RSSParser from 'rss-parser';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TRANSCRIPTS_DIR = path.join(__dirname, 'transcripts');

// Ensure transcripts directory exists
if (!fs.existsSync(TRANSCRIPTS_DIR)) {
    fs.mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
}

dotenv.config();

const app = express();
const parser = new RSSParser();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// 1. Parse RSS feed and return episode metadata
app.post('/api/rss', async (req, res) => {
  const { rssUrl } = req.body;
  if (!rssUrl) return res.status(400).json({ error: 'rssUrl required' });
  try {
    const feed = await parser.parseURL(rssUrl);
    const episodes = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      audioUrl: item.enclosure?.url || '',
      pubDate: item.pubDate,
      guid: item.guid || item.link,
    })).filter(e => e.audioUrl);
    res.json({ episodes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse RSS', details: err.message });
  }
});

// 2. Download audio and send to Deepgram for transcription
const sendUpdate = (res, update) => {
  if (!res.writable) {
    console.error('Response stream is not writable');
    return;
  }

  try {
    // Ensure update has required fields
    const validUpdate = {
      timestamp: new Date().toISOString(),
      ...update,
      status: update.status || 'unknown'
    };

    const jsonString = JSON.stringify(validUpdate);
    console.log('Sending update:', jsonString);
    
    // Ensure string ends with newline
    res.write(jsonString + '\n', 'utf8', (err) => {
      if (err) {
        console.error('Error writing to response stream:', err);
      }
    });
  } catch (err) {
    console.error('Error preparing update:', err, '\nUpdate was:', update);
  }
};

app.post('/api/transcribe', async (req, res) => {
  console.log('Received transcription request:', req.body);
  // Set headers for streaming response
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const { audioUrl } = req.body;
  if (!audioUrl) return res.status(400).json({ error: 'audioUrl required' });
  try {
    console.log('Checking audio file size...');
    // Get file size before downloading
    const headResp = await axios.head(audioUrl);
    console.log('Head response headers:', headResp.headers);
    const totalSize = parseInt(headResp.headers['content-length'] || 0);
    sendUpdate(res, { status: 'downloading', message: 'Starting audio download...', progress: 0 });

    // Download audio file with progress tracking
    const audioResp = await axios.get(audioUrl, { 
      responseType: 'stream',
      onDownloadProgress: (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / totalSize);
        sendUpdate(res, {
          status: 'downloading',
          message: `Downloading audio: ${progress}%`,
          progress
        });
      }
    });

    const tempPath = path.join('/tmp', `audio_${Date.now()}_${path.basename(new URL(audioUrl).pathname)}`);
    const writer = fs.createWriteStream(tempPath);
    
    await new Promise((resolve, reject) => {
      audioResp.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    sendUpdate(res, {
      status: 'processing',
      message: 'Audio downloaded, preparing for transcription...'
    });

    // Read audio file into a buffer
    const audioBuffer = await fs.promises.readFile(tempPath);
    sendUpdate(res, {
      status: 'processing',
      message: `Audio file prepared (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB), sending to Deepgram...`
    });

    console.log('Sending request to Deepgram...');
    sendUpdate(res, {
      status: 'processing',
      message: 'Sending audio to Deepgram for transcription...'
    });

    let deepgramResp;
    try {
      deepgramResp = await axios.post(
        'https://api.deepgram.com/v1/listen',
        audioBuffer,
        {
          headers: {
            'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': 'application/octet-stream',
          },
          params: {
            model: 'nova-2',
            smart_format: true,
            utterances: true,
            punctuate: true,
            diarize: true,
            diarize_version: '3'
          },
          maxBodyLength: Infinity,
          timeout: 600000,
        }
      );

      if (!deepgramResp.data || !deepgramResp.data.results) {
        throw new Error('Invalid response from Deepgram: ' + JSON.stringify(deepgramResp.data));
      }
    } catch (err) {
      console.error('Deepgram API error:', err.response?.data || err.message);
      throw new Error('Deepgram transcription failed: ' + (err.response?.data?.error || err.message));
    }

    // Clean up temporary file
    fs.unlink(tempPath, (err) => { 
      if (err) {
        console.error('Error unlinking temp audio file:', err); 
      } else {
        console.log(`Temporary file removed: ${tempPath}`);
      }
    });
    // Save transcript to file
    const transcriptData = {
      timestamp: new Date().toISOString(),
      audioUrl,
      transcript: deepgramResp.data
    };
    
    const safeFileName = Buffer.from(audioUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '_');
    const transcriptPath = path.join(TRANSCRIPTS_DIR, `${safeFileName}.json`);
    
    fs.writeFileSync(transcriptPath, JSON.stringify(transcriptData, null, 2));
    console.log(`Transcript saved to: ${transcriptPath}`);
    
    console.log('Deepgram response received');
    sendUpdate(res, {
      status: 'complete',
      message: 'Transcription complete!',
      transcript: deepgramResp.data
    });
    res.end();
  } catch (err) {
    console.error('Transcription error details:', err);
    console.error('Error stack:', err.stack);
    
    // Send detailed error information
    sendUpdate(res, { 
      status: 'error',
      message: 'Transcription failed: ' + (err.response?.data?.error || err.message),
      error: {
        message: err.message,
        type: err.name,
        response: err.response?.data
      }
    });
    
    res.end();
  } finally {
    // No-op
  }
});

// Get all saved transcripts
app.get('/api/transcripts', (req, res) => {
  try {
    const files = fs.readdirSync(TRANSCRIPTS_DIR);
    const transcripts = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const content = fs.readFileSync(path.join(TRANSCRIPTS_DIR, file), 'utf8');
        return JSON.parse(content);
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ transcripts });
  } catch (err) {
    console.error('Error reading transcripts:', err);
    res.status(500).json({ error: 'Failed to read transcripts' });
  }
});

// Get a specific transcript by audio URL
app.post('/api/transcript/find', (req, res) => {
  try {
    const { audioUrl } = req.body;
    if (!audioUrl) {
      return res.status(400).json({ error: 'audioUrl required' });
    }

    const safeFileName = Buffer.from(audioUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '_');
    const transcriptPath = path.join(TRANSCRIPTS_DIR, `${safeFileName}.json`);

    if (fs.existsSync(transcriptPath)) {
      const content = fs.readFileSync(transcriptPath, 'utf8');
      res.json(JSON.parse(content));
    } else {
      res.status(404).json({ error: 'Transcript not found' });
    }
  } catch (err) {
    console.error('Error finding transcript:', err);
    res.status(500).json({ error: 'Failed to find transcript' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
