/**
 * script.js — точка входа SportArena
 * Подключает все модули и инициализирует страницу
 */

// ─── Компоненты (существующие) ────────────────────────────────────────────────
import { HotelManager }  from './components/HotelManager.js';
import { NewsModal }     from './components/NewsModal.js';
import { Slider }        from './components/Slider.js';
import { TableSorter }   from './components/TableSorter.js';
import { Timer }         from './components/Timer.js';
import { Voting }        from './components/Voting.js';

// ─── Новые API-модули ─────────────────────────────────────────────────────────
import { API_CONFIG }    from './api/config.js';
import { safeGetMatches, getStandings, getRecentResults } from './services/matchSyncService.js';
import {
  showInAppNotification,
  offerNotificationPermission,
  startPolling,
} from './services/notificationService.js';
import {
  renderMatches,
  renderStandings,
  renderRecentResults,
  renderLastUpdated,
  showLoadingState,
  showErrorBanner,
} from './utils/uiRenderer.js';
import { clearExpired, clearAllCache, getCacheStats } from './storege/localStorageCache.js';

// ─── Инициализация существующих компонентов ───────────────────────────────────

function initExistingComponents() {
  // Таймеры обратного отсчёта
  const timer = new Timer('[data-target-date]');
  timer.init();

  // Слайдер изображений
  const slider = new Slider('[data-slider]');
  slider.init();

  // Голосование
  const voting = new Voting(
    '#voting-form',
    '#voting-result',
    '#voting-error',
    'sportarena:vote:player'
  );
  voting.init();

  // Модальное окно новостей
  const newsModal = new NewsModal({
    newsContainerSelector: '.news',
    modalSelector:         '#news-modal',
    modalBodySelector:     '#news-modal-body',
  });
  newsModal.init();

  // Сортировщик таблицы (статической, если API не загрузил)
  const tableSorter = new TableSorter('#standings-table');
  tableSorter.init();

  // Менеджер отелей (на hotels.html)
  const hotelManager = new HotelManager({
    hotelListSelector:     '[data-hotel-list]',
    loadMoreButtonSelector: '[data-load-more-hotels]',
    modalSelector:         '#booking-modal',
    formSelector:          '#booking-form',
    hotelNameSelector:     '#booking-hotel-name',
    hotelInputSelector:    '#booking-hotel-input',
    nameInputSelector:     '#booking-name',
    emailInputSelector:    '#booking-email',
    nameErrorSelector:     '#booking-name-error',
    emailErrorSelector:    '#booking-email-error',
    successSelector:       '#booking-success',
  });
  hotelManager.init();
}

// ─── Загрузка данных из API ───────────────────────────────────────────────────

async function loadMatchesSection() {
  const container = document.querySelector('[data-matches-list]');
  if (!container) return;

  showLoadingState(container);

  const competition = container.dataset.competition ?? API_CONFIG.COMPETITIONS.PL;
  const status      = container.dataset.status      ?? 'SCHEDULED';

  // onUpdate = вызывается при фоновом обновлении кэша
  const onUpdate = (freshData) => {
    renderMatches(container, freshData, false);
    showInAppNotification(
      '🔄 Данные обновлены',
      `Загружены свежие матчи (${competition})`,
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
      showInAppNotification('📦 Данные из кэша', 'API временно недоступен. Показаны сохранённые данные.', 'warning');
    }
  }
}

async function loadStandingsSection() {
  const container = document.querySelector('[data-standings-container]');
  if (!container) return;

  const competition = container.dataset.competition ?? API_CONFIG.COMPETITIONS.PL;

  const onUpdate = (freshData) => {
    renderStandings(container, freshData);
  };

  try {
    const standings = await getStandings(competition, onUpdate);
    renderStandings(container, standings);
  } catch (err) {
    console.error('[App] Ошибка таблицы:', err.message);
    container.innerHTML = `<p style="color:#fca5a5;padding:16px;font-family:'Source Code Pro',monospace;">⚠️ ${err.message}</p>`;
  }
}

async function loadRecentResults() {
  const container = document.querySelector('[data-recent-results]');
  if (!container) return;

  showLoadingState(container);

  const onUpdate = (freshData) => {
    renderRecentResults(container, freshData);
    renderLastUpdated(container, Date.now());
  };

  try {
    const results = await getRecentResults(onUpdate);
    renderRecentResults(container, results);
    renderLastUpdated(container, Date.now());
  } catch (err) {
    console.error('[App] Ошибка последних результатов:', err.message);
    container.innerHTML = `<p style="color:#fca5a5;padding:16px;font-family:'Source Code Pro',monospace;">⚠️ ${err.message}</p>`;
  }
}

// ─── Кнопка ручной очистки кэша (dev-helper) ─────────────────────────────────

function initCacheControls() {
  const clearBtn = document.querySelector('[data-clear-cache]');
  if (!clearBtn) return;

  clearBtn.addEventListener('click', () => {
    const count = clearAllCache();
    showInAppNotification('🗑 Кэш очищен', `Удалено ${count} записей. Обновите страницу.`, 'warning');
  });

  // Очищаем протухшие при старте
  clearExpired();

  // Выводим статистику кэша в консоль для скриншота отчёта
  const stats = getCacheStats();
  if (stats.length) {
    console.group('[Cache] Статистика кэша:');
    console.table(stats);
    console.groupEnd();
  }
}

// ─── Инициализация уведомлений ────────────────────────────────────────────────

function initNotifications() {
  // Показываем баннер предложения через 2 сек после загрузки
  setTimeout(offerNotificationPermission, 2000);

  // Запускаем polling новых результатов
  startPolling(API_CONFIG.COMPETITIONS.PL, 'LIVE');
}

// ─── Offline-индикатор ────────────────────────────────────────────────────────

function initOfflineDetection() {
  const showOffline = () => showErrorBanner('Нет подключения к интернету. Показаны кэшированные данные.', true);
  const hideOffline = () => {
    const banner = document.getElementById('sa-error-banner');
    if (banner) banner.style.display = 'none';
    showInAppNotification('✅ Соединение восстановлено', 'Данные будут обновлены автоматически.', 'success');
  };

  window.addEventListener('offline', showOffline);
  window.addEventListener('online',  hideOffline);

  if (!navigator.onLine) showOffline();
}

// ─── Точка входа ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[SportArena] Инициализация...');

  // 1. Существующие компоненты
  initExistingComponents();

  // 2. Offline-детектор
  initOfflineDetection();

  // 3. Кэш-контролы и очистка
  initCacheControls();

  // 4. Данные из API (параллельно)
  await Promise.allSettled([
    loadMatchesSection(),
    loadStandingsSection(),
    loadRecentResults(),
  ]);

  // 5. Уведомления (после загрузки данных)
  initNotifications();

  console.log('[SportArena] ✓ Инициализация завершена');
});
