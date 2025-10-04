#!/bin/bash

# Batch Transcription Script using existing AssemblyAI Backend
# Uses the existing server.js API endpoints for transcription

SERVER_URL="http://localhost:4000"
RSS_URL="https://www.toxinless.com/peat/podcast.rss"
API_KEY="$ASSEMBLYAI_API_KEY"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Ray Peat Batch Transcription Script${NC}"
echo "=================================="

# Check if API key is provided
if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: ASSEMBLYAI_API_KEY environment variable not set${NC}"
    echo "Please set your AssemblyAI API key:"
    echo "export ASSEMBLYAI_API_KEY='your_api_key_here'"
    echo ""
    echo "Or run: ASSEMBLYAI_API_KEY='your_key' $0"
    exit 1
fi

echo -e "${GREEN}✓ Using AssemblyAI API Key: ${API_KEY:0:10}...${NC}"

# Check if server is running
echo ""
echo "Checking if backend server is running..."
if curl -s "$SERVER_URL/api/transcripts" > /dev/null; then
    echo -e "${GREEN}✓ Backend server is running${NC}"
else
    echo -e "${YELLOW}⚠ Backend server not detected at $SERVER_URL${NC}"
    echo "Please start the backend server first:"
    echo "cd backend && npm start"
    echo ""
    echo "Or run this script after starting the server."
    exit 1
fi

# Parse RSS feed and get episodes
echo ""
echo "Fetching episodes from RSS feed..."
RSS_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/rss" \
  -H "Content-Type: application/json" \
  -d "{\"rssUrl\":\"$RSS_URL\"}")

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to fetch RSS feed${NC}"
    exit 1
fi

# Extract episodes from response
EPISODES=$(echo "$RSS_RESPONSE" | jq -r '.episodes[]? | @base64')

if [ -z "$EPISODES" ]; then
    echo -e "${RED}✗ No episodes found in RSS feed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found $(echo "$RSS_RESPONSE" | jq '.episodes | length') episodes${NC}"

# Function to transcribe a single episode
transcribe_episode() {
    local episode_data="$1"
    local title=$(echo "$episode_data" | base64 --decode | jq -r '.title')
    local audio_url=$(echo "$episode_data" | base64 --decode | jq -r '.audioUrl')
    local pub_date=$(echo "$episode_data" | base64 --decode | jq -r '.pubDate')

    echo ""
    echo -e "${YELLOW}Transcribing: $title${NC}"

    # Submit transcription request
    TRANSCRIBE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/transcribe" \
      -H "Content-Type: application/json" \
      -d "{
        \"audioUrl\": \"$audio_url\",
        \"title\": \"$title\",
        \"pubDate\": \"$pub_date\",
        \"provider\": \"assemblyai\",
        \"feedTitle\": \"Ray Peat Interviews\",
        \"rssUrl\": \"$RSS_URL\"
      }")

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Transcription request submitted for: $title${NC}"
        # The server will handle the streaming response and save the transcript
    else
        echo -e "${RED}✗ Failed to submit transcription for: $title${NC}"
    fi
}

# Process first 10 episodes (or all if less than 10)
echo ""
echo -e "${YELLOW}Starting batch transcription of first 10 episodes...${NC}"

COUNT=0
while IFS= read -r episode_b64 && [ $COUNT -lt 10 ]; do
    transcribe_episode "$episode_b64"
    COUNT=$((COUNT + 1))
    sleep 2  # Brief pause between requests
done < <(echo "$EPISODES" | head -10)

echo ""
echo -e "${GREEN}Batch transcription initiated!${NC}"
echo ""
echo "The backend server will process these transcriptions in the background."
echo "Check the backend/transcripts/ directory for completed transcripts."
echo "Monitor progress in backend/server.log"
echo ""
echo "To check completed transcripts:"
echo "curl -s \"$SERVER_URL/api/transcripts\" | jq '.'"
