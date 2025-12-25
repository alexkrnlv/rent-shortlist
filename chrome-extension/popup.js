// State
let currentTab = null;
let pageData = null;
let isManualMode = false;
let availableTags = [];
let selectedTagIds = [];

// DOM Elements
const elements = {};

// Icons
const icons = {
  pending: '○',
  spinner: '<div class="step-spinner"></div>',
  success: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  error: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM elements
  elements.status = document.getElementById('status');
  elements.addView = document.getElementById('add-view');
  elements.alreadyAddedView = document.getElementById('already-added-view');
  elements.previewTitle = document.getElementById('preview-title');
  elements.previewAddress = document.getElementById('preview-address');
  elements.previewUrl = document.getElementById('preview-url');
  elements.addedTitle = document.getElementById('added-title');
  elements.addedAddress = document.getElementById('added-address');
  elements.addedUrl = document.getElementById('added-url');
  elements.addBtn = document.getElementById('add-btn');
  elements.retryBtn = document.getElementById('retry-btn');
  elements.openAppBtn = document.getElementById('open-app-btn');
  elements.openAppBtnAdded = document.getElementById('open-app-btn-added');
  elements.appUrlInput = document.getElementById('app-url');
  elements.progressSteps = document.getElementById('progress-steps');
  elements.manualForm = document.getElementById('manual-form');
  elements.manualName = document.getElementById('manual-name');
  elements.manualAddress = document.getElementById('manual-address');
  elements.manualPrice = document.getElementById('manual-price');
  elements.propertyPreview = document.getElementById('property-preview');
  elements.tagSelection = document.getElementById('tag-selection');
  elements.tagList = document.getElementById('tag-list');

  // Load saved app URL
  const stored = await chrome.storage.local.get(['appUrl']);
  if (stored.appUrl) {
    elements.appUrlInput.value = stored.appUrl;
  }

  // Save app URL on change
  elements.appUrlInput.addEventListener('change', () => {
    chrome.storage.local.set({ appUrl: elements.appUrlInput.value });
  });

  // Fetch available tags from server
  await fetchTags();

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Check if this URL was already added
  const addedProperties = await getAddedProperties();
  const existingProperty = addedProperties.find(p => normalizeUrl(p.url) === normalizeUrl(tab.url));

  if (existingProperty) {
    // Show "already added" view
    showAlreadyAddedView(existingProperty);
    return;
  }

  // Show add view
  elements.previewUrl.textContent = tab.url;
  elements.previewTitle.textContent = tab.title || 'Property Listing';

  // Try to extract page data via content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageData' });
    if (response) {
      pageData = response;
      if (response.title) elements.previewTitle.textContent = response.title;
      if (response.address) elements.previewAddress.textContent = response.address;
    }
  } catch (e) {
    console.log('Could not get page data from content script');
  }

  // Add event listeners
  elements.addBtn.addEventListener('click', handleAddProperty);
  elements.retryBtn.addEventListener('click', handleRetryWithManual);
  elements.openAppBtn.addEventListener('click', openApp);
  elements.openAppBtnAdded.addEventListener('click', openApp);
});

// Normalize URL for comparison (remove trailing slashes, query params, etc.)
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

// Get API URL from app URL (handle localhost port mapping)
function getApiUrl(appUrl) {
  const cleanUrl = appUrl.replace(/\/$/, '');
  // For localhost development, map frontend port to API port
  if (cleanUrl.includes('localhost:5173') || cleanUrl.includes('localhost:5174')) {
    return cleanUrl.replace(':5173', ':3001').replace(':5174', ':3001');
  }
  // For production (Render), API is on same origin
  return cleanUrl;
}

// Make a fetch request with proper error handling
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Server error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Check App URL setting.');
    }
    throw error;
  }
}

// Fetch available tags from server
async function fetchTags() {
  const appUrl = elements.appUrlInput.value.replace(/\/$/, '');
  const apiUrl = getApiUrl(appUrl);

  try {
    availableTags = await safeFetch(`${apiUrl}/api/tags`);
    renderTags();
  } catch (e) {
    console.log('Could not fetch tags from server:', e.message);
  }
}

// Render tags in the UI
function renderTags() {
  if (!Array.isArray(availableTags) || availableTags.length === 0) {
    elements.tagSelection.classList.add('hidden');
    return;
  }

  elements.tagSelection.classList.remove('hidden');
  elements.tagList.innerHTML = availableTags.map(tag => `
    <span
      class="tag-chip ${selectedTagIds.includes(tag.id) ? 'selected' : ''}"
      data-tag-id="${tag.id}"
      style="background-color: ${tag.color}20; color: ${tag.color}"
    >
      <span class="tag-dot" style="background-color: ${tag.color}"></span>
      ${tag.name}
    </span>
  `).join('');

  // Add click handlers
  elements.tagList.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tagId = chip.dataset.tagId;
      toggleTag(tagId);
    });
  });
}

