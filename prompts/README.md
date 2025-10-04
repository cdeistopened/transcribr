# `/prompts` - AI Prompt Templates

## Purpose
This directory contains **prompt templates** and **instructions** used by AI models to process transcripts. These are the "instructions" you give to GPT/Claude/Gemini for polishing transcripts.

## Programming Terminology
- **Prompt** = Instructions/context given to an AI model
- **Template** = Reusable pattern with placeholders
- **Prompt Engineering** = Crafting effective AI instructions
- **System Prompt** = Instructions that define AI behavior

## Contents

### Transcript Polishing Prompts

**`transcript-polish-balanced-prompt.md`**
- Balanced approach between fidelity and readability
- Preserves speaker patterns while improving clarity
- Used by `polish-transcript-improved.js`

**`enhanced-transcript-polish-prompt.md`**
- More aggressive editing
- Focus on professional readability
- Used by `polish-transcript-dual.js`

**`improved-polish-prompt.md`**
- Lightweight polish
- Minimal changes, maximum fidelity
- Used by `polish-with-openai.js`

### Transcription Rules

**`TRANSCRIPTION_RULES_MINIMAL.md`**
- Guidelines for consistent transcription
- Formatting standards
- Speaker labeling conventions

**`transcription-workflow-agent.md`**
- Workflow instructions for AI agents
- Multi-step processing guidelines

## How Prompts Work

### Basic Structure
```
[SYSTEM INSTRUCTIONS]
- Define AI's role
- Set constraints
- Specify format

[CONTEXT]
- Domain information
- Background knowledge

[INPUT]
- The transcript to process

[OUTPUT INSTRUCTIONS]
- Desired format
- Quality criteria
```

### Example Usage in Code
```javascript
const prompt = fs.readFileSync('prompts/transcript-polish-balanced-prompt.md');
const transcript = fs.readFileSync('output/transcripts/markdown/episode.md');

const result = await ai.complete({
  system: prompt,
  user: transcript
});
```

## Best Practices

✅ **DO:**
- Version control prompts (they're source code!)
- Document what each prompt does
- Include examples in prompts
- Test prompts before using in production
- Iterate and improve based on results

❌ **DON'T:**
- Hard-code prompts in JavaScript files
- Mix prompts with generated content
- Use overly long prompts (AI has token limits)
- Forget to specify output format

## Prompt Engineering Tips

### 1. **Be Specific**
❌ "Make this better"
✅ "Fix grammar errors while preserving technical terms"

### 2. **Give Examples**
Show the AI what you want:
```
Input: "um so like the thing is that"
Output: "The key point is that"
```

### 3. **Set Constraints**
- "Never remove scientific terms"
- "Keep speaker names as-is"
- "Maintain casual tone"

### 4. **Specify Format**
- "Output in markdown"
- "Use headers for sections"
- "Include YAML frontmatter"

## Comparing Prompt Strategies

| Prompt Type | Fidelity | Readability | Use Case |
|-------------|----------|-------------|----------|
| Minimal     | High     | Medium      | Academic/Legal |
| Balanced    | Medium   | High        | General purpose |
| Enhanced    | Low      | Very High   | Public content |

## Related Directories
- `/scripts/polishing` - Scripts that use these prompts
- `/output/transcripts/polished` - Results of applying prompts
- `/docs` - Documentation about the overall workflow

