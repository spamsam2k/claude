/**
 * Background service worker for the extension
 */

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Zillow Agent Scraper extension installed');
});

// Optional: Listen for any extension events
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle any messages that need background processing
    if (request.action === 'getStoredData') {
        chrome.storage.local.get(null, (data) => {
            sendResponse(data);
        });
        return true;
    }
});
