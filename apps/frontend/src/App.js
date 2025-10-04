import React, { useState, useMemo } from 'react';
import './App.css';

const IconArrowRight = ({ size = 16, strokeWidth = 1.5 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const IconDownload = ({ size = 16, strokeWidth = 1.6 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 18h14" />
  </svg>
);

const IconTrash = ({ size = 16, strokeWidth = 1.6 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M8 6v-1.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 4.5V6" />
    <path d="M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v5" />
    <path d="M14 11v5" />
  </svg>
);

const IconCheck = ({ size = 12, strokeWidth = 1.8 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 5 5 9-9" />
  </svg>
);

const IconClose = ({ size = 12, strokeWidth = 1.8 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m7 7 10 10" />
    <path d="m7 17 10-10" />
  </svg>
);

const IconSearch = ({ size = 16, strokeWidth = 1.6 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

function App() {
  const [rssUrl, setRssUrl] = useState('http://naval.libsyn.com/rss');
  const [feedInfo, setFeedInfo] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState({});
  const [selectedYear, setSelectedYear] = useState(null);
  const [savedTranscripts, setSavedTranscripts] = useState([]);
  const [progress, setProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activePanel, setActivePanel] = useState('queue');
  const [librarySearch, setLibrarySearch] = useState('');
  const [previewTranscript, setPreviewTranscript] = useState(null);

  const loadSavedTranscripts = async () => {
    try {
      const response = await fetch('/api/transcripts');
      const data = await response.json();
      setSavedTranscripts(data.transcripts || []);
    } catch (error) {
      console.error('Error loading saved transcripts:', error);
    }
  };

  const findSavedTranscript = async (audioUrl) => {
    try {
      const response = await fetch('/api/transcript/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.transcript;
      }
    } catch (error) {
      console.error('Error finding saved transcript:', error);
    }
    return null;
  };

  const transcribedKeySet = useMemo(() => {
    const identifiers = new Set();
    savedTranscripts.forEach(item => {
      if (!item) return;
      if (item.audioUrl) identifiers.add(item.audioUrl);
      if (item.guid) identifiers.add(item.guid);
    });
    return identifiers;
  }, [savedTranscripts]);

  const annotatedEpisodes = useMemo(() => {
    if (!episodes.length) return [];
    return episodes.map(ep => ({
      ...ep,
      isTranscribed: transcribedKeySet.has(ep.audioUrl) || transcribedKeySet.has(ep.guid)
    }));
  }, [episodes, transcribedKeySet]);

  const fetchEpisodes = async () => {
    console.log('fetchEpisodes called with URL:', rssUrl);
    setLoading(true);
    setEpisodes([]);
    setSelected([]);
    setTranscripts({});
    try {
      const resp = await fetch('/api/rss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rssUrl }),
      });
      const data = await resp.json();
      setFeedInfo(data.feed || null);
      setEpisodes(data.episodes || []);
      setSearchTerm('');
      setSelectedYear(null);
    } catch {
      alert('Failed to fetch episodes');
    }
    setLoading(false);
  };

  const handleSelect = (guid) => {
    setSelected(prev => prev.includes(guid) ? prev.filter(g => g !== guid) : [...prev, guid]);
  };

  const transcribeSelected = async () => {
    console.log('Starting transcription for selected episodes...');
    console.log('Selected episodes:', episodes.filter(e => selected.includes(e.guid)));
    setTranscribing(true);
    for (const ep of episodes.filter(e => selected.includes(e.guid))) {
      try {
        // First check if we already have this transcript saved
        const savedTranscript = await findSavedTranscript(ep.audioUrl);
        if (savedTranscript) {
          setProgress(prev => ({
            ...prev,
            [ep.guid]: { status: 'complete', message: 'Loading saved transcript...', progress: 100 }
          }));
          setTranscripts(t => ({ ...t, [ep.guid]: savedTranscript }));
          continue;
        }

        setProgress(prev => ({
          ...prev,
          [ep.guid]: { status: 'starting', message: 'Connecting to transcription service...', progress: 0 }
        }));

        console.log(`Sending transcription request for episode: ${ep.title}`);
        const resp = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            audioUrl: ep.audioUrl,
            title: ep.title,
            pubDate: ep.pubDate,
            guid: ep.guid,
            description: ep.description,
            feedTitle: ep.feedTitle || feedInfo?.title || null,
            feedUrl: ep.feedLink || feedInfo?.link || null,
            rssUrl
          }),
        });

        console.log('Response received:', resp);
        if (!resp.ok) {
          const errorText = await resp.text();
          console.error('Server error:', errorText);
          throw new Error(`Server error: ${resp.status} ${errorText}`);
        }
        console.log('Starting to read response stream...');
        // Set up text decoder for streaming
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = ''; // Buffer for incomplete chunks

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          // Append new chunk to buffer and try to split into complete JSON objects
          buffer += decoder.decode(value, { stream: true });
          
          // Find complete JSON objects
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in buffer
          
          for (const line of lines.filter(Boolean)) {
            try {
              console.log('Processing line:', { line, length: line.length });
              const update = JSON.parse(line);
              console.log('Successfully parsed update:', update);
              
              if (!update || Object.keys(update).length === 0) {
                console.log('Skipping empty update');
                continue;
              }

              // Update progress
              setProgress(prev => {
                const previous = prev[ep.guid] || {};
                const mergedUpdate = {
                  ...previous,
                  ...update
                };

                if (typeof update.progress === 'undefined' && typeof previous.progress === 'number') {
                  mergedUpdate.progress = previous.progress;
                }

                const newProgress = {
                  ...prev,
                  [ep.guid]: mergedUpdate
                };
                console.log('Progress update:', {
                  episodeGuid: ep.guid,
                  previousProgress: prev[ep.guid],
                  newUpdate: mergedUpdate,
                  fullProgress: newProgress
                });
                return newProgress;
              });
              
              // Update transcript if available
              if (update.transcript) {
                console.log('Updating transcript for episode:', ep.guid);
                setTranscripts(prev => {
                  const newTranscripts = { ...prev, [ep.guid]: update.transcript };
                  console.log('New transcripts state:', newTranscripts);
                  return newTranscripts;
                });
              }
            } catch (e) {
              console.error('Error processing update:', {
                error: e.message,
                line,
                lineLength: line.length,
                buffer: buffer.length
              });
            }
          }
        }

        setProgress(prev => ({
          ...prev,
          [ep.guid]: { status: 'complete', message: 'Transcription complete! Available in saved transcripts.', progress: 100 }
        }));
      } catch (err) {
        console.error('Transcription error:', err);
        setProgress(prev => ({
          ...prev,
          [ep.guid]: { 
            status: 'error', 
            message: 'Transcription failed',
            progress: typeof prev[ep.guid]?.progress === 'number' ? prev[ep.guid].progress : 0
          }
        }));
      }
    }
    setTranscribing(false);
    // Reset selection after transcription is complete
    setSelected([]);
    // Reload saved transcripts to show newly completed ones
    loadSavedTranscripts();
  };

  const filteredEpisodes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return annotatedEpisodes;

    return annotatedEpisodes.filter(ep => {
      const values = [ep.title, ep.description, ep.feedTitle, ep.pubDate]
        .filter(Boolean)
        .map(value => String(value).toLowerCase());
      return values.some(value => value.includes(term));
    });
  }, [annotatedEpisodes, searchTerm]);

  // Group episodes by year after filtering
  const groupedEpisodes = useMemo(() => {
    return filteredEpisodes.reduce((acc, ep) => {
      const year = new Date(ep.pubDate).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(ep);
      return acc;
    }, {});
  }, [filteredEpisodes]);

  // Sort years in descending order
  const sortedYears = useMemo(() => {
    return Object.keys(groupedEpisodes).sort((a, b) => b - a);
  }, [groupedEpisodes]);

  // Get episodes to display (recent 25 by default, or selected year)
  const displayEpisodes = useMemo(() => {
    if (!filteredEpisodes.length) return [];

    if (selectedYear) {
      return groupedEpisodes[selectedYear] || [];
    }

    return filteredEpisodes.slice(0, 25);
  }, [filteredEpisodes, selectedYear, groupedEpisodes]);

  const visibleEpisodeGuids = useMemo(() => displayEpisodes.map(ep => ep.guid), [displayEpisodes]);

  const allVisibleSelected = useMemo(() => {
    if (visibleEpisodeGuids.length === 0) return false;
    return visibleEpisodeGuids.every(guid => selected.includes(guid));
  }, [visibleEpisodeGuids, selected]);

  // Get selected episode details for the panel
  const selectedEpisodeDetails = useMemo(() => {
    if (!selected.length) return [];
    const lookup = new Map(annotatedEpisodes.map(ep => [ep.guid, ep]));
    return selected
      .map(guid => lookup.get(guid))
      .filter(Boolean);
  }, [annotatedEpisodes, selected]);

  const totalEpisodes = annotatedEpisodes.length;
  const filteredCount = filteredEpisodes.length;

  const toggleSelectAllVisible = () => {
    if (!visibleEpisodeGuids.length) return;
    setSelected(prev => {
      if (allVisibleSelected) {
        const visibleSet = new Set(visibleEpisodeGuids);
        return prev.filter(guid => !visibleSet.has(guid));
      }

      const merged = new Set(prev);
      visibleEpisodeGuids.forEach(guid => merged.add(guid));
      return Array.from(merged);
    });
  };

  const libraryGroups = useMemo(() => {
    if (!savedTranscripts.length) return [];

    const groups = new Map();
    savedTranscripts.forEach(item => {
      const groupTitle = item.feedTitle || feedInfo?.title || 'Uncategorized';
      if (!groups.has(groupTitle)) {
        groups.set(groupTitle, []);
      }
      groups.get(groupTitle).push(item);
    });

    return Array.from(groups.entries())
      .map(([title, items]) => ({
        title,
        transcripts: items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
        feedUrl: items[0]?.feedUrl || items[0]?.rssUrl || ''
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [savedTranscripts, feedInfo?.title]);

  const filteredLibraryGroups = useMemo(() => {
    const term = librarySearch.trim().toLowerCase();
    if (!term) return libraryGroups;

    return libraryGroups
      .map(group => {
        const transcripts = group.transcripts.filter(item => {
          const values = [group.title, item.title, item.description, item.pubDate]
            .filter(Boolean)
            .map(value => String(value).toLowerCase());
          return values.some(value => value.includes(term));
        });

        if (!transcripts.length) {
          return null;
        }

        return {
          ...group,
          transcripts
        };
      })
      .filter(Boolean);
  }, [libraryGroups, librarySearch]);

  const libraryCount = savedTranscripts.length;


  const formatTranscriptWithSpeakers = (transcript) => {
    console.log('Processing transcript for speaker diarization');
    
    if (!transcript?.results) {
      console.log('No results found in transcript');
      return '';
    }
    
    // Debug: Check what Deepgram actually returned
    console.log('Utterances available:', !!transcript.results.utterances);
    console.log('Utterances count:', transcript.results.utterances?.length || 0);
    
    // First, try to use utterances for speaker diarization (Deepgram's preferred method)
    if (transcript.results.utterances && transcript.results.utterances.length > 0) {
      console.log('Using utterances method for speaker diarization');
      
      let formattedText = '';
      let previousSpeaker = null;
      
      transcript.results.utterances.forEach((utterance, index) => {
        console.log(`Processing utterance ${index}: Speaker ${utterance.speaker} - "${utterance.transcript}"`);
        
        // Only add speaker label when speaker changes
        if (utterance.speaker !== previousSpeaker) {
          // Add extra line break between different speakers (except for the first utterance)
          if (index > 0) {
            formattedText += '\n';
          }
          formattedText += `[Speaker ${utterance.speaker}]: ${utterance.transcript}`;
          previousSpeaker = utterance.speaker;
        } else {
          // Same speaker, just add the text with a space
          formattedText += ` ${utterance.transcript}`;
        }
      });
      
      console.log('Formatted transcript:', formattedText.substring(0, 500) + '...');
      return formattedText;
    }
    
    // Fallback: try to use words with speaker information from channels
    const alternative = transcript.results.channels?.[0]?.alternatives?.[0];
    if (alternative?.words && alternative.words.length > 0) {
      console.log('Words available:', alternative.words.length);
      console.log('First few words with speaker info:', alternative.words.slice(0, 5).map(w => ({word: w.word, speaker: w.speaker})));
      
      const wordsWithSpeakers = alternative.words.filter(word => word.speaker !== undefined);
      if (wordsWithSpeakers.length > 0) {
        console.log('Using words method for speaker diarization');
        let formattedText = '';
        let currentSpeaker = null;
        let currentSegment = '';

        alternative.words.forEach((word, index) => {
          // If speaker changes, start new segment
          if (word.speaker !== currentSpeaker) {
            if (currentSegment) {
              formattedText += `[Speaker ${currentSpeaker}]: ${currentSegment.trim()}\n\n`;
            }
            currentSpeaker = word.speaker;
            currentSegment = word.word;
          } else {
            currentSegment += ` ${word.word}`;
          }

          // If it's the last word, add the final segment
          if (index === alternative.words.length - 1) {
            formattedText += `[Speaker ${currentSpeaker}]: ${currentSegment.trim()}`;
          }
        });

        console.log('Formatted transcript from words:', formattedText.substring(0, 500) + '...');
        return formattedText;
      }
    }
    
    console.log('No speaker information found, using plain transcript');
    // Final fallback: return plain transcript without speaker labels
    const plainTranscript = alternative?.transcript || transcript.results.channels?.[0]?.alternatives?.[0]?.transcript || '';
    console.log('Plain transcript:', plainTranscript.substring(0, 200) + '...');
    return plainTranscript;
  };

  const composeMarkdownDocument = (title, pubDate, durationSeconds, generatedDate, transcriptBody) => {
    const formattedTitle = title || 'Transcript';
    const formattedPubDate = pubDate ? new Date(pubDate).toLocaleDateString() : 'Unknown';
    const formattedDuration = durationSeconds ? `${Math.round(durationSeconds / 60)} minutes` : 'Unknown';
    const formattedGeneratedDate = generatedDate ? new Date(generatedDate).toLocaleDateString() : new Date().toLocaleDateString();

    return `# ${formattedTitle}

**Date:** ${formattedPubDate}  
**Duration:** ${formattedDuration}  
**Generated:** ${formattedGeneratedDate}

---

## Transcript

${transcriptBody}

---

*Generated with Transcribr - AI-powered podcast transcription with speaker diarization*
`;
  };

  const exportMarkdownFile = (title, markdownContent) => {
    const safeTitle = (title || 'transcript').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTranscript = (guid) => {
    const transcript = transcripts[guid];
    if (!transcript) return;

    const episode = episodes.find(e => e.guid === guid);
    const title = episode?.title || 'transcript';
    const transcriptContent = formatTranscriptWithSpeakers(transcript);
    const markdownContent = composeMarkdownDocument(
      title,
      episode?.pubDate,
      transcript.metadata?.duration,
      new Date(),
      transcriptContent
    );

    exportMarkdownFile(title, markdownContent);
  };

  const downloadSavedTranscript = (record, fallbackTitle) => {
    const title = record.title || fallbackTitle || 'transcript';
    const transcriptContent = formatTranscriptWithSpeakers(record.transcript);
    const markdownContent = composeMarkdownDocument(
      title,
      record.pubDate,
      record.transcript?.metadata?.duration,
      record.timestamp,
      transcriptContent
    );

    exportMarkdownFile(title, markdownContent);
  };

  const openTranscriptPreview = (record, fallbackTitle) => {
    if (!record) return;
    const title = record.title || fallbackTitle || 'Transcript';
    const transcriptContent = formatTranscriptWithSpeakers(record.transcript);
    const markdown = composeMarkdownDocument(
      title,
      record.pubDate,
      record.transcript?.metadata?.duration,
      record.timestamp,
      transcriptContent
    );

    setPreviewTranscript({
      title,
      markdown
    });
  };

  const closeTranscriptPreview = () => setPreviewTranscript(null);

  const clearQueue = () => {
    setTranscripts({});
    setProgress({});
    setSelected([]);
  };

  // Load saved transcripts when component mounts
  React.useEffect(() => {
    loadSavedTranscripts();
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Transcribr</h1>
        <p className="app-tagline">Precision transcripts for thoughtful audio teams.</p>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Content Panel */}
        <div className="content-panel">
          {/* Hero RSS Input Section */}
          <div className="rss-hero">
            <h2>Transform Podcasts into Text</h2>
            <p>Enter any podcast RSS feed URL to select and transcribe episodes with AI-powered speech recognition</p>
            <div className="rss-input-group">
              <input
                type="text"
                value={rssUrl}
                onChange={e => setRssUrl(e.target.value)}
                placeholder="Enter podcast RSS feed URL or try the pre-filled Naval example"
                className="rss-input"
                onKeyPress={e => e.key === 'Enter' && !loading && rssUrl && fetchEpisodes()}
              />
              <button
                className="rss-button"
                onClick={() => {
                  if (!loading && rssUrl) {
                    fetchEpisodes();
                  }
                }}
                disabled={loading || !rssUrl}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Fetching episodes
                  </>
                ) : (
                  <>
                    Fetch episodes
                    <IconArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="episode-toolbar">
            <div className="search-field">
              <IconSearch size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search episodes by title or details"
              />
            </div>
            <div className="toolbar-actions">
              <span className="results-count">
                {filteredCount} of {totalEpisodes || 0} episodes
              </span>
              <button
                className="secondary-button"
                onClick={toggleSelectAllVisible}
                disabled={!displayEpisodes.length}
              >
                {allVisibleSelected ? 'Clear visible' : 'Select visible'}
              </button>
            </div>
          </div>

          {/* Year Navigation */}
          {episodes.length > 0 && sortedYears.length > 1 && (
            <div className="year-navigation">
              <div className="year-tabs">
                <button
                  className={`year-tab ${!selectedYear ? 'active' : ''}`}
                  onClick={() => setSelectedYear(null)}
                >
                  Recent 25
                </button>
                {sortedYears.map(year => (
                  <button
                    key={year}
                    className={`year-tab ${selectedYear === year ? 'active' : ''}`}
                    onClick={() => setSelectedYear(year)}
                  >
                    {year} ({groupedEpisodes[year].length})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Episodes List */}
          {displayEpisodes.length > 0 && (
            <div className="episodes-container">
              <h2 className="section-heading">
                {selectedYear ? `${selectedYear} Episodes` : 'Recent Episodes'}
              </h2>
              {displayEpisodes.map(ep => (
                <div 
                  key={ep.guid} 
                  className={`episode-item ${ep.isTranscribed ? 'transcribed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(ep.guid)}
                    onChange={() => handleSelect(ep.guid)}
                    className="episode-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="episode-content" onClick={() => handleSelect(ep.guid)}>
                    <h3>{ep.title}</h3>
                    <div className="episode-meta">
                      <p className="episode-date">{new Date(ep.pubDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                      {ep.isTranscribed && (
                        <span className="episode-status">Transcribed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}


        </div>

        {/* Fixed Transcription Panel */}
        <div className="transcription-panel">
          <div className="panel-header">
            <div className="panel-tabs">
              <button
                className={`panel-tab ${activePanel === 'queue' ? 'active' : ''}`}
                onClick={() => setActivePanel('queue')}
              >
                Queue
              </button>
              <button
                className={`panel-tab ${activePanel === 'library' ? 'active' : ''}`}
                onClick={() => setActivePanel('library')}
              >
                Library
              </button>
            </div>
            <div className="panel-subtitle">
              {activePanel === 'queue'
                ? `${selected.length} episode${selected.length !== 1 ? 's' : ''} selected`
                : `${libraryCount} saved transcript${libraryCount !== 1 ? 's' : ''}`}
            </div>
          </div>

          {activePanel === 'queue' ? (
            <>
              <div className="selected-episodes">
                {selectedEpisodeDetails.length === 0 ? (
                  <div className="empty-state">
                    Select episodes to transcribe
                  </div>
                ) : (
                  selectedEpisodeDetails.map(ep => (
                    <div key={ep.guid} className="selected-episode">
                      <div className="selected-episode-title">{ep.title}</div>
                      <div className="selected-episode-meta">
                        {new Date(ep.pubDate).toLocaleDateString()}
                        {ep.isTranscribed && ' · Transcribed'}
                      </div>
                      {progress[ep.guid] && (() => {
                        const info = progress[ep.guid];
                        const status = info.status;
                        const showSpinner = ['starting', 'downloading', 'uploading', 'processing', 'queued', 'saving'].includes(status);
                        const showBar = typeof info.progress === 'number';
                        const progressValue = showBar ? Math.max(0, Math.min(100, info.progress)) : 0;

                        return (
                          <div className={`progress-item ${
                            status === 'complete' ? 'complete' : 
                            status === 'error' ? 'error' : ''
                          }`}>
                            <div className="progress-status">
                              {showSpinner && <div className="progress-spinner"></div>}
                              {status === 'complete' && (
                                <div className="progress-check"><IconCheck /></div>
                              )}
                              {status === 'error' && (
                                <div className="progress-error"><IconClose /></div>
                              )}
                              <span className="progress-text">{info.message}</span>
                            </div>
                            {showBar && (
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{width: `${progressValue}%`}}
                                ></div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {transcripts[ep.guid] && (
                        <div className="selected-episode-actions">
                          <button
                            className="action-button"
                            onClick={(e) => {
                              e.preventDefault();
                              downloadTranscript(ep.guid);
                            }}
                          >
                            <IconDownload size={16} />
                            Download transcript
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="transcribe-section">
                <button 
                  onClick={transcribeSelected} 
                  disabled={transcribing || selected.length === 0}
                  className="transcribe-button"
                >
                  {transcribing ? (
                    <>
                      <span className="loading-spinner"></span>
                      Transcribing...
                    </>
                  ) : (
                    `Transcribe ${selected.length} Episode${selected.length !== 1 ? 's' : ''}`
                  )}
                </button>
                
                {(Object.keys(transcripts).length > 0 || Object.keys(progress).length > 0) && (
                  <button 
                    onClick={clearQueue}
                    className="secondary-button full-width-button action-button--ghost"
                  >
                    <IconTrash size={16} />
                    Clear queue
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="library-section">
              <div className="library-toolbar">
                <div className="search-field">
                  <IconSearch size={16} />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={e => setLibrarySearch(e.target.value)}
                    placeholder="Search transcripts"
                  />
                </div>
              </div>

              {filteredLibraryGroups.length === 0 ? (
                <div className="empty-state">
                  {libraryCount ? 'No transcripts match your filters yet.' : 'No transcripts saved yet. Start transcribing episodes to build your library.'}
                </div>
              ) : (
                <div className="library-groups">
                  {filteredLibraryGroups.map(group => (
                    <div key={group.title} className="library-group">
                      <div className="library-group-header">
                        <div>
                          <h4 className="library-group-title">{group.title}</h4>
                          {group.feedUrl && (
                            <a 
                              className="library-group-link" 
                              href={group.feedUrl} 
                              target="_blank" 
                              rel="noreferrer"
                            >
                              Visit feed
                            </a>
                          )}
                        </div>
                        <span className="library-group-count">{group.transcripts.length} item{group.transcripts.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="library-items">
                        {group.transcripts.map((record, index) => {
                          const fallbackTitle = record.title || `Episode ${index + 1}`;
                          const displayTitle = record.title || fallbackTitle;
                          const transcribedDate = record.timestamp ? new Date(record.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '';
                          return (
                            <div key={`${group.title}-${record.audioUrl || index}`} className="library-item">
                              <div className="library-item-main">
                                <div className="library-item-title">{displayTitle}</div>
                                <div className="library-item-meta">
                                  {transcribedDate && `Transcribed ${transcribedDate}`}
                                  {record.pubDate && ` • Published ${new Date(record.pubDate).toLocaleDateString()}`}
                                </div>
                              </div>
                              <div className="library-item-actions">
                                <button
                                  className="action-button action-button--ghost"
                                  onClick={() => openTranscriptPreview(record, displayTitle)}
                                >
                                  View
                                </button>
                                <button
                                  className="action-button"
                                  onClick={() => downloadSavedTranscript(record, displayTitle)}
                                >
                                  <IconDownload size={16} />
                                  Download
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {previewTranscript && (
        <div className="modal-backdrop" onClick={closeTranscriptPreview}>
          <div className="modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{previewTranscript.title}</h3>
              <button className="icon-button" onClick={closeTranscriptPreview} aria-label="Close transcript preview">
                <IconClose size={14} />
              </button>
            </div>
            <div className="modal-body markdown-preview">
              <pre>{previewTranscript.markdown}</pre>
            </div>
            <div className="modal-actions">
              <button className="secondary-button action-button--ghost" onClick={closeTranscriptPreview}>
                Close
              </button>
              <button 
                className="action-button"
                onClick={() => exportMarkdownFile(previewTranscript.title, previewTranscript.markdown)}
              >
                <IconDownload size={16} />
                Download markdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
