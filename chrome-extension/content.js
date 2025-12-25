// Content script - extracts page text for AI processing
// This bypasses anti-scraping measures by extracting directly from the DOM

function extractPageData() {
  return {
    url: window.location.href,
    // Get all visible text from the page for AI parsing
    pageText: document.body.innerText || '',
    // Get og:image for thumbnail (optional, AI can override)
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageData') {
    const data = extractPageData();
    sendResponse(data);
  }
  return true;
});
