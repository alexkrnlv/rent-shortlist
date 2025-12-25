import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from dist in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// SSE clients for real-time updates
const sseClients: Set<express.Response> = new Set();

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

// Extract addresses with context labels
function extractAddressesWithContext(html: string): string[] {
  const addresses: string[] = [];
  const postcodeRegex = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/gi;

  // Find all postcodes and extract surrounding context
  const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const matches = cleanText.matchAll(new RegExp(`(.{0,150}${postcodeRegex.source}.{0,50})`, 'gi'));

  for (const match of matches) {
    const context = match[1].trim();
    // Determine likely source based on context
    let source = 'UNKNOWN SECTION';
    const lowerContext = context.toLowerCase();

    if (lowerContext.includes('property') || lowerContext.includes('flat') ||
        lowerContext.includes('apartment') || lowerContext.includes('bedroom') ||
        lowerContext.includes('to let') || lowerContext.includes('for rent')) {
      source = 'LIKELY PROPERTY ADDRESS';
    } else if (lowerContext.includes('office') || lowerContext.includes('branch') ||
               lowerContext.includes('contact') || lowerContext.includes('visit us') ||
               lowerContext.includes('call us')) {
      source = 'LIKELY AGENT/OFFICE ADDRESS';
    } else if (lowerContext.includes('developer') || lowerContext.includes('ltd') ||
               lowerContext.includes('limited') || lowerContext.includes('head office') ||
               lowerContext.includes('registered')) {
      source = 'LIKELY DEVELOPER/COMPANY ADDRESS';
    }

    addresses.push(`[${source}] ${context}`);
  }

  return [...new Set(addresses)];
}

