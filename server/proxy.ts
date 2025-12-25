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

// Extract addresses with context labels and HTML location
interface ExtractedAddress {
  postcode: string;
  fullContext: string;
  source: 'PROPERTY' | 'AGENT_OFFICE' | 'DEVELOPER' | 'FOOTER' | 'CONTACT' | 'UNKNOWN';
  confidence: number;
  htmlLocation: string;
}

function extractAddressesWithContext(html: string): ExtractedAddress[] {
  const addresses: ExtractedAddress[] = [];
  const postcodeRegex = /[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/gi;

  // Identify different sections of the page
  const footerContent = (html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i) || ['', ''])[1];
  const headerContent = (html.match(/<header[^>]*>([\s\S]*?)<\/header>/i) || ['', ''])[1];
  const navContent = (html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/gi) || []).join('');
  const sidebarContent = (html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/gi) || []).join('') +
                         (html.match(/<div[^>]*class=["'][^"']*sidebar[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi) || []).join('');
  const mainContent = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || ['', ''])[1] ||
                      (html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || ['', ''])[1] ||
                      (html.match(/<div[^>]*class=["'][^"']*(?:property|listing|detail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || ['', ''])[1];

  // Find all postcodes
  const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const matches = cleanText.matchAll(new RegExp(`(.{0,200})(${postcodeRegex.source})(.{0,100})`, 'gi'));

  for (const match of matches) {
    const beforeContext = match[1].trim();
    const postcode = match[2].toUpperCase().replace(/\s+/g, ' ');
    const afterContext = match[3].trim();
    const fullContext = `${beforeContext} ${postcode} ${afterContext}`.trim();
    const lowerContext = fullContext.toLowerCase();

    // Determine where in the HTML this address appears
    let htmlLocation = 'BODY';
    if (footerContent.toLowerCase().includes(postcode.toLowerCase())) {
      htmlLocation = 'FOOTER';
    } else if (headerContent.toLowerCase().includes(postcode.toLowerCase())) {
      htmlLocation = 'HEADER';
    } else if (navContent.toLowerCase().includes(postcode.toLowerCase())) {
      htmlLocation = 'NAVIGATION';
    } else if (sidebarContent.toLowerCase().includes(postcode.toLowerCase())) {
      htmlLocation = 'SIDEBAR';
    } else if (mainContent.toLowerCase().includes(postcode.toLowerCase())) {
      htmlLocation = 'MAIN_CONTENT';
    }

    // Score and classify the address
    let source: ExtractedAddress['source'] = 'UNKNOWN';
    let confidence = 50;

    // Strong property indicators
    const propertyIndicators = [
      'property', 'flat', 'apartment', 'studio', 'bedroom', 'bed', 'bath',
      'to let', 'for rent', 'available', 'pcm', 'pw', 'per month', 'per week',
      'tenancy', 'tenant', 'move in', 'unfurnished', 'furnished',
      'living room', 'kitchen', 'balcony', 'terrace', 'parking'
    ];

    // Strong agent/office indicators
    const agentIndicators = [
      'office', 'branch', 'contact us', 'visit us', 'call us', 'speak to',
      'our address', 'find us', 'opening hours', 'open monday', 'sales office',
      'lettings office', 'viewing office', 'show flat', 'showroom'
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
      if (lowerContext.includes(indicator)) agentScore += 20;
    }
    for (const indicator of developerIndicators) {
      if (lowerContext.includes(indicator)) developerScore += 20;
    }
    for (const indicator of footerIndicators) {
      if (lowerContext.includes(indicator)) footerScore += 15;
    }

    // HTML location significantly affects scoring
    if (htmlLocation === 'FOOTER') {
      footerScore += 40;
      propertyScore -= 30;
    } else if (htmlLocation === 'MAIN_CONTENT') {
      propertyScore += 30;
    } else if (htmlLocation === 'SIDEBAR' || htmlLocation === 'NAVIGATION') {
      agentScore += 20;
      propertyScore -= 10;
    }

    // Determine source based on highest score
    const maxScore = Math.max(propertyScore, agentScore, developerScore, footerScore);
    if (maxScore === 0 || propertyScore === maxScore) {
      source = 'PROPERTY';
      confidence = Math.min(95, 50 + propertyScore);
    } else if (agentScore === maxScore) {
      source = 'AGENT_OFFICE';
      confidence = Math.min(95, 50 + agentScore);
    } else if (developerScore === maxScore) {
      source = 'DEVELOPER';
      confidence = Math.min(95, 50 + developerScore);
    } else {
      source = 'FOOTER';
      confidence = Math.min(95, 50 + footerScore);
    }

    addresses.push({
      postcode,
      fullContext,
      source,
      confidence,
      htmlLocation
    });
  }

  // Deduplicate by postcode, keeping the one with highest property confidence
  const uniqueAddresses = new Map<string, ExtractedAddress>();
  for (const addr of addresses) {
    const existing = uniqueAddresses.get(addr.postcode);
    if (!existing || (addr.source === 'PROPERTY' && existing.source !== 'PROPERTY') ||
        (addr.source === 'PROPERTY' && existing.source === 'PROPERTY' && addr.confidence > existing.confidence)) {
      uniqueAddresses.set(addr.postcode, addr);
    }
  }

  return Array.from(uniqueAddresses.values());
}

// Clean and condense HTML for AI parsing
function prepareHtmlForAI(html: string, url: string): string {
  let condensed = '';

  // Get title - often contains property address
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) condensed += `## PAGE TITLE (often contains property location)\n${titleMatch[1].trim()}\n\n`;

  // Get meta description - often has property summary
  const descMatch = html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) condensed += `## META DESCRIPTION (property summary)\n${descMatch[1]}\n\n`;

  // Get all headings H1-H3 to understand page structure
  const headings: string[] = [];
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  if (h1Match) {
    for (const h of h1Match) {
      const text = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) headings.push(`[H1] ${text}`);
    }
  }
  const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  for (const match of h2Matches) {
    const text = match[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && text.length < 200) headings.push(`[H2] ${text}`);
  }
  if (headings.length > 0) {
    condensed += `## PAGE HEADINGS (H1 usually contains property title/address)\n${headings.slice(0, 10).join('\n')}\n\n`;
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
  if (!aiResult.address || extractedAddresses.length === 0) {
    return aiResult;
  }

  // Extract postcode from AI's address
  const aiPostcodeMatch = aiResult.address.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}/i);
  if (!aiPostcodeMatch) {
    // AI didn't return a valid UK postcode, try to use the best pre-classified one
    const propertyAddresses = extractedAddresses.filter(a => a.source === 'PROPERTY');
    if (propertyAddresses.length > 0) {
      const best = propertyAddresses.sort((a, b) => b.confidence - a.confidence)[0];
      aiResult.address = best.fullContext;
      aiResult.addressConfidence = 'medium';
      aiResult.addressReasoning = 'Address corrected: AI response missing valid postcode, using pre-classified property address';
      console.log('Address correction: Missing postcode, using pre-classified address');
    }
    return aiResult;
  }

  const aiPostcode = aiPostcodeMatch[0].toUpperCase().replace(/\s+/g, ' ');
  
  // Find this postcode in our pre-classified addresses
  const matchingAddress = extractedAddresses.find(
    a => a.postcode.replace(/\s+/g, ' ') === aiPostcode.replace(/\s+/g, ' ')
  );

  if (!matchingAddress) {
    // Postcode not in our extracted list - could be valid but not caught by our regex
    return aiResult;
  }

  // Check if AI picked a non-property address
  if (matchingAddress.source !== 'PROPERTY') {
    console.log(`Address warning: AI picked ${matchingAddress.source} address (${aiPostcode}), checking for alternatives...`);
    
    // Find best property address as alternative
    const propertyAddresses = extractedAddresses.filter(a => a.source === 'PROPERTY');
    
    if (propertyAddresses.length > 0) {
      const best = propertyAddresses.sort((a, b) => b.confidence - a.confidence)[0];
      
      // If the best property address has reasonable confidence, use it instead
      if (best.confidence >= 60) {
        console.log(`Address correction: Replacing ${matchingAddress.source} address with PROPERTY address (${best.postcode})`);
        
        // Try to construct a better address from the context
        aiResult.address = best.fullContext;
        aiResult.addressConfidence = 'medium';
        aiResult.addressReasoning = `Address corrected: Original was ${matchingAddress.source.toLowerCase()} address, replaced with property address from main content`;
        aiResult.originalAddress = `${aiPostcode} (was: ${matchingAddress.source})`;
      }
    } else if (matchingAddress.htmlLocation === 'FOOTER') {
      // No clear property address, but AI picked a footer address - warn about low confidence
      aiResult.addressConfidence = 'low';
      aiResult.addressReasoning = (aiResult.addressReasoning || '') + ' (Warning: Address found in footer, may be agent address)';
    }
  } else {
    // AI correctly picked a property address - increase confidence
    if (matchingAddress.confidence >= 80 && aiResult.addressConfidence !== 'high') {
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
          content: `You are an expert at analyzing UK property rental listing pages. Your task is to extract the PROPERTY ADDRESS - the actual location where the rental unit is physically located.

## CRITICAL PROBLEM TO AVOID

Many property pages contain MULTIPLE addresses:
1. **PROPERTY ADDRESS** (✓ WHAT WE WANT) - where the flat/house is located
2. **AGENT OFFICE ADDRESS** (✗ WRONG) - the estate agent's office address
3. **DEVELOPER HQ ADDRESS** (✗ WRONG) - the building company's headquarters
4. **FOOTER/CONTACT ADDRESS** (✗ WRONG) - company registration or contact address

**You MUST distinguish between these and ONLY return the property address.**

## STEP-BY-STEP ANALYSIS PROCESS

Follow these steps in order:

### Step 1: Identify the PROPERTY from the page title/H1
The H1 heading and page title usually contain the property description like "2 Bed Apartment in Canary Wharf" or "Studio Flat, E14". This tells you WHAT the property is and often hints at the location.

### Step 2: Find ALL postcodes/addresses on the page
List every UK postcode you see and note WHERE on the page it appears (main content, footer, sidebar, contact section).

### Step 3: Classify each address
For each address, determine if it's:
- PROPERTY: Appears in property title, main content, near bedroom/bathroom counts, rental price
- AGENT: Near "contact us", "our office", "visit our branch", in footer, with phone/email
- DEVELOPER: Near "about us", "head office", company registration, "Ltd", "Limited"

### Step 4: Select the PROPERTY address
Choose the address that:
- Appears in the MAIN CONTENT area (not footer/sidebar)
- Is associated with property features (bedrooms, rent price, available date)
- Matches the location hinted at in the page title/H1
- Is NOT marked as an office, branch, or company address

## COMMON MISTAKES TO AVOID

❌ DO NOT pick an address from the footer - that's usually the agent's office
❌ DO NOT pick an address near "Contact us" or "Visit our branch"  
❌ DO NOT pick an address that includes "Floor" + company name (office address)
❌ DO NOT pick an address near "Registered office" or "Head office"
❌ DO NOT confuse "Sales office" or "Marketing suite" with the property address

## EXAMPLES

### Example 1: CORRECT
Page title: "2 Bed Apartment, Royal Docks, E16"
Main content mentions: "This stunning flat at The Shoreline, Royal Docks, London E16 1BQ"
Footer contains: "ABC Lettings, 45 Commercial Road, London E1 1LH"
→ CORRECT: Use E16 1BQ (property), NOT E1 1LH (agent office)

### Example 2: CORRECT  
H1: "Luxury Studio in Wembley Park"
Property description: "Located at Quintain's development, Olympic Way, HA9 0GQ"
Sidebar: "Contact our Wembley office: 123 High Road, Wembley HA0 2AA"
→ CORRECT: Use HA9 0GQ (property), NOT HA0 2AA (agent office)

### Example 3: INCORRECT (what to avoid)
Page shows a property in Canary Wharf but you pick "Floor 2, One Canada Square, E14 5AB" which is clearly an office address, not a residential flat address.

## UK POSTCODE REFERENCE
Format: [Area][District] [Sector][Unit]
Examples: E14 9GE, SW1A 1AA, N1 9GU, SE1 7PB

## RESPONSE FORMAT

Think through your analysis, then return a JSON object:

{
  "analysisSteps": {
    "propertyFromTitle": "What the page title/H1 tells us about the property and its likely location",
    "allAddressesFound": ["List each postcode with its context"],
    "classification": "For each address, explain if it's property/agent/developer",
    "selectedAddress": "Which address you chose and why"
  },
  "name": "property title - e.g., '2 Bed Apartment, The Shoreline'",
  "address": "PROPERTY address only - the full address where a tenant would live",
  "addressConfidence": "high/medium/low",
  "addressReasoning": "One sentence explaining why this is the property address",
  "thumbnail": "best property image URL (full URL starting with http)",
  "isBTR": true/false
}

## BTR (Build to Rent) Indicators
Quintain, Greystar, Get Living, Essential Living, Fizzy Living, Grainger, Tipi, Uncle, APO, Canvas, Platform_, Lendlease, Related Argent, Vertus, Moda Living, "Build to Rent", "BTR", professionally managed developments with concierge/gym/amenities.

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
