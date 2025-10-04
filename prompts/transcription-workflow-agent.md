# Backend Transcription Workflow Agent

## Mission
- Keep the Ray Peat Interviews feed processed end-to-end using only the Express backend and local post-processing scripts.
- Produce polished Markdown transcripts on a recurring schedule without relying on the React frontend.

## Required Configuration
- Node.js 18+ with dependencies installed (`npm install` in repo root and `backend/`).
- `backend/.env` populated with:
  - `ASSEMBLYAI_API_KEY` (default transcription provider).
  - `DEEPGRAM_API_KEY` (optional alternative provider).
  - `OPENAI_API_KEY` (used by polishing scripts).
- Writable directories already exist: `backend/transcripts/`, `markdown-transcripts/`, `polished-transcripts/`.
- Recommended tools: `jq` for JSON inspection, `rg` for quick searches.

## Recurring Run Checklist

### 1. Start the backend server
```bash
cd backend
npm start
```
- Leave this terminal running to stream progress updates.

### 2. Refresh the RSS feed and nominate targets
Use the backend RSS endpoint so downstream metadata stays consistent.
```bash
curl -s http://localhost:4000/api/rss \
  -H "Content-Type: application/json" \
  -d '{"rssUrl":"https://www.toxinless.com/peat/podcast.rss"}' \
  | jq '{feed: .feed.title, episodes: .episodes[:10] | map({title, audioUrl, pubDate, guid})}'
```
If `jq` is unavailable, run the helper directly with the backend dependency:
```bash
node - <<'NODE'
import RSSParser from 'rss-parser';
const parser = new RSSParser();
const feedUrl = 'https://www.toxinless.com/peat/podcast.rss';
const feed = await parser.parseURL(feedUrl);
feed.items.slice(0, 10).forEach((item, idx) => {
  const audioUrl = item.enclosure?.url || '';
  console.log(`${idx + 1}. ${item.title}`);
  console.log(`   Published: ${item.pubDate || ''}`);
  console.log(`   Audio: ${audioUrl}`);
  console.log(`   GUID: ${item.guid || ''}`);
  console.log('');
});
NODE
```
Latest fetch (2025-10-03) returned:

| # | Title | Published (UTC) | Audio |
|---|-------|-----------------|-------|
| 1 | Ask the Herb Doctor: November 2022 KMUD | 2022-11-18 07:00:00 | [MP3](https://www.toxinless.com/kmud-221118.mp3) |
| 2 | Ask the Herb Doctor: Lipofuscin | 2022-08-19 06:00:00 | [MP3](https://www.toxinless.com/kmud-220819-lipofuscin.mp3) |
| 3 | Ask the Herb Doctor: June 2022 KMUD | 2022-06-17 06:00:00 | [MP3](https://www.toxinless.com/kmud-220617.mp3) |
| 4 | Ask the Herb Doctor: May 2022 KMUD | 2022-05-20 06:00:00 | [MP3](https://www.toxinless.com/kmud-220520.mp3) |
| 5 | Ask the Herb Doctor: April 2022 KMUD | 2022-04-15 06:00:00 | [MP3](https://www.toxinless.com/kmud-220415.mp3) |
| 6 | Ask the Herb Doctor: How irradiated cells affect other living cells in human body | 2022-03-18 06:00:00 | [MP3](https://www.toxinless.com/kmud-220318-how-irradiated-cells-affect-other-living-cells-in-human-body.mp3) |
| 7 | Ask the Herb Doctor: February 2022 KMUD | 2022-02-18 07:00:00 | [MP3](https://www.toxinless.com/kmud-220218.mp3) |
| 8 | Ask the Herb Doctor: January 2022 KMUD | 2022-01-21 07:00:00 | [MP3](https://www.toxinless.com/kmud-220121.mp3) |
| 9 | Ask the Herb Doctor: The hormones behind inflammation | 2021-12-17 07:00:00 | [MP3](https://www.toxinless.com/kmud-211217-the-hormones-behind-inflammation.mp3) |
| 10 | Ask the Herb Doctor: Managing hormones and cancer treatment with nutrition | 2021-11-19 07:00:00 | [MP3](https://www.toxinless.com/kmud-211119-managing-hormones-and-cancer-treatment-with-nutrition.mp3) |

Mark the episodes to process and continue below.

### 3. Submit a transcription job per episode
Use `curl -N` so you can watch the streaming status messages.
```bash
curl -N -X POST http://localhost:4000/api/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://www.toxinless.com/kmud-221118.mp3",
    "title": "Ask the Herb Doctor: November 2022 KMUD",
    "pubDate": "Fri, 18 Nov 2022 07:00:00 GMT",
    "guid": "http://www.toxinless.com/kmud-221118.mp3",
    "description": "Ray Peat interview/radio show on Fri Nov 18 2022 from Ask the Herb Doctor",
    "provider": "assemblyai",
    "feedTitle": "Ray Peat Interviews",
    "feedUrl": "https://www.selftestable.com/ray-peat-stuff/podcast",
    "rssUrl": "https://www.toxinless.com/peat/podcast.rss"
  }'
```
- Swap the payload values for each chosen episode.
- Set `provider` to `deepgram` when needed; leave it at `assemblyai` otherwise.
- Completed transcripts land in `backend/transcripts/` as JSON keyed by a base64 hash of the audio URL.

### 4. Convert JSON transcripts to Markdown drafts
Run from the repo root after one or more jobs finish.
```bash
node convert-transcripts.js
```
- Produces `markdown-transcripts/<sanitized-title>_<provider>.md`.
- Re-running skips files that already exist; remove or rename to regenerate.

### 5. Polish transcripts with the enhanced prompt
Run the dual-model comparison to capture both GPT-5-mini and GPT-5 polishes.
```bash
node polish-transcript-dual.js markdown-transcripts/<filename>.md
```
- Generates two timestamped files alongside the source (`_polished_gpt5mini_...` and `_polished_gpt5_...`).
- Review both versions in your editor and move the preferred copy into `polished-transcripts/` for archival.
- For single-model runs, `node polish-transcript-improved.js markdown-transcripts/<filename>.md` still works with the same enhanced prompt.

### 6. Quality assurance and archival
- Spot-check diarization, technical terms, and caller attributions.
- Confirm `backend/transcripts/` retains the raw JSON for future reference.
- Once satisfied, commit or sync `markdown-transcripts/` and `polished-transcripts/` if version control is desired.

## Automation Notes
- Schedule a weekly reminder (Fridays, 09:00 PT) to run steps 1–6.
- For batch runs, queue multiple `/api/transcribe` requests back-to-back; the backend handles them sequentially while streaming progress.
- Capture server logs (`backend/server.log`) after each session for troubleshooting history.

## Next Actions
- Await episode selection feedback, then execute step 3 for each chosen item.
- Update the episode table after every feed refresh so the agent document stays current.
