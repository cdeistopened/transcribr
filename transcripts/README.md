# Ray Peat Audio Transcription Project

This project provides a comprehensive system for transcribing the complete collection of Ray Peat interviews and radio shows from the RSS feed at https://www.toxinless.com/peat/podcast.rss. The collection contains 204+ episodes across multiple shows from 1996-2022.

## Project Overview

The system is designed to:
1. **Bulk Download** - Download all audio files from the RSS feed
2. **Automated Transcription** - Use OpenAI Whisper for high-quality transcription
3. **Speaker Diarization** - Identify and label speakers in transcripts
4. **Structured Organization** - Organize transcripts by show, year, and topic
5. **Quality Assurance** - Ensure accuracy and consistency

## Project Structure

```
transcripts/
├── audio-cache/                    # Downloaded MP3 files
├── raw-transcripts/               # Initial Whisper output (JSON)
│   ├── ask-the-herb-doctor/
│   │   ├── 2022/                  # Year-based organization
│   │   └── ...
│   ├── politics-and-science/
│   └── other-shows/
├── speaker-labeled-transcripts/   # Speaker identification applied
├── polished-transcripts/         # Final polished markdown files
├── scripts/                      # Python scripts for processing
│   ├── download_audio.py        # Bulk download from RSS feed
│   ├── bulk_transcribe.py       # Whisper transcription pipeline
│   └── speaker_diarization.py   # Speaker identification
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## Quick Start

### 1. Environment Setup

```bash
# Navigate to project directory
cd transcripts

# Install Python dependencies
pip install -r requirements.txt

# Install OpenAI Whisper
pip install openai-whisper

# Optional: Install FFmpeg for audio processing
# On macOS: brew install ffmpeg
# On Ubuntu: sudo apt install ffmpeg
# On Windows: Download from https://ffmpeg.org/
```

### 2. Download Audio Files

```bash
# Download all audio files from RSS feed
python scripts/download_audio.py
```

This will download all MP3 files to `audio-cache/` directory and organize them by episode titles.

### 3. Bulk Transcription

```bash
# Transcribe all audio files (this may take several hours)
python scripts/bulk_transcribe.py

# Or transcribe a limited number for testing
python scripts/bulk_transcribe.py --limit 5

# Or start from a specific file
python scripts/bulk_transcribe.py --start-from "Ask_the_Herb_Doctor_June_2022"
```

### 4. Speaker Diarization

```bash
# Apply speaker labels to all transcripts
python scripts/speaker_diarization.py

# Or process a limited number
python scripts/speaker_diarization.py --limit 10
```

## Detailed Workflow

### Phase 1: Setup (1 week)

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   pip install openai-whisper
   ```

2. **Test Pipeline**
   ```bash
   # Download a few files for testing
   python scripts/download_audio.py

   # Test transcription on 1-2 files
   python scripts/bulk_transcribe.py --limit 2
   ```

### Phase 2: Bulk Processing (8-10 weeks)

1. **Download All Audio**
   ```bash
   python scripts/download_audio.py
   ```
   Expected: ~204 audio files, ~50GB total

2. **Batch Transcription** (Process in batches of 10-20)
   ```bash
   # Process first 20 files
   python scripts/bulk_transcribe.py --limit 20

   # Process next batch
   python scripts/bulk_transcribe.py --start-from "specific_filename"
   ```

3. **Speaker Diarization**
   ```bash
   python scripts/speaker_diarization.py
   ```

### Phase 3: Quality Assurance (1 week)

1. **Review Sample Transcripts**
   - Check accuracy of 5-10 random transcripts
   - Verify speaker identification
   - Note any systematic issues

2. **Fix Issues**
   - Re-transcribe problematic files
   - Update speaker patterns if needed
   - Validate folder structure

## Configuration Options

### Transcription Settings

Edit `bulk_transcribe.py` to modify:
```python
WHISPER_MODEL = "large"  # tiny, base, small, medium, large
```

- **tiny**: Fastest, least accurate
- **base**: Good balance of speed/accuracy
- **small**: Better accuracy, slower
- **medium**: High accuracy, slower
- **large**: Best accuracy, slowest (recommended for final processing)

