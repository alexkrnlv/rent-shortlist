// Simple content script - extract basic property data for preview
// The main app handles all AI processing

function extractPropertyData() {
  const data = {
    url: window.location.href,
    title: '',
    thumbnail: '',
  };

  // Get title from meta tags or page title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    data.title = ogTitle.getAttribute('content');
  } else {
    data.title = document.title;
  }

  // Get thumbnail from og:image
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    data.thumbnail = ogImage.getAttribute('content');
  }

  return data;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    const data = extractPropertyData();
    sendResponse(data);
  }
  return true;
});
