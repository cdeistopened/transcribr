import axios from 'axios';

export const handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'text/plain'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { audioUrl } = JSON.parse(event.body);
    
    if (!audioUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'audioUrl required' })
      };
    }

    const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
    
    if (!DEEPGRAM_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Deepgram API key not configured' })
      };
    }

    console.log(`Starting transcription for: ${audioUrl}`);

    // Send initial status
    let responseBody = JSON.stringify({
      status: 'downloading',
      message: 'Starting audio download...',
      timestamp: new Date().toISOString()
    }) + '\\n';

    // Download audio file
    console.log('Downloading audio file...');
    const audioResp = await axios.get(audioUrl, { 
      responseType: 'arraybuffer',
      timeout: 300000 // 5 minutes
    });

    responseBody += JSON.stringify({
      status: 'processing',
      message: `Audio downloaded (${(audioResp.data.length / 1024 / 1024).toFixed(2)} MB), sending to Deepgram...`,
      timestamp: new Date().toISOString()
    }) + '\\n';

    // Send to Deepgram
    console.log('Sending to Deepgram...');
    const deepgramResp = await axios.post(
      'https://api.deepgram.com/v1/listen',
      audioResp.data,
      {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/octet-stream',
        },
        params: {
          model: 'nova-2',
          smart_format: true,
          utterances: true,
          punctuate: true,
          diarize: true,
          diarize_version: '3'
        },
        timeout: 600000 // 10 minutes
      }
    );

    if (!deepgramResp.data || !deepgramResp.data.results) {
      throw new Error('Invalid response from Deepgram');
    }

    responseBody += JSON.stringify({
      status: 'complete',
      message: 'Transcription complete!',
      transcript: deepgramResp.data,
      timestamp: new Date().toISOString()
    }) + '\\n';

    console.log('Transcription completed successfully');

    return {
      statusCode: 200,
      headers,
      body: responseBody
    };
    
  } catch (error) {
    console.error('Transcription error:', error);
    
    const errorResponse = JSON.stringify({
      status: 'error',
      message: `Transcription failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }) + '\\n';

    return {
      statusCode: 500,
      headers,
      body: errorResponse
    };
  }
};