### Speaker Patterns

Edit `speaker_diarization.py` to improve speaker identification:
```python
SPEAKER_PATTERNS = {
    "Dr. Raymond Peat": [
        r"ray.*peat", r"doctor.*peat", r"dr.*peat",
        r"peat.*doctor", r"peat.*raymond"
    ],
    # Add more patterns as needed
}
```

## File Naming Convention

### Audio Files (Downloaded)
`Ask_the_Herb_Doctor_June_2022_KMUD.mp3`

### Raw Transcripts
`ask-the-herb-doctor/2022/ask_the_herb_doctor_june_2022_kmud_raw.json`

### Speaker-Labeled Transcripts
`ask-the-herb-doctor/2022/ask_the_herb_doctor_june_2022_kmud_speakers.json`

### Final Polished Transcripts
`polished-transcripts/ask-the-herb-doctor/2022/Ask the Herb Doctor - June 2022.md`

## Performance Considerations

### Hardware Requirements
- **CPU**: Multi-core recommended for faster processing
- **RAM**: 8GB+ recommended for large model
- **Storage**: ~100GB free space for audio + transcripts
- **GPU**: Optional, significantly speeds up Whisper (NVIDIA recommended)

### Processing Speed Estimates
- **tiny model**: 10-15 episodes/hour
- **base model**: 5-8 episodes/hour
- **large model**: 1-2 episodes/hour

### Batch Processing Strategy
- Process in batches of 10-20 episodes
- Monitor for failures and retry
- Keep audio files for re-processing if needed

## Troubleshooting

### Common Issues

1. **Whisper Installation Issues**
   ```bash
   # Try installing with conda
   conda install -c conda-forge openai-whisper

   # Or build from source if needed
   pip install git+https://github.com/openai/whisper.git
   ```

2. **Audio File Issues**
   - Check file format (must be MP3)
   - Verify file integrity
   - Some files may need format conversion

3. **Speaker Diarization Accuracy**
   - Add more speaker name patterns
   - Review transcripts manually for better patterns
   - Consider manual speaker identification for challenging cases

4. **Memory Issues**
   - Use smaller Whisper model for testing
   - Process fewer files at once
   - Monitor system resources

### Quality Checks

1. **Transcription Accuracy**
   - Sample 5-10 transcripts per batch
   - Check for common errors (medical terms, names)
   - Verify timestamps match audio

2. **Speaker Identification**
   - Review speaker labels in sample transcripts
   - Update patterns based on findings
   - Manual correction may be needed for some files

## Next Steps After Transcription

1. **Speaker Diarization** ✅ (Included in workflow)
2. **Content Tagging** - Add topic tags for searchability
3. **Quality Review** - Sample review for accuracy
4. **Bulk Polishing** - Apply transcript polishing prompt to all completed transcripts
5. **Index Creation** - Create searchable index of all content
6. **Archive Organization** - Final organization for long-term storage

## Metadata Template

Each transcript includes structured metadata:
```json
{
  "metadata": {
    "title": "Ask the Herb Doctor: June 2022 KMUD",
    "audio_file": "Ask_the_Herb_Doctor_June_2022_KMUD.mp3",
    "transcription_date": "2024-01-01T12:00:00",
    "transcription_method": "OpenAI Whisper large",
    "show": "Ask the Herb Doctor",
    "topic": "June 2022 KMUD"
  }
}
```

## Success Metrics

- **Completion Rate**: >95% of episodes transcribed
- **Accuracy Rate**: >90% word accuracy (verified by sampling)
- **Speaker Identification**: >80% accuracy for main speakers
- **Processing Speed**: Consistent batch processing
- **File Organization**: All files properly named and stored

## Support and Maintenance

- **Regular Backups**: Backup audio and transcript files
- **Version Control**: Track script changes and improvements
- **Documentation Updates**: Keep this README current
- **Error Monitoring**: Log and address recurring issues

## License and Attribution

This project is for educational and research purposes. All content belongs to the original creators and copyright holders. The Ray Peat interviews are made available through https://www.toxinless.com/ and should be used in accordance with fair use principles.

---

*Last updated: January 2024*
