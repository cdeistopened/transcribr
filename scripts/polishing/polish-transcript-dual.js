const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

async function callChatModel(model, prompt) {
  console.log(`\n🤖 Sending prompt to ${model}...`);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 128000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${model}): ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`✅ ${model} responded with ${data.usage?.completion_tokens || 'unknown'} completion tokens.`);
  return data.choices[0].message.content;
}

function createImprovedPolishingPrompt(rawTranscript) {
  return `Transform this raw podcast transcript into a polished, readable version while preserving every substantive word and idea. Clean up the dialogue, identify speakers by name, organize with logical headers, and correct technical terms using domain knowledge. Remove administrative details like phone numbers and call-in instructions, but keep all meaningful content and conversation.

## EXAMPLES:

### Example 1: Speaker Introductions & Section Headers

**RAW:**
\`\`\`
[Speaker B]: All right, so once again now we're joined by Dr. Raymond Pete. I've got an intro that I'm going to read. I'm going to read after we've got Dr. Pete on the air. Dr. Pete, are you with us?

[Speaker D]: Yes.

[Speaker B]: Okay, thanks so much for joining us as always. And as always for those people who Perhaps have never heard of you before and don't know anything about you. Would you please outline your professional and scientific background so people know how and where you're coming from?
\`\`\`

**POLISHED:**
\`\`\`
## Dr. Peat's Background

**Andrew Murray:** Dr. Peat, are you with us?

**Dr. Raymond Peat:** Yes.

**Andrew Murray:** Thanks so much for joining us as always. For those people who perhaps have never heard of you before, would you please outline your professional and scientific background?
\`\`\`

### Example 2: Subject Transitions & Technical Corrections

**RAW:**
\`\`\`
[Speaker B]: So Dr. Pete, transhumanism, there's this premise that biological evolution will be overtaken by genetic wearable and implantable or injectable technologies that artificially expedite the evolutionary process called the Great Reset. What are your thoughts on this?

[Speaker D]: In the 1940s and 50s, I knew people who had become convinced members of Technocracy Incorporated and the stock market that you mentioned, that has been one of the techniques to take over assets of the world.
\`\`\`

**POLISHED:**
\`\`\`
## Transhumanism and Corporate Control

**Andrew Murray:** Dr. Peat, regarding transhumanism—there's this premise that biological evolution will be overtaken by genetic, wearable, and implantable or injectable technologies that artificially expedite the evolutionary process called the Great Reset. What are your thoughts on this?

**Dr. Raymond Peat:** In the 1940s and 50s, I knew people who had become convinced members of Technocracy Incorporated. The stock market that you mentioned has been one of the techniques to take over assets of the world.
\`\`\`

### Example 3: Back-and-forth Dialogue Cleanup

**RAW:**
\`\`\`
[Speaker A]: They just had less than five words.

[Speaker B]: Oh, okay, go ahead.

[Speaker A]: A very good germane one. Please define transhumanism.

[Speaker B]: Right. So, okay, so as I said at the beginning here, it's the premise that biological evolution will be overtaken by genetic, wearable and implantable or injectable folks, technologies that artificially expedite the evolutionary process.
\`\`\`

**POLISHED:**
\`\`\`
**Caller:** Please define transhumanism.

**Andrew Murray:** It's the premise that biological evolution will be overtaken by genetic, wearable, and implantable or injectable technologies that artificially expedite the evolutionary process.
\`\`\`

### Example 4: Medical Terms & Product Names

**RAW:**
\`\`\`
[Speaker E]: I used progest, the progest tea, the kind that Ray recommends and Phenol plus and Spider Mel. And as soon as I got my T3 up, the bleeding stopped.

[Speaker C]: But the thyroid should be like, you guys, I've heard you mention when, you know, getting a sinoplast from Mexico, or is there a desiccated thyroid that we could find in the market?
\`\`\`

**POLISHED:**
\`\`\`
**Caller:** I used Progest-E, the kind that Ray recommends, and Cynoplus and Cynomel. As soon as I got my T3 up, the bleeding stopped.

**Caller:** Regarding thyroid, I've heard you mention getting Cynoplus from Mexico—is there a desiccated thyroid we could find in the market that would be well tolerated?
\`\`\`

### Example 5: Administrative Detail Removal

**RAW:**
\`\`\`
[Speaker B]: So Ascarev, Dr. Kamie D. Garberville 91.1 FM from now and we have a caller from now until the end of the show, 8 o', clock, you're invited to call in the questions. The number 707-923-3911. I wanted to say one last thing before we take this next call, that the whole point of transhumanism as an evolution through intelligent design relies on intelligent design, folks.
\`\`\`

**POLISHED:**
\`\`\`
**Andrew Murray:** Before we take this next call, the whole point of transhumanism as evolution through intelligent design relies on intelligent design.
\`\`\`

---

**YOUR TASK:** Polish the following raw transcript using these principles. Preserve all substantive content while making it highly readable and professionally formatted.

**RAW TRANSCRIPT TO POLISH:**

${rawTranscript}

**BEGIN POLISHED TRANSCRIPT:**`;
}

