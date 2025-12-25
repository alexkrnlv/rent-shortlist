import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import Redis from 'ioredis';

// Load environment variables
config();

// Initialize Redis connection for session storage
const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : null;

if (redis) {
  redis.on('connect', () => console.log('✅ Connected to Redis'));
  redis.on('error', (err) => console.error('Redis error:', err));
} else {
  console.log('⚠️ REDIS_URL not set, using in-memory session storage (sessions will be lost on restart)');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Note: Static files are served AFTER API routes (see end of file)

// SSE clients for real-time updates
const sseClients: Set<express.Response> = new Set();

// ============================================
// Session Storage for Short URLs (Redis + Fallback)
// ============================================

interface StoredSession {
  id: string;
  data: object;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback when Redis is not available
const memorySessionStore = new Map<string, StoredSession>();

// Session storage abstraction - uses Redis if available, memory otherwise
const sessionStorage = {
  async get(id: string): Promise<StoredSession | null> {
    if (redis) {
      const data = await redis.get(`session:${id}`);
      return data ? JSON.parse(data) : null;
    }
    return memorySessionStore.get(id) || null;
  },
  
  async set(id: string, session: StoredSession): Promise<void> {
    if (redis) {
      // Store with 90-day expiration
      // No expiration - sessions persist forever
      await redis.set(`session:${id}`, JSON.stringify(session));
    } else {
      memorySessionStore.set(id, session);
    }
  },
  
  async has(id: string): Promise<boolean> {
    if (redis) {
      return (await redis.exists(`session:${id}`)) === 1;
    }
    return memorySessionStore.has(id);
  },
  
  async count(): Promise<number> {
    if (redis) {
      const keys = await redis.keys('session:*');
      return keys.length;
    }
    return memorySessionStore.size;
  },
  
  async list(): Promise<{ id: string; createdAt: string; updatedAt: string }[]> {
    if (redis) {
      const keys = await redis.keys('session:*');
      const sessions = await Promise.all(
        keys.slice(0, 100).map(async (key) => {
          const data = await redis.get(key);
          if (data) {
            const session = JSON.parse(data) as StoredSession;
            return { id: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt };
          }
          return null;
        })
      );
      return sessions.filter((s): s is NonNullable<typeof s> => s !== null);
    }
    return Array.from(memorySessionStore.values()).map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }
};

// Word lists for friendly URL generation
const adjectives = [
  'sunny', 'cozy', 'bright', 'quiet', 'modern', 'charming', 'lovely', 'central',
  'spacious', 'stylish', 'elegant', 'urban', 'trendy', 'peaceful', 'vibrant',
  'fresh', 'warm', 'cool', 'green', 'blue', 'golden', 'silver', 'royal',
  'happy', 'swift', 'calm', 'bold', 'crisp', 'prime', 'smart'
];

const nouns = [
  'flat', 'home', 'nest', 'place', 'spot', 'pad', 'space', 'suite',
  'lodge', 'haven', 'retreat', 'base', 'hub', 'zone', 'corner',
  'view', 'court', 'lane', 'walk', 'garden', 'terrace', 'heights',
  'point', 'house', 'manor', 'villa', 'loft', 'studio', 'den', 'nook'
];

function generateFriendlyId(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}-${noun}-${num}`;
}

async function generateUniqueId(): Promise<string> {
  let id = generateFriendlyId();
  let attempts = 0;
  while (await sessionStorage.has(id) && attempts < 100) {
    id = generateFriendlyId();
    attempts++;
  }
  // Fallback to random suffix if collision persists
  if (await sessionStorage.has(id)) {
    id = `${id}-${Date.now().toString(36)}`;
  }
  return id;
}

// POST /api/sessions - Create or update a session
app.post('/api/sessions', async (req, res) => {
  try {
    const { id, data } = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid session data' });
    }

    const now = new Date().toISOString();
    
    // If ID provided and exists, update it
    if (id) {
      const existing = await sessionStorage.get(id);
      if (existing) {
        existing.data = data;
        existing.updatedAt = now;
        await sessionStorage.set(id, existing);
        console.log(`Session updated: ${id}`);
        return res.json({ id, url: `/s/${id}` });
      }
    }

    // Create new session
    const newId = id || await generateUniqueId();
    const session: StoredSession = {
      id: newId,
      data,
      createdAt: now,
      updatedAt: now,
    };
    await sessionStorage.set(newId, session);
    const count = await sessionStorage.count();
    console.log(`Session created: ${newId} (total: ${count})`);
    
    res.json({ id: newId, url: `/s/${newId}` });
  } catch (error) {
    console.error('Error saving session:', error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// GET /api/sessions/:id - Retrieve a session
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const session = await sessionStorage.get(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ id: session.id, data: session.data });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// GET /api/sessions - List sessions (for debugging)
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await sessionStorage.list();
    res.json({ count: sessions.length, sessions, storage: redis ? 'redis' : 'memory' });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Broadcast to all SSE clients
function broadcastToClients(data: object) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    client.write(message);
  });
}

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Add client to set
  sseClients.add(res);
  console.log(`SSE client connected. Total clients: ${sseClients.size}`);

  // Remove client on close
  req.on('close', () => {
    sseClients.delete(res);
    console.log(`SSE client disconnected. Total clients: ${sseClients.size}`);
  });

  // Keep connection alive with periodic pings
  const pingInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(pingInterval);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// Fetch with retry logic
async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
        redirect: 'follow',
      });

      if (response.ok) {
        return await response.text();
      }

      if (response.status === 403 || response.status === 429) {
        // Rate limited or blocked, wait before retry
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        lastError = new Error(`HTTP ${response.status}: Access blocked or rate limited`);
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

// Extract structured data (JSON-LD) from HTML
function extractStructuredData(html: string): any {
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const structuredData: any[] = [];

  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '').trim();
        const parsed = JSON.parse(jsonContent);
        structuredData.push(parsed);
      } catch (e) {
        // Invalid JSON, skip
      }
    }
  }

  return structuredData;
}

// Extract all possible images from HTML
function extractImages(html: string): string[] {
  const images: string[] = [];

  // og:image
  const ogMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                  html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) images.push(ogMatch[1]);

  // twitter:image
  const twitterMatch = html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
                       html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (twitterMatch) images.push(twitterMatch[1]);

  // Large images in img tags (likely property photos)
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgMatches) {
    const src = match[1];
    // Filter for likely property images (large, not icons/logos/lifestyle)
    if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('sprite') &&
        !src.includes('avatar') && !src.includes('1x1') && !src.includes('placeholder') &&
        !src.includes('lifestyle') && !src.includes('pet') && !src.includes('dog') &&
        !src.includes('cat') && !src.includes('person') && !src.includes('people') &&
        !src.includes('team') && !src.includes('staff') && !src.includes('agent') &&
        (src.includes('property') || src.includes('image') || src.includes('photo') ||
         src.includes('media') || src.includes('cdn') || src.includes('rightmove') ||
         src.includes('zoopla') || src.includes('onthemarket') || src.includes('apartment') ||
         src.includes('flat') || src.includes('room') || src.includes('kitchen') ||
         src.includes('bedroom') || src.includes('bathroom') || src.includes('living') ||
         src.includes('exterior') || src.includes('interior') || src.match(/\d{3,}x\d{3,}/))) {
      images.push(src);
    }
  }

  // srcset images (often have high-res versions)
  const srcsetMatches = html.matchAll(/srcset=["']([^"']+)["']/gi);
  for (const match of srcsetMatches) {
    const srcset = match[1];
    const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
    images.push(...urls.filter(u => u && u.startsWith('http')));
  }

  // data-src (lazy loaded images)
  const dataSrcMatches = html.matchAll(/data-src=["']([^"']+)["']/gi);
  for (const match of dataSrcMatches) {
    if (match[1].startsWith('http')) images.push(match[1]);
  }

  // Background images in style
  const bgMatches = html.matchAll(/background(?:-image)?:\s*url\(['"]?([^'")\s]+)['"]?\)/gi);
  for (const match of bgMatches) {
    if (match[1].startsWith('http')) images.push(match[1]);
  }

  // Remove duplicates and return
  return [...new Set(images)].slice(0, 10); // Limit to first 10
}

// Extract addresses with context labels and HTML location
interface ExtractedAddress {
  postcode: string;
  fullAddress: string;
  fullContext: string;
  source: 'PROPERTY' | 'AGENT_OFFICE' | 'DEVELOPER' | 'FOOTER' | 'CONTACT' | 'UNKNOWN';
  confidence: number;
  htmlLocation: string;
  isFromTitle: boolean;
}

// Extract the PRIMARY property address from H1/title/body - handles both listings and BTR sites
function extractPrimaryPropertyAddress(html: string): { address: string; postcode: string; source: string } | null {
  // Get page title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  
  // Get H1 (first one, which is usually the property/development name)
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  
  // Get meta description
  const descMatch = html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1] : '';
  
  // Combined text to search for primary source (title/H1/description)
  const primaryText = `${title} | ${h1} | ${description}`;
  
  // Look for UK postcode patterns (full or partial)
  // Full postcode: SE18 1AB, NW10 6QQ
  const fullPostcodeMatch = primaryText.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
  // Partial postcode (outward code only): SE18, E14, NW1, SE1, etc.
  const partialPostcodeMatch = primaryText.match(/[,\s]([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s*$|[,\s.|])/i);
  
  let postcode = fullPostcodeMatch ? fullPostcodeMatch[1].toUpperCase() : 
                 partialPostcodeMatch ? partialPostcodeMatch[1].toUpperCase() : '';
  let source = 'title';
  
  // Extract address from title/h1 patterns
  const addressPatterns = [
    // "3 bedroom house for rent in Barlow Drive, London, SE18"
    /(?:for\s+rent|to\s+let|to\s+rent)\s+(?:in|at)\s+([^|]+)/i,
    // "Barlow Drive, London, SE18" or "123 High Street, London, E14 5AB"
    /([A-Za-z0-9\s]+(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Way|Close|Court|Ct|Place|Pl|Gardens|Gdns|Square|Sq|Terrace|Mews|Walk|Row|Crescent|Cres|Drive|Dr|Grove|Park|Hill|Canal|Wharf|Quay)[^|,]*(?:,\s*[A-Za-z\s]+)*,?\s*[A-Z]{1,2}\d{1,2}[A-Z]?(?:\s*\d[A-Z]{2})?)/i,
    // Just the H1 if it looks like an address (with London or postcode)
    /^([^|]+,\s*(?:London|Greater London)[^|]*)/i,
  ];
  
  let extractedAddress = '';
  for (const pattern of addressPatterns) {
    const match = primaryText.match(pattern);
    if (match) {
      extractedAddress = match[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/^[\s,]+|[\s,]+$/g, '');
      break;
    }
  }
  
  // If H1 looks like an address (contains street name or area + postcode), use it
  if (!extractedAddress && h1) {
    const h1HasAddress = h1.match(/[A-Za-z]+\s*,\s*(?:London|[A-Z]{1,2}\d)/i);
    if (h1HasAddress) {
      extractedAddress = h1;
    }
  }
  
  // For BTR/development sites: if no postcode in title/H1, search in body content
  if (!postcode) {
    // Get main content area for BTR sites - look for address in page body
    const mainContentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                            html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                            html.match(/<div[^>]*class=["'][^"']*(?:content|hero|property|location|address)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi);
    
    const bodyContent = mainContentMatch 
      ? (Array.isArray(mainContentMatch) ? mainContentMatch.join(' ') : mainContentMatch[1])
      : html;
    
    // Clean and search for postcode in body
    const cleanBody = bodyContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    
    // Find full postcode in body content (prioritize ones near location keywords)
    const locationContextMatch = cleanBody.match(/(?:address|location|located|find us|visit|canal|wharf|street|road|avenue)[^.]*?([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
    const bodyFullPostcodeMatch = cleanBody.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
    
    if (locationContextMatch) {
      postcode = locationContextMatch[1].toUpperCase();
      source = 'body_with_context';
    } else if (bodyFullPostcodeMatch) {
      postcode = bodyFullPostcodeMatch[1].toUpperCase();
      source = 'body';
    }
    
    // Also try to extract a fuller address from body if we found a postcode
    if (postcode && !extractedAddress) {
      // Look for address pattern near the postcode we found
      const postcodeEscaped = postcode.replace(/\s+/g, '\\s*');
      const addressNearPostcode = cleanBody.match(new RegExp(`([A-Za-z0-9\\s,]+(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Way|Close|Court|Ct|Place|Pl|Gardens|Gdns|Square|Sq|Terrace|Mews|Walk|Row|Crescent|Cres|Drive|Dr|Grove|Park|Hill|Canal|Wharf|Quay|Gate)[^,]*,?[^,]*${postcodeEscaped})`, 'i'));
      
      if (addressNearPostcode) {
        extractedAddress = addressNearPostcode[1].trim();
      }
    }
  }
  
  // If we still don't have an address but have H1 (for BTR sites with development names)
  if (!extractedAddress && h1 && postcode) {
    // Use H1 (development name) + postcode
    extractedAddress = `${h1}, ${postcode}`;
  } else if (!extractedAddress && h1) {
    // Just use H1 as the address/name
    extractedAddress = h1;
  }
  
  if (extractedAddress || postcode) {
    return { address: extractedAddress || postcode, postcode, source };
  }
  
  return null;
}

function extractAddressesWithContext(html: string): ExtractedAddress[] {
  const addresses: ExtractedAddress[] = [];
  
  // Full UK postcode regex
  const fullPostcodeRegex = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/gi;
  // Partial postcode (outward code) regex - matches SE18, E14, NW1, etc.
  const partialPostcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b/gi;

  // Identify different sections of the page
  const footerContent = (html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i) || ['', ''])[1];
  const headerContent = (html.match(/<header[^>]*>([\s\S]*?)<\/header>/i) || ['', ''])[1];
  const navContent = (html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || []).join('');
  const sidebarContent = (html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/gi) || []).join('') +
                         (html.match(/<div[^>]*class=["'][^"']*sidebar[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi) || []).join('');
  const mainContent = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || ['', ''])[1] ||
                      (html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || ['', ''])[1] ||
                      (html.match(/<div[^>]*class=["'][^"']*(?:property|listing|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || ['', ''])[1];

  // Get H1 and title for high-priority extraction
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : '';
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  
  // Look for "MARKETED BY" or similar agent sections
  const marketedByMatch = html.match(/(?:marketed\s+by|listed\s+by|agent|estate\s+agent)[^<]*<[^>]*>([^<]*(?:<[^>]*>[^<]*)*?(?:[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}))/gi);
  const agentSectionContent = marketedByMatch ? marketedByMatch.join(' ') : '';

  // Find all FULL postcodes first
  const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const fullMatches = cleanText.matchAll(new RegExp(`(.{0,200})(${fullPostcodeRegex.source})(.{0,100})`, 'gi'));

  for (const match of fullMatches) {
    const beforeContext = match[1].trim();
    const postcode = match[2].toUpperCase().replace(/\s+/g, ' ');
    const afterContext = match[3].trim();
    const fullContext = `${beforeContext} ${postcode} ${afterContext}`.trim();
    const lowerContext = fullContext.toLowerCase();

    // Determine where in the HTML this address appears
    let htmlLocation = 'BODY';
    const postcodeNormalized = postcode.toLowerCase();
    
    if (title.toLowerCase().includes(postcodeNormalized) || h1.toLowerCase().includes(postcodeNormalized)) {
      htmlLocation = 'TITLE_OR_H1';
    } else if (agentSectionContent.toLowerCase().includes(postcodeNormalized)) {
      htmlLocation = 'AGENT_SECTION';
    } else if (footerContent.toLowerCase().includes(postcodeNormalized)) {
      htmlLocation = 'FOOTER';
    } else if (headerContent.toLowerCase().includes(postcodeNormalized)) {
      htmlLocation = 'HEADER';
    } else if (navContent.toLowerCase().includes(postcodeNormalized)) {
      htmlLocation = 'NAVIGATION';
    } else if (sidebarContent.toLowerCase().includes(postcodeNormalized)) {
      htmlLocation = 'SIDEBAR';
    } else if (mainContent.toLowerCase().includes(postcodeNormalized)) {
      htmlLocation = 'MAIN_CONTENT';
    }

    // Extract a cleaner full address from context
    const addressMatch = fullContext.match(/(\d+[^,]*(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Way|Close|Court|Ct|Place|Pl|Gardens|Gdns|Square|Sq|Terrace|Mews|Walk|Row|Crescent|Cres|Drive|Dr|Grove|Park|Hill)[^,]*(?:,\s*[^,]+)*,?\s*[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
    const fullAddress = addressMatch ? addressMatch[1].trim() : fullContext.substring(0, 150);

    // Score and classify the address
    const { source, confidence } = classifyAddress(lowerContext, htmlLocation, false);

    addresses.push({
      postcode,
      fullAddress,
      fullContext,
      source,
      confidence,
      htmlLocation,
      isFromTitle: htmlLocation === 'TITLE_OR_H1'
    });
  }

  // Now check if the H1/title/body has a postcode that we should prioritize
  const primaryAddress = extractPrimaryPropertyAddress(html);
  if (primaryAddress && primaryAddress.postcode) {
    // Check if this postcode is already in our list (as full postcode)
    const existingMatch = addresses.find(a => 
      a.postcode.startsWith(primaryAddress.postcode) || 
      primaryAddress.postcode.startsWith(a.postcode.split(' ')[0])
    );
    
    if (!existingMatch) {
      // This is a postcode from title/H1/body that we should add with HIGH priority
      const confidence = primaryAddress.source === 'title' ? 95 : 
                        primaryAddress.source === 'body_with_context' ? 85 : 75;
      addresses.push({
        postcode: primaryAddress.postcode,
        fullAddress: primaryAddress.address,
        fullContext: `From ${primaryAddress.source}: ${primaryAddress.address}`,
        source: 'PROPERTY',
        confidence,
        htmlLocation: primaryAddress.source === 'title' ? 'TITLE_OR_H1' : 'MAIN_CONTENT',
        isFromTitle: primaryAddress.source === 'title'
      });
    } else if (existingMatch && !existingMatch.isFromTitle && primaryAddress.source === 'title') {
      // Update existing match to mark it as from title
      existingMatch.isFromTitle = true;
      existingMatch.confidence = Math.max(existingMatch.confidence, 95);
      existingMatch.source = 'PROPERTY';
    }
  }

  // Deduplicate by postcode, keeping the one with highest property confidence
  const uniqueAddresses = new Map<string, ExtractedAddress>();
  for (const addr of addresses) {
    const existing = uniqueAddresses.get(addr.postcode);
    if (!existing || 
        (addr.isFromTitle && !existing.isFromTitle) ||
        (addr.source === 'PROPERTY' && existing.source !== 'PROPERTY') ||
        (addr.source === 'PROPERTY' && existing.source === 'PROPERTY' && addr.confidence > existing.confidence)) {
      uniqueAddresses.set(addr.postcode, addr);
    }
  }

  return Array.from(uniqueAddresses.values());
}

// Classify an address based on context and HTML location
function classifyAddress(lowerContext: string, htmlLocation: string, isFromTitle: boolean): { source: ExtractedAddress['source']; confidence: number } {
  // If it's from the title/H1, it's almost certainly the property address
  if (isFromTitle || htmlLocation === 'TITLE_OR_H1') {
    return { source: 'PROPERTY', confidence: 95 };
  }
  
  // If it's in the "MARKETED BY" section, it's definitely the agent
  if (htmlLocation === 'AGENT_SECTION') {
    return { source: 'AGENT_OFFICE', confidence: 95 };
  }

  // Strong property indicators
  const propertyIndicators = [
    'property', 'flat', 'apartment', 'studio', 'bedroom', 'bed', 'bath',
    'to let', 'for rent', 'available', 'pcm', 'pw', 'per month', 'per week',
    'tenancy', 'tenant', 'move in', 'unfurnished', 'furnished',
    'living room', 'kitchen', 'balcony', 'terrace', 'parking'
  ];

  // Strong agent/office indicators - these are VERY strong signals
  const agentIndicators = [
    'marketed by', 'listed by', 'more properties from this agent',
    'office', 'branch', 'contact us', 'visit us', 'call us', 'speak to',
    'our address', 'find us', 'opening hours', 'open monday', 'sales office',
    'lettings office', 'viewing office', 'show flat', 'showroom', 
    'call agent', 'request details', 'email agent'
  ];

  // Developer/company indicators
  const developerIndicators = [
    'head office', 'headquarters', 'registered office', 'company registration',
    'ltd', 'limited', 'plc', 'holdings', 'group', 'developments',
    'developer', 'management company', 'managing agent'
  ];

  // Footer/contact section indicators
  const footerIndicators = [
    'copyright', '©', 'all rights reserved', 'terms', 'privacy',
    'cookie', 'social media', 'follow us', 'newsletter'
  ];

  // Calculate scores
  let propertyScore = 0;
  let agentScore = 0;
  let developerScore = 0;
  let footerScore = 0;

  for (const indicator of propertyIndicators) {
    if (lowerContext.includes(indicator)) propertyScore += 15;
  }
  for (const indicator of agentIndicators) {
    if (lowerContext.includes(indicator)) agentScore += 25; // Higher weight for agent indicators
  }
  for (const indicator of developerIndicators) {
    if (lowerContext.includes(indicator)) developerScore += 20;
  }
  for (const indicator of footerIndicators) {
    if (lowerContext.includes(indicator)) footerScore += 15;
  }

  // HTML location significantly affects scoring
  if (htmlLocation === 'FOOTER') {
    footerScore += 50;
    propertyScore -= 40;
  } else if (htmlLocation === 'MAIN_CONTENT') {
    propertyScore += 30;
  } else if (htmlLocation === 'SIDEBAR' || htmlLocation === 'NAVIGATION') {
    agentScore += 30;
    propertyScore -= 20;
  }

  // Determine source based on highest score
  const maxScore = Math.max(propertyScore, agentScore, developerScore, footerScore);
  let source: ExtractedAddress['source'] = 'UNKNOWN';
  let confidence = 50;

  if (agentScore === maxScore && agentScore > 0) {
    source = 'AGENT_OFFICE';
    confidence = Math.min(95, 50 + agentScore);
  } else if (developerScore === maxScore && developerScore > 0) {
    source = 'DEVELOPER';
    confidence = Math.min(95, 50 + developerScore);
  } else if (footerScore === maxScore && footerScore > 0) {
    source = 'FOOTER';
    confidence = Math.min(95, 50 + footerScore);
  } else if (maxScore === 0 || propertyScore === maxScore) {
    source = 'PROPERTY';
    confidence = Math.min(95, 50 + propertyScore);
  }

  return { source, confidence };
}

// Clean and condense HTML for AI parsing
function prepareHtmlForAI(html: string, url: string): string {
  let condensed = '';

  // MOST IMPORTANT: Extract primary property address from title/H1/body
  const primaryAddress = extractPrimaryPropertyAddress(html);
  if (primaryAddress) {
    const sourceDesc = primaryAddress.source === 'title' ? 'page title/H1' :
                       primaryAddress.source === 'body_with_context' ? 'page content (near location keywords)' :
                       'page content';
    condensed += `## ⭐ PRIMARY PROPERTY ADDRESS (from ${sourceDesc} - HIGHEST PRIORITY)\n`;
    condensed += `Address: ${primaryAddress.address}\n`;
    condensed += `Postcode: ${primaryAddress.postcode || 'not found - use area name'}\n`;
    condensed += `Source: ${primaryAddress.source}\n`;
    condensed += `NOTE: This is the property/development location. Use this address, NOT any agent or company address.\n\n`;
  }

  // Get title - often contains property address
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) condensed += `## PAGE TITLE\n${titleMatch[1].trim()}\n\n`;

  // Get meta description - often has property summary
  const descMatch = html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) condensed += `## META DESCRIPTION\n${descMatch[1]}\n\n`;

  // Get all headings H1-H3 to understand page structure
  const headings: string[] = [];
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  if (h1Match) {
    for (const h of h1Match) {
      const text = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) headings.push(`[H1 - PROPERTY ADDRESS] ${text}`);
    }
  }
  const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  for (const match of h2Matches) {
    const text = match[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && text.length < 200) headings.push(`[H2] ${text}`);
  }
  if (headings.length > 0) {
    condensed += `## PAGE HEADINGS\n${headings.slice(0, 10).join('\n')}\n\n`;
  }

  // Get all structured data with type labels
  const structuredData = extractStructuredData(html);
  if (structuredData.length > 0) {
    // Separate property-related and agent-related structured data
    const propertyData: any[] = [];
    const agentData: any[] = [];
    const otherData: any[] = [];

    for (const data of structuredData) {
      const type = data['@type']?.toLowerCase() || '';
      if (type.includes('residence') || type.includes('apartment') || type.includes('house') ||
          type.includes('product') || type.includes('offer') || type.includes('place')) {
        propertyData.push(data);
      } else if (type.includes('agent') || type.includes('organization') || type.includes('business') ||
                 type.includes('realestate')) {
        agentData.push(data);
      } else {
        otherData.push(data);
      }
    }

    if (propertyData.length > 0) {
      condensed += `## STRUCTURED DATA - PROPERTY (addresses here are likely the property location)\n${JSON.stringify(propertyData, null, 2)}\n\n`;
    }
    if (agentData.length > 0) {
      condensed += `## STRUCTURED DATA - AGENT/COMPANY (addresses here are NOT the property - ignore for property address)\n${JSON.stringify(agentData, null, 2)}\n\n`;
    }
    if (otherData.length > 0) {
      condensed += `## STRUCTURED DATA - OTHER\n${JSON.stringify(otherData, null, 2)}\n\n`;
    }
  }

  // Extract and format addresses with enhanced context
  const addressesWithContext = extractAddressesWithContext(html);
  if (addressesWithContext.length > 0) {
    condensed += `## PRE-ANALYZED ADDRESSES (sorted by likelihood of being property address)\n`;
    condensed += `Note: System has pre-classified these addresses. PROPERTY addresses are likely correct, but verify with context.\n\n`;

    // Sort by property likelihood
    const sortedAddresses = [...addressesWithContext].sort((a, b) => {
      const scoreA = a.source === 'PROPERTY' ? 100 + a.confidence : a.confidence;
      const scoreB = b.source === 'PROPERTY' ? 100 + b.confidence : b.confidence;
      return scoreB - scoreA;
    });

    for (const addr of sortedAddresses) {
      const icon = addr.source === 'PROPERTY' ? '✓' : '✗';
      condensed += `${icon} [${addr.source}] (${addr.htmlLocation}, confidence: ${addr.confidence}%)\n`;
      condensed += `  Postcode: ${addr.postcode}\n`;
      condensed += `  Context: "${addr.fullContext.substring(0, 300)}"\n\n`;
    }
  }

  // Get images
  const images = extractImages(html);
  if (images.length > 0) {
    condensed += `## PROPERTY IMAGES\n${images.slice(0, 5).join('\n')}\n\n`;
  }

  // Extract main content area (exclude footer, nav, sidebar)
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                    html.match(/<div[^>]*class=["'][^"']*(?:content|property|listing|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (mainMatch) {
    const cleanMain = mainMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000);
    condensed += `## MAIN CONTENT AREA (property details - addresses here are the PROPERTY ADDRESS)\n${cleanMain}\n\n`;
  }

  // Extract sidebar content - often contains agent info
  const sidebarMatch = html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/i) ||
                       html.match(/<div[^>]*class=["'][^"']*sidebar[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (sidebarMatch) {
    const sidebarText = sidebarMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1500);
    condensed += `## SIDEBAR (often contains agent contact info - addresses here are usually NOT the property)\n${sidebarText}\n\n`;
  }

  // Extract footer content separately - addresses here are usually agent/company
  const footerMatch = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  if (footerMatch) {
    const footerText = footerMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1500);
    condensed += `## FOOTER CONTENT (addresses here are AGENT/COMPANY addresses - NOT the property!)\n${footerText}\n\n`;
  }

  return condensed;
}

