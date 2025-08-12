import RSSParser from 'rss-parser';

const parser = new RSSParser();

export const handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
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
    const { rssUrl } = JSON.parse(event.body);
    
    if (!rssUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'rssUrl required' })
      };
    }

    console.log(`Parsing RSS feed: ${rssUrl}`);
    
    const feed = await parser.parseURL(rssUrl);
    
    const episodes = feed.items.map(item => ({
      title: item.title,
      link: item.link,
      audioUrl: item.enclosure?.url || '',
      pubDate: item.pubDate,
      guid: item.guid || item.link,
    })).filter(e => e.audioUrl);

    console.log(`Successfully parsed ${episodes.length} episodes`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ episodes })
    };
    
  } catch (error) {
    console.error('RSS parsing error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to parse RSS', 
        details: error.message 
      })
    };
  }
};
