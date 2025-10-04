import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to new architecture paths
const TRANSCRIPTS_DIR = path.join(__dirname, '../../output/transcripts/raw');
const MARKDOWN_DIR = path.join(__dirname, '../../output/transcripts/markdown');

// Ensure markdown directory exists
if (!fs.existsSync(MARKDOWN_DIR)) {
    fs.mkdirSync(MARKDOWN_DIR, { recursive: true });
}

function formatTranscriptWithSpeakers(transcript) {
    if (!transcript || !transcript.results) return "";
    
    // Handle AssemblyAI format with utterances
    if (transcript.results.utterances && transcript.results.utterances.length > 0) {
        let formattedText = "";
        
        transcript.results.utterances.forEach((utterance, index) => {
            if (index > 0) {
                formattedText += "\n\n";
            }
            formattedText += `[Speaker ${utterance.speaker}]: ${utterance.transcript}`;
        });
        
        return formattedText;
    }
    
    // Handle Deepgram format with utterances
    if (transcript.results?.utterances && transcript.results.utterances.length > 0) {
        let formattedText = "";
        let previousSpeaker = null;
        
        transcript.results.utterances.forEach((utterance, index) => {
            if (utterance.speaker !== previousSpeaker) {
                if (index > 0) {
                    formattedText += "\n\n";
                }
                formattedText += `[Speaker ${utterance.speaker}]: ${utterance.transcript}`;
                previousSpeaker = utterance.speaker;
            } else {
                formattedText += ` ${utterance.transcript}`;
            }
        });
        
        return formattedText;
    }
    
    // Fallback to basic transcript
    return transcript.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}

function createMarkdownFromTranscript(transcriptData) {
    const title = transcriptData.title || "Unknown Episode";
    const transcriptContent = formatTranscriptWithSpeakers(transcriptData.transcript);
    const provider = transcriptData.provider || "Unknown";
    
    // Calculate duration in minutes
    const durationSeconds = transcriptData.transcript?.metadata?.duration || 0;
    const durationMinutes = Math.round(durationSeconds / 60);
    
    const pubDate = transcriptData.pubDate ? new Date(transcriptData.pubDate).toLocaleDateString() : "Unknown";
    const generated = transcriptData.timestamp ? new Date(transcriptData.timestamp).toLocaleDateString() : "Unknown";

    return `# ${title}

**Date:** ${pubDate}  
**Duration:** ${durationMinutes} minutes  
**Generated:** ${generated}  
**Audio URL:** [Link](${transcriptData.audioUrl})
**Transcription Provider:** ${provider}

---

## Transcript

${transcriptContent}

---

*Generated with Transcribr - AI-powered podcast transcription with ${provider} speaker diarization*
`;
}

function sanitizeFilename(filename) {
    return filename
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

function convertAllTranscripts() {
    const files = fs.readdirSync(TRANSCRIPTS_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} transcript files to process`);
    
    let converted = 0;
    let skipped = 0;
    
    jsonFiles.forEach(file => {
        try {
            const filePath = path.join(TRANSCRIPTS_DIR, file);
            const transcriptData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Generate markdown filename
            const title = transcriptData.title || "unknown_episode";
            const provider = transcriptData.provider || "unknown";
            const sanitizedTitle = sanitizeFilename(title);
            const markdownFilename = `${sanitizedTitle}_${provider}.md`;
            const markdownPath = path.join(MARKDOWN_DIR, markdownFilename);
            
            // Skip if already exists
            if (fs.existsSync(markdownPath)) {
                console.log(`⏭️  Skipped: ${markdownFilename} (already exists)`);
                skipped++;
                return;
            }
            
            // Generate markdown content
            const markdownContent = createMarkdownFromTranscript(transcriptData);
            
            // Write markdown file
            fs.writeFileSync(markdownPath, markdownContent);
            
            console.log(`✅ Converted: ${file} → ${markdownFilename}`);
            converted++;
            
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Converted: ${converted} files`);
    console.log(`   ⏭️  Skipped: ${skipped} files`);
    console.log(`   📁 Output directory: ${MARKDOWN_DIR}`);
}

// Run the conversion
convertAllTranscripts();