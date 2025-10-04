# Project Architecture Analysis & Best Practices Guide

## 🎯 Current Project State

**Project Name:** Transcribr (Podcast Transcription Tool)  
**Type:** Full-stack web application (Express.js + React)  
**Primary Purpose:** Transcribe podcast episodes from RSS feeds using AI services

---

## 📊 Current Structure Issues

### 🚨 **Main Problems Identified:**

1. **Mixed Concerns** - Application code mixed with generated output/data
2. **Root Directory Clutter** - Too many files in root directory
3. **Inconsistent Naming** - Mix of kebab-case, snake_case, camelCase
4. **Data Duplication** - Multiple transcript folders with unclear purposes
5. **Ad-hoc Scripts** - Utility scripts scattered without organization
6. **Missing .gitignore** - Generated content likely tracked in version control

---

## 📂 Current Structure Breakdown

```
transcription-tool/
├── backend/                              # ✅ GOOD: Application backend
│   ├── server.js                        # Express API server
│   ├── package.json                     
│   ├── transcripts/                     # ⚠️ ISSUE: Generated data in app folder
│   └── *.md                             # ⚠️ ISSUE: Prompts in app folder
│
├── frontend/                             # ✅ GOOD: Application frontend
│   ├── src/                             
│   ├── public/                          
│   └── package.json                     
│
├── markdown-transcripts/                 # ❌ ISSUE: Generated output at root
├── polished-transcripts/                 # ❌ ISSUE: Generated output at root
├── raw-speaker-labeled-transcripts/      # ❌ ISSUE: Generated output at root
├── transcripts/                          # ❌ ISSUE: Confusing duplicate name
│
├── polish-transcript-*.js               # ⚠️ ISSUE: Utility scripts at root
├── convert-*.js                         # ⚠️ ISSUE: Utility scripts at root
│
├── *.log                                # ❌ ISSUE: Log files in version control
├── transcript-polish-*.md               # ⚠️ ISSUE: Prompts scattered
└── transcription-project-checklist.md    # ⚠️ ISSUE: Project management at root
```

---

## 🎓 Best Practices Explained

### 1. **Separation of Concerns** 
**Principle:** Keep application code separate from generated data/output

**Why?** 
- Application code should be version-controlled
- Generated data should NOT be in version control (bloats repo)
- Makes backups, deployments, and sharing easier

**Your Issue:** Transcripts mixed with application code

### 2. **Clear Directory Structure**
**Principle:** Use standard folder names that developers expect

**Standard Structure:**
```
project/
├── src/          # Source code (backend/frontend/shared)
├── scripts/      # Utility scripts & automation
├── docs/         # Documentation & prompts
├── data/         # User-generated or input data (gitignored)
├── output/       # Generated results (gitignored)
├── tests/        # Test files
└── config/       # Configuration files
```

### 3. **Naming Conventions**
**Principle:** Be consistent with file/folder naming

**Standards:**
- **Folders:** `kebab-case` (e.g., `raw-transcripts`)
- **JavaScript files:** `camelCase.js` or `kebab-case.js`
- **Config files:** `lowercase.json` (e.g., `package.json`)
- **Documentation:** `UPPERCASE.md` for important docs, `Title Case.md` for guides

### 4. **.gitignore Strategy**
**Principle:** Never commit generated files, logs, or secrets

**Should be ignored:**
- `node_modules/`
- `.env` files
- Log files (`*.log`)
- Generated transcripts
- Audio cache files
- Build artifacts

### 5. **Monorepo vs Multi-repo**
**Your case:** Monorepo (backend + frontend in one repo)

**Structure for Monorepo:**
```
project/
├── packages/         # or "apps/"
│   ├── backend/
│   └── frontend/
├── scripts/          # Shared scripts
├── docs/            # Shared documentation
└── package.json     # Root package.json for workspaces
```

---

## 🏗️ Proposed Clean Architecture

