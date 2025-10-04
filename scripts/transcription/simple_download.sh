#!/bin/bash

# Simple Audio Downloader for Ray Peat Podcast Collection
# Uses curl instead of Python to avoid dependency issues

RSS_URL="https://www.toxinless.com/peat/podcast.rss"
AUDIO_CACHE_DIR="transcripts/audio-cache"

echo "Creating audio cache directory..."
mkdir -p "$AUDIO_CACHE_DIR"

echo "Fetching RSS feed..."
curl -s "$RSS_URL" > /tmp/peat_rss.xml

if [ $? -ne 0 ]; then
    echo "Failed to download RSS feed"
    exit 1
fi

echo "Extracting MP3 URLs from RSS feed..."

# Extract MP3 URLs from RSS feed
grep -o 'https://[^"]*\.mp3' /tmp/peat_rss.xml > /tmp/mp3_urls.txt

if [ ! -s /tmp/mp3_urls.txt ]; then
    echo "No MP3 URLs found in RSS feed"
    exit 1
fi

echo "Found $(wc -l < /tmp/mp3_urls.txt) audio files"

# Download each MP3 file
while IFS= read -r url; do
    filename=$(basename "$url")
    output_path="$AUDIO_CACHE_DIR/$filename"

    if [ -f "$output_path" ]; then
        echo "✓ Already exists: $filename"
        continue
    fi

    echo "Downloading: $filename"
    curl -L -o "$output_path" "$url"

    if [ $? -eq 0 ] && [ -f "$output_path" ]; then
        echo "✓ Downloaded: $filename"
    else
        echo "✗ Failed: $filename"
    fi

    # Small delay to be respectful
    sleep 1
done < /tmp/mp3_urls.txt

echo ""
echo "=== Download Summary ==="
echo "Downloaded $(find "$AUDIO_CACHE_DIR" -name "*.mp3" | wc -l) files"
echo "Audio files saved to: $AUDIO_CACHE_DIR"

# Cleanup
rm -f /tmp/peat_rss.xml /tmp/mp3_urls.txt

echo "Ready for transcription!"
