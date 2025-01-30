document.addEventListener('DOMContentLoaded', async () => {
  // Get the active tab immediately
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  if (tab.url.includes('chess.com')) {
    // Immediately send message to content script without showing popup
    chrome.tabs.sendMessage(tab.id, {action: "togglePopup"});
    // Close popup window immediately
    window.close();
  }
  // If not on chess.com, the default popup will show automatically
});