function extractTranscriptContent(markdownContent) {
  const titleMatch = markdownContent.match(/^# (.+)/m);
  const title = titleMatch ? titleMatch[1] : 'Unknown Episode';
  const transcriptMatch = markdownContent.match(/## Transcript\n\n([\s\S]+?)\n\n---/);

  if (!transcriptMatch) {
    throw new Error('Could not find transcript section in markdown file');
  }

  const rawTranscript = transcriptMatch[1];
  return { title, rawTranscript, fullContent: markdownContent };
}

function createOutputMarkdown(fullContent, polishedContent) {
  return fullContent.replace(
    /## Transcript\n\n[\s\S]+?\n\n---/,
    `## Transcript\n\n${polishedContent}\n\n---`
  );
}

async function polishWithModel(modelConfig, inputPath, transcriptData, prompt, outputDir) {
  const { model, label, suffix } = modelConfig;
  const polishedContent = await callChatModel(model, prompt);

  const originalTurns = transcriptData.rawTranscript.split('\n').filter(l => l.includes('Speaker')).length;
  const polishedTurns = polishedContent.split('\n').filter(l => l.startsWith('**')).length;

  console.log(`🔍 ${label} speaker turns: original=${originalTurns} polished=${polishedTurns}`);

  const outputMarkdown = createOutputMarkdown(transcriptData.fullContent, polishedContent);
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
  const baseName = path.basename(inputPath, '.md');
  const outputFile = path.join(outputDir, `${baseName}_polished_${suffix}_${timestamp}.md`);

  fs.writeFileSync(outputFile, outputMarkdown);
  console.log(`📄 ${label} output saved to ${outputFile}`);

  return outputFile;
}

async function main() {
  const transcriptArg = process.argv[2] || 'ask_the_herb_doctor_may_2022_kmud_assemblyai.md';
  const transcriptsDir = path.join(__dirname, 'markdown-transcripts');
  const outputDir = path.join(__dirname, 'markdown-transcripts');
  const inputPath = path.isAbsolute(transcriptArg) ? transcriptArg : path.join(transcriptsDir, transcriptArg);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    const files = fs.readdirSync(transcriptsDir).filter(f => f.endsWith('.md'));
    console.log('\nAvailable markdown transcripts:');
    files.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(inputPath, 'utf8');
  let transcriptData;
  try {
    transcriptData = extractTranscriptContent(markdownContent);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  const prompt = createImprovedPolishingPrompt(transcriptData.rawTranscript);
  const models = [
    { model: 'gpt-5-mini', label: 'GPT-5-mini', suffix: 'gpt5mini' },
    { model: 'gpt-5', label: 'GPT-5', suffix: 'gpt5' }
  ];

  const outputs = [];
  for (const modelConfig of models) {
    try {
      const filePath = await polishWithModel(modelConfig, inputPath, transcriptData, prompt, outputDir);
      outputs.push({ label: modelConfig.label, filePath });
    } catch (err) {
      console.error(`💥 Failed polishing with ${modelConfig.label}: ${err.message}`);
    }
  }

  if (outputs.length === 0) {
    console.error('No polished transcripts were produced.');
    process.exit(1);
  }

  console.log('\n📝 Comparison files ready:');
  outputs.forEach(({ label, filePath }) => {
    console.log(`  - ${label}: ${filePath}`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { createImprovedPolishingPrompt, extractTranscriptContent };
