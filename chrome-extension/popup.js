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

// Fetch available tags from server
async function fetchTags() {
  const appUrl = elements.appUrlInput.value.replace(/\/$/, '');
  const apiUrl = appUrl.replace(':5173', ':3001').replace(':5174', ':3001');

  try {
    const response = await fetch(`${apiUrl}/api/tags`);
    if (response.ok) {
      availableTags = await response.json();
      renderTags();
    }
  } catch (e) {
    console.log('Could not fetch tags from server');
  }
}

// Render tags in the UI
function renderTags() {
  if (availableTags.length === 0) {
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

// Update step status
function updateStep(stepId, status) {
  const step = document.getElementById(stepId);
  const iconEl = step.querySelector('.step-icon');

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

// Open app
function openApp() {
  chrome.tabs.create({ url: elements.appUrlInput.value });
}

// Main add property handler
async function handleAddProperty() {
  const appUrl = elements.appUrlInput.value.replace(/\/$/, '');
  const apiUrl = appUrl.replace(':5173', ':3001').replace(':5174', ':3001');

  // Disable button and show progress
  elements.addBtn.disabled = true;
  elements.addBtn.innerHTML = '<div class="spinner"></div> Processing...';
  elements.progressSteps.classList.remove('hidden');
  elements.propertyPreview.classList.add('hidden');
  hideStatus();

  let propertyData = {
    name: pageData?.title || currentTab.title || 'Property',
    address: pageData?.address || '',
    thumbnail: pageData?.thumbnail || '',
    price: '',
    isBTR: false,
  };

  try {
    // Step 1: Fetch property details
    updateStep('step-fetch', 'active');

    const fetchResponse = await fetch(`${apiUrl}/api/fetch-property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentTab.url }),
    });

    if (fetchResponse.ok) {
      const fetchedData = await fetchResponse.json();
      propertyData = { ...propertyData, ...fetchedData };
      updateStep('step-fetch', 'completed');
    } else {
      updateStep('step-fetch', 'error');
      throw new Error('Could not fetch property details');
    }

    // Step 2: Parse with AI (already done in fetch-property)
    updateStep('step-parse', 'active');
    await new Promise(r => setTimeout(r, 300)); // Brief pause for UX
    updateStep('step-parse', 'completed');

    // Step 3: Geocode
    updateStep('step-geocode', 'active');

    if (!propertyData.address) {
      updateStep('step-geocode', 'error');
      throw new Error('No address found - manual entry required');
    }

    const geocodeResponse = await fetch(`${apiUrl}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: propertyData.address }),
    });

    if (!geocodeResponse.ok) {
      updateStep('step-geocode', 'error');
      throw new Error('Could not find location');
    }

    const coordinates = await geocodeResponse.json();
    updateStep('step-geocode', 'completed');

    // Step 4: Save to shortlist
    updateStep('step-save', 'active');

    const saveResponse = await fetch(`${apiUrl}/api/add-property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentTab.url,
        title: propertyData.name,
        address: propertyData.address,
        thumbnail: propertyData.thumbnail,
        price: propertyData.price,
        coordinates,
        isBTR: propertyData.isBTR || false,
        tags: selectedTagIds,
      }),
    });

    if (!saveResponse.ok) {
      updateStep('step-save', 'error');
      throw new Error('Failed to save property');
    }

    updateStep('step-save', 'completed');

    // Success!
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
  showStatus(errorMessage + '. Please enter details manually.', 'warning');

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
  const apiUrl = appUrl.replace(':5173', ':3001').replace(':5174', ':3001');

  elements.retryBtn.disabled = true;
  elements.retryBtn.innerHTML = '<div class="spinner"></div> Saving...';

  try {
    // Try to geocode the manual address
    updateStep('step-geocode', 'active');

    const geocodeResponse = await fetch(`${apiUrl}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    let coordinates = null;
    if (geocodeResponse.ok) {
      coordinates = await geocodeResponse.json();
      updateStep('step-geocode', 'completed');
    } else {
      updateStep('step-geocode', 'error');
      showStatus('Could not find location for this address', 'error');
      elements.retryBtn.disabled = false;
      elements.retryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/></svg> Retry with Manual Details';
      return;
    }

    // Save to shortlist
    updateStep('step-save', 'active');

    const saveResponse = await fetch(`${apiUrl}/api/add-property`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentTab.url,
        title: name,
        address,
        thumbnail: pageData?.thumbnail || '',
        price,
        coordinates,
        isBTR: false, // Manual entry defaults to non-BTR, can be changed in main app
        tags: selectedTagIds,
      }),
    });

    if (!saveResponse.ok) {
      throw new Error('Failed to save property');
    }

    updateStep('step-save', 'completed');

    // Success!
    await saveAddedProperty({ name, address });

    showStatus('Property added to your shortlist!', 'success');
    elements.retryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Added!';
    elements.retryBtn.classList.add('btn-success');
    elements.retryBtn.classList.remove('btn-warning');

  } catch (error) {
    console.error('Error saving property:', error);
    showStatus('Failed to save: ' + error.message, 'error');
    elements.retryBtn.disabled = false;
    elements.retryBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/></svg> Retry with Manual Details';
  }
}