// Validate AI-extracted address against pre-classified addresses
function validateAndCorrectAddress(
  aiResult: any, 
  extractedAddresses: ExtractedAddress[], 
  html: string
): any {
  // First, check if we have a high-confidence address from title/H1
  const titleAddress = extractedAddresses.find(a => a.isFromTitle && a.source === 'PROPERTY');
  
  if (titleAddress) {
    // We have a reliable address from the page title - this should be used
    const aiPostcode = aiResult.address?.match(/[A-Z]{1,2}\d{1,2}[A-Z]?(?:\s*\d[A-Z]{2})?/i)?.[0]?.toUpperCase() || '';
    const titlePostcode = titleAddress.postcode.toUpperCase();
    
    // Check if AI's address matches the title address
    const aiMatchesTitle = aiPostcode && (
      aiPostcode.startsWith(titlePostcode) || 
      titlePostcode.startsWith(aiPostcode.split(' ')[0])
    );
    
    if (!aiMatchesTitle) {
      console.log(`Address correction: AI picked "${aiPostcode}" but title shows "${titlePostcode}"`);
      
      // Use the title address instead
      aiResult.address = titleAddress.fullAddress;
      aiResult.addressConfidence = 'high';
      aiResult.addressReasoning = 'Address from page title/H1 heading - the most reliable source';
      aiResult.originalAddress = aiResult.address !== titleAddress.fullAddress ? `AI suggested: ${aiPostcode}` : undefined;
      
      return aiResult;
    }
  }

  if (!aiResult.address || extractedAddresses.length === 0) {
    // If no AI address, try to use title address
    if (titleAddress) {
      aiResult.address = titleAddress.fullAddress;
      aiResult.addressConfidence = 'high';
      aiResult.addressReasoning = 'Address extracted from page title/H1';
    }
    return aiResult;
  }

  // Extract postcode from AI's address (full or partial)
  const aiPostcodeMatch = aiResult.address.match(/[A-Z]{1,2}\d{1,2}[A-Z]?(?:\s*\d[A-Z]{2})?/i);
  if (!aiPostcodeMatch) {
    // AI didn't return a valid UK postcode, try to use the best pre-classified one
    const propertyAddresses = extractedAddresses
      .filter(a => a.source === 'PROPERTY')
      .sort((a, b) => {
        // Prioritize title addresses, then by confidence
        if (a.isFromTitle && !b.isFromTitle) return -1;
        if (!a.isFromTitle && b.isFromTitle) return 1;
        return b.confidence - a.confidence;
      });
      
    if (propertyAddresses.length > 0) {
      const best = propertyAddresses[0];
      aiResult.address = best.fullAddress;
      aiResult.addressConfidence = best.isFromTitle ? 'high' : 'medium';
      aiResult.addressReasoning = best.isFromTitle 
        ? 'Address from page title - most reliable source'
        : 'Address corrected: AI response missing valid postcode, using pre-classified property address';
      console.log('Address correction: Missing postcode, using pre-classified address');
    }
    return aiResult;
  }

  const aiPostcode = aiPostcodeMatch[0].toUpperCase().replace(/\s+/g, ' ');
  
  // Find this postcode in our pre-classified addresses
  const matchingAddress = extractedAddresses.find(a => {
    const normalizedAI = aiPostcode.replace(/\s+/g, '');
    const normalizedExtracted = a.postcode.replace(/\s+/g, '');
    return normalizedAI === normalizedExtracted || 
           normalizedAI.startsWith(normalizedExtracted) || 
           normalizedExtracted.startsWith(normalizedAI);
  });

  if (!matchingAddress) {
    // Postcode not in our extracted list - could be valid but not caught by our regex
    return aiResult;
  }

  // Check if AI picked a non-property address (agent, footer, etc.)
  if (matchingAddress.source !== 'PROPERTY') {
    console.log(`Address warning: AI picked ${matchingAddress.source} address (${aiPostcode}) from ${matchingAddress.htmlLocation}`);
    
    // Find best property address as alternative
    const propertyAddresses = extractedAddresses
      .filter(a => a.source === 'PROPERTY')
      .sort((a, b) => {
        if (a.isFromTitle && !b.isFromTitle) return -1;
        if (!a.isFromTitle && b.isFromTitle) return 1;
        return b.confidence - a.confidence;
      });
    
    if (propertyAddresses.length > 0) {
      const best = propertyAddresses[0];
      
      // If we have a title address or high confidence property address, use it
      if (best.isFromTitle || best.confidence >= 60) {
        console.log(`Address correction: Replacing ${matchingAddress.source} address with PROPERTY address (${best.postcode})`);
        
        aiResult.address = best.fullAddress;
        aiResult.addressConfidence = best.isFromTitle ? 'high' : 'medium';
        aiResult.addressReasoning = best.isFromTitle
          ? 'Address from page title/H1 - agent address was incorrectly selected'
          : `Address corrected: Original was ${matchingAddress.source.toLowerCase()} address`;
        aiResult.originalAddress = `${aiPostcode} (was: ${matchingAddress.source})`;
      }
    } else if (matchingAddress.htmlLocation === 'FOOTER' || matchingAddress.htmlLocation === 'AGENT_SECTION') {
      // No clear property address, but AI picked a footer/agent address - warn about low confidence
      aiResult.addressConfidence = 'low';
      aiResult.addressReasoning = (aiResult.addressReasoning || '') + ` (Warning: Address found in ${matchingAddress.htmlLocation}, likely agent address)`;
    }
  } else {
    // AI correctly picked a property address - increase confidence
    if (matchingAddress.isFromTitle) {
      aiResult.addressConfidence = 'high';
    } else if (matchingAddress.confidence >= 80 && aiResult.addressConfidence !== 'high') {
      aiResult.addressConfidence = 'high';
    }
  }

  return aiResult;
}

