/**
 * Spotifiee - Background Service Worker
 * Handles extension lifecycle, default settings initialization, and stats synchronization.
 */

const DEFAULT_SETTINGS = {
  autoMute: true,
  autoSkip: true,
  blockBanners: true,
  showToast: true,
  adsBlockedCount: 0,
  timeSavedSeconds: 0
};

// Initialize settings on install or update
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (stored) => {
    const toSet = {};
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (stored[key] === undefined) {
        toSet[key] = value;
      }
    }
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });

  if (details.reason === 'install') {
    console.log('[Spotifiee] Installed successfully.');
  }
});

// Handle messages from content script & popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AD_BLOCKED') {
    const estimatedDuration = message.duration || 30;
    chrome.storage.local.get(['adsBlockedCount', 'timeSavedSeconds'], (data) => {
      const newCount = (data.adsBlockedCount || 0) + 1;
      const newTimeSaved = (data.timeSavedSeconds || 0) + estimatedDuration;
      chrome.storage.local.set({
        adsBlockedCount: newCount,
        timeSavedSeconds: newTimeSaved
      });
      sendResponse({ status: 'ok', adsBlockedCount: newCount, timeSavedSeconds: newTimeSaved });
    });
    return true;
  }

  if (message.type === 'RESET_STATS') {
    chrome.storage.local.set({
      adsBlockedCount: 0,
      timeSavedSeconds: 0
    }, () => {
      sendResponse({ status: 'reset_ok' });
    });
    return true;
  }
});