```
transcribr/
│
├── apps/                                  # Application code
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── routes/
│   │   │   ├── services/                 # AssemblyAI, Deepgram wrappers
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── frontend/
│       ├── src/
│       ├── public/
│       └── package.json
│
├── scripts/                               # Automation & utilities
│   ├── transcription/
│   │   ├── batch-transcribe.js
│   │   ├── convert-formats.js
│   │   └── speaker-diarization.js
│   ├── polishing/
│   │   ├── polish-transcript.js
│   │   └── polish-batch.js
│   └── utils/
│       ├── download-audio.js
│       └── parse-rss.js
│
├── prompts/                               # AI prompts & templates
│   ├── transcript-polish-balanced.md
│   ├── transcript-polish-improved.md
│   └── transcription-rules.md
│
├── docs/                                  # Project documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── WORKFLOW.md
│
├── data/                                  # Input data (gitignored)
│   ├── audio-cache/                      # Downloaded MP3s
│   └── rss-feeds/                        # Saved RSS data
│
├── output/                                # Generated results (gitignored)
│   ├── transcripts/
│   │   ├── raw/                          # Initial API output (JSON)
│   │   ├── markdown/                     # Converted to markdown
│   │   ├── speaker-labeled/              # With speaker identification
│   │   └── polished/                     # Final polished version
│   └── logs/                             # Process logs
│
├── .gitignore                            # Ignore generated files
├── .env.example                          # Template for environment vars
├── package.json                          # Root package.json (workspaces)
├── README.md                             # Main documentation
└── transcription-checklist.md            # Project tracking (optional to ignore)
```

---

## 📝 Programming Terminology Guide

### Project Organization Terms

**Monorepo**
- Single repository containing multiple related projects/packages
- Your case: Backend + Frontend in one repo
- Alternative: Multiple repos (one for backend, one for frontend)

**Workspace**
- Package manager feature (npm/yarn) to manage multiple packages in monorepo
- Allows sharing dependencies and scripts

**Source Directory (`src/`)**
- Contains actual application source code
- Should be version controlled
- Gets compiled/built for production

**Build Artifacts**
- Generated files from compilation/build process
- E.g., `dist/`, `build/`, `*.bundle.js`
- Should be gitignored

### File/Folder Types

**Application Code**
- Core functionality: server.js, React components
- Version controlled, manually written

**Utility Scripts**
- Helper tools for development/operations
- E.g., migration scripts, batch processors
- Usually in `scripts/` folder

**Configuration Files**
- `package.json`, `.env`, `tsconfig.json`
- Define how app runs and dependencies

**Generated/Ephemeral Data**
- Created by running the application
- Can be recreated anytime
- Should NOT be version controlled

### Best Practice Patterns

**Separation of Concerns (SoC)**
- Each module/file has one clear responsibility
- Backend handles API, Frontend handles UI, Scripts handle automation

**Don't Repeat Yourself (DRY)**
- Avoid duplicate code/data
- Your issue: Multiple transcript folders with unclear purposes

**Convention over Configuration**
- Use standard names developers expect
- `src/`, `dist/`, `tests/`, `docs/`

**Environment Variables**
- Store secrets/config in `.env` files
- Never commit `.env`, only `.env.example`

---

## 🚀 Migration Plan

### Phase 1: Backup & Prepare
1. Create full backup of project
2. Create `.gitignore` file
3. Document current state

### Phase 2: Reorganize Structure
1. Create new folder structure
2. Move application code to `apps/`
3. Move scripts to `scripts/`
4. Move prompts to `prompts/`
5. Move generated transcripts to `output/`

### Phase 3: Update References
1. Update import paths in code
2. Update package.json scripts
3. Test application still works

### Phase 4: Clean Up
1. Remove duplicate/old files
2. Add proper README in each directory
3. Update main README.md

---

## 💡 Quick Wins

**Immediate improvements:**
1. Create `.gitignore` to exclude generated files
2. Move all transcript outputs to single `output/` directory
3. Move utility scripts to `scripts/` directory
4. Create `.env.example` for API keys
5. Remove `.log` files from root

---

## 📚 Resources

**Recommended Reading:**
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Project Structure Best Practices](https://github.com/elsewhencode/project-guidelines)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)

**Terms to Google:**
- "Node.js project structure best practices"
- "Monorepo vs multi-repo"
- "Separation of concerns in software"
- "gitignore best practices"

---

*Generated: October 4, 2025*
*Next Step: Review this document, then we'll execute the reorganization*

