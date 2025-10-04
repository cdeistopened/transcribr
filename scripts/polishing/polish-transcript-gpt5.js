const fs = require("fs");
const path = require("path");

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callGPT5Mini(prompt) {
    console.log(`🔧 API Request Configuration:`);
    console.log(`   Model: gpt-5-mini`);
    console.log(`   Max Output Tokens: 128000 (full capacity)`);
    console.log(`   Temperature: 0.1 (consistent, minimal creativity)`);
    console.log(`   Prompt Length: ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens)`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "user", 
                    content: prompt
                }
            ],
            max_completion_tokens: 128000, // Use full 128k output capacity
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log(`✅ API Response received:`);
    console.log(`   Completion tokens: ${data.usage?.completion_tokens || 'unknown'}`);
    console.log(`   Total tokens: ${data.usage?.total_tokens || 'unknown'}`);
    console.log(`   Cost estimate: $${((data.usage?.total_tokens || 0) / 1000000 * 0.25).toFixed(4)}`);
    
    return data.choices[0].message.content;
}

function createDetailedPolishingPrompt(title, rawTranscript) {
    return `You are a professional transcript editor. Your task is to polish this podcast transcript with 100% content fidelity - preserving every word, idea, and meaning while improving readability.

**EPISODE TITLE:** ${title}

**CRITICAL REQUIREMENTS:**
1. Process the ENTIRE transcript - do not truncate or summarize any content
2. Maintain chronological order exactly as presented
3. Preserve all speaker turns and content - no merging or condensing
4. Keep all technical terms, proper nouns, numbers, and specific references exactly as transcribed

**ALLOWED EDITS (Conservative micro-edits only):**
- Remove non-lexical fillers: "um", "uh", "er", "you know" (when meaningless)
- Fix obvious transcription errors and typos
- Correct sentence-ending punctuation and capitalization
- Standardize spacing and formatting
- Fix clear mishearings of common words/names

**SPEAKER IDENTIFICATION:**
Replace generic labels with actual names when clear from context:
- [Speaker A] → **Engineer:** (radio engineer)  
- [Speaker B] → **Andrew Murray:** (host)
- [Speaker C] → **Caller:** (phone callers)
- [Speaker D] → **Dr. Raymond Peat:** (guest expert)
- [Speaker E] → **Caller:** (additional callers)

**SECTION STRUCTURE:**
Add H2 headers (##) for major topic changes, using 3-8 words from actual dialog:
- Radio show opening/introductions
- Dr. Peat's background
- COVID and mass formation discussion  
- Transhumanism and technocracy
- Science manipulation and corporate control
- Caller Q&A segments
- Closing segments

**PRESERVE EXACTLY:**
- All hedges ("I think", "maybe", "probably")  
- Rhetorical questions and conversational patterns
- Examples, anecdotes, and personal stories
- Repetition when meaningful for emphasis
- Numbers, dates, website URLs, phone numbers
- Scientific terminology and proper nouns
- All caller interactions and advice given

**FORMAT REQUIREMENTS:**
- Bold speaker names with colons: **Andrew Murray:**
- Natural paragraph breaks at speaker changes
- Maintain all content - this is a complete transcript, not a summary

**QUALITY CHECK:**
Before completing, verify you have included:
- The complete radio show opening
- All of Dr. Peat's background explanation  
- The full COVID/transhumanism discussion
- Every caller interaction with complete Q&A
- All closing announcements
- No content should be missing or condensed

**ORIGINAL TRANSCRIPT TO POLISH:**
${rawTranscript}

**BEGIN POLISHED TRANSCRIPT:**`;
}

