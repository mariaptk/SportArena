import { API_CONFIG } from '../api/config.js';
import { fetchMatches } from '../api/sportsApi.js';
import { cacheGet, cacheSet } from '../storege/localStorageCache.js';
import { isNotified, markNotified } from '../storege/sessionStorageCache.js';
import { matchScoreKey } from '../utils/dataParser.js';

const SNAPSHOT_KEY = 'notifications:snapshot';
const SNAPSHOT_TTL = 5 * 60 * 1000;

let toastContainer = null;
let pollingTimer = null;
let currentCompetition = 'PL';
let currentStatus = 'LIVE';

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

export function showInAppNotification(title, body, type = 'info') {
  const container = ensureToastContainer();

  const colors = {
    info: { bg: 'rgba(5, 150, 105, 0.92)', border: '#059669' },
    success: { bg: 'rgba(5, 150, 105, 0.92)', border: '#34d399' },
    warning: { bg: 'rgba(220, 38, 38, 0.92)', border: '#dc2626' },
  };
  const { bg, border } = colors[type] ?? colors.info;

  const toast = document.createElement('div');
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

  setTimeout(() => removeToast(toast), 6000);
  console.log(`[Notification] In-app: "${title}"`);
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(40px)';
  setTimeout(() => toast.remove(), 300);
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[Notification] Browser notifications are not supported.');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  console.log(`[Notification] Permission: ${permission}`);
  return permission;
}

function showBrowserNotification(title, body, icon = '/images/logo.svg') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    new Notification(title, { body, icon });
  } catch (error) {
    console.warn('[Notification] Browser notification failed:', error);
  }
}

function detectChanges(newMatches, oldSnapshot) {
  if (!oldSnapshot || !Array.isArray(oldSnapshot)) return [];

  const oldMap = Object.fromEntries(oldSnapshot.map((match) => [match.id, match]));
  const changes = [];

  for (const match of newMatches) {
    const previous = oldMap[match.id];
    if (!previous) continue;

    const scoreChanged = match.homeScore !== previous.homeScore || match.awayScore !== previous.awayScore;
    const becameFinished = match.status === 'FINISHED' && previous.status !== 'FINISHED';

    if (scoreChanged || becameFinished) {
      changes.push({ match, reason: becameFinished ? 'FINISHED' : 'SCORE' });
    }
  }

  return changes;
}

export async function checkForNewResults() {
  try {
    const matches = await fetchMatches(currentCompetition, currentStatus);
    if (!matches?.length) return;

    const snapshotRecord = cacheGet(SNAPSHOT_KEY);
    const oldSnapshot = snapshotRecord?.data ?? null;

    cacheSet(SNAPSHOT_KEY, matches, SNAPSHOT_TTL);

    if (!oldSnapshot) {
      console.log('[Notification] First snapshot saved.');
      return;
    }

    const changes = detectChanges(matches, oldSnapshot);
    console.log(`[Notification] Changes detected: ${changes.length}`);

    for (const { match, reason } of changes) {
      const score = `${match.homeScore ?? '-'} : ${match.awayScore ?? '-'}`;
      const dedupKey = matchScoreKey(match);

      if (isNotified(match.id, dedupKey)) continue;
      markNotified(match.id, dedupKey);

      const title = reason === 'FINISHED'
        ? `Match finished: ${match.homeTeam} vs ${match.awayTeam}`
        : `Score update: ${match.homeTeam} vs ${match.awayTeam}`;
      const body = `Score: ${score} | ${match.competition}`;

      showInAppNotification(title, body, reason === 'FINISHED' ? 'success' : 'info');
      showBrowserNotification(title, body);
    }
  } catch (error) {
    console.warn('[Notification] Failed to check for results:', error.message);
  }
}

export function startPolling(competition = 'PL', status = 'LIVE') {
  currentCompetition = competition;
  currentStatus = status;

  stopPolling();

  const getInterval = () =>
    document.visibilityState === 'hidden'
      ? API_CONFIG.POLL_INTERVAL_HIDDEN
      : API_CONFIG.POLL_INTERVAL_ACTIVE;

  const schedule = () => {
    pollingTimer = setTimeout(async () => {
      await checkForNewResults();
      schedule();
    }, getInterval());
  };

  document.addEventListener('visibilitychange', () => {
    stopPolling();
    schedule();
  });

  schedule();
  
  // Show initial polling notification
  showInAppNotification(
    '🔔 Polling Started',
    `Watching ${currentCompetition} matches for updates every 90 seconds...`,
    'success'
  );
  
  console.log(`[Notification] ✅ Polling started for ${competition} ${status}`);
  console.log(`[Notification] 📡 Updates every ${API_CONFIG.POLL_INTERVAL_ACTIVE / 1000}s (active) / ${API_CONFIG.POLL_INTERVAL_HIDDEN / 1000}s (hidden)`);
}

export function stopPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

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
    <p style="margin-bottom:12px;font-weight:700;">Match Notifications</p>
    <p style="margin-bottom:12px;font-size:13px;opacity:0.9;">Would you like alerts when new scores come in?</p>
    <div style="display:flex;gap:8px;">
      <button id="sa-notif-allow" style="flex:1;padding:8px;border:none;border-radius:8px;background:#fff;color:#059669;font-weight:700;cursor:pointer;">Allow</button>
      <button id="sa-notif-deny" style="flex:1;padding:8px;border:1px solid rgba(255,255,255,0.4);border-radius:8px;background:transparent;color:#fff;cursor:pointer;">Not now</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('sa-notif-allow').addEventListener('click', async () => {
    banner.remove();
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      showInAppNotification(
        'Notifications Enabled',
        'You will now receive score updates.',
        'success'
      );
    }
  });

  document.getElementById('sa-notif-deny').addEventListener('click', () => {
    banner.remove();
  });
}
