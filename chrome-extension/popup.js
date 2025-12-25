// Simplified Extension - Just sends URL to main app
// The main app handles all processing (AI parsing, geocoding, etc.)

let currentTab = null;
let pageData = null;

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM elements
  elements.addView = document.getElementById('add-view');
  elements.successView = document.getElementById('success-view');
  elements.alreadyView = document.getElementById('already-view');
  elements.errorView = document.getElementById('error-view');
  elements.setupView = document.getElementById('setup-view');
  elements.propertyTitle = document.getElementById('property-title');
  elements.propertyUrl = document.getElementById('property-url');
  elements.thumbnailContainer = document.getElementById('thumbnail-container');
  elements.siteBadge = document.getElementById('site-badge');
  elements.siteName = document.getElementById('site-name');
  elements.tagsSection = document.getElementById('tags-section');
  elements.tagsContainer = document.getElementById('tags-container');
  elements.addBtn = document.getElementById('add-btn');
  elements.retryBtn = document.getElementById('retry-btn');
  elements.openAppBtn = document.getElementById('open-app-btn');
  elements.openAppBtnSuccess = document.getElementById('open-app-btn-success');
  elements.openAppBtnAlready = document.getElementById('open-app-btn-already');
  elements.openAppBtnError = document.getElementById('open-app-btn-error');
  elements.errorMessage = document.getElementById('error-message');
  elements.appUrlInput = document.getElementById('app-url');
  elements.settingsToggle = document.getElementById('settings-toggle');
  elements.settingsPanel = document.getElementById('settings-panel');

  // Load saved app URL
  const stored = await chrome.storage.local.get(['appUrl']);
  const savedUrl = stored.appUrl || '';
  elements.appUrlInput.value = savedUrl;

  // Save app URL on change
  elements.appUrlInput.addEventListener('change', () => {
    const url = elements.appUrlInput.value.trim();
    chrome.storage.local.set({ appUrl: url });
    // If we were showing setup view and now have a URL, reload
    if (url && !elements.setupView.classList.contains('hidden')) {
      location.reload();
    }
  });

  // Settings toggle
  elements.settingsToggle.addEventListener('click', () => {
    elements.settingsPanel.classList.toggle('hidden');
  });

  // Check if URL is configured
  if (!savedUrl) {
    showSetupRequired();
    // Auto-expand settings
    elements.settingsPanel.classList.remove('hidden');
    return;
  }

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Check for invalid URLs (browser internal pages)
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    showError('Cannot add this page. Navigate to a property listing website first.');
    return;
  }

  // Show property preview
  elements.propertyUrl.textContent = truncateUrl(tab.url);
  elements.propertyTitle.textContent = cleanTitle(tab.title) || 'Property Listing';
  elements.siteName.textContent = getSiteName(tab.url);

  // Try to get more data from content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageData' });
    if (response) {
      pageData = response;
      if (response.title) {
        elements.propertyTitle.textContent = cleanTitle(response.title);
      }
      if (response.thumbnail) {
        showThumbnail(response.thumbnail);
      }
    }
  } catch (e) {
    // Content script not loaded - that's fine, we'll use basic data
    console.log('Content script not available');
  }

  // Check if already added
  const addedProperties = await getAddedProperties();
  const normalizedUrl = normalizeUrl(tab.url);
  const existing = addedProperties.find(p => normalizeUrl(p.url) === normalizedUrl);

  if (existing) {
    showAlreadyAdded();
    return;
  }

  // Fetch tags from server
  await fetchTags();

  // Event listeners
  elements.addBtn.addEventListener('click', handleAdd);
  elements.retryBtn.addEventListener('click', handleRetry);
  elements.openAppBtn.addEventListener('click', openApp);
  elements.openAppBtnSuccess.addEventListener('click', openApp);
  elements.openAppBtnAlready.addEventListener('click', openApp);
  elements.openAppBtnError.addEventListener('click', openApp);
});

// Get site name from URL
function getSiteName(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0];
  } catch {
    return 'website';
  }
}

// Clean up property title
function cleanTitle(title) {
  if (!title) return '';
  // Remove common suffixes
  return title
    .split('|')[0]
    .split(' - ')[0]
    .split(' – ')[0]
    .trim()
    .substring(0, 80);
}

// Truncate URL for display
function truncateUrl(url) {
  if (url.length > 50) {
    return url.substring(0, 47) + '...';
  }
  return url;
}

// Normalize URL for comparison
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

// Show thumbnail image
function showThumbnail(src) {
  if (!src) return;
  elements.thumbnailContainer.innerHTML = `<img src="${src}" alt="Property" onerror="this.parentElement.innerHTML='<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'></rect><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'></circle><polyline points=\\'21 15 16 10 5 21\\'></polyline></svg>'">`;
}

// Get API URL - extracts base URL even if user entered a session URL
function getApiUrl() {
  let appUrl = elements.appUrlInput.value.trim().replace(/\/$/, '');
  if (!appUrl) return '';
  
  // Extract just the origin (protocol + host) to handle session URLs like /s/xyz
  try {
    const parsed = new URL(appUrl);
    appUrl = parsed.origin; // e.g., https://rent-shortlist.onrender.com
  } catch {
    // If parsing fails, use as-is
  }
  
  // Handle local development
  if (appUrl.includes('localhost:5173') || appUrl.includes('localhost:5174')) {
    return appUrl.replace(':5173', ':3001').replace(':5174', ':3001');
  }
  return appUrl;
}

