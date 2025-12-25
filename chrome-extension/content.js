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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    const data = extractPropertyData();
    sendResponse(data);
  }
  return true;
});
