const fs = require("fs");
const path = require("path");

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(prompt) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini", // Very cheap model - ~$0.15/1M input tokens, ~$0.075/1M output
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 16000 // Allow for long responses
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function extractTranscriptContent(markdownContent) {
    // Extract title
    const titleMatch = markdownContent.match(/^# (.+)/m);
    const title = titleMatch ? titleMatch[1] : "Unknown Episode";
    
    // Extract transcript section
    const transcriptMatch = markdownContent.match(/## Transcript\n\n([\s\S]+?)\n\n---/);
    if (!transcriptMatch) {
        throw new Error("Could not find transcript section in markdown file");
    }
    
    return {
        title,
        rawTranscript: transcriptMatch[1],
        fullContent: markdownContent
    };
}

function createPolishingPrompt(title, rawTranscript) {
    return `You are polishing a podcast transcript according to specific fidelity-first rules. Your goal is maximum readability while preserving all original content and meaning.

**EPISODE:** ${title}

**POLISHING RULES:**
1. **Speaker Labels**: Convert [Speaker A], [Speaker B] etc. to **Andrew Murray:**, **Dr. Raymond Peat:**, **Caller:** format with bold labels and colons
2. **Section Headers**: Add H2 (##) headers for clear topic changes - use 3-8 word titles drawn from actual dialog
3. **Conservative Micro-edits ONLY**:
   - Remove: "um", "uh", "er", meaningless stutters, immediate false starts
   - Fix: obvious typos, sentence punctuation, spacing
4. **Preserve Exactly**: Technical terms, names, numbers, hedges, examples, meaningful repetition, all content
5. **DO NOT**: Condense, summarize, paraphrase, reorder, merge, or drop content beyond micro-edits

**ORIGINAL TRANSCRIPT:**
${rawTranscript}

**INSTRUCTIONS:**
Return the polished transcript with proper speaker names and section breaks. Keep chronological order. Err on fidelity over perfection.

Start with the first speaker turn:`;
}

async function polishTranscript(inputFile) {
    console.log(`📖 Reading transcript: ${inputFile}`);
    
    const markdownContent = fs.readFileSync(inputFile, 'utf8');
    const { title, rawTranscript, fullContent } = extractTranscriptContent(markdownContent);
    
    console.log(`📊 Transcript stats:`);
    console.log(`   Title: ${title}`);
    console.log(`   Length: ${rawTranscript.length} characters`);
    console.log(`   Estimated tokens: ~${Math.ceil(rawTranscript.length / 4)}`);
    
    const prompt = createPolishingPrompt(title, rawTranscript);
    
    console.log(`🤖 Sending to OpenAI GPT-4o-mini...`);
    console.log(`💰 Estimated cost: ~$${(prompt.length / 4 / 1000000 * 0.15).toFixed(4)} (very cheap!)`);
    
    try {
        const polishedContent = await callOpenAI(prompt);
        
        // Create polished markdown file
        const polishedMarkdown = fullContent.replace(
            /## Transcript\n\n[\s\S]+?\n\n---/,
            `## Transcript\n\n${polishedContent}\n\n---`
        );
        
        // Save polished version
        const outputFile = inputFile.replace('.md', '_polished.md');
        fs.writeFileSync(outputFile, polishedMarkdown);
        
        console.log(`✅ Polished transcript saved: ${outputFile}`);
        console.log(`📄 Output length: ${polishedContent.length} characters`);
        
        return outputFile;
        
    } catch (error) {
        console.error(`❌ Error polishing transcript:`, error.message);
        throw error;
    }
}

// Main execution
async function main() {
    const transcriptFile = process.argv[2] || "ask_the_herb_doctor_may_2022_kmud_assemblyai.md";
    const fullPath = path.join(__dirname, 'markdown-transcripts', transcriptFile);
    
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ File not found: ${fullPath}`);
        process.exit(1);
    }
    
    try {
        await polishTranscript(fullPath);
        console.log(`🎯 Success! Transcript polished with proper speaker diarization and formatting.`);
    } catch (error) {
        console.error(`💥 Failed to polish transcript:`, error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { polishTranscript };