// Custom error class for duplicates
class DuplicateError extends Error {
  constructor(message, existingProperty) {
    super(message);
    this.name = 'DuplicateError';
    this.existingProperty = existingProperty;
  }
}

// Fetch with error handling
async function safeFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    // Check for duplicate error (409 Conflict)
    if (response.status === 409) {
      const data = await response.json().catch(() => ({}));
      if (data.error === 'duplicate') {
        throw new DuplicateError(data.message || 'Already added', data.existingProperty);
      }
    }
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Server error: ${text}`);
  }
  
  return response.json();
}

// Get locally stored added properties
async function getAddedProperties() {
  const stored = await chrome.storage.local.get(['addedProperties']);
  return stored.addedProperties || [];
}

// Save property to local storage
async function saveAddedProperty(url, title) {
  const properties = await getAddedProperties();
  properties.push({
    url,
    title,
    addedAt: new Date().toISOString(),
  });
  // Keep only last 100 entries
  if (properties.length > 100) {
    properties.shift();
  }
  await chrome.storage.local.set({ addedProperties: properties });
}

// Fetch available tags
let availableTags = [];
let selectedTagIds = [];

async function fetchTags() {
  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;
    availableTags = await safeFetch(`${apiUrl}/api/tags`);
    renderTags();
  } catch (e) {
    console.log('Could not fetch tags:', e.message);
  }
}

function renderTags() {
  if (!Array.isArray(availableTags) || availableTags.length === 0) {
    elements.tagsSection.classList.add('hidden');
    return;
  }

  elements.tagsSection.classList.remove('hidden');
  elements.tagsContainer.innerHTML = availableTags.map(tag => `
    <span
      class="tag-chip ${selectedTagIds.includes(tag.id) ? 'selected' : ''}"
      data-tag-id="${tag.id}"
      style="background-color: ${tag.color}15; color: ${tag.color}"
    >
      <span class="tag-dot" style="background-color: ${tag.color}"></span>
      ${tag.name}
    </span>
  `).join('');

  elements.tagsContainer.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tagId = chip.dataset.tagId;
      const idx = selectedTagIds.indexOf(tagId);
      if (idx === -1) {
        selectedTagIds.push(tagId);
      } else {
        selectedTagIds.splice(idx, 1);
      }
      renderTags();
    });
  });
}

// Main add handler - sends URL + page text to server
// Server/App handles ALL parsing via Claude
async function handleAdd() {
  const apiUrl = getApiUrl();
  
  // Check if URL is configured
  if (!apiUrl) {
    showSetupRequired();
    elements.settingsPanel.classList.remove('hidden');
    return;
  }
  
  // Disable button, show loading
  elements.addBtn.disabled = true;
  elements.addBtn.innerHTML = '<div class="spinner"></div> Adding...';

  try {
    // Get page text from content script (for sites that block server fetching)
    let pageText = '';
    let ogImage = '';
    try {
      const contentData = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageData' });
      if (contentData) {
        pageText = contentData.pageText || '';
        ogImage = contentData.ogImage || '';
      }
    } catch (e) {
      console.log('Could not get page text from content script');
    }

    // Send ONLY URL + page text to server - Claude does ALL the parsing
    await safeFetch(`${apiUrl}/api/add-property`, {
      method: 'POST',
      body: JSON.stringify({
        url: currentTab.url,
        pageText: pageText,  // Full page text for AI parsing
        ogImage: ogImage,    // Optional fallback thumbnail
        tags: selectedTagIds, // User-selected tags only
      }),
    });

    // Save locally (just URL for duplicate detection)
    await saveAddedProperty(currentTab.url, currentTab.title);

    // Show success
    showSuccess();

  } catch (error) {
    console.error('Error adding property:', error);
    
    // Handle duplicate error specifically
    if (error instanceof DuplicateError) {
      // Save locally so we don't check server again
      await saveAddedProperty(currentTab.url, currentTab.title);
      showAlreadyAdded();
      return;
    }
    
    showError(error.message || 'Could not connect to server. Check your App URL in settings.');
  }
}

// Retry after error
function handleRetry() {
  elements.errorView.classList.add('hidden');
  elements.addView.classList.remove('hidden');
  elements.addBtn.disabled = false;
  elements.addBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    Add to Shortlist
  `;
}

// Open the main app (use the URL as entered by user)
function openApp() {
  let appUrl = elements.appUrlInput.value.trim() || 'https://rent-shortlist.onrender.com';
  // Ensure it's a valid URL
  try {
    new URL(appUrl);
  } catch {
    appUrl = 'https://rent-shortlist.onrender.com';
  }
  chrome.tabs.create({ url: appUrl });
}

// Show views
function showSuccess() {
  elements.addView.classList.add('hidden');
  elements.successView.classList.remove('hidden');
}

function showAlreadyAdded() {
  elements.addView.classList.add('hidden');
  elements.alreadyView.classList.remove('hidden');
}

function showSetupRequired() {
  elements.addView.classList.add('hidden');
  elements.setupView.classList.remove('hidden');
}

function showError(message) {
  elements.addView.classList.add('hidden');
  elements.errorView.classList.remove('hidden');
  elements.errorMessage.textContent = message;
}
