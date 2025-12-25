// Content script to extract property data from listing pages

function extractPropertyData() {
  const data = {
    url: window.location.href,
    title: '',
    address: '',
    thumbnail: '',
  };

  // Try to get title
  // OpenGraph title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    data.title = ogTitle.getAttribute('content');
  } else {
    // Fallback to page title
    data.title = document.title.split('|')[0].split('-')[0].trim();
  }

  // Try to get thumbnail/image
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    data.thumbnail = ogImage.getAttribute('content');
  }

  // Site-specific extractors
  const hostname = window.location.hostname;

  if (hostname.includes('rightmove.co.uk')) {
    extractRightmove(data);
  } else if (hostname.includes('zoopla.co.uk')) {
    extractZoopla(data);
  } else if (hostname.includes('openrent.com')) {
    extractOpenRent(data);
  } else if (hostname.includes('spareroom.co.uk')) {
    extractSpareRoom(data);
  } else if (hostname.includes('onthemarket.com')) {
    extractOnTheMarket(data);
  } else {
    // Generic extraction
    extractGeneric(data);
  }

  return data;
}

function extractRightmove(data) {
  // Address
  const addressEl = document.querySelector('[itemprop="streetAddress"]') ||
                    document.querySelector('.property-header-bedroom-and-price address') ||
                    document.querySelector('h1[itemprop="name"]');
  if (addressEl) {
    data.address = addressEl.textContent.trim();
  }

  // Title from property header
  const titleEl = document.querySelector('h1._2uQQ3SV0eMHL1P6t5ZDo2q');
  if (titleEl) {
    data.title = titleEl.textContent.trim();
  }
}

function extractZoopla(data) {
  // Address
  const addressEl = document.querySelector('[data-testid="address-label"]') ||
                    document.querySelector('h1');
  if (addressEl) {
    data.address = addressEl.textContent.trim();
  }
}

function extractOpenRent(data) {
  // Address
  const addressEl = document.querySelector('.property-title') ||
                    document.querySelector('h1');
  if (addressEl) {
    data.address = addressEl.textContent.trim();
  }
}

function extractSpareRoom(data) {
  // Address
  const addressEl = document.querySelector('.listing-title') ||
                    document.querySelector('h1');
  if (addressEl) {
    data.address = addressEl.textContent.trim();
  }
}

function extractOnTheMarket(data) {
  // Address
  const addressEl = document.querySelector('.address') ||
                    document.querySelector('h1');
  if (addressEl) {
    data.address = addressEl.textContent.trim();
  }
}

function extractGeneric(data) {
  // Try common patterns for address
  const addressPatterns = [
    '[itemprop="address"]',
    '[class*="address"]',
    '[class*="location"]',
    'h1',
  ];

  for (const pattern of addressPatterns) {
    const el = document.querySelector(pattern);
    if (el && el.textContent.trim()) {
      // Check if it looks like an address (has postcode-like pattern)
      const text = el.textContent.trim();
      if (/[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}/i.test(text) || text.includes('London')) {
        data.address = text;
        break;
      }
    }
  }
}

