/**
 * notificationService.js — уведомления о новых результатах матчей
 * In-app уведомления: всегда
 * Browser Notifications: только при разрешении пользователя
 * Polling: адаптивный по видимости вкладки
 */

import { API_CONFIG } from '../api/config.js';
import { fetchMatches } from '../api/sportsApi.js';
import { cacheGet, cacheSet } from '../storege/localStorageCache.js';
import { isNotified, markNotified } from '../storege/sessionStorageCache.js';
import { matchScoreKey } from '../utils/dataParser.js';

const SNAPSHOT_KEY = 'notifications:snapshot';
const SNAPSHOT_TTL = 5 * 60 * 1000; // 5 мин

// ─── In-app toast-контейнер ───────────────────────────────────────────────────

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.id = 'sa-toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
    max-width: 340px;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

/**
 * Показать in-app уведомление
 * @param {string} title
 * @param {string} body
 * @param {'info'|'success'|'warning'} type
 */
export function showInAppNotification(title, body, type = 'info') {
  const container = ensureToastContainer();

  const toast = document.createElement('div');
  const colors = {
    info:    { bg: 'rgba(5, 150, 105, 0.92)',  border: '#059669' },
    success: { bg: 'rgba(5, 150, 105, 0.92)',  border: '#34d399' },
    warning: { bg: 'rgba(220, 38, 38, 0.92)',  border: '#dc2626' },
  };
  const { bg, border } = colors[type] ?? colors.info;

  toast.style.cssText = `
    background: ${bg};
    border: 1px solid ${border};
    border-radius: 14px;
    padding: 14px 18px;
    color: #fff;
    font-family: 'Source Code Pro', monospace;
    font-size: 14px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    pointer-events: all;
    cursor: pointer;
    opacity: 0;
    transform: translateX(40px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    backdrop-filter: blur(10px);
  `;
  toast.innerHTML = `<strong style="display:block;margin-bottom:4px;font-size:15px;">${title}</strong>${body}`;
  toast.addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Автоудаление через 6 сек
  setTimeout(() => removeToast(toast), 6000);
  console.log(`[Notification] In-app: "${title}"`);
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(40px)';
  setTimeout(() => toast.remove(), 300);
}

// ─── Browser Notifications ────────────────────────────────────────────────────

/**
 * Запросить разрешение на уведомления
 * @returns {Promise<NotificationPermission>}
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[Notification] Browser Notifications не поддерживаются.');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const perm = await Notification.requestPermission();
  console.log(`[Notification] Разрешение: ${perm}`);
  return perm;
}

function showBrowserNotification(title, body, icon = '/images/logo.svg') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon });
  } catch (err) {
    console.warn('[Notification] Browser Notification не показан:', err);
  }
}

// ─── Сравнение снапшотов ──────────────────────────────────────────────────────

/**
 * Сравнивает текущие матчи с кэшированным снапшотом.
 * Возвращает массив "новых результатов"
 */
function detectChanges(newMatches, oldSnapshot) {
  if (!oldSnapshot || !Array.isArray(oldSnapshot)) return [];

  const oldMap = Object.fromEntries(oldSnapshot.map(m => [m.id, m]));
  const changes = [];

  for (const match of newMatches) {
    const old = oldMap[match.id];
    if (!old) continue;

    const scoreChanged =
      match.homeScore !== old.homeScore || match.awayScore !== old.awayScore;
    const becameFinished =
      match.status === 'FINISHED' && old.status !== 'FINISHED';

    if (scoreChanged || becameFinished) {
      changes.push({ match, reason: becameFinished ? 'FINISHED' : 'SCORE' });
    }
  }

  return changes;
}

// ─── Polling ──────────────────────────────────────────────────────────────────

let pollingTimer = null;
let currentCompetition = 'PL';
let currentStatus = 'LIVE';

/**
 * Проверить новые результаты и показать уведомления
 */
