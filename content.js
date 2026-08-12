/**
 * Spotifiee - Extension Content Script (world: "ISOLATED")
 * Manages UI toast, storage sync, and communicates with page_script.js (world: "MAIN").
 */

(function () {
  'use strict';

  let config = {
    autoMute: true,
    autoSkip: true,
    blockBanners: true,
    showToast: true
  };

  let toastElement = null;
  let isAdCurrently = false;

  // Send config to page script in MAIN world
  function syncConfig() {
    window.postMessage({
      type: 'SPOTIFIEE_CONFIG_UPDATE',
      config: {
        autoMute: config.autoMute,
        autoSkip: config.autoSkip
      }
    }, '*');
  }

  // Load settings from storage
  chrome.storage.local.get(['autoMute', 'autoSkip', 'blockBanners', 'showToast'], (stored) => {
    config = { ...config, ...stored };
    if (config.blockBanners) {
      document.documentElement.classList.add('spotifiee-hide-banners');
    }
    syncConfig();
  });

  // Settings change listener
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      for (const [key, change] of Object.entries(changes)) {
        if (key in config) {
          config[key] = change.newValue;
        }
      }
      if (changes.blockBanners) {
        if (changes.blockBanners.newValue) {
          document.documentElement.classList.add('spotifiee-hide-banners');
        } else {
          document.documentElement.classList.remove('spotifiee-hide-banners');
        }
      }
      syncConfig();
    }
  });

  /**
   * Update Floating In-Player Toast
   */
  function updateToast(show) {
    if (!config.showToast) {
      if (toastElement) toastElement.style.display = 'none';
      return;
    }

    if (!toastElement) {
      toastElement = document.createElement('div');
      toastElement.id = 'spotifiee-status-badge';
      toastElement.innerHTML = `
        <div class="spotifiee-badge-inner active">
          <span class="spotifiee-icon">⚡</span>
          <div class="spotifiee-text">
            <strong>Spotifiee Active</strong>
            <span>Ad Skipped & Muted</span>
          </div>
          <span class="spotifiee-pulse"></span>
        </div>
      `;
      document.documentElement.appendChild(toastElement);
    }

    if (show) {
      toastElement.style.display = 'block';
      toastElement.classList.add('visible');
    } else {
      toastElement.classList.remove('visible');
      setTimeout(() => {
        if (!isAdCurrently && toastElement) {
          toastElement.style.display = 'none';
        }
      }, 300);
    }
  }

  // Listen for messages from page_script.js (world: "MAIN")
  window.addEventListener('message', (event) => {
    if (!event.data) return;

    if (event.data.type === 'SPOTIFIEE_STATUS_CHANGE') {
      isAdCurrently = event.data.isAd;
      if (isAdCurrently) {
        updateToast(true);
        try {
          chrome.runtime.sendMessage({ type: 'AD_BLOCKED', duration: 30 });
        } catch (e) {}
      } else {
        updateToast(false);
      }
    }
  });

  // Re-sync config periodically after initial page load
  setTimeout(syncConfig, 300);
  setTimeout(syncConfig, 1000);
  setTimeout(syncConfig, 2500);

  console.log('[Spotifiee ContentScript] 🚀 UI & Storage controller active.');
})();