// Toggle tag selection
function toggleTag(tagId) {
  const index = selectedTagIds.indexOf(tagId);
  if (index === -1) {
    selectedTagIds.push(tagId);
  } else {
    selectedTagIds.splice(index, 1);
  }
  renderTags();
}

// Get added properties from storage
async function getAddedProperties() {
  const stored = await chrome.storage.local.get(['addedProperties']);
  return stored.addedProperties || [];
}

// Save added property to storage
async function saveAddedProperty(property) {
  const properties = await getAddedProperties();
  properties.push({
    url: currentTab.url,
    title: property.name,
    address: property.address,
    addedAt: new Date().toISOString(),
  });
  await chrome.storage.local.set({ addedProperties: properties });
}

// Show "already added" view
function showAlreadyAddedView(property) {
  elements.addView.classList.add('hidden');
  elements.alreadyAddedView.classList.remove('hidden');
  elements.addedTitle.textContent = property.title;
  elements.addedAddress.textContent = property.address || '';
  elements.addedUrl.textContent = property.url;
}

// Update step status with optional message
function updateStep(stepId, status, message = null) {
  const step = document.getElementById(stepId);
  if (!step) return;
  
  const iconEl = step.querySelector('.step-icon');
  const textEl = step.querySelector('.step-text');

  step.classList.remove('active', 'completed', 'error');

  switch (status) {
    case 'active':
      step.classList.add('active');
      iconEl.innerHTML = icons.spinner;
      break;
    case 'completed':
      step.classList.add('completed');
      iconEl.innerHTML = icons.success;
      break;
    case 'error':
      step.classList.add('error');
      iconEl.innerHTML = icons.error;
      break;
    default:
      iconEl.innerHTML = icons.pending;
  }
  
  if (message && textEl) {
    textEl.textContent = message;
  }
}

// Show status message
function showStatus(message, type = 'info') {
  elements.status.className = `status ${type}`;
  elements.status.textContent = message;
  elements.status.classList.remove('hidden');
}

// Hide status
function hideStatus() {
  elements.status.classList.add('hidden');
}

// Reset all steps to pending
function resetAllSteps() {
  ['step-connect', 'step-fetch', 'step-geocode', 'step-save'].forEach(stepId => {
    updateStep(stepId, 'pending');
  });
}

// Open app
function openApp() {
  chrome.tabs.create({ url: elements.appUrlInput.value });
}

// Main add property handler
async function handleAddProperty() {
  const appUrl = elements.appUrlInput.value.replace(/\/$/, '');
  const apiUrl = getApiUrl(appUrl);

  // Disable button and show progress
  elements.addBtn.disabled = true;
  elements.addBtn.innerHTML = '<div class="spinner"></div> Processing...';
  elements.progressSteps.classList.remove('hidden');
  elements.propertyPreview.classList.add('hidden');
  hideStatus();
  resetAllSteps();

  let propertyData = {
    name: pageData?.title || currentTab.title || 'Property',
    address: pageData?.address || '',
    thumbnail: pageData?.thumbnail || '',
    price: '',
    isBTR: false,
  };

  try {
    // Step 1: Test server connection
    updateStep('step-connect', 'active');
    
    try {
      await safeFetch(`${apiUrl}/api/health`);
      updateStep('step-connect', 'completed');
    } catch (error) {
      updateStep('step-connect', 'error');
      throw new Error(`Cannot connect to server at ${apiUrl}. Is the App URL correct?`);
    }

    // Step 2: Extract content from page and parse with AI
    // This bypasses anti-scraping measures by extracting directly from the DOM
    updateStep('step-fetch', 'active');

    try {
      // First, extract comprehensive content from the page via content script
      const pageContent = await chrome.tabs.sendMessage(currentTab.id, { action: 'getPageContent' });
      
      if (!pageContent) {
        throw new Error('Could not extract page content');
      }

      // Send the extracted content to our server for AI parsing
      const fetchedData = await safeFetch(`${apiUrl}/api/parse-property-content`, {
        method: 'POST',
        body: JSON.stringify({ pageContent }),
      });
      
      propertyData = { ...propertyData, ...fetchedData };
      updateStep('step-fetch', 'completed');
    } catch (error) {
      // If content extraction fails, fall back to basic page data
      console.log('Content extraction failed, using basic data:', error.message);
      if (pageData?.address) {
        // We have basic data from the initial extraction, continue with that
        updateStep('step-fetch', 'completed');
      } else {
        updateStep('step-fetch', 'error');
        throw new Error(`Failed to extract property details: ${error.message}`);
      }
    }

    // Step 3: Geocode the address
    updateStep('step-geocode', 'active');

    if (!propertyData.address) {
      updateStep('step-geocode', 'error');
      throw new Error('No address found on the page - manual entry required');
    }

    let coordinates;
    try {
      coordinates = await safeFetch(`${apiUrl}/api/geocode`, {
        method: 'POST',
        body: JSON.stringify({ address: propertyData.address }),
      });
      
      if (!coordinates || !coordinates.lat || !coordinates.lng) {
        throw new Error('Invalid coordinates returned');
      }
      updateStep('step-geocode', 'completed');
    } catch (error) {
      updateStep('step-geocode', 'error');
      throw new Error(`Could not find location for address: ${propertyData.address}`);
    }

    // Step 4: Save to shortlist
    updateStep('step-save', 'active');

    try {
      const savedProperty = await safeFetch(`${apiUrl}/api/add-property`, {
        method: 'POST',
        body: JSON.stringify({
          url: currentTab.url,
          title: propertyData.name,
          address: propertyData.address,
          thumbnail: propertyData.thumbnail,
          price: propertyData.price || '',
          coordinates,
          isBTR: propertyData.isBTR || false,
          tags: selectedTagIds,
        }),
      });
      
      if (!savedProperty || !savedProperty.success) {
        throw new Error('Server did not confirm save');
      }
      
      updateStep('step-save', 'completed');
    } catch (error) {
      updateStep('step-save', 'error');
      throw new Error(`Failed to save property: ${error.message}`);
    }

    // Success! Save to local storage
    await saveAddedProperty(propertyData);

    showStatus('Property added to your shortlist!', 'success');
    elements.addBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Added!';
    elements.addBtn.classList.add('btn-success');
    elements.addBtn.classList.remove('btn-primary');

  } catch (error) {
    console.error('Error adding property:', error);
    showFailureState(error.message, propertyData);
  }
}