export async function checkForNewResults() {
  try {
    const { fetchMatches } = await import('../api/sportsApi.js');
    const matches = await fetchMatches(currentCompetition, currentStatus);

    if (!matches || matches.length === 0) return;

    // Загружаем старый снапшот
    const snapshotRecord = cacheGet(SNAPSHOT_KEY);
    const oldSnapshot = snapshotRecord?.data ?? null;

    // Сохраняем новый снапшот
    cacheSet(SNAPSHOT_KEY, matches, SNAPSHOT_TTL);

    if (!oldSnapshot) {
      console.log('[Notification] Первый снапшот сохранён.');
      return;
    }

    const changes = detectChanges(matches, oldSnapshot);
    console.log(`[Notification] Изменений обнаружено: ${changes.length}`);

    for (const { match, reason } of changes) {
      const scoreStr = `${match.homeScore ?? '-'} : ${match.awayScore ?? '-'}`;
      const dedupKey = matchScoreKey(match);

      // Дедупликация через sessionStorage
      if (isNotified(match.id, dedupKey)) continue;
      markNotified(match.id, dedupKey);

      const title = reason === 'FINISHED'
        ? `⚽ Матч завершён: ${match.homeTeam} vs ${match.awayTeam}`
        : `🔔 Новый счёт: ${match.homeTeam} vs ${match.awayTeam}`;
      const body = `Счёт: ${scoreStr} | ${match.competition}`;

      showInAppNotification(title, body, reason === 'FINISHED' ? 'success' : 'info');
      showBrowserNotification(title, body);
    }
  } catch (err) {
    console.warn('[Notification] Ошибка при проверке результатов:', err.message);
  }
}

/**
 * Запустить периодический polling
 * @param {string} competition  код лиги
 * @param {string} status       статус матчей
 */
export function startPolling(competition = 'PL', status = 'LIVE') {
  currentCompetition = competition;
  currentStatus = status;

  stopPolling(); // сбросить предыдущий

  const getInterval = () =>
    document.visibilityState === 'hidden'
      ? API_CONFIG.POLL_INTERVAL_HIDDEN
      : API_CONFIG.POLL_INTERVAL_ACTIVE;

  const schedule = () => {
    pollingTimer = setTimeout(async () => {
      await checkForNewResults();
      schedule(); // следующий цикл
    }, getInterval());
  };

  // Менять интервал при смене видимости вкладки
  document.addEventListener('visibilitychange', () => {
    stopPolling();
    schedule();
  });

  schedule();
  console.log('[Notification] Polling запущен.');
}

export function stopPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

// ─── Кнопка запроса разрешения (добавляется в UI) ────────────────────────────

/**
 * Добавить in-app баннер с предложением включить уведомления
 */
export function offerNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;

  const banner = document.createElement('div');
  banner.id = 'sa-notif-banner';
  banner.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 9000;
    background: rgba(5, 150, 105, 0.95);
    border: 1px solid #059669;
    border-radius: 14px;
    padding: 16px 20px;
    color: #fff;
    font-family: 'Source Code Pro', monospace;
    font-size: 14px;
    max-width: 300px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  `;
  banner.innerHTML = `
    <p style="margin-bottom:12px;font-weight:700;">🔔 Уведомления о результатах</p>
    <p style="margin-bottom:12px;font-size:13px;opacity:0.9;">Хотите получать уведомления о новых результатах матчей?</p>
    <div style="display:flex;gap:8px;">
      <button id="sa-notif-allow" style="flex:1;padding:8px;border:none;border-radius:8px;background:#fff;color:#059669;font-weight:700;cursor:pointer;">Да</button>
      <button id="sa-notif-deny"  style="flex:1;padding:8px;border:1px solid rgba(255,255,255,0.4);border-radius:8px;background:transparent;color:#fff;cursor:pointer;">Нет</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('sa-notif-allow').addEventListener('click', async () => {
    banner.remove();
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      showInAppNotification('✅ Уведомления включены', 'Вы будете получать уведомления о результатах матчей.', 'success');
    }
  });

  document.getElementById('sa-notif-deny').addEventListener('click', () => {
    banner.remove();
  });
}