// Fetch and parse property page
app.post('/api/fetch-property', async (req, res) => {
  try {
    const { url, claudeApiKey } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the page HTML with retry
    const html = await fetchWithRetry(url);

    // Extract images first (will be used as fallback)
    const allImages = extractImages(html);

    // If no Claude API key, try basic extraction
    if (!claudeApiKey) {
      const basicData = extractBasicData(html, url);
      // Add first image if no thumbnail found
      if (!basicData.thumbnail && allImages.length > 0) {
        basicData.thumbnail = allImages[0];
      }
      basicData.images = allImages;
      return res.json(basicData);
    }

    // Use Claude to parse the HTML
    const anthropic = new Anthropic({ apiKey: claudeApiKey });

    // Prepare condensed HTML with structured data
    const preparedContent = prepareHtmlForAI(html, url);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are an expert at analyzing UK property rental listing pages. Extract the PROPERTY ADDRESS - where the rental unit is located.

## 🚨 THE #1 RULE: USE THE ADDRESS FROM THE PAGE TITLE/H1

On property listing websites (Rightmove, Zoopla, OnTheMarket, etc.), the H1 heading and page title ALWAYS contain the PROPERTY ADDRESS, not the agent's address.

**ALWAYS use the address shown in the H1 heading or page title as your primary source.**

Examples:
- H1: "Barlow Drive, London, SE18" → Property is at Barlow Drive, SE18
- Title: "3 bedroom house for rent in Barlow Drive, London, SE18" → Property is at Barlow Drive, SE18
- H1: "2 Bed Apartment, Canary Wharf, E14" → Property is at Canary Wharf, E14

## ⚠️ AGENT ADDRESSES TO IGNORE

The page will also contain the estate agent's office address. This is NEVER the property address.

Agent addresses appear in:
- "MARKETED BY" sections with agent name + address
- "About [Agent Name]" sections  
- Sidebars with "Call agent", "Contact us"
- Footers with copyright info

Example of what to IGNORE:
- "MARKETED BY Village Estates, 91 Main Road, Sidcup, DA14 6ND" → This is the AGENT office, NOT the property!

## DECISION PROCESS

1. **FIRST**: Look at the "PRIMARY PROPERTY ADDRESS" section I've provided - this is extracted from the page title/H1 and is almost always correct.

2. **VERIFY**: The primary address should match the postcode area mentioned in the main property heading.

3. **CROSS-CHECK**: Make sure you're NOT using an address from:
   - "MARKETED BY" sections
   - Agent contact information
   - Footer content
   - "About the agent" sections

## EXAMPLES

### Example: Rightmove listing
H1: "Barlow Drive, London, SE18"  
Sidebar shows: "MARKETED BY Village Estates, 91 Main Road, Sidcup, DA14 6ND"

✅ CORRECT: Use "Barlow Drive, London, SE18" (from H1)
❌ WRONG: "91 Main Road, Sidcup, DA14 6ND" (agent's office!)

### Example: Zoopla listing  
Title: "2 bed flat to rent, The Shoreline, E16 1BQ"
Footer: "Agent HQ: 123 Business Park, E1 1AA"

✅ CORRECT: Use "The Shoreline, E16 1BQ" (from title)
❌ WRONG: "123 Business Park, E1 1AA" (agent's HQ!)

## RESPONSE FORMAT

Return a JSON object:

{
  "name": "property title from H1 - e.g., '3 bedroom house, Barlow Drive'",
  "address": "PROPERTY address from title/H1 - e.g., 'Barlow Drive, London, SE18'",
  "addressConfidence": "high/medium/low",
  "addressReasoning": "Brief explanation - e.g., 'Address from page H1 heading'",
  "thumbnail": "best property image URL",
  "isBTR": true/false
}

Notes:
- For partial postcodes (like SE18 without full code), that's fine - use what's shown in the title
- If the title only shows an area name, use that with any postcode you can find in the main content
- NEVER use an address from a "MARKETED BY" or "About the agent" section

## BTR (Build to Rent) / Development Sites

BTR sites (like Get Living, Quintain, AWOL) often show:
- Development NAME in the title (e.g., "Elephant Central", "North Kensington Gate")
- Street address with postcode somewhere in the page body
- Use the development name + postcode as the address

Examples:
- Title: "North Kensington - AWOL", Body mentions "Grand Union Canal, NW10 6QQ"
  → Address: "North Kensington Gate, Grand Union Canal, NW10 6QQ"
- Title: "Apartments to Rent at Elephant Central", Meta says "SE1"
  → Address: "Elephant Central, SE1"

## BTR Indicators
Quintain, Greystar, Get Living, Essential Living, Fizzy Living, Grainger, Tipi, Uncle, APO, Canvas, Platform_, Lendlease, Related Argent, Vertus, Moda Living, Simple Life London, AWOL, Way of Life, "Build to Rent", "BTR", professionally managed developments with concierge/gym/amenities.

---

URL: ${url}

${preparedContent}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and potentially correct the address
        const extractedAddresses = extractAddressesWithContext(html);
        const validatedResult = validateAndCorrectAddress(parsed, extractedAddresses, html);
        
        // Add images array and fallback thumbnail
        validatedResult.images = allImages;
        if (!validatedResult.thumbnail && allImages.length > 0) {
          validatedResult.thumbnail = allImages[0];
        }
        
        // Remove internal analysis from response if present
        delete validatedResult.analysisSteps;
        
        return res.json(validatedResult);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
    }

    // Fallback to basic extraction
    const basicData = extractBasicData(html, url);
    if (!basicData.thumbnail && allImages.length > 0) {
      basicData.thumbnail = allImages[0];
    }
    basicData.images = allImages;
    return res.json(basicData);

  } catch (error) {
    console.error('Error processing property:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Geocode address
app.post('/api/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Add London to help with geocoding
    const searchAddress = address.toLowerCase().includes('london') 
      ? address 
      : address + ', London, UK';

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchAddress)}&key=${apiKey}`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return res.json({ lat: location.lat, lng: location.lng });
    }

    res.status(404).json({ error: 'Address not found' });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Calculate distances
app.post('/api/distances', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const originStr = origin.lat + ',' + origin.lng;
    const destStr = destination.lat + ',' + destination.lng;

    const modes = ['transit', 'walking', 'driving'];
    const results: Record<string, { distance: string; duration: string } | null> = {};

    for (const mode of modes) {
      try {
        const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destStr}&mode=${mode}&key=${apiKey}`;
        
        const response = await fetch(distanceUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
          const element = data.rows[0].elements[0];
          results[mode] = {
            distance: element.distance.text,
            duration: element.duration.text,
          };
        } else {
          results[mode] = null;
        }
      } catch (e) {
        results[mode] = null;
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================
// Extension Property Storage (Redis-backed)
// ============================================

interface ExtensionProperty {
  id: string;
  url: string;
  pageText?: string;  // Full page text from extension for AI parsing
  title: string;
  address: string;
  thumbnail: string;
  price: string;
  coordinates: { lat: number; lng: number } | null;
  isBTR: boolean;
  tags: string[];
  addedAt: string;
  processed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// In-memory fallback
const memoryPropertyStore: ExtensionProperty[] = [];

// Property storage abstraction - uses Redis if available
const propertyStorage = {
  async getAll(): Promise<ExtensionProperty[]> {
    if (redis) {
      const keys = await redis.keys('property:*');
      if (keys.length === 0) return [];
      const values = await redis.mget(keys);
      return values
        .filter((v): v is string => v !== null)
        .map(v => JSON.parse(v) as ExtensionProperty);
    }
    return [...memoryPropertyStore];
  },

  async getPending(): Promise<ExtensionProperty[]> {
    const all = await this.getAll();
    return all.filter(p => !p.processed);
  },

  async get(id: string): Promise<ExtensionProperty | null> {
    if (redis) {
      const data = await redis.get(`property:${id}`);
      return data ? JSON.parse(data) : null;
    }
    return memoryPropertyStore.find(p => p.id === id) || null;
  },

  async add(property: ExtensionProperty): Promise<void> {
    if (redis) {
      // Store with 30-day expiration
      await redis.set(`property:${property.id}`, JSON.stringify(property), 'EX', 30 * 24 * 60 * 60);
    } else {
      memoryPropertyStore.push(property);
    }
  },

  async update(id: string, updates: Partial<ExtensionProperty>): Promise<void> {
    const property = await this.get(id);
    if (property) {
      const updated = { ...property, ...updates };
      if (redis) {
        await redis.set(`property:${id}`, JSON.stringify(updated), 'EX', 30 * 24 * 60 * 60);
      } else {
        const idx = memoryPropertyStore.findIndex(p => p.id === id);
        if (idx >= 0) memoryPropertyStore[idx] = updated;
      }
    }
  },

  async delete(id: string): Promise<void> {
    if (redis) {
      await redis.del(`property:${id}`);
    } else {
      const idx = memoryPropertyStore.findIndex(p => p.id === id);
      if (idx >= 0) memoryPropertyStore.splice(idx, 1);
    }
  },

  async clear(): Promise<void> {
    if (redis) {
      const keys = await redis.keys('property:*');
      if (keys.length > 0) await redis.del(...keys);
    } else {
      memoryPropertyStore.length = 0;
    }
  },
};

// In-memory storage for tags (synced from main app)
interface PropertyTag {
  id: string;
  name: string;
  color: string;
}
let storedTags: PropertyTag[] = [];

// ============================================
// Background Property Processing
// ============================================

async function processPropertyInBackground(property: ExtensionProperty): Promise<void> {
  console.log(`🔄 Background processing: ${property.url}`);
  
  try {
    await propertyStorage.update(property.id, { processingStatus: 'processing' });

    // Broadcast processing status
    broadcastToClients({
      type: 'property-processing',
      propertyId: property.id,
      status: 'processing',
    });

    const claudeApiKey = process.env.ANTHROPIC_API_KEY;
    if (!claudeApiKey) {
      throw new Error('No Claude API key available for background processing');
    }

    // Use pageText from extension if available (bypasses anti-scraping)
    // Otherwise try to fetch the page server-side
    let contentForAI = property.pageText || '';
    
    if (!contentForAI || contentForAI.length < 100) {
      console.log('   No page text from extension, trying server-side fetch...');
      try {
        const response = await fetch(property.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        if (response.ok) {
          const html = await response.text();
          contentForAI = prepareHtmlForAI(html, property.url);
        } else {
          console.log(`   Server fetch failed: ${response.status}`);
        }
      } catch (fetchError) {
        console.log('   Server fetch error:', (fetchError as Error).message);
      }
    }

    if (!contentForAI || contentForAI.length < 50) {
      throw new Error('No content available for AI parsing');
    }

    console.log(`   Content length: ${contentForAI.length} chars`);
    
    // Call Claude for extraction - Claude parses EVERYTHING
    const anthropic = new Anthropic({ apiKey: claudeApiKey });
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are parsing a UK property rental listing. Extract ALL details from the page content below.

Return a JSON object with these fields:
{
  "name": "descriptive title - e.g., '2 Bed Flat, Canary Wharf'",
  "address": "full property address with postcode - NOT the estate agent's address",
  "price": "monthly rent - e.g., '£2,500 pcm'",
  "thumbnail": "main property image URL if found",
  "isBTR": true/false
}

## Important Rules:
1. The ADDRESS must be the PROPERTY location, not the estate agent's office
2. Look for postcode patterns (e.g., E14 5AB, SW1A 1AA)
3. isBTR = true if this is a Build-to-Rent development (Quintain, Get Living, Greystar, Fizzy, Grainger, Essential Living, etc.)
4. Extract the actual monthly rent price

## Page URL:
${property.url}

## Page Content:
${contentForAI.substring(0, 80000)}`,
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('   Claude response received');
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Could not parse AI response - no JSON found');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('   Parsed:', parsed.name, '|', parsed.address);
    
    // Geocode the address
    let coordinates: { lat: number; lng: number } | null = null;
    if (parsed.address) {
      const geocodeKey = process.env.GOOGLE_MAPS_API_KEY;
      if (geocodeKey) {
        try {
          const geoResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parsed.address + ', UK')}&key=${geocodeKey}`
          );
          const geoData = await geoResponse.json();
          if (geoData.results?.[0]?.geometry?.location) {
            coordinates = {
              lat: geoData.results[0].geometry.location.lat,
              lng: geoData.results[0].geometry.location.lng,
            };
            console.log('   Geocoded:', coordinates.lat, coordinates.lng);
          }
        } catch (geoError) {
          console.log('   Geocoding failed:', (geoError as Error).message);
        }
      }
    }

    // Update property with ALL parsed data
    await propertyStorage.update(property.id, {
      title: parsed.name || 'Property',
      address: parsed.address || '',
      thumbnail: parsed.thumbnail || property.thumbnail,
      price: parsed.price || '',
      isBTR: parsed.isBTR || false,
      coordinates,
      processingStatus: 'completed',
      pageText: undefined, // Clear page text to save storage
      error: undefined,
    });

    console.log(`✅ Background processing complete: ${parsed.name || property.url}`);

    // Broadcast completion to connected clients
    const updatedProperty = await propertyStorage.get(property.id);
    if (updatedProperty) {
      broadcastToClients({
        type: 'property-updated',
        property: updatedProperty,
      });
    }

  } catch (error) {
    console.error(`❌ Background processing failed for ${property.url}:`, error);
    await propertyStorage.update(property.id, {
      title: 'Failed to process',
      processingStatus: 'failed',
      error: (error as Error).message,
    });
    
    // Broadcast failure
    broadcastToClients({
      type: 'property-processing',
      propertyId: property.id,
      status: 'failed',
      error: (error as Error).message,
    });
  }
}

// Get tags (for extension to fetch available tags)
app.get('/api/tags', (req, res) => {
  res.json(storedTags);
});

// Sync tags from main app
app.post('/api/tags', (req, res) => {
  const { tags } = req.body;
  if (Array.isArray(tags)) {
    storedTags = tags;
  }
  res.json({ success: true, tags: storedTags });
});

// Add property from Chrome extension
app.post('/api/add-property', async (req, res) => {
  try {
    // Extension sends ONLY: url, pageText, ogImage, tags
    // Everything else is parsed by Claude
    const { url, pageText, ogImage, tags } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const property: ExtensionProperty = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      url,
      pageText: pageText || '',  // Store page text for AI processing
      title: 'Processing...',    // Will be filled by Claude
      address: '',               // Will be filled by Claude
      thumbnail: ogImage || '',  // Fallback, Claude may find better
      price: '',                 // Will be filled by Claude
      coordinates: null,         // Will be filled after geocoding
      isBTR: false,              // Will be filled by Claude
      tags: tags || [],          // User-selected tags from extension
      addedAt: new Date().toISOString(),
      processed: false,
      processingStatus: 'pending',
    };

    // Save to Redis/memory immediately
    await propertyStorage.add(property);

    console.log('📥 Property added from extension:', property.url);
    console.log('   Page text length:', (pageText || '').length, 'chars');

    // Broadcast to all connected clients for real-time update
    broadcastToClients({
      type: 'property-added',
      property,
    });

    // Start background processing immediately (non-blocking)
    processPropertyInBackground(property).catch(err => {
      console.error('Background processing error:', err);
    });

    res.json({ success: true, property, storage: redis ? 'redis' : 'memory' });
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get pending properties from Chrome extension
app.get('/api/pending-properties', async (req, res) => {
  try {
    const pending = await propertyStorage.getPending();
    res.json(pending);
  } catch (error) {
    console.error('Error getting pending properties:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all extension properties (for debugging/admin)
app.get('/api/extension-properties', async (req, res) => {
  try {
    const all = await propertyStorage.getAll();
    res.json({ 
      count: all.length, 
      properties: all,
      storage: redis ? 'redis' : 'memory',
    });
  } catch (error) {
    console.error('Error getting extension properties:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Mark property as processed
app.post('/api/mark-processed', async (req, res) => {
  try {
    const { id } = req.body;
    await propertyStorage.update(id, { processed: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking processed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete a specific property
app.delete('/api/extension-properties/:id', async (req, res) => {
  try {
    await propertyStorage.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Clear all pending properties
app.delete('/api/pending-properties', async (req, res) => {
  try {
    await propertyStorage.clear();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing properties:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// NEW: Parse property from extracted page content (bypasses anti-scraping)
// This is called when the Chrome extension extracts content directly from the DOM
app.post('/api/parse-property-content', async (req, res) => {
  try {
    const { pageContent } = req.body;

    if (!pageContent) {
      return res.status(400).json({ error: 'Page content is required' });
    }

    const claudeApiKey = process.env.ANTHROPIC_API_KEY;
    
    // If no API key, do basic extraction from the provided content
    if (!claudeApiKey) {
      const basicResult = extractBasicFromContent(pageContent);
      return res.json(basicResult);
    }

    // Truncate page text to fit within Claude's context (leave room for prompt)
    const maxTextLength = 25000;
    const pageText = (pageContent.fullPageText || '').substring(0, maxTextLength);
    
    console.log('=== PARSING PROPERTY ===');
    console.log('URL:', pageContent.url);
    console.log('Title:', pageContent.pageTitle);
    console.log('Text length:', pageText.length);
    console.log('First 500 chars:', pageText.substring(0, 500));

    // Use Claude to parse the content - give it ALL the text and let it figure it out
    const anthropic = new Anthropic({ apiKey: claudeApiKey });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Extract property details from this UK rental listing.

URL: ${pageContent.url}
PAGE TITLE: ${pageContent.pageTitle}

PAGE TEXT:
${pageText}

---

Extract the PROPERTY ADDRESS from this listing. Look for:
1. Street names (e.g., "Charlton Road", "High Street", "Baldwin Lane")
2. Area names (e.g., "Blackheath", "Canary Wharf", "Shoreditch")  
3. UK postcodes (e.g., "SE3", "E14 5AB", "N1")

The address is usually in the page title or the main property heading.
IGNORE any addresses in "Marketed by", "Contact agent", or footer sections - those are agent offices.

You MUST provide an address. If you can only find a partial address (like just "Canary Wharf" or "E14"), use that.

Return ONLY valid JSON:
{
  "name": "descriptive title like '1 bed flat, Canary Wharf'",
  "address": "the property location - REQUIRED, e.g., 'Canary Wharf, E14' or 'Charlton Road, Blackheath, SE3'",
  "price": "rent amount like '£1,750 pcm' or null",
  "bedrooms": number or null,
  "isBTR": true/false
}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('Claude raw response:', responseText);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Claude parsed:', JSON.stringify(parsed, null, 2));
        
        // Ensure we have images from the original content
        if (!parsed.thumbnail && pageContent.images && pageContent.images.length > 0) {
          parsed.thumbnail = pageContent.images[0];
        }
        parsed.images = pageContent.images || [];
        
        // If address is still empty, try to extract from page title
        if (!parsed.address && pageContent.pageTitle) {
          console.log('No address from Claude, trying page title extraction...');
          // Look for postcode pattern in title
          const postcodeMatch = pageContent.pageTitle.match(/([A-Z]{1,2}\d{1,2}[A-Z]?(?:\s*\d[A-Z]{2})?)/i);
          if (postcodeMatch) {
            // Find the segment containing the postcode
            const segments = pageContent.pageTitle.split(/[|\-–]/);
            for (const seg of segments) {
              if (seg.match(/[A-Z]{1,2}\d/i) && !seg.toLowerCase().includes('bed')) {
                parsed.address = seg.trim();
                console.log('Extracted from title:', parsed.address);
                break;
              }
            }
          }
        }
        
        return res.json(parsed);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        console.error('Raw response was:', responseText);
      }
    }

    // Fallback to basic extraction
    console.log('Falling back to basic extraction');
    const basicResult = extractBasicFromContent(pageContent);
    console.log('Basic result:', basicResult);
    return res.json(basicResult);

  } catch (error) {
    console.error('Error parsing property content:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Basic extraction from content without AI (fallback)
function extractBasicFromContent(content: any): any {
  const result: any = {
    name: content.pageTitle?.split('|')[0]?.split('-')[0]?.trim() || 'Property',
    address: '',
    thumbnail: content.images?.[0] || '',
    images: content.images || [],
    isBTR: false,
  };
  
  // Try to extract address from page title using postcode pattern
  const titleText = content.pageTitle || '';
  const postcodeMatch = titleText.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d?[A-Z]{0,2})/i);
  if (postcodeMatch) {
    // Find the part of the title that contains the address
    const parts = titleText.split(/[|\-–]/);
    for (const part of parts) {
      if (part.match(/[A-Z]{1,2}\d/i)) {
        result.address = part.trim();
        break;
      }
    }
  }
  
  // Check for BTR indicators in full page text
  const fullText = (content.fullPageText || '').toLowerCase();
  const btrKeywords = [
    'build to rent', 'build-to-rent', 'btr', 'quintain', 'greystar',
    'get living', 'essential living', 'fizzy living', 'grainger', 'tipi',
    'uncle', 'apo', 'canvas', 'platform_', 'lendlease', 'related argent',
    'vertus', 'moda living'
  ];
  result.isBTR = btrKeywords.some(kw => fullText.includes(kw));
  
  // Extract price
  const priceMatch = fullText.match(/£[\d,]+(?:\s*(?:pcm|pm|per month))?/i);
  if (priceMatch) {
    result.price = priceMatch[0];
  }
  
  return result;
}

function extractBasicData(html: string, url: string): any {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Try structured data first for address
  let address = '';
  const structuredData = extractStructuredData(html);
  for (const data of structuredData) {
    // Check for address in various JSON-LD formats
    const addr = data.address || data.location?.address || data.geo?.address;
    if (addr) {
      if (typeof addr === 'string') {
        address = addr;
        break;
      } else if (typeof addr === 'object') {
        const parts = [addr.streetAddress, addr.addressLocality, addr.postalCode].filter(Boolean);
        if (parts.length > 0) {
          address = parts.join(', ');
          break;
        }
      }
    }
  }

  // If no address from structured data, try regex patterns
  if (!address) {
    // UK postcode patterns - more comprehensive
    const postcodeMatch = html.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);

    // Try to find address with postcode in context
    const addressPatterns = [
      // Full addresses with postcodes
      /(\d+[^<,]*(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Way|Close|Court|Ct|Place|Pl|Gardens|Gdns|Square|Sq|Terrace|Mews|Walk|Row|Crescent|Cres|Drive|Dr|Grove)[^<,]*,\s*[^<,]+,\s*[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i,
      // Area + postcode
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*(?:London|Greater London)?,?\s*[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/gi,
      // Just postcode as fallback
      /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i,
    ];

    for (const pattern of addressPatterns) {
      const match = html.match(pattern);
      if (match) {
        address = match[1] || match[0];
        break;
      }
    }
  }

  // Get images using our comprehensive extractor
  const images = extractImages(html);
  const thumbnail = images.length > 0 ? images[0] : undefined;

  // Detect BTR (Build to Rent)
  const btrKeywords = [
    'build to rent',
    'build-to-rent',
    'btr',
    'purpose-built rental',
    'purpose built rental',
    'quintain',
    'greystar',
    'get living',
    'essential living',
    'fizzy living',
    'grainger',
    'tipi',
    'uncle',
    'apo',
    'canvas',
    'platform_',
    'lendlease',
    'related argent',
    'vertus',
    'moda living',
    'way of life',
    'connected living',
    'verto',
  ];
  const htmlLower = html.toLowerCase();
  const isBTR = btrKeywords.some(keyword => htmlLower.includes(keyword));

  return {
    name: title.split('|')[0].split('-')[0].trim() || 'Property',
    address,
    thumbnail,
    images,
    isBTR,
  };
}

// Static files and SPA fallback - MUST be after all API routes
if (process.env.NODE_ENV === 'production') {
  // Serve static files from dist
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
