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

// NEW: Extract ALL page content for AI parsing
// Simple approach: just get everything and let Claude figure it out
function extractPageContent() {
  const content = {
    url: window.location.href,
    hostname: window.location.hostname,
    pageTitle: document.title,
    images: [],
    fullPageText: '',
  };

  // 1. Get og:image for thumbnail
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    content.images.push(ogImage.getAttribute('content'));
  }

  // 2. Get other property images
  const imgEls = document.querySelectorAll('img');
  for (const img of imgEls) {
    const src = img.src || img.dataset.src;
    if (src && src.startsWith('http') && isValidPropertyImage(src)) {
      content.images.push(src);
    }
  }
  content.images = [...new Set(content.images)].slice(0, 10);

  // 3. Extract ALL visible text from the page - let Claude handle the parsing
  // This is the key change: no more regex, no more trying to be clever
  // Just give Claude everything and let it figure out what's what
  content.fullPageText = document.body.innerText;

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