// Clean and condense HTML for AI parsing
function prepareHtmlForAI(html: string, url: string): string {
  let condensed = '';

  // Get title - often contains property address
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) condensed += `PAGE TITLE (often contains property location): ${titleMatch[1].trim()}\n\n`;

  // Get meta description - often has property summary
  const descMatch = html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) condensed += `META DESCRIPTION (property summary): ${descMatch[1]}\n\n`;

  // Get H1 - usually the property title/address
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const h1Text = h1Match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    condensed += `MAIN HEADING (H1 - likely property title): ${h1Text}\n\n`;
  }

  // Get all structured data with type labels
  const structuredData = extractStructuredData(html);
  if (structuredData.length > 0) {
    condensed += `STRUCTURED DATA (JSON-LD) - Check @type to distinguish property vs agent data:\n${JSON.stringify(structuredData, null, 2)}\n\n`;
  }

  // Extract addresses with context
  const addressesWithContext = extractAddressesWithContext(html);
  if (addressesWithContext.length > 0) {
    condensed += `ADDRESSES FOUND WITH CONTEXT (analyze carefully):\n${addressesWithContext.join('\n')}\n\n`;
  }

  // Get images
  const images = extractImages(html);
  if (images.length > 0) {
    condensed += `IMAGES FOUND:\n${images.join('\n')}\n\n`;
  }

  // Extract main content area (exclude footer, nav, sidebar)
  let mainContent = html;
  // Try to isolate main content
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                    html.match(/<div[^>]*class=["'][^"']*(?:content|property|listing|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (mainMatch) {
    mainContent = mainMatch[1];
    const cleanMain = mainContent
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000);
    condensed += `MAIN CONTENT AREA (property details - addresses here are likely the property):\n${cleanMain}\n\n`;
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
      .substring(0, 2000);
    condensed += `FOOTER CONTENT (addresses here are usually agent/company - NOT the property):\n${footerText}\n\n`;
  }

  // Add remaining HTML for context if space allows
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .substring(0, 20000);

  condensed += `FULL PAGE HTML (for additional context):\n${cleanHtml}`;

  return condensed;
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
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `You are analyzing a UK property rental listing page. Your task is to extract the PROPERTY ADDRESS - the actual location where the rental unit is physically located, where a tenant would LIVE.

## CRITICAL: DISTINGUISHING ADDRESS TYPES

This page may contain MULTIPLE addresses. You must identify which is which:

### 1. PROPERTY ADDRESS (✓ WHAT WE WANT)
This is the physical location of the rental flat/house - where someone would MOVE INTO.
Indicators:
- Appears in the main listing title, h1, or property description
- Associated with: "property at", "located at", "flat at", "apartment at", "bedroom", "to let", "for rent", "available"
- In JSON-LD with @type: "Residence", "Apartment", "House", "Product" (for rentals)
- Usually a RESIDENTIAL address (not a business district unless it's a residential tower)
- Often includes a specific flat/unit number or floor
- The postcode area matches residential London areas

### 2. ESTATE AGENT/AGENCY ADDRESS (✗ NOT WHAT WE WANT)
This is the office of the letting agency advertising the property.
Indicators:
- Appears in footer, header, "Contact us", "Visit our office", "Branch address"
- Associated with: "agent", "agency", "office", "branch", "contact", "call us", "visit us"
- In JSON-LD with @type: "RealEstateAgent", "Organization", "LocalBusiness"
- Often includes: "Floor", "Suite", "Unit" in commercial context, company name
- Usually in commercial/business areas

### 3. DEVELOPER/LANDLORD ADDRESS (✗ NOT WHAT WE WANT)
This is the HQ of the property developer or management company.
Indicators:
- Appears in "About the developer", "About us", company info sections
- Associated with: "head office", "headquarters", "registered office", "Ltd", "Limited", "PLC"
- Corporate addresses in business districts
- Often has company registration info nearby

### 4. CORRESPONDENCE ADDRESS (✗ NOT WHAT WE WANT)
Where to send letters or documents.
Indicators:
- "Write to us", "Send applications to", "Postal address"

## YOUR TASK

1. ANALYZE the page content and identify ALL addresses present
2. REASON about which address is the PROPERTY ADDRESS based on context clues
3. If uncertain, prefer addresses that:
   - Appear in the main content area (not footer/sidebar)
   - Have residential area postcodes
   - Are associated with property features (bedrooms, bathrooms, etc.)
   - Include building/development names typical of residential properties

## UK POSTCODE FORMAT
- Format: [Area][District] [Sector][Unit] (e.g., E14 9GE, SW1A 1AA, N1 9GU)
- London residential areas: E1-E18, N1-N22, NW1-NW11, SE1-SE28, SW1-SW20, W1-W14, EC1-EC4, WC1-WC2

## RESPONSE FORMAT

Return ONLY a valid JSON object:
{
  "name": "property title - e.g., '2 Bed Apartment, The Shoreline'",
  "address": "PROPERTY address only - e.g., 'Flat 45, The Shoreline, 12 Western Gateway, Royal Docks, London E16 1BQ'",
  "addressConfidence": "high/medium/low - how confident you are this is the property address",
  "addressReasoning": "brief explanation of why you chose this address",
  "thumbnail": "best property image URL",
  "isBTR": true/false
}

## BTR (Build to Rent) indicators
Quintain, Greystar, Get Living, Essential Living, Fizzy Living, Grainger, Tipi, Uncle, APO, Canvas, Platform_, Lendlease, Related Argent, Vertus, Moda Living, "Build to Rent", "BTR", professionally managed with amenities.

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
        // Add images array and fallback thumbnail
        parsed.images = allImages;
        if (!parsed.thumbnail && allImages.length > 0) {
          parsed.thumbnail = allImages[0];
        }
        return res.json(parsed);
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

// In-memory storage for properties added via Chrome extension
// In production, you'd use a database
const extensionProperties: Array<{
  id: string;
  url: string;
  title: string;
  address: string;
  thumbnail: string;
  isBTR: boolean;
  tags: string[];
  addedAt: string;
  processed: boolean;
}> = [];

// In-memory storage for tags (synced from main app)
interface PropertyTag {
  id: string;
  name: string;
  color: string;
}
let storedTags: PropertyTag[] = [];

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
    const { url, title, address, thumbnail, price, coordinates, isBTR, tags } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const property = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      url,
      title: title || 'Property',
      address: address || '',
      thumbnail: thumbnail || '',
      price: price || '',
      coordinates: coordinates || null,
      isBTR: isBTR || false,
      tags: tags || [],
      addedAt: new Date().toISOString(),
      processed: false,
    };

    extensionProperties.push(property);

    console.log('Property added from extension:', property.url);

    // Broadcast to all connected clients for real-time update
    broadcastToClients({
      type: 'property-added',
      property,
    });

    res.json({ success: true, property });
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get pending properties from Chrome extension
app.get('/api/pending-properties', (req, res) => {
  const pending = extensionProperties.filter(p => !p.processed);
  res.json(pending);
});

// Mark property as processed
app.post('/api/mark-processed', (req, res) => {
  const { id } = req.body;
  const property = extensionProperties.find(p => p.id === id);
  if (property) {
    property.processed = true;
  }
  res.json({ success: true });
});

// Clear all pending properties
app.delete('/api/pending-properties', (req, res) => {
  extensionProperties.length = 0;
  res.json({ success: true });
});

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

// SPA fallback - serve index.html for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
