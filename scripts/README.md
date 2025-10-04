# `/scripts` - Utility Scripts

## Purpose
This directory contains **automation scripts** and **utility tools** that process data or perform operations, but are NOT part of the deployed application.

## Programming Terminology
- **Utility Scripts** = Helper tools for development/operations tasks
- **Batch Processing** = Processing many items automatically
- **CLI Tools** = Command-line interface tools (run from terminal)

## Contents

### `transcription/`
Scripts for converting audio to text

**Files:**
- `batch-transcribe.js` - Bulk transcribe multiple episodes
- `convert-*.js` - Convert between transcript formats
- `bulk_transcribe.py` - Python-based transcription
- `speaker_diarization.py` - Identify speakers
- `download_audio.py` - Download MP3 files from RSS

**Usage:**
```bash
cd scripts/transcription
node batch-transcribe.js
```

### `polishing/`
Scripts for improving transcript quality

**Files:**
- `polish-transcript-*.js` - Various polishing strategies
- `polish-with-openai.js` - AI-powered text improvement

**Usage:**
```bash
cd scripts/polishing
node polish-transcript-improved.js
```

### `utils/`
General-purpose utility scripts

## Best Practices

✅ **DO:**
- Organize scripts by their purpose (subdirectories)
- Include comments explaining what each script does
- Make scripts executable (`chmod +x script.sh`)
- Add `#!/usr/bin/env node` or `#!/bin/bash` at top

❌ **DON'T:**
- Mix scripts with application code
- Hard-code file paths (use relative paths or arguments)
- Commit large generated files from script outputs

## Difference from `/apps`

| Apps (Application)         | Scripts (Utilities)        |
|---------------------------|----------------------------|
| Deployed to production    | Run locally/on-demand      |
| Serves users              | Helps developers           |
| Always running (server)   | Runs once and exits        |
| Has frontend/backend      | Command-line only          |

## Related Directories
- `/apps` - The main application code
- `/output` - Where script results go
- `/prompts` - Templates used by polishing scripts

