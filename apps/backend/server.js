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
// Point to project root's output/transcripts/raw directory
const TRANSCRIPTS_DIR = path.join(__dirname, '../../output/transcripts/raw');

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
    const feedInfo = {
      title: feed.title || 'Unknown Podcast',
      description: feed.description || '',
      link: feed.link || '',
      image: feed.image?.url || feed.itunes?.image || '',
      rssUrl
    };

    const episodes = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      audioUrl: item.enclosure?.url || '',
      pubDate: item.pubDate,
      guid: item.guid || item.link,
      description: item.contentSnippet || item.summary || item.content || '',
      duration: item.itunes?.duration || null,
      feedTitle: feedInfo.title,
      feedLink: feedInfo.link
    })).filter(e => e.audioUrl);
    res.json({ feed: feedInfo, episodes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse RSS', details: err.message });
  }
});

// 2. Download audio and send to Deepgram for transcription
const PROGRESS_STAGES = {
  download: { base: 0, range: 35 },
  upload: { base: 35, range: 15 },
  processing: { base: 50, range: 45 },
  saving: { base: 95, range: 5 }
};

const getProgressValue = (stage, ratio = 0) => {
  const config = PROGRESS_STAGES[stage];
  if (!config) return undefined;
  const boundedRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  return Math.round(config.base + config.range * boundedRatio);
};

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

    if (typeof validUpdate.progress === 'number') {
      validUpdate.progress = Math.max(0, Math.min(100, Math.round(validUpdate.progress)));
    }

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
  const { 
    audioUrl, 
    title, 
    pubDate, 
    guid, 
    description, 
    provider = 'assemblyai',
    feedTitle,
    feedUrl,
    rssUrl
  } = req.body;
  if (!audioUrl) return res.status(400).json({ error: 'audioUrl required' });
  try {
    console.log('Checking audio file size...');
    // Get file size before downloading
    const headResp = await axios.head(audioUrl);
    console.log('Head response headers:', headResp.headers);
    const totalSize = parseInt(headResp.headers['content-length'] || 0);
    sendUpdate(res, {
      status: 'downloading',
      stage: 'download',
      message: 'Starting audio download...',
      progress: getProgressValue('download', 0)
    });

    // Download audio file with progress tracking
    const audioResp = await axios.get(audioUrl, { 
      responseType: 'stream',
      onDownloadProgress: (progressEvent) => {
        if (totalSize) {
          const downloadRatio = progressEvent.loaded / totalSize;
          const progress = getProgressValue('download', downloadRatio);
          sendUpdate(res, {
            status: 'downloading',
            stage: 'download',
            message: `Downloading audio: ${Math.min(100, Math.round(downloadRatio * 100))}%`,
            progress
          });
        }
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
      status: 'downloading',
      stage: 'download',
      message: 'Audio download complete',
      progress: getProgressValue('download', 1)
    });

    sendUpdate(res, {
      status: 'processing',
      stage: 'upload',
      message: 'Audio downloaded, preparing for transcription...',
      progress: getProgressValue('upload', 0)
    });

    // Read audio file into a buffer
    const audioBuffer = await fs.promises.readFile(tempPath);
    sendUpdate(res, {
      status: 'processing',
      stage: 'upload',
      message: `Audio file prepared (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB), preparing upload...`,
      progress: getProgressValue('upload', 0.2)
    });

    let transcriptResponse;
    
    if (provider === 'assemblyai') {
      console.log('Sending request to AssemblyAI...');
      sendUpdate(res, {
        status: 'processing',
        stage: 'upload',
        message: 'Uploading audio to AssemblyAI...',
        progress: getProgressValue('upload', 0.35)
      });

      // Step 1: Upload audio file to AssemblyAI
      let uploadResp;
      try {
        uploadResp = await axios.post(
          'https://api.assemblyai.com/v2/upload',
          audioBuffer,
          {
            headers: {
              'authorization': process.env.ASSEMBLYAI_API_KEY,
              'content-type': 'application/octet-stream',
            },
            timeout: 600000,
          }
        );
      } catch (err) {
        console.error('AssemblyAI upload error:', err.response?.data || err.message);
        throw new Error('AssemblyAI upload failed: ' + (err.response?.data?.error || err.message));
      }

      sendUpdate(res, {
        status: 'processing',
        stage: 'upload',
        message: 'Audio uploaded. Submitting transcription job to AssemblyAI...',
        progress: getProgressValue('upload', 1)
      });

      // Step 2: Submit transcription job
      let submitResp;
      try {
        submitResp = await axios.post(
          'https://api.assemblyai.com/v2/transcript',
          {
            audio_url: uploadResp.data.upload_url,
            speaker_labels: true,
            auto_chapters: false,
            auto_highlights: false,
            punctuate: true,
            format_text: true
          },
          {
            headers: {
              'authorization': process.env.ASSEMBLYAI_API_KEY,
              'content-type': 'application/json',
            }
          }
        );
      } catch (err) {
        console.error('AssemblyAI submit error:', err.response?.data || err.message);
        throw new Error('AssemblyAI submit failed: ' + (err.response?.data?.error || err.message));
      }

      const transcript_id = submitResp.data.id;
      console.log('AssemblyAI transcript ID:', transcript_id);

      sendUpdate(res, {
        status: 'processing',
        stage: 'processing',
        message: 'AssemblyAI received the audio. Processing has started... (this may take a few minutes)',
        progress: getProgressValue('processing', 0.05)
      });

      // Step 3: Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 180; // 3 minutes timeout
      
      while (!completed && attempts < maxAttempts) {
        try {
          const statusResp = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${transcript_id}`,
            {
              headers: {
                'authorization': process.env.ASSEMBLYAI_API_KEY
              }
            }
          );

          console.log(`AssemblyAI status (attempt ${attempts + 1}):`, statusResp.data.status);

          if (statusResp.data.status === 'completed') {
            transcriptResponse = statusResp.data;
            completed = true;
            
            // Debug: Log AssemblyAI response structure
            console.log('AssemblyAI response structure:');
            console.log('- Has text:', !!statusResp.data.text);
            console.log('- Has utterances:', !!statusResp.data.utterances);
            console.log('- Utterances count:', statusResp.data.utterances?.length || 0);
            
            if (statusResp.data.utterances?.length > 0) {
              console.log('First few utterances:');
              statusResp.data.utterances.slice(0, 3).forEach((utterance, i) => {
                console.log(`  ${i}: Speaker ${utterance.speaker} - "${utterance.text}"`);
              });
            }
          } else if (statusResp.data.status === 'error') {
            throw new Error('AssemblyAI transcription failed: ' + statusResp.data.error);
          } else {
            // Still processing, wait and try again
            sendUpdate(res, {
              status: 'processing',
              stage: 'processing',
              message: `AssemblyAI ${statusResp.data.status === 'queued' ? 'queueing job' : 'processing audio'} (${attempts + 1}/${maxAttempts})`,
              progress: statusResp.data.status === 'queued'
                ? getProgressValue('processing', 0.15)
                : getProgressValue('processing', 0.5 + Math.min(0.4, attempts / maxAttempts))
            });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        } catch (err) {
          console.error('AssemblyAI polling error:', err.response?.data || err.message);
          throw new Error('AssemblyAI polling failed: ' + (err.response?.data?.error || err.message));
        }
        
        attempts++;
      }

      if (!completed) {
        throw new Error('AssemblyAI transcription timed out after 3 minutes');
      }

      // Convert AssemblyAI format to Deepgram-like format for compatibility
      transcriptResponse = {
        metadata: {
          transaction_key: 'deprecated',
          request_id: transcript_id,
          created: new Date().toISOString(),
          duration: transcriptResponse.audio_duration / 1000, // Convert ms to seconds
          channels: 1,
          models: ['assemblyai']
        },
        results: {
          channels: [{
            alternatives: [{
              transcript: transcriptResponse.text,
              confidence: transcriptResponse.confidence
            }]
          }],
          utterances: transcriptResponse.utterances?.map(utterance => ({
            speaker: utterance.speaker,
            transcript: utterance.text,
            start: utterance.start / 1000, // Convert ms to seconds
            end: utterance.end / 1000,
            confidence: utterance.confidence
          })) || []
        }
      };

    } else {
      // Default to Deepgram
      console.log('Sending request to Deepgram...');
      sendUpdate(res, {
        status: 'processing',
        stage: 'processing',
        message: 'Sending audio to Deepgram for transcription...',
        progress: getProgressValue('processing', 0.2)
      });

      try {
        const deepgramResp = await axios.post(
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
              diarize: true
            },
            maxBodyLength: Infinity,
            timeout: 600000,
          }
        );

        if (!deepgramResp.data || !deepgramResp.data.results) {
          throw new Error('Invalid response from Deepgram: ' + JSON.stringify(deepgramResp.data));
        }

        transcriptResponse = deepgramResp.data;

        sendUpdate(res, {
          status: 'processing',
          stage: 'processing',
          message: 'Deepgram transcription received. Finalizing transcript...',
          progress: getProgressValue('processing', 0.9)
        });

        // Debug: Log the Deepgram response structure
        console.log('Deepgram response structure:');
        console.log('- Has results:', !!deepgramResp.data.results);
        console.log('- Has channels:', !!deepgramResp.data.results?.channels);
        console.log('- Has alternatives:', !!deepgramResp.data.results?.channels?.[0]?.alternatives);
        console.log('- Has utterances:', !!deepgramResp.data.results?.utterances);
        console.log('- Utterances count:', deepgramResp.data.results?.utterances?.length || 0);
        console.log('- Has words:', !!deepgramResp.data.results?.channels?.[0]?.alternatives?.[0]?.words);
        console.log('- Words count:', deepgramResp.data.results?.channels?.[0]?.alternatives?.[0]?.words?.length || 0);
        
        // Log first few utterances if they exist
        if (deepgramResp.data.results?.utterances?.length > 0) {
          console.log('First few utterances:');
          deepgramResp.data.results.utterances.slice(0, 3).forEach((utterance, i) => {
            console.log(`  ${i}: Speaker ${utterance.speaker} - "${utterance.transcript}"`);
          });
        }
        
        // Log first few words if they exist
        if (deepgramResp.data.results?.channels?.[0]?.alternatives?.[0]?.words?.length > 0) {
          console.log('First few words:');
          deepgramResp.data.results.channels[0].alternatives[0].words.slice(0, 5).forEach((word, i) => {
            console.log(`  ${i}: "${word.word}" - Speaker ${word.speaker}`);
          });
        }
      } catch (err) {
        console.error('Deepgram API error:', err.response?.data || err.message);
        throw new Error('Deepgram transcription failed: ' + (err.response?.data?.error || err.message));
      }
    }

    // Clean up temporary file
    fs.unlink(tempPath, (err) => { 
      if (err) {
        console.error('Error unlinking temp audio file:', err); 
      } else {
        console.log(`Temporary file removed: ${tempPath}`);
      }
    });
    sendUpdate(res, {
      status: 'processing',
      stage: 'saving',
      message: 'Formatting transcript and saving...',
      progress: getProgressValue('saving', 0.5)
    });
    // Save transcript to file
    const transcriptData = {
      timestamp: new Date().toISOString(),
      audioUrl,
      title: title || 'Unknown Episode',
      pubDate: pubDate || new Date().toISOString(),
      guid: guid || null,
      description: description || null,
      transcript: transcriptResponse,
      provider: provider,
      feedTitle: feedTitle || null,
      feedUrl: feedUrl || null,
      rssUrl: rssUrl || null
    };
    
    const safeFileName = Buffer.from(audioUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '_');
    const transcriptPath = path.join(TRANSCRIPTS_DIR, `${safeFileName}.json`);
    
    fs.writeFileSync(transcriptPath, JSON.stringify(transcriptData, null, 2));
    console.log(`Transcript saved to: ${transcriptPath}`);
    
    console.log(`${provider} response received`);
    sendUpdate(res, {
      status: 'complete',
      stage: 'complete',
      message: 'Transcription complete!',
      progress: 100,
      transcript: transcriptResponse
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

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  app.use(express.static(frontendBuildPath));
  
  // Handle React Router - send all non-API requests to React
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
  console.log(`Speaker diarization enabled via AssemblyAI`);
});
