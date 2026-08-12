/**
 * Spotifiee - Popup Logic
 * Handles dashboard data bindings, setting toggles, tab detection, and stats management.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const adsCountEl = document.getElementById('ads-count');
  const timeSavedEl = document.getElementById('time-saved');

  const toggleSkip = document.getElementById('toggle-skip');
  const toggleMute = document.getElementById('toggle-mute');
  const toggleBanners = document.getElementById('toggle-banners');
  const toggleToast = document.getElementById('toggle-toast');

  const openSpotifyBtn = document.getElementById('open-spotify-btn');
  const resetStatsBtn = document.getElementById('reset-stats-btn');

  /**
   * Format seconds to human-readable string (e.g. 45s, 4.2m, 1.5h)
   */
  function formatTimeSaved(seconds) {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes.toFixed(1)}m`;
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  }

  /**
   * Load and render statistics & toggles from storage
   */
  function loadState() {
    chrome.storage.local.get(
      ['autoSkip', 'autoMute', 'blockBanners', 'showToast', 'adsBlockedCount', 'timeSavedSeconds'],
      (data) => {
        // Toggles (default to true if undefined)
        toggleSkip.checked = data.autoSkip !== false;
        toggleMute.checked = data.autoMute !== false;
        toggleBanners.checked = data.blockBanners !== false;
        toggleToast.checked = data.showToast !== false;

        // Stats
        adsCountEl.textContent = data.adsBlockedCount || 0;
        timeSavedEl.textContent = formatTimeSaved(data.timeSavedSeconds || 0);
      }
    );
  }

  /**
   * Check if user is currently on open.spotify.com
   */
  function checkSpotifyTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes('open.spotify.com')) {
        statusPill.className = 'status-pill status-active';
        statusText.textContent = 'Spotify Active';
      } else {
        // Check if Spotify is open in any other tab
        chrome.tabs.query({ url: '*://open.spotify.com/*' }, (spotifyTabs) => {
          if (spotifyTabs && spotifyTabs.length > 0) {
            statusPill.className = 'status-pill status-active';
            statusText.textContent = 'Active (Background)';
          } else {
            statusPill.className = 'status-pill status-ready';
            statusText.textContent = 'Standby';
          }
        });
      }
    });
  }

  // Toggle Handlers
  toggleSkip.addEventListener('change', () => {
    chrome.storage.local.set({ autoSkip: toggleSkip.checked });
  });

  toggleMute.addEventListener('change', () => {
    chrome.storage.local.set({ autoMute: toggleMute.checked });
  });

  toggleBanners.addEventListener('change', () => {
    chrome.storage.local.set({ blockBanners: toggleBanners.checked });
  });

  toggleToast.addEventListener('change', () => {
    chrome.storage.local.set({ showToast: toggleToast.checked });
  });

  // Open / Switch to Spotify Web Player
  openSpotifyBtn.addEventListener('click', () => {
    chrome.tabs.query({ url: '*://open.spotify.com/*' }, (tabs) => {
      if (tabs && tabs.length > 0) {
        // Focus existing tab
        chrome.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) {
          chrome.windows.update(tabs[0].windowId, { focused: true });
        }
      } else {
        // Open new tab
        chrome.tabs.create({ url: 'https://open.spotify.com/' });
      }
      window.close();
    });
  });

  // Reset Statistics
  resetStatsBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESET_STATS' }, () => {
      adsCountEl.textContent = '0';
      timeSavedEl.textContent = '0s';
    });
  });

  // Live update if stats change while popup is open
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.adsBlockedCount) {
        adsCountEl.textContent = changes.adsBlockedCount.newValue || 0;
      }
      if (changes.timeSavedSeconds) {
        timeSavedEl.textContent = formatTimeSaved(changes.timeSavedSeconds.newValue || 0);
      }
    }
  });

  // Initialize
  loadState();
  checkSpotifyTab();
});
