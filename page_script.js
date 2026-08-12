/**
 * Spotifiee - Main Page World Engine (world: "MAIN") - v1.7.0
 * Zero-latency ad bypass with direct media lifecycle event listeners, 16x acceleration, and React Fiber skipping.
 */

(function () {
  'use strict';

  const activeMediaElements = new Set();
  let isAdActive = false;
  let cachedVolume = 1.0;
  let lastSkipTime = 0;
  let config = {
    autoMute: true,
    autoSkip: true
  };

  /**
   * Fast-action intercept on any media element
   */
  function handleMediaElement(media) {
    activeMediaElements.add(media);
    if (isAdPlaying()) {
      if (config.autoMute) {
        if (!media.muted && media.volume > 0) cachedVolume = media.volume;
        media.muted = true;
        media.volume = 0;
      }
      if (config.autoSkip) {
        try { media.playbackRate = 16.0; } catch (e) {}
        try {
          if (media.duration && isFinite(media.duration)) {
            media.currentTime = media.duration;
          } else {
            media.currentTime = 999999;
          }
          media.dispatchEvent(new Event('ended', { bubbles: true }));
        } catch (e) {}
      }
    }
  }

  // 1. Hook HTMLMediaElement prototype
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    handleMediaElement(this);
    return origPlay.apply(this, arguments);
  };

  // 2. Hook document.createElement
  const origCreateElement = document.createElement;
  document.createElement = function (tagName) {
    const el = origCreateElement.apply(this, arguments);
    if (typeof tagName === 'string') {
      const lower = tagName.toLowerCase();
      if (lower === 'audio' || lower === 'video') {
        activeMediaElements.add(el);
        el.addEventListener('loadedmetadata', () => handleMediaElement(el));
        el.addEventListener('play', () => handleMediaElement(el));
      }
    }
    return el;
  };

  // 3. Hook window.Audio
  if (window.Audio) {
    const OrigAudio = window.Audio;
    window.Audio = function () {
      const audio = new OrigAudio(...arguments);
      activeMediaElements.add(audio);
      audio.addEventListener('loadedmetadata', () => handleMediaElement(audio));
      audio.addEventListener('play', () => handleMediaElement(audio));
      return audio;
    };
    window.Audio.prototype = OrigAudio.prototype;
  }

  // Settings sync listener
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SPOTIFIEE_CONFIG_UPDATE') {
      config = { ...config, ...event.data.config };
    }
  });

  function getAllMedia() {
    document.querySelectorAll('audio, video').forEach((el) => activeMediaElements.add(el));
    return Array.from(activeMediaElements);
  }

  /**
   * Precision Ad Detection (Zero False Positives)
   */
  function isAdPlaying() {
    const docTitle = (document.title || '').trim().toLowerCase();

    // 1. Document Title
    const isDocAd = (
      docTitle === 'advertisement' ||
      docTitle.startsWith('advertisement •') ||
      docTitle.startsWith('iklan •') ||
      docTitle === 'spotify - advertisement' ||
      docTitle.startsWith('spotify - advertisement')
    );

    // 2. MediaSession
    let isMediaSessionAd = false;
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const msTitle = (navigator.mediaSession.metadata.title || '').trim().toLowerCase();
      const msAlbum = (navigator.mediaSession.metadata.album || '').trim().toLowerCase();
      if (msTitle === 'advertisement' || msTitle === 'iklan' || msAlbum === 'advertisement') {
        isMediaSessionAd = true;
      }
    }

    // 3. Now Playing Widget
    const widget = document.querySelector('[data-testid="now-playing-widget"]');
    let isWidgetAd = false;
    let hasRealArtist = false;

    if (widget) {
      const titleEl = widget.querySelector('[data-testid="context-item-info-title"], [data-testid="context-item-link"]');
      const titleText = (titleEl ? titleEl.textContent : '').trim().toLowerCase();

      if (
        titleText === 'advertisement' ||
        titleText === 'iklan' ||
        titleText === 'publicité' ||
        titleText === 'werbung' ||
        titleText === 'anuncio'
      ) {
        isWidgetAd = true;
      }

      if (widget.querySelector('[data-testid="track-info-advertiser"], [data-testid="ad-link"], a[href*="spotify:ad:"]')) {
        isWidgetAd = true;
      }

      if (widget.querySelector('[aria-label*="Advertisement" i], [aria-label*="Iklan" i]')) {
        isWidgetAd = true;
      }

      const artistLink = widget.querySelector('a[href*="/artist/"], [data-testid="context-item-info-artist"] a');
      if (artistLink && !isWidgetAd && !isDocAd && !isMediaSessionAd) {
        hasRealArtist = true;
      }
    }

    if (hasRealArtist) {
      return false;
    }

    return isDocAd || isMediaSessionAd || isWidgetAd;
  }

  /**
   * Click Progress Bar End to trigger React onSeek(1.0)
   */
  function clickProgressBarEnd() {
    const progressBar = document.querySelector('[data-testid="playback-progressbar"], .playback-progressbar');
    if (progressBar) {
      const rect = progressBar.getBoundingClientRect();
      if (rect.width > 0) {
        const x = rect.right - 2;
        const y = rect.top + rect.height / 2;
        const opts = { clientX: x, clientY: y, bubbles: true, cancelable: true, view: window };
        progressBar.dispatchEvent(new MouseEvent('mousedown', opts));
        progressBar.dispatchEvent(new MouseEvent('mouseup', opts));
        progressBar.dispatchEvent(new MouseEvent('click', opts));
      }
    }
  }

  /**
   * React Fiber Player Skip Trigger
   */
  function triggerReactSkip() {
    const widget = document.querySelector('[data-testid="now-playing-widget"], .now-playing-bar');
    if (!widget) return;

    const fiberKey = Object.keys(widget).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (fiberKey) {
      let fiber = widget[fiberKey];
      let depth = 0;
      while (fiber && depth < 30) {
        depth++;
        if (fiber.memoizedProps) {
          const p = fiber.memoizedProps;
          if (typeof p.onSkipToNext === 'function') {
            try { p.onSkipToNext(); return; } catch (e) {}
          }
          if (typeof p.skipToNext === 'function') {
            try { p.skipToNext(); return; } catch (e) {}
          }
          if (typeof p.onNext === 'function') {
            try { p.onNext(); return; } catch (e) {}
          }
        }
        fiber = fiber.return;
      }
    }
  }

  /**
   * Instant Zero-Latency Action on Ad
   */
  function handleAd() {
    const mediaList = getAllMedia();
    const now = Date.now();

    document.documentElement.classList.add('spotifiee-ad-active');

    mediaList.forEach((media) => {
      // 1. Mute
      if (config.autoMute) {
        if (!media.muted && media.volume > 0) {
          cachedVolume = media.volume;
        }
        media.muted = true;
        media.volume = 0;
      }

      // 2. Speed up & seek end
      if (config.autoSkip) {
        try {
          if (media.playbackRate !== 16.0) {
            media.playbackRate = 16.0;
          }
        } catch (e) {}

        try {
          if (media.duration && isFinite(media.duration) && !isNaN(media.duration)) {
            if (media.currentTime < media.duration - 0.02) {
              media.currentTime = media.duration;
            }
          } else {
            media.currentTime = 999999;
          }
          media.dispatchEvent(new Event('ended', { bubbles: true }));
        } catch (e) {}
      }
    });

    // 3. UI and React Skip (throttled every 100ms)
    if (config.autoSkip && now - lastSkipTime > 100) {
      lastSkipTime = now;
      clickProgressBarEnd();
      triggerReactSkip();

      const nextBtn = document.querySelector(
        '[data-testid="control-button-skip-forward"], button[aria-label*="Next" i], button[aria-label*="Lewati" i]'
      );
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
      }
    }
  }

  /**
   * Action when normal song resumes
   */
  function handleNormal() {
    document.documentElement.classList.remove('spotifiee-ad-active');
    const mediaList = getAllMedia();
    mediaList.forEach((media) => {
      try {
        if (media.playbackRate !== 1.0) {
          media.playbackRate = 1.0;
        }
      } catch (e) {}
      media.muted = false;
      media.volume = cachedVolume || 1.0;
    });
  }

  /**
   * High-Precision Fast Loop (25ms = 40 checks/sec)
   */
  function loop() {
    const adPlaying = isAdPlaying();

    if (adPlaying) {
      if (!isAdActive) {
        isAdActive = true;
        console.log('[Spotifiee MainWorld] ⚡ Instant Ad Bypass Triggered...');
        window.postMessage({ type: 'SPOTIFIEE_STATUS_CHANGE', isAd: true }, '*');
      }
      handleAd();
    } else {
      if (isAdActive) {
        isAdActive = false;
        console.log('[Spotifiee MainWorld] 🎵 Music Resumed Smoothly.');
        handleNormal();
        window.postMessage({ type: 'SPOTIFIEE_STATUS_CHANGE', isAd: false }, '*');
      }
    }
  }

  setInterval(loop, 25);
  console.log('[Spotifiee MainWorld v1.7.0] 🚀 Ultra-fast 25ms engine active.');
})();
