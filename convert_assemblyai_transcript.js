const fs = require("fs");

// Function to format AssemblyAI transcript with speakers
function formatAssemblyAITranscript(transcript) {
    if (!transcript || !transcript.results) return "";
    
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
    
    // Fallback to basic transcript if no utterances
    return transcript.results.channels && transcript.results.channels[0] && transcript.results.channels[0].alternatives && transcript.results.channels[0].alternatives[0] ? 
           transcript.results.channels[0].alternatives[0].transcript : "";
}

// Read the AssemblyAI transcript
const transcriptFile = "/Users/charliedeist/Downloads/transcribr-main/backend/transcripts/aHR0cHM6Ly93d3cudG94aW5sZXNzLmNvbS9rbXVkLTIyMTExOC5tcDM_.json";
const transcriptData = JSON.parse(fs.readFileSync(transcriptFile, "utf8"));

const title = transcriptData.title || "Ask the Herb Doctor: November 2022 KMUD (AssemblyAI)";
const transcriptContent = formatAssemblyAITranscript(transcriptData.transcript);

// Calculate duration in minutes
const durationMinutes = Math.round(transcriptData.transcript.metadata.duration / 60);

const markdownContent = `# ${title}

**Date:** ${new Date(transcriptData.pubDate).toLocaleDateString()}  
**Duration:** ${durationMinutes} minutes  
**Generated:** ${new Date(transcriptData.timestamp).toLocaleDateString()}  
**Audio URL:** [Link](${transcriptData.audioUrl})
**Transcription Provider:** AssemblyAI

---

## Transcript

${transcriptContent}

---

*Generated with Transcribr - AI-powered podcast transcription with AssemblyAI speaker diarization*
`;

// Save to a new file with AssemblyAI suffix
const outputFile = "/Users/charliedeist/Downloads/transcribr-main/markdown-transcripts/ask_the_herb_doctor_november_2022_assemblyai.md";
fs.writeFileSync(outputFile, markdownContent);

console.log("✅ AssemblyAI transcript converted to Markdown!");
console.log("📄 File:", outputFile);
console.log("📊 Duration:", durationMinutes, "minutes");
console.log("🎯 Provider: AssemblyAI");
console.log("🔊 Speakers detected:", transcriptData.transcript.results.utterances?.length > 0 ? 
    [...new Set(transcriptData.transcript.results.utterances.map(u => u.speaker))].length : "Unknown");