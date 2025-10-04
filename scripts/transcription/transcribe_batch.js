#!/usr/bin/env node

/**
 * Batch Transcription Script using AssemblyAI Backend
 * Transcribes first 10 episodes from Ray Peat RSS feed
 */

import axios from 'axios';
import RSSParser from 'rss-parser';

const RSS_URL = 'https://www.toxinless.com/peat/podcast.rss';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const BATCH_SIZE = 10;

const parser = new RSSParser();

async function main() {
  console.log('🎙️  Ray Peat Batch Transcription Script');
  console.log('========================================\n');

  // Check if backend is running
  try {
    await axios.get(`${SERVER_URL}/api/transcripts`);
    console.log('✓ Backend server is running at', SERVER_URL);
  } catch (err) {
    console.error('✗ Backend server not running at', SERVER_URL);
    console.error('Please start the backend first:');
    console.error('  cd backend && node server.js\n');
    process.exit(1);
  }

  // Fetch RSS feed
  console.log('\nFetching RSS feed...');
  let feed;
  try {
    feed = await parser.parseURL(RSS_URL);
    console.log(`✓ Found ${feed.items.length} episodes\n`);
  } catch (err) {
    console.error('✗ Failed to fetch RSS feed:', err.message);
    process.exit(1);
  }

  // Get first 10 episodes
  const episodes = feed.items.slice(0, BATCH_SIZE);
  console.log(`Processing first ${episodes.length} episodes:\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < episodes.length; i++) {
    const episode = episodes[i];
    const audioUrl = episode.enclosure?.url;
    
    if (!audioUrl) {
      console.log(`${i + 1}/${episodes.length} ✗ Skipping: ${episode.title} (no audio URL)`);
      failCount++;
      continue;
    }

    console.log(`\n${i + 1}/${episodes.length} 🎧 ${episode.title}`);
    console.log(`    Audio: ${audioUrl}`);

    try {
      // Check if already transcribed
      const checkResponse = await axios.post(`${SERVER_URL}/api/transcript/find`, {
        audioUrl: audioUrl
      }).catch(() => null);

      if (checkResponse?.data) {
        console.log(`    ✓ Already transcribed (skipping)`);
        successCount++;
        continue;
      }

      // Submit transcription request
      console.log(`    ⏳ Submitting to AssemblyAI...`);
      
      const response = await axios.post(`${SERVER_URL}/api/transcribe`, {
        audioUrl: audioUrl,
        title: episode.title,
        pubDate: episode.pubDate,
        guid: episode.guid,
        description: episode.contentSnippet || episode.content,
        provider: 'assemblyai',
        feedTitle: 'Ray Peat Interviews',
        rssUrl: RSS_URL
      }, {
        timeout: 600000, // 10 minute timeout
        responseType: 'stream'
      });

      // Monitor progress from streaming response
      let lastStatus = '';
      response.data.on('data', (chunk) => {
        try {
          const lines = chunk.toString().split('\n').filter(l => l.trim());
          for (const line of lines) {
            const update = JSON.parse(line);
            if (update.status !== lastStatus) {
              console.log(`    📊 ${update.message || update.status}`);
              lastStatus = update.status;
            }
            if (update.status === 'complete') {
              console.log(`    ✓ Transcription complete!`);
              successCount++;
            } else if (update.status === 'error') {
              console.log(`    ✗ Error: ${update.message}`);
              failCount++;
            }
          }
        } catch (e) {
          // Ignore JSON parse errors from incomplete chunks
        }
      });

      await new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });

    } catch (err) {
      console.log(`    ✗ Failed: ${err.response?.data?.error || err.message}`);
      failCount++;
    }

    // Brief pause between requests
    if (i < episodes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n========================================');
  console.log('📊 Batch Transcription Summary');
  console.log('========================================');
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Total: ${episodes.length}`);
  console.log('\nTranscripts saved to: backend/transcripts/');
  console.log(`\nTo view transcripts: curl ${SERVER_URL}/api/transcripts`);
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});

