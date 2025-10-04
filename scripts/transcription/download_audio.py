#!/usr/bin/env python3
"""
Bulk Audio Downloader for Ray Peat Podcast Collection
Downloads all audio files from the RSS feed to the audio-cache directory
"""

import os
import json
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import time
from pathlib import Path

# RSS Feed URL
RSS_URL = "https://www.toxinless.com/peat/podcast.rss"

# Base URL for resolving relative links
BASE_URL = "https://www.toxinless.com"

# Output directory for audio files
AUDIO_CACHE_DIR = Path("transcripts/audio-cache")

def extract_audio_urls_from_rss():
    """Extract all audio URLs from the RSS feed"""
    print(f"Fetching RSS feed from {RSS_URL}...")

    try:
        response = requests.get(RSS_URL)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching RSS feed: {e}")
        return []

    soup = BeautifulSoup(response.content, 'xml')
    audio_urls = []

    # Find all enclosure URLs (MP3 files)
    for enclosure in soup.find_all('enclosure'):
        audio_url = enclosure.get('url')
        if audio_url and audio_url.endswith('.mp3'):
            audio_urls.append(audio_url)

    print(f"Found {len(audio_urls)} audio files in RSS feed")
    return audio_urls

def download_audio_file(url, output_path):
    """Download a single audio file"""
    try:
        print(f"Downloading: {url}")
        response = requests.get(url, stream=True)
        response.raise_for_status()

        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        print(f"✓ Downloaded: {output_path}")
        return True

    except requests.RequestException as e:
        print(f"✗ Failed to download {url}: {e}")
        return False
    except IOError as e:
        print(f"✗ Failed to write file {output_path}: {e}")
        return False

def sanitize_filename(filename):
    """Sanitize filename to be filesystem-safe"""
    # Remove or replace problematic characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Remove multiple spaces and replace with single underscore
    filename = re.sub(r'\s+', '_', filename)
    return filename

def extract_episode_info_from_rss():
    """Extract episode metadata from RSS feed for better file naming"""
    print("Extracting episode metadata from RSS feed...")

    try:
        response = requests.get(RSS_URL)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Error fetching RSS feed: {e}")
        return {}

    soup = BeautifulSoup(response.content, 'xml')
    episodes = {}

    # Parse each item in the RSS feed
    for item in soup.find_all('item'):
        title = item.find('title').text if item.find('title') else "Unknown"
        audio_url = None

        # Find the audio URL in enclosure
        enclosure = item.find('enclosure')
        if enclosure:
            audio_url = enclosure.get('url')

        if audio_url:
            episodes[audio_url] = {
                'title': title,
                'description': item.find('description').text if item.find('description') else "",
                'pub_date': item.find('pubDate').text if item.find('pubDate') else "",
            }

    return episodes

def main():
    """Main download function"""
    # Create audio cache directory
    AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Extract audio URLs from RSS
    audio_urls = extract_audio_urls_from_rss()
    if not audio_urls:
        print("No audio URLs found. Exiting.")
        return

    # Extract episode metadata for better naming
    episode_info = extract_episode_info_from_rss()

    print(f"\nStarting download of {len(audio_urls)} audio files...")

    downloaded = 0
    failed = 0

    for i, url in enumerate(audio_urls, 1):
        print(f"\n[{i}/{len(audio_urls)}] Processing: {url}")

        # Get episode info for this URL
        info = episode_info.get(url, {})
        title = info.get('title', 'Unknown_Title')

        # Create a sanitized filename
        filename = sanitize_filename(title) + ".mp3"
        output_path = AUDIO_CACHE_DIR / filename

        # Skip if file already exists
        if output_path.exists():
            print(f"✓ File already exists: {output_path}")
            downloaded += 1
            continue

        # Download the file
        if download_audio_file(url, output_path):
            downloaded += 1
        else:
            failed += 1

        # Add a small delay to be respectful to the server
        time.sleep(0.5)

    print("
=== Download Summary ===")
    print(f"Successfully downloaded: {downloaded} files")
    print(f"Failed downloads: {failed} files")
    print(f"Total processed: {len(audio_urls)} files")
    print(f"Audio files saved to: {AUDIO_CACHE_DIR}")

if __name__ == "__main__":
    main()
