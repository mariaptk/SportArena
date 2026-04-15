import { HotelManager } from './components/HotelManager.js';
import { MatchModal } from './components/MatchModal.js';
import { NewsModal } from './components/NewsModal.js';
import { Slider } from './components/Slider.js';
import { TableSorter } from './components/TableSorter.js';
import { Timer } from './components/Timer.js';
import { Voting } from './components/Voting.js';
import { SearchManager } from './components/SearchManager.js';

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
import { clearExpired, clearAllCache, getCacheStats } from './storage/localStorageCache.js';

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

  new SearchManager();

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
  const labels = ['Premier League', 'Champions League', 'La Liga', 'Bundesliga', 'Serie A', 'Results'];

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

  const competitions = ['PL', 'CL', 'PD', 'BL1', 'SA'];
  const statuses = ['LIVE', 'FINISHED', 'SCHEDULED'];

  try {
    const matchPromises = competitions.flatMap((comp) =>
      statuses.map((status) => safeGetMatches(comp, status, null))
    );

    const results = await Promise.allSettled(matchPromises);
    const matchMap = new Map();
    let hadError = false;

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.data) {
        result.value.data.forEach((match) => {
          const key = match.id ?? `${match.homeTeam}-${match.awayTeam}-${match.utcDate}`;
          if (!matchMap.has(key)) {
            matchMap.set(key, match);
          }
        });
      } else {
        hadError = true;
      }
    });

    const allMatches = Array.from(matchMap.values());

    allMatches.sort((a, b) => {
      const dateA = a.utcDate ? new Date(a.utcDate).getTime() : 0;
      const dateB = b.utcDate ? new Date(b.utcDate).getTime() : 0;
      return dateA - dateB;
    });

    if (allMatches.length > 0) {
      renderMatches(container, allMatches, false);
      showInAppNotification('All Matches Loaded', `Loaded ${allMatches.length} matches`, 'success');
    } else if (hadError) {
      showErrorBanner('Unable to load matches', false);
    }
  } catch (error) {
    console.error('[App] Error loading matches:', error);
    showErrorBanner('Failed to load matches', false);
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
  initExistingComponents();
  initFeaturesInfo();
  normalizeCompetitionButtons();
  initOfflineDetection();
  initCacheControls();

  await Promise.allSettled([
    loadMatchesSection(),
    loadStandingsSection(),
  ]);

  initNotifications();
});

/**
 * Global function to switch competitions
 * Called from inline onclick handlers in HTML
 */
window.switchCompetition = async (competition, status) => {
  const container = document.querySelector('[data-matches-list]');
  if (!container) return;

  showLoadingState(container);

  try {
    const targetStatus = status || 'SCHEDULED';

    if (status === 'FINISHED' || !competition) {
      const competitions = ['PL', 'CL', 'PD', 'BL1', 'SA'];
      const matchPromises = competitions.map((comp) => safeGetMatches(comp, 'FINISHED', null));
      const results = await Promise.allSettled(matchPromises);
      const allMatches = results
        .filter((result) => result.status === 'fulfilled' && result.value.data)
        .flatMap((result) => result.value.data);

      allMatches.sort((a, b) => {
        const dateA = a.utcDate ? new Date(a.utcDate).getTime() : 0;
        const dateB = b.utcDate ? new Date(b.utcDate).getTime() : 0;
        return dateB - dateA;
      });

      renderMatches(container, allMatches, false);
      showInAppNotification('Results Loaded', `Showing ${allMatches.length} finished matches`, 'info');
    } else {
      const { data } = await safeGetMatches(competition, targetStatus, null);
      if (data?.length) {
        renderMatches(container, data, false);
        showInAppNotification('Competition Switched', `Showing ${targetStatus} matches`, 'info');
      } else {
        showErrorBanner('No matches found for this competition', false);
      }
    }
  } catch (error) {
    console.error('[App] Error switching competition:', error);
    showErrorBanner('Failed to load competition', false);
  }
};


/**
 * Initialize features info panel
 */
function initFeaturesInfo() {
  const toggleBtn = document.getElementById('toggle-features');
  const featureDetails = document.getElementById('features-details');

  if (toggleBtn && featureDetails) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = featureDetails.style.display === 'none';
      featureDetails.style.display = isHidden ? 'block' : 'none';
      toggleBtn.textContent = isHidden ? 'Hide Details' : 'Show Details';
    });
  }
}