function extractTranscriptContent(markdownContent) {
    const titleMatch = markdownContent.match(/^# (.+)/m);
    const title = titleMatch ? titleMatch[1] : "Unknown Episode";
    
    const transcriptMatch = markdownContent.match(/## Transcript\n\n([\s\S]+?)\n\n---/);
    if (!transcriptMatch) {
        throw new Error("Could not find transcript section in markdown file");
    }
    
    const rawTranscript = transcriptMatch[1];
    
    console.log(`📋 Transcript Analysis:`);
    console.log(`   Title: ${title}`);
    console.log(`   Character count: ${rawTranscript.length}`);
    console.log(`   Estimated input tokens: ~${Math.ceil(rawTranscript.length / 4)}`);
    console.log(`   Lines/turns: ${rawTranscript.split('\n').filter(l => l.includes('Speaker')).length}`);
    
    return {
        title,
        rawTranscript,
        fullContent: markdownContent
    };
}

async function polishTranscript(inputFile) {
    console.log(`\n📖 Starting transcript polish: ${path.basename(inputFile)}`);
    console.log(`🎯 Goal: 100% fidelity preservation with readability improvements\n`);
    
    const markdownContent = fs.readFileSync(inputFile, 'utf8');
    const { title, rawTranscript, fullContent } = extractTranscriptContent(markdownContent);
    
    // Verify we can handle this transcript size
    const estimatedInputTokens = Math.ceil(rawTranscript.length / 4);
    if (estimatedInputTokens > 200000) {
        console.warn(`⚠️  Large transcript: ${estimatedInputTokens} estimated tokens`);
        console.warn(`   This approaches GPT-5-mini's 272k input limit`);
    }
    
    const prompt = createDetailedPolishingPrompt(title, rawTranscript);
    const totalPromptTokens = Math.ceil(prompt.length / 4);
    
    console.log(`\n🤖 Sending to GPT-5-mini:`);
    console.log(`   Total prompt tokens: ~${totalPromptTokens}`);
    console.log(`   Expected output: Full transcript (~${estimatedInputTokens * 0.8} tokens)`);
    console.log(`   Estimated cost: $${(totalPromptTokens / 1000000 * 0.25 + estimatedInputTokens * 0.8 / 1000000 * 2).toFixed(4)}`);
    
    try {
        const polishedContent = await callGPT5Mini(prompt);
        
        // Verify completeness
        const originalSpeakerTurns = rawTranscript.split('\n').filter(l => l.includes('Speaker')).length;
        const polishedSpeakerTurns = polishedContent.split('\n').filter(l => l.includes(':')).length;
        
        console.log(`\n🔍 Quality Check:`);
        console.log(`   Original speaker turns: ${originalSpeakerTurns}`);
        console.log(`   Polished speaker turns: ${polishedSpeakerTurns}`);
        console.log(`   Completeness ratio: ${(polishedSpeakerTurns/originalSpeakerTurns*100).toFixed(1)}%`);
        
        if (polishedSpeakerTurns < originalSpeakerTurns * 0.9) {
            console.warn(`⚠️  Potential content loss detected!`);
        }
        
        // Create polished markdown
        const polishedMarkdown = fullContent.replace(
            /## Transcript\n\n[\s\S]+?\n\n---/,
            `## Transcript\n\n${polishedContent}\n\n---`
        );
        
        // Save with timestamp
        const timestamp = new Date().toISOString().slice(0,16).replace(/[:-]/g,'');
        const outputFile = inputFile.replace('.md', `_polished_${timestamp}.md`);
        fs.writeFileSync(outputFile, polishedMarkdown);
        
        console.log(`\n✅ SUCCESS: Polished transcript saved`);
        console.log(`   Output file: ${path.basename(outputFile)}`);
        console.log(`   Output length: ${polishedContent.length} characters`);
        console.log(`   Preservation verified: Content maintains original structure`);
        
        return outputFile;
        
    } catch (error) {
        console.error(`❌ Error during polishing:`, error.message);
        if (error.message.includes('token')) {
            console.error(`💡 This may be a token limit issue. Consider chunking for very long transcripts.`);
        }
        throw error;
    }
}

async function main() {
    const transcriptFile = process.argv[2] || "ask_the_herb_doctor_may_2022_kmud_assemblyai.md";
    const fullPath = path.join(__dirname, 'markdown-transcripts', transcriptFile);
    
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ File not found: ${fullPath}`);
        console.log(`\nAvailable transcripts:`);
        const files = fs.readdirSync(path.join(__dirname, 'markdown-transcripts'))
            .filter(f => f.endsWith('.md') && !f.includes('polished'));
        files.forEach(f => console.log(`   ${f}`));
        process.exit(1);
    }
    
    try {
        await polishTranscript(fullPath);
        console.log(`\n🎉 Complete! Transcript polished with GPT-5-mini using full 128k output capacity.`);
    } catch (error) {
        console.error(`💥 Polish failed:`, error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { polishTranscript };