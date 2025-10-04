#!/usr/bin/env python3
"""
Bulk Transcription Script for Ray Peat Podcast Collection
Transcribes all audio files using OpenAI Whisper and outputs structured JSON
"""

import os
import json
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
import re
from typing import Dict, List, Optional

# Configuration
WHISPER_MODEL = "large"  # tiny, base, small, medium, large
AUDIO_CACHE_DIR = Path("transcripts/audio-cache")
RAW_TRANSCRIPTS_DIR = Path("transcripts/raw-transcripts")

def get_audio_files() -> List[Path]:
    """Get all MP3 files from audio cache directory"""
    audio_files = []
    if AUDIO_CACHE_DIR.exists():
        for mp3_file in AUDIO_CACHE_DIR.glob("**/*.mp3"):
            audio_files.append(mp3_file)
    return sorted(audio_files)

def extract_episode_info(filename: str) -> Dict:
    """Extract episode metadata from filename"""
    # Try to parse show name, date, and topic from filename
    filename_clean = filename.replace(".mp3", "")

    # Look for patterns like "Ask_the_Herb_Doctor_June_2022_KMUD"
    show_patterns = [
        r"(ask_the_herb_doctor)_(\w+)_(\d{4})_(\w+)",
        r"(politics_and_science)_(.+)",
        r"(hope_for_health)_(.+)",
        r"(gary_null)_(.+)",
    ]

    for pattern in show_patterns:
        match = re.search(pattern, filename_clean.lower())
        if match:
            groups = match.groups()
            if len(groups) >= 2:
                show_name = groups[0].replace("_", " ").title()
                topic = groups[1].replace("_", " ").title()
                return {
                    "show": show_name,
                    "topic": topic,
                    "filename": filename
                }

    # Fallback: use filename as topic
    return {
        "show": "Unknown Show",
        "topic": filename_clean.replace("_", " ").title(),
        "filename": filename
    }

def transcribe_audio(audio_path: Path) -> Optional[Dict]:
    """Transcribe a single audio file using Whisper"""
    try:
        print(f"Transcribing: {audio_path.name}")

        # Run Whisper command
        cmd = [
            "whisper",
            str(audio_path),
            "--model", WHISPER_MODEL,
            "--output_format", "json",
            "--language", "en",
            "--verbose", "False"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, check=True)

        # Find the output JSON file
        json_pattern = audio_path.stem + "*.json"
        json_files = list(audio_path.parent.glob(json_pattern))

        if not json_files:
            print(f"✗ No JSON output found for {audio_path.name}")
            return None

        json_file = json_files[0]

        # Read the transcription
        with open(json_file, 'r', encoding='utf-8') as f:
            transcription_data = json.load(f)

        # Clean up the JSON file
        json_file.unlink()

        # Extract episode info
        episode_info = extract_episode_info(audio_path.name)

        # Create structured output
        transcript_data = {
            "metadata": {
                "title": f"{episode_info['show']}: {episode_info['topic']}",
                "audio_file": audio_path.name,
                "transcription_date": datetime.now().isoformat(),
                "transcription_method": f"OpenAI Whisper {WHISPER_MODEL}",
                "audio_duration": transcription_data.get("duration"),
                "show": episode_info["show"],
                "topic": episode_info["topic"]
            },
            "transcript": {
                "text": transcription_data.get("text", ""),
                "segments": transcription_data.get("segments", [])
            },
            "quality_metrics": {
                "language": transcription_data.get("language"),
                "word_count": len(transcription_data.get("text", "").split()) if transcription_data.get("text") else 0
            }
        }

        print(f"✓ Transcribed: {audio_path.name} ({transcript_data['quality_metrics']['word_count']} words)")
        return transcript_data

    except subprocess.CalledProcessError as e:
        print(f"✗ Whisper failed for {audio_path.name}: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"✗ Invalid JSON output for {audio_path.name}: {e}")
        return None
    except Exception as e:
        print(f"✗ Unexpected error for {audio_path.name}: {e}")
        return None

def save_transcript(transcript_data: Dict, output_path: Path):
    """Save transcript to structured JSON file"""
    try:
        # Create output directory if it doesn't exist
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write JSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, indent=2, ensure_ascii=False)

        print(f"✓ Saved transcript: {output_path}")

    except Exception as e:
        print(f"✗ Failed to save transcript {output_path}: {e}")

def organize_by_show_and_year(audio_file: Path, transcript_data: Dict) -> Path:
    """Organize transcript into appropriate folder structure"""
    show = transcript_data["metadata"]["show"].lower().replace(" ", "-")
    topic = transcript_data["metadata"]["topic"].lower().replace(" ", "-")

    # Extract year from topic or filename if possible
    year_match = re.search(r'\b(20\d{2})\b', topic)
    if year_match:
        year = year_match.group(1)
    else:
        # Fallback: try to extract from filename
        year_match = re.search(r'\b(20\d{2})\b', audio_file.name)
        year = year_match.group(1) if year_match else "unknown"

    # Create output path
    output_dir = RAW_TRANSCRIPTS_DIR / show / year
    filename = f"{show}_{year}_{topic}_raw.json"
    output_path = output_dir / filename

    return output_path

def main():
    """Main transcription function"""
    parser = argparse.ArgumentParser(description="Bulk transcribe Ray Peat audio files")
    parser.add_argument("--limit", type=int, help="Limit number of files to process")
    parser.add_argument("--start-from", type=str, help="Start processing from specific file")
    args = parser.parse_args()

    # Get audio files
    audio_files = get_audio_files()
    if not audio_files:
        print("No audio files found in audio-cache directory")
        return

    print(f"Found {len(audio_files)} audio files")

    # Apply filters
    if args.start_from:
        start_index = next((i for i, f in enumerate(audio_files) if args.start_from in f.name), 0)
        audio_files = audio_files[start_index:]

    if args.limit:
        audio_files = audio_files[:args.limit]

    print(f"Processing {len(audio_files)} files...")

    # Process files
    processed = 0
    successful = 0

    for audio_file in audio_files:
        print(f"\n--- Processing {processed + 1}/{len(audio_files)} ---")

        # Transcribe audio
        transcript_data = transcribe_audio(audio_file)
        if transcript_data:
            # Organize and save
            output_path = organize_by_show_and_year(audio_file, transcript_data)
            save_transcript(transcript_data, output_path)
            successful += 1
        else:
            print(f"✗ Failed to transcribe: {audio_file.name}")

        processed += 1

        # Progress update
        if processed % 10 == 0:
            print(f"\n--- Progress: {processed}/{len(audio_files)} files processed, {successful} successful ---")

    print("
=== Final Summary ===")
    print(f"Total files processed: {processed}")
    print(f"Successful transcriptions: {successful}")
    print(f"Failed transcriptions: {processed - successful}")
    print(f"Success rate: {(successful/processed)*100".1f"}%" if processed > 0 else "No files processed")

    if successful > 0:
        print(f"\nTranscripts saved to: {RAW_TRANSCRIPTS_DIR}")
        print("Next steps:")
        print("1. Run speaker diarization script")
        print("2. Apply transcript polishing")
        print("3. Organize final polished transcripts")

if __name__ == "__main__":
    main()
