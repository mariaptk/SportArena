import { HotelManager } from './components/HotelManager.js';
import { MatchModal } from './components/MatchModal.js';
import { NewsModal } from './components/NewsModal.js';
import { Slider } from './components/Slider.js';
import { TableSorter } from './components/TableSorter.js';
import { Timer } from './components/Timer.js';
import { Voting } from './components/Voting.js';

import { API_CONFIG } from './api/config.js';
import { safeGetMatches, getStandings } from './services/matchSyncService.js';
import {
  showInAppNotification,
  offerNotificationPermission,
  startPolling,
} from './services/notificationService.js';
import {
  renderMatches,
  renderStandings,
  showLoadingState,
  showErrorBanner,
} from './utils/uiRenderer.js';
import { clearExpired, clearAllCache, getCacheStats } from './storege/localStorageCache.js';

function initExistingComponents() {
  new Timer('[data-target-date]').init();
  new Slider('[data-slider]').init();

  new Voting(
    '#voting-form',
    '#voting-result',
    '#voting-error',
    'sportarena:vote:player'
  ).init();

  new NewsModal({
    newsContainerSelector: '.news',
    modalSelector: '#news-modal',
    modalBodySelector: '#news-modal-body',
  }).init();

  new MatchModal({
    matchesContainerSelector: '[data-matches-list]',
    modalSelector: '#match-modal',
    modalBodySelector: '#match-modal-body',
  }).init();

  new TableSorter('#league-table').init();

  new HotelManager({
    hotelListSelector: '[data-hotel-list]',
    loadMoreButtonSelector: '[data-load-more-hotels]',
    modalSelector: '#booking-modal',
    formSelector: '#booking-form',
    hotelNameSelector: '#booking-hotel-name',
    hotelInputSelector: '#booking-hotel-input',
    nameInputSelector: '#booking-name',
    emailInputSelector: '#booking-email',
    nameErrorSelector: '#booking-name-error',
    emailErrorSelector: '#booking-email-error',
    successSelector: '#booking-success',
  }).init();
}

function normalizeCompetitionButtons() {
  const labels = ['Premier League', 'Champions League', 'Results'];

  document.querySelectorAll('.competition-switcher__button').forEach((button, index) => {
    button.textContent = labels[index] ?? button.textContent;
    button.type = 'button';
    button.removeAttribute('style');
  });

  const clearCacheButton = document.querySelector('[data-clear-cache]');
  if (clearCacheButton) {
    clearCacheButton.textContent = 'Clear Cache';
  }
}

async function loadMatchesSection() {
  const container = document.querySelector('[data-matches-list]');
  if (!container) return;

  showLoadingState(container);

  const competition = container.dataset.competition ?? API_CONFIG.COMPETITIONS.PL;
  const status = container.dataset.status ?? 'SCHEDULED';

  const onUpdate = (freshData) => {
    renderMatches(container, freshData, false);
    showInAppNotification(
      'Matches Updated',
      `Fresh ${competition} fixtures are now available.`,
      'info'
    );
  };

  const { data, error, fromCache } = await safeGetMatches(competition, status, onUpdate);

  if (error) {
    showErrorBanner(error, fromCache);
  }

  if (data) {
    renderMatches(container, data, fromCache);
    if (fromCache) {
      showInAppNotification(
        'Cached Data',
        'The API is temporarily unavailable, so saved data is being shown.',
        'warning'
      );
    }
  }
}

async function loadStandingsSection() {
  const container = document.querySelector('[data-standings-container]');
  if (!container) return;

  const competition = container.dataset.competition ?? API_CONFIG.COMPETITIONS.PL;

  const mountStandings = (data) => {
    renderStandings(container, data);
    if (Array.isArray(data) && data.length) {
      new TableSorter('#league-table').init();
    }
  };

  try {
    const standings = await getStandings(competition, mountStandings);
    mountStandings(standings);
  } catch (error) {
    console.error('[App] Standings error:', error.message);
    container.innerHTML = `
      <p style="color:#fca5a5;padding:16px;font-family:'Source Code Pro',monospace;">
        ${error.message}
      </p>
    `;
  }
}

function initCacheControls() {
  const clearBtn = document.querySelector('[data-clear-cache]');
  if (!clearBtn) return;

  clearBtn.addEventListener('click', () => {
    const count = clearAllCache();
    showInAppNotification(
      'Cache Cleared',
      `${count} cached entries were removed. Refresh the page to reload data.`,
      'warning'
    );
  });

  clearExpired();

  const stats = getCacheStats();
  if (stats.length) {
    console.group('[Cache] Cache statistics:');
    console.table(stats);
    console.groupEnd();
  }
}

function initNotifications() {
  setTimeout(offerNotificationPermission, 2000);
  startPolling(API_CONFIG.COMPETITIONS.PL, 'LIVE');
}

function initOfflineDetection() {
  const showOffline = () => showErrorBanner('No internet connection. Cached data is being shown.', true);
  const hideOffline = () => {
    const banner = document.getElementById('sa-error-banner');
    if (banner) banner.style.display = 'none';

    showInAppNotification('Connection Restored', 'Data will refresh automatically.', 'success');
  };

  window.addEventListener('offline', showOffline);
  window.addEventListener('online', hideOffline);

  if (!navigator.onLine) showOffline();
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SportArena] Initializing...');

  initExistingComponents();
  normalizeCompetitionButtons();
  initOfflineDetection();
  initCacheControls();

  await Promise.allSettled([
    loadMatchesSection(),
    loadStandingsSection(),
  ]);

  initNotifications();

  console.log('[SportArena] Initialization finished.');
});