// NEW: Extract comprehensive page content for AI parsing
// This allows us to bypass anti-scraping measures by extracting directly from the DOM
function extractPageContent() {
  const content = {
    url: window.location.href,
    hostname: window.location.hostname,
    pageTitle: document.title,
    headings: {},
    metaTags: {},
    structuredData: [],
    mainContent: '',
    sidebarContent: '',
    footerContent: '',
    images: [],
    allText: '',
    priceInfo: [],
    propertyFeatures: [],
  };

  // 1. Extract all headings
  const h1Els = document.querySelectorAll('h1');
  const h2Els = document.querySelectorAll('h2');
  const h3Els = document.querySelectorAll('h3');
  
  content.headings.h1 = Array.from(h1Els).map(el => el.textContent.trim()).filter(t => t);
  content.headings.h2 = Array.from(h2Els).slice(0, 10).map(el => el.textContent.trim()).filter(t => t);
  content.headings.h3 = Array.from(h3Els).slice(0, 10).map(el => el.textContent.trim()).filter(t => t);

  // 2. Extract meta tags
  const metaTags = ['og:title', 'og:description', 'og:image', 'description', 'twitter:title', 'twitter:description', 'twitter:image'];
  for (const tag of metaTags) {
    const el = document.querySelector(`meta[property="${tag}"], meta[name="${tag}"]`);
    if (el) {
      content.metaTags[tag] = el.getAttribute('content');
    }
  }

  // 3. Extract JSON-LD structured data
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent);
      content.structuredData.push(data);
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // 4. Extract main content area
  const mainEl = document.querySelector('main') || 
                 document.querySelector('article') ||
                 document.querySelector('[class*="property-detail"]') ||
                 document.querySelector('[class*="listing-detail"]') ||
                 document.querySelector('[id*="property"]');
  
  if (mainEl) {
    content.mainContent = cleanText(mainEl.innerText).substring(0, 10000);
  }

  // 5. Extract sidebar content (often contains agent info - important to identify)
  const sidebarEl = document.querySelector('aside') ||
                    document.querySelector('[class*="sidebar"]') ||
                    document.querySelector('[class*="agent"]');
  
  if (sidebarEl) {
    content.sidebarContent = cleanText(sidebarEl.innerText).substring(0, 2000);
  }

  // 6. Extract footer content (agent/company addresses often here)
  const footerEl = document.querySelector('footer');
  if (footerEl) {
    content.footerContent = cleanText(footerEl.innerText).substring(0, 2000);
  }

  // 7. Extract images
  const imgSources = new Set();
  
  // og:image (primary)
  if (content.metaTags['og:image']) {
    imgSources.add(content.metaTags['og:image']);
  }
  
  // Property gallery images
  const galleryImgs = document.querySelectorAll(
    '[class*="gallery"] img, [class*="carousel"] img, [class*="slider"] img, ' +
    '[class*="photo"] img, [class*="image"] img, [data-testid*="image"] img'
  );
  for (const img of galleryImgs) {
    const src = img.src || img.dataset.src || img.getAttribute('data-lazy-src');
    if (src && isValidPropertyImage(src)) {
      imgSources.add(src);
    }
  }
  
  // srcset for high-res images
  const srcsetImgs = document.querySelectorAll('img[srcset]');
  for (const img of srcsetImgs) {
    const srcset = img.getAttribute('srcset');
    const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
    for (const url of urls) {
      if (url && url.startsWith('http') && isValidPropertyImage(url)) {
        imgSources.add(url);
      }
    }
  }
  
  content.images = Array.from(imgSources).slice(0, 10);

  // 8. Extract price information
  const pricePatterns = [
    /£[\d,]+(?:\.\d{2})?\s*(?:pcm|pm|per\s+month|pw|per\s+week)/gi,
    /£[\d,]+(?:\.\d{2})?/gi,
  ];
  
  const bodyText = document.body.innerText;
  for (const pattern of pricePatterns) {
    const matches = bodyText.match(pattern);
    if (matches) {
      content.priceInfo = [...new Set(matches)].slice(0, 5);
      break;
    }
  }

  // 9. Extract property features (bedrooms, bathrooms, etc.)
  const featurePatterns = [
    /(\d+)\s*(?:bed(?:room)?s?)/gi,
    /(\d+)\s*(?:bath(?:room)?s?)/gi,
    /(\d+)\s*(?:reception\s*rooms?)/gi,
    /(studio)/gi,
    /(furnished|unfurnished|part[- ]furnished)/gi,
    /(parking|garage)/gi,
    /(garden|balcony|terrace)/gi,
    /(epc\s*rating\s*[A-G])/gi,
  ];
  
  for (const pattern of featurePatterns) {
    const matches = bodyText.match(pattern);
    if (matches) {
      content.propertyFeatures.push(...matches.slice(0, 3));
    }
  }
  content.propertyFeatures = [...new Set(content.propertyFeatures)];

  // 10. Get a condensed version of the page text (for AI analysis)
  // Prioritize main content over headers/footers
  let allText = '';
  
  // Page title and H1 are highest priority
  allText += `PAGE TITLE: ${content.pageTitle}\n\n`;
  if (content.headings.h1.length > 0) {
    allText += `H1 HEADINGS (usually contains property address): ${content.headings.h1.join(' | ')}\n\n`;
  }
  
  // Add meta description
  if (content.metaTags.description || content.metaTags['og:description']) {
    allText += `DESCRIPTION: ${content.metaTags.description || content.metaTags['og:description']}\n\n`;
  }
  
  // Main content
  if (content.mainContent) {
    allText += `MAIN CONTENT:\n${content.mainContent}\n\n`;
  }
  
  // Mark sidebar as potential agent info
  if (content.sidebarContent) {
    allText += `SIDEBAR (may contain AGENT info, not property address):\n${content.sidebarContent}\n\n`;
  }
  
  // Mark footer as agent/company info
  if (content.footerContent) {
    allText += `FOOTER (usually contains AGENT/COMPANY address, NOT the property):\n${content.footerContent}\n\n`;
  }
  
  content.allText = allText.substring(0, 20000); // Limit total text

  return content;
}

// Helper: Clean text (remove excessive whitespace)
function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

// Helper: Check if image URL is likely a property photo (not logo/icon/lifestyle)
function isValidPropertyImage(url) {
  const lowerUrl = url.toLowerCase();
  const exclude = [
    'logo', 'icon', 'sprite', 'avatar', '1x1', 'placeholder',
    'lifestyle', 'pet', 'dog', 'cat', 'person', 'people', 'team', 
    'staff', 'agent', 'favicon', 'badge', 'button', 'arrow'
  ];
  
  return !exclude.some(term => lowerUrl.includes(term));
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    const data = extractPropertyData();
    sendResponse(data);
  } else if (request.action === 'getPageContent') {
    // NEW: Return comprehensive page content for AI parsing
    const content = extractPageContent();
    sendResponse(content);
  }
  return true;
});
