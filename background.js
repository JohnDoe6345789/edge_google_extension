// Minimal service worker for the extension.
// Most of the logic is in declarativeNetRequest rules (rules.json).

chrome.runtime.onInstalled.addListener((details) => {
  console.log("Fix Edge Search to Google installed/updated:", details.reason);
});
