const db = require('../../backend/db');
const cache = require('../../backend/cache');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Response helper
const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders
  },
  body: JSON.stringify(body)
});

// Success response
const success = (data, message = null) => createResponse(200, {
  success: true,
  data,
  message
});

// Error response
const error = (statusCode, message, code = null) => createResponse(statusCode, {
  success: false,
  error: {
    code,
    message
  }
});

// Parse query parameters robustly (supports object or string)
const parseQuery = (query) => {
  if (!query) return {};
  if (typeof query === 'string') {
    const params = new URLSearchParams(query);
    return Object.fromEntries(params.entries());
  }
  return query;
};

// Main handler function
exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  const method = event.httpMethod;
  const query = parseQuery(event.queryStringParameters);
  const path = event.path || '';
  const parts = path.split('/').filter(Boolean);

  // Detect path parameters
  let id = query.id;
  const tIndex = parts.indexOf('timetable');
  const afterTimetable = tIndex >= 0 ? parts[tIndex + 1] : null;

  // Route for AI enhancement endpoint
  if (method === 'POST' && afterTimetable === 'enhance') {
    return await handleEnhance(event.body);
  }

  // Support PUT/DELETE with path param like /timetable/:id
  if (!id && (method === 'PUT' || method === 'DELETE')) {
    if (afterTimetable && afterTimetable !== 'enhance') {
      id = afterTimetable;
    }
  }
  
  try {
    switch (method) {
      case 'GET':
        return await handleGet(query);
      case 'POST':
        return await handlePost(event.body);
      case 'PUT':
        return await handlePut(id, event.body);
      case 'DELETE':
        return await handleDelete(id);
      default:
        return error(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
    }
  } catch (err) {
    console.error('Handler error:', err);
    return error(500, 'Internal server error', 'INTERNAL_ERROR');
  }
};

// Handle GET requests
const handleGet = async (query) => {
  try {
    const day = query.day || null;
    const cacheKey = day || 'all';
    
    // Check cache first
    let data = cache.getTimetable(cacheKey);
    
    if (!data) {
      // Fetch from database
      data = await db.getAllEntries(day);
      
      // Cache the result
      cache.setTimetable(data, cacheKey);
    }
    
    return success(data);
  } catch (err) {
    console.error('GET error:', err);
    return error(500, err.message, 'DATABASE_ERROR');
  }
};

// Handle POST requests
const handlePost = async (body) => {
  try {
    if (!body) {
      return error(400, 'Request body is required', 'MISSING_BODY');
    }
    
    let data;
    let entries;
    
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      // If JSON parsing fails, treat as natural text (fallback)
      console.log('JSON parse failed, treating as natural text');
      const parseNaturalTextServer = require('../../backend/db').parseNaturalTextServer;
      entries = parseNaturalTextServer(body);
      
      if (entries.length === 0) {
        return error(400, 'No valid entries found in natural text', 'PARSE_ERROR');
      }
    }
    
    // Handle structured data
    if (data) {
      if (!data.entries || !Array.isArray(data.entries)) {
        return error(400, 'entries array is required', 'INVALID_FORMAT');
      }
      
      if (data.entries.length === 0) {
        return error(400, 'At least one entry is required', 'EMPTY_ENTRIES');
      }
      
      entries = data.entries;
    }
    
    // Create entries in database
    const insertedIds = await db.createEntries(entries);
    
    // Invalidate cache
    cache.invalidate();
    
    return success(
      { insertedIds, count: insertedIds.length },
      `${insertedIds.length} entries created successfully`
    );
  } catch (err) {
    console.error('POST error:', err);
    
    if (err.message.includes('Overlapping entry')) {
      return error(409, err.message, 'CONFLICT');
    }
    
    if (err.message.includes('Invalid') || err.message.includes('Entry')) {
      return error(400, err.message, 'VALIDATION_ERROR');
    }
    
    return error(500, err.message, 'DATABASE_ERROR');
  }
};

// Handle PUT requests
const handlePut = async (id, body) => {
  try {
    if (!id) {
      return error(400, 'Entry ID is required', 'MISSING_ID');
    }
    
    if (!body) {
      return error(400, 'Request body is required', 'MISSING_BODY');
    }
    
    const data = JSON.parse(body);
    
    // Update entry in database
    await db.updateEntry(parseInt(id), data);
    
    // Invalidate cache
    cache.invalidate();
    
    return success(
      { id: parseInt(id) },
      'Entry updated successfully'
    );
  } catch (err) {
    console.error('PUT error:', err);
    
    if (err.message === 'Entry not found') {
      return error(404, 'Entry not found', 'NOT_FOUND');
    }
    
    if (err.message.includes('Overlapping entry')) {
      return error(409, err.message, 'CONFLICT');
    }
    
    if (err.message.includes('Invalid')) {
      return error(400, err.message, 'VALIDATION_ERROR');
    }
    
    return error(500, err.message, 'DATABASE_ERROR');
  }
};

// Handle DELETE requests
const handleDelete = async (id) => {
  try {
    if (!id) {
      return error(400, 'Entry ID is required', 'MISSING_ID');
    }
    
    // Delete entry from database
    await db.deleteEntry(parseInt(id));
    
    // Invalidate cache
    cache.invalidate();
    
    return success(
      { id: parseInt(id) },
      'Entry deleted successfully'
    );
  } catch (err) {
    console.error('DELETE error:', err);
    
    if (err.message === 'Entry not found') {
      return error(404, 'Entry not found', 'NOT_FOUND');
    }
    
    return error(500, err.message, 'DATABASE_ERROR');
  }
};

// Handle AI Enhancement (server-side Gemini call)
const handleEnhance = async (body) => {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return error(400, 'AI enhancement is unavailable: missing API key', 'MISSING_API_KEY');
    }

    if (!body) {
      return error(400, 'Request body is required', 'MISSING_BODY');
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return error(400, 'Invalid JSON body', 'INVALID_JSON');
    }

    const entries = Array.isArray(data.entries) ? data.entries : [];
    if (entries.length === 0) {
      return error(400, 'entries array is required', 'INVALID_FORMAT');
    }

    const prompt = `You are given an array of timetable entries in JSON with fields: day, start_time (HH:MM), end_time (HH:MM), type (class|lab), subject.\n` +
      `Goal: Improve subject names for clarity and suggest merging of immediately consecutive identical entries if applicable.\n` +
      `Rules: Return ONLY a JSON array with the same structure. Keep times and days unchanged unless merging requires adjusting end_time. Do not add commentary.\n` +
      `Input: ${JSON.stringify(entries)}`;

    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GOOGLE_GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, topK: 1, topP: 1, maxOutputTokens: 512 }
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return error(resp.status, `AI service error: ${text.substring(0, 200)}`, 'AI_SERVICE_ERROR');
    }

    const payload = await resp.json();
    const outText = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let optimized = entries;
    try {
      const parsed = JSON.parse(outText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        optimized = parsed;
      }
    } catch (_) {
      // If parsing fails, return original entries
    }

    return success({ entries: optimized }, 'AI enhancement complete');
  } catch (err) {
    console.error('ENHANCE error:', err);
    return error(500, 'AI enhancement failed', 'AI_ERROR');
  }
};