// Show failure state with manual entry option
function showFailureState(errorMessage, propertyData) {
  showStatus(errorMessage, 'error');

  // Show manual form
  elements.manualForm.classList.remove('hidden');
  elements.addBtn.classList.add('hidden');
  elements.retryBtn.classList.remove('hidden');

  // Pre-fill with any data we have
  elements.manualName.value = propertyData.name || '';
  elements.manualAddress.value = propertyData.address || '';
  elements.manualPrice.value = propertyData.price || '';

  isManualMode = true;
}

// Retry with manual details
async function handleRetryWithManual() {
  const name = elements.manualName.value.trim();
  const address = elements.manualAddress.value.trim();
  const price = elements.manualPrice.value.trim();

  if (!name || !address) {
    showStatus('Name and address are required', 'error');
    return;
  }

  const appUrl = elements.appUrlInput.value.replace(/\/$/, '');
  const apiUrl = getApiUrl(appUrl);

  elements.retryBtn.disabled = true;
  elements.retryBtn.innerHTML = '<div class="spinner"></div> Saving...';
  hideStatus();

  try {
    // Reset and try geocode
    updateStep('step-geocode', 'active');

    let coordinates;
    try {
      coordinates = await safeFetch(`${apiUrl}/api/geocode`, {
        method: 'POST',
        body: JSON.stringify({ address }),
      });
      
      if (!coordinates || !coordinates.lat || !coordinates.lng) {
        throw new Error('Invalid coordinates');
      }
      updateStep('step-geocode', 'completed');
    } catch (error) {
      updateStep('step-geocode', 'error');
      showStatus(`Could not find location for: ${address}`, 'error');
      elements.retryBtn.disabled = false;
      elements.retryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/></svg> Retry';
      return;
    }

    // Save to shortlist
    updateStep('step-save', 'active');

    try {
      const savedProperty = await safeFetch(`${apiUrl}/api/add-property`, {
        method: 'POST',
        body: JSON.stringify({
          url: currentTab.url,
          title: name,
          address,
          thumbnail: pageData?.thumbnail || '',
          price,
          coordinates,
          isBTR: false,
          tags: selectedTagIds,
        }),
      });
      
      if (!savedProperty || !savedProperty.success) {
        throw new Error('Server did not confirm save');
      }
      
      updateStep('step-save', 'completed');
    } catch (error) {
      updateStep('step-save', 'error');
      throw new Error(`Failed to save: ${error.message}`);
    }

    // Success!
    await saveAddedProperty({ name, address });

    showStatus('Property added to your shortlist!', 'success');
    elements.retryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Added!';
    elements.retryBtn.classList.add('btn-success');
    elements.retryBtn.classList.remove('btn-warning');

  } catch (error) {
    console.error('Error saving property:', error);
    showStatus(error.message, 'error');
    elements.retryBtn.disabled = false;
    elements.retryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/></svg> Retry';
  }
}
