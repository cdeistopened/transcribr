import React, { useState, useMemo } from 'react';
import './App.css';

function App() {
  const [rssUrl, setRssUrl] = useState('');
  const [episodes, setEpisodes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transcripts, setTranscripts] = useState({});
  const [selectedYear, setSelectedYear] = useState(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState({});
  const [savedTranscripts, setSavedTranscripts] = useState([]);
  const [showSavedTranscripts, setShowSavedTranscripts] = useState(false);
  const [progress, setProgress] = useState({});

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

  const fetchEpisodes = async () => {
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
      setEpisodes(data.episodes || []);
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
    setLoading(true);
    for (const ep of episodes.filter(e => selected.includes(e.guid))) {
      try {
        // First check if we already have this transcript saved
        const savedTranscript = await findSavedTranscript(ep.audioUrl);
        if (savedTranscript) {
          setProgress(prev => ({
            ...prev,
            [ep.guid]: { status: 'complete', message: 'Loading saved transcript...' }
          }));
          setTranscripts(t => ({ ...t, [ep.guid]: savedTranscript }));
          continue;
        }

        setProgress(prev => ({
          ...prev,
          [ep.guid]: { status: 'starting', message: 'Starting transcription...' }
        }));

        console.log(`Sending transcription request for episode: ${ep.title}`);
        const resp = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioUrl: ep.audioUrl }),
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
                const newProgress = {
                  ...prev,
                  [ep.guid]: update
                };
                console.log('Progress update:', {
                  episodeGuid: ep.guid,
                  previousProgress: prev[ep.guid],
                  newUpdate: update,
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
          [ep.guid]: { status: 'complete', message: 'Transcription complete!' }
        }));
      } catch (err) {
        console.error('Transcription error:', err);
        setProgress(prev => ({
          ...prev,
          [ep.guid]: { status: 'error', message: 'Transcription failed' }
        }));
      }
    }
    setLoading(false);
    // Reset selection after transcription is complete
    setSelected([]);
  };

  // Group episodes by year
  const groupedEpisodes = useMemo(() => {
    return episodes.reduce((acc, ep) => {
      const year = new Date(ep.pubDate).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(ep);
      return acc;
    }, {});
  }, [episodes]);

  // Sort years in descending order
  const sortedYears = useMemo(() => {
    return Object.keys(groupedEpisodes).sort((a, b) => b - a);
  }, [groupedEpisodes]);

  // Get episodes to display (recent 25 by default, or selected year)
  const displayEpisodes = useMemo(() => {
    if (!episodes.length) return [];
    
    if (selectedYear) {
      return groupedEpisodes[selectedYear] || [];
    }
    
    // Default: show most recent 25 episodes
    return episodes.slice(0, 25);
  }, [episodes, selectedYear, groupedEpisodes]);

  // Get selected episode details for the panel
  const selectedEpisodeDetails = useMemo(() => {
    return episodes.filter(ep => selected.includes(ep.guid));
  }, [episodes, selected]);

  const toggleTranscript = (guid) => {
    setExpandedTranscripts(prev => ({
      ...prev,
      [guid]: !prev[guid]
    }));
  };

  const formatTranscriptWithSpeakers = (transcript) => {
    if (!transcript?.results?.channels?.[0]?.alternatives?.[0]) return '';
    
    const words = transcript.results.channels[0].alternatives[0].words || [];
    let formattedText = '';
    let currentSpeaker = null;
    let currentParagraph = '';

    words.forEach((word, index) => {
      // If speaker changes or it's been more than 5 seconds since last word, start new paragraph
      const nextWord = words[index + 1];
      const timeDiff = nextWord ? nextWord.start - word.end : 0;
      const speakerChanged = word.speaker !== currentSpeaker;
      const longPause = timeDiff > 5;

      if (speakerChanged || longPause) {
        if (currentParagraph) {
          formattedText += currentParagraph + '\n\n';
        }
        currentSpeaker = word.speaker;
        currentParagraph = `Speaker ${word.speaker}: ${word.word}`;
      } else {
        currentParagraph += ` ${word.word}`;
      }

      // If it's the last word, add the final paragraph
      if (index === words.length - 1) {
        formattedText += currentParagraph;
      }
    });

    return formattedText;
  };

  const downloadTranscript = (guid) => {
    const transcript = transcripts[guid];
    if (!transcript) return;

    const episode = episodes.find(e => e.guid === guid);
    const title = episode?.title || 'transcript';
    const content = formatTranscriptWithSpeakers(transcript);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
                placeholder="https://example.com/podcast/feed.xml"
                className="rss-input"
                onKeyPress={e => e.key === 'Enter' && !loading && rssUrl && fetchEpisodes()}
              />
              <button 
                onClick={fetchEpisodes} 
                disabled={loading || !rssUrl}
                className="rss-button"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Loading Episodes...
                  </>
                ) : (
                  'Fetch Episodes'
                )}
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
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                {selectedYear ? `${selectedYear} Episodes` : 'Recent Episodes'}
              </h2>
              {displayEpisodes.map(ep => (
                <div key={ep.guid} className="episode-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(ep.guid)}
                    onChange={() => handleSelect(ep.guid)}
                    className="episode-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="episode-content" onClick={() => handleSelect(ep.guid)}>
                    <h3>{ep.title}</h3>
                    <p className="episode-date">{new Date(ep.pubDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved Transcripts Section */}
          {savedTranscripts.length > 0 && (
            <div style={{ padding: '2rem' }}>
              <button 
                onClick={() => setShowSavedTranscripts(!showSavedTranscripts)}
                style={{ 
                  background: 'none', 
                  border: '1px solid var(--border-color)', 
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--border-radius-sm)',
                  cursor: 'pointer',
                  marginBottom: '1rem'
                }}
              >
                {showSavedTranscripts ? 'Hide' : 'Show'} Saved Transcripts ({savedTranscripts.length})
              </button>

              {showSavedTranscripts && (
                <div style={{ 
                  background: 'var(--secondary-color)', 
                  padding: '1rem', 
                  borderRadius: 'var(--border-radius)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {savedTranscripts.map((transcript, index) => {
                    // Try to extract episode title from the transcript data or URL
                    const episodeTitle = transcript.episodeTitle || 
                                       episodes.find(ep => ep.audioUrl === transcript.audioUrl)?.title || 
                                       'Unknown Episode';
                    
                    return (
                      <div key={index} style={{ 
                        background: 'white', 
                        padding: '1rem', 
                        marginBottom: '0.5rem',
                        borderRadius: 'var(--border-radius-sm)',
                        fontSize: '0.9rem',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ 
                          fontWeight: '600', 
                          marginBottom: '0.5rem',
                          color: 'var(--text-primary)',
                          lineHeight: '1.3'
                        }}>
                          {episodeTitle}
                        </div>
                        <div style={{ 
                          marginBottom: '0.75rem', 
                          color: 'var(--text-secondary)',
                          fontSize: '0.8rem'
                        }}>
                          Transcribed: {new Date(transcript.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const guid = transcript.audioUrl;
                            setTranscripts(prev => ({ ...prev, [guid]: transcript.transcript }));
                            setExpandedTranscripts(prev => ({ ...prev, [guid]: true }));
                          }}
                          style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => e.target.style.background = 'var(--primary-hover)'}
                          onMouseOut={(e) => e.target.style.background = 'var(--primary-color)'}
                        >
                          View Transcript
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Transcription Panel */}
        <div className="transcription-panel">
          <div className="panel-header">
            <h3 className="panel-title">Transcription Queue</h3>
            <div className="selected-count">
              {selected.length} episode{selected.length !== 1 ? 's' : ''} selected
            </div>
          </div>

          {/* Selected Episodes List */}
          <div className="selected-episodes">
            {selectedEpisodeDetails.length === 0 ? (
              <div style={{ 
                padding: '2rem 1rem', 
                textAlign: 'center', 
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>
                Select episodes to transcribe
              </div>
            ) : (
              selectedEpisodeDetails.map(ep => (
                <div key={ep.guid} className="selected-episode">
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {ep.title}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem'
                  }}>
                    {new Date(ep.pubDate).toLocaleDateString()}
                  </div>
                  {progress[ep.guid] && (
                    <div className={`progress-item ${
                      progress[ep.guid].status === 'complete' ? 'complete' : 
                      progress[ep.guid].status === 'error' ? 'error' : ''
                    }`}>
                      <div className="progress-status">
                        {progress[ep.guid].status === 'downloading' && (
                          <div className="progress-spinner"></div>
                        )}
                        {progress[ep.guid].status === 'processing' && (
                          <div className="progress-spinner"></div>
                        )}
                        {progress[ep.guid].status === 'complete' && (
                          <div className="progress-check">✓</div>
                        )}
                        {progress[ep.guid].status === 'error' && (
                          <div className="progress-error">✗</div>
                        )}
                        <span className="progress-text">{progress[ep.guid].message}</span>
                      </div>
                      {progress[ep.guid].progress && (
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{width: `${progress[ep.guid].progress}%`}}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}
                  {transcripts[ep.guid] && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => toggleTranscript(ep.guid)}
                        style={{
                          background: 'var(--accent-color)',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          marginRight: '0.5rem'
                        }}
                      >
                        {expandedTranscripts[ep.guid] ? 'Hide' : 'View'}
                      </button>
                      <button 
                        onClick={() => downloadTranscript(ep.guid)}
                        style={{
                          background: 'var(--text-secondary)',
                          color: 'white',
                          border: 'none',
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--border-radius-sm)',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Download
                      </button>
                      {expandedTranscripts[ep.guid] && (
                        <div style={{
                          marginTop: '0.5rem',
                          padding: '0.75rem',
                          background: 'white',
                          borderRadius: 'var(--border-radius-sm)',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          fontSize: '0.8rem',
                          lineHeight: '1.4',
                          border: '1px solid var(--border-color)'
                        }}>
                          <pre style={{ 
                            whiteSpace: 'pre-wrap', 
                            margin: 0,
                            fontFamily: 'inherit'
                          }}>
                            {formatTranscriptWithSpeakers(transcripts[ep.guid])}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Transcribe Action */}
          <div className="transcribe-section">
            <button 
              onClick={transcribeSelected} 
              disabled={loading || selected.length === 0}
              className="transcribe-button"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Transcribing...
                </>
              ) : (
                `Transcribe ${selected.length} Episode${selected.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
