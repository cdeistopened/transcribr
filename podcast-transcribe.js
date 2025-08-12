import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RSS_URL = 'https://davidgornoski.libsyn.com/rss';
const BACKEND_URL = 'http://localhost:4000'; // Adjust if your backend runs on a different port
const THREE_YEARS_AGO = new Date();
THREE_YEARS_AGO.setFullYear(THREE_YEARS_AGO.getFullYear() - 3);
const CHECKLIST_FILE = path.join(__dirname, 'episode-checklist.json');

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Fetch episodes from RSS feed using the backend
 */
async function fetchEpisodes() {
  try {
    console.log(`Fetching episodes from ${RSS_URL}...`);
    const response = await axios.post(`${BACKEND_URL}/api/rss`, { rssUrl: RSS_URL });
    return response.data.episodes;
  } catch (error) {
    console.error('Error fetching episodes:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Filter episodes to only include those from the past three years
 */
function filterRecentEpisodes(episodes) {
  return episodes.filter(episode => {
    const pubDate = new Date(episode.pubDate);
    return pubDate >= THREE_YEARS_AGO;
  });
}

/**
 * Save episodes to a checklist file
 */
function saveChecklist(episodes) {
  // Add a transcribed flag to each episode
  const checklist = episodes.map(episode => ({
    ...episode,
    transcribed: false
  }));
  
  fs.writeFileSync(CHECKLIST_FILE, JSON.stringify(checklist, null, 2));
  console.log(`Saved ${checklist.length} episodes to ${CHECKLIST_FILE}`);
  return checklist;
}

/**
 * Load the checklist from file if it exists
 */
function loadChecklist() {
  if (fs.existsSync(CHECKLIST_FILE)) {
    const data = fs.readFileSync(CHECKLIST_FILE, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

/**
 * Transcribe a single episode
 */
async function transcribeEpisode(episode) {
  console.log(`Transcribing: ${episode.title}`);
  try {
    const response = await axios.post(`${BACKEND_URL}/api/transcribe`, {
      audioUrl: episode.audioUrl
    }, {
      // Set up to handle streaming response
      responseType: 'text',
      onDownloadProgress: progressEvent => {
        const dataChunk = progressEvent.currentTarget.response;
        // Split response by newlines to handle multiple JSON objects
        const lines = dataChunk.split('\n').filter(line => line.trim());
        
        // Process only the last line to show current status
        if (lines.length > 0) {
          try {
            const lastUpdate = JSON.parse(lines[lines.length - 1]);
            process.stdout.write(`\r${lastUpdate.message || lastUpdate.status}${' '.repeat(20)}`);
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    });
    
    console.log('\nTranscription complete!');
    return true;
  } catch (error) {
    console.error('\nError transcribing episode:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

/**
 * Update the transcribed status in the checklist
 */
function updateChecklist(index, transcribed = true) {
  const checklist = loadChecklist();
  if (checklist && checklist[index]) {
    checklist[index].transcribed = transcribed;
    fs.writeFileSync(CHECKLIST_FILE, JSON.stringify(checklist, null, 2));
    console.log(`Updated status for "${checklist[index].title}"`);
  }
}

/**
 * Display the checklist with numbers
 */
function displayChecklist(checklist) {
  console.log('\n===== EPISODE CHECKLIST =====');
  checklist.forEach((episode, index) => {
    const date = new Date(episode.pubDate).toLocaleDateString();
    const status = episode.transcribed ? '[✓]' : '[ ]';
    console.log(`${index + 1}. ${status} ${date} - ${episode.title}`);
  });
  console.log('===========================\n');
}

/**
 * Interactive menu
 */
async function showMenu(checklist) {
  displayChecklist(checklist);
  
  console.log('OPTIONS:');
  console.log('1. Transcribe all untranscribed episodes');
  console.log('2. Transcribe a specific episode');
  console.log('3. Refresh episode list from RSS');
  console.log('4. Exit');
  
  rl.question('Enter your choice: ', async (choice) => {
    switch (choice) {
      case '1':
        for (let i = 0; i < checklist.length; i++) {
          if (!checklist[i].transcribed) {
            const success = await transcribeEpisode(checklist[i]);
            updateChecklist(i, success);
          }
        }
        showMenu(loadChecklist());
        break;
        
      case '2':
        rl.question('Enter episode number to transcribe: ', async (num) => {
          const index = parseInt(num) - 1;
          if (index >= 0 && index < checklist.length) {
            const success = await transcribeEpisode(checklist[index]);
            updateChecklist(index, success);
            showMenu(loadChecklist());
          } else {
            console.log('Invalid episode number');
            showMenu(checklist);
          }
        });
        break;
        
      case '3':
        await main(true);
        break;
        
      case '4':
        rl.close();
        break;
        
      default:
        console.log('Invalid choice');
        showMenu(checklist);
    }
  });
}

/**
 * Main function
 */
async function main(forceRefresh = false) {
  try {
    let checklist = !forceRefresh && loadChecklist();
    
    if (!checklist) {
      // Fetch and filter episodes
      const allEpisodes = await fetchEpisodes();
      console.log(`Fetched ${allEpisodes.length} total episodes`);
      
      const recentEpisodes = filterRecentEpisodes(allEpisodes);
      console.log(`Found ${recentEpisodes.length} episodes from the past three years`);
      
      // Save filtered episodes to checklist
      checklist = saveChecklist(recentEpisodes);
    }
    
    // Show interactive menu
    showMenu(checklist);
    
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Start the program
main();
