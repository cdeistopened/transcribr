#!/usr/bin/env python3
"""
Speaker Diarization Script for Ray Peat Transcripts
Identifies and labels speakers in transcribed audio files
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple
import argparse

# Configuration
RAW_TRANSCRIPTS_DIR = Path("transcripts/raw-transcripts")
SPEAKER_LABELED_DIR = Path("transcripts/speaker-labeled-transcripts")

# Known speakers and their patterns
SPEAKER_PATTERNS = {
    "Dr. Raymond Peat": [
        r"ray.*peat", r"doctor.*peat", r"dr.*peat",
        r"peat.*doctor", r"peat.*raymond"
    ],
    "Andrew Murray": [
        r"andrew.*murray", r"murray.*andrew",
        r"host.*andrew", r"andrew.*host"
    ],
    "Sarah Johannessen Murray": [
        r"sarah.*murray", r"murray.*sarah",
        r"sarah.*johannessen", r"co.host.*sarah"
    ]
}

def load_transcript(file_path: Path) -> Dict:
    """Load a transcript JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None

def identify_speakers(text: str) -> Dict[str, List[str]]:
    """Identify speakers from transcript text"""
    speakers_found = {}

    # Check for known speaker patterns
    for speaker, patterns in SPEAKER_PATTERNS.items():
        found_segments = []
        for pattern in patterns:
            matches = re.finditer(pattern, text.lower())
            for match in matches:
                # Get context around the match
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end].strip()
                found_segments.append(context)

        if found_segments:
            speakers_found[speaker] = found_segments

    return speakers_found

def analyze_segments_for_speakers(segments: List[Dict]) -> Dict[str, List[Dict]]:
    """Analyze transcript segments to identify speaker patterns"""
    speakers = {}

    for segment in segments:
        text = segment.get("text", "").lower()
        start_time = segment.get("start", 0)
        end_time = segment.get("end", 0)

        # Check for speaker indicators
        speaker_found = None

        for speaker, patterns in SPEAKER_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text):
                    if speaker not in speakers:
                        speakers[speaker] = []
                    speakers[speaker].append({
                        "start": start_time,
                        "end": end_time,
                        "text": segment.get("text", ""),
                        "confidence": 0.8  # Placeholder confidence score
                    })
                    speaker_found = speaker
                    break
            if speaker_found:
                break

    return speakers

def apply_speaker_labels(transcript_data: Dict) -> Dict:
    """Apply speaker labels to transcript segments"""
    text = transcript_data["transcript"]["text"]
    segments = transcript_data["transcript"]["segments"]

    # Identify speakers from text and segments
    text_speakers = identify_speakers(text)
    segment_speakers = analyze_segments_for_speakers(segments)

    # Combine speaker information
    all_speakers = {}
    for speaker in set(list(text_speakers.keys()) + list(segment_speakers.keys())):
        all_speakers[speaker] = {
            "text_evidence": text_speakers.get(speaker, []),
            "segment_evidence": segment_speakers.get(speaker, [])
        }

    # Update transcript metadata
    transcript_data["speaker_analysis"] = {
        "identified_speakers": list(all_speakers.keys()),
        "speaker_evidence": all_speakers,
        "analysis_method": "pattern_matching",
        "analysis_date": __import__('datetime').datetime.now().isoformat()
    }

    # Add speaker labels to segments where possible
    for segment in segments:
        segment_text = segment.get("text", "").lower()

        # Find matching speaker
        speaker_label = "Unknown Speaker"
        for speaker, patterns in SPEAKER_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, segment_text):
                    speaker_label = speaker
                    break
            if speaker_label != "Unknown Speaker":
                break

        segment["speaker"] = speaker_label

    return transcript_data

def process_transcript_file(input_path: Path, output_path: Path):
    """Process a single transcript file for speaker diarization"""
    print(f"Processing: {input_path.name}")

    # Load transcript
    transcript_data = load_transcript(input_path)
    if not transcript_data:
        return False

    # Apply speaker analysis
    updated_transcript = apply_speaker_labels(transcript_data)

    # Save updated transcript
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(updated_transcript, f, indent=2, ensure_ascii=False)
        print(f"✓ Speaker labels applied: {output_path}")
        return True
    except Exception as e:
        print(f"✗ Failed to save {output_path}: {e}")
        return False

def find_transcript_files() -> List[Path]:
    """Find all raw transcript files"""
    transcript_files = []
    if RAW_TRANSCRIPTS_DIR.exists():
        for json_file in RAW_TRANSCRIPTS_DIR.glob("**/*_raw.json"):
            transcript_files.append(json_file)
    return sorted(transcript_files)

def main():
    """Main speaker diarization function"""
    parser = argparse.ArgumentParser(description="Apply speaker diarization to Ray Peat transcripts")
    parser.add_argument("--limit", type=int, help="Limit number of files to process")
    parser.add_argument("--file", type=str, help="Process specific file")
    args = parser.parse_args()

    # Get transcript files
    transcript_files = find_transcript_files()
    if not transcript_files:
        print("No transcript files found in raw-transcripts directory")
        return

    print(f"Found {len(transcript_files)} transcript files")

    # Apply filters
    if args.file:
        transcript_files = [f for f in transcript_files if args.file in f.name]

    if args.limit:
        transcript_files = transcript_files[:args.limit]

    print(f"Processing {len(transcript_files)} files...")

    # Process files
    processed = 0
    successful = 0

    for transcript_file in transcript_files:
        # Create output path in speaker-labeled directory
        relative_path = transcript_file.relative_to(RAW_TRANSCRIPTS_DIR)
        output_path = SPEAKER_LABELED_DIR / relative_path

        # Replace "_raw.json" with "_speakers.json"
        output_path = output_path.with_name(output_path.name.replace("_raw.json", "_speakers.json"))

        if process_transcript_file(transcript_file, output_path):
            successful += 1

        processed += 1

        if processed % 10 == 0:
            print(f"--- Progress: {processed}/{len(transcript_files)} files processed, {successful} successful ---")

    print("
=== Final Summary ===")
    print(f"Total files processed: {processed}")
    print(f"Successful speaker labeling: {successful}")
    print(f"Failed: {processed - successful}")

    if successful > 0:
        print(f"\nSpeaker-labeled transcripts saved to: {SPEAKER_LABELED_DIR}")

if __name__ == "__main__":
    main()
