/**
 * sessionStorage.js — хранилище на основе sessionStorage
 * Используется для: deduplication уведомлений, состояния сессии
 */

const PREFIX = 'sportarena_session:';

export function sessionSet(key, value) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch (err) {
    console.warn('[Session] Ошибка записи:', err);
  }
}

export function sessionGet(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw).value;
  } catch {
    return null;
  }
}

export function sessionDelete(key) {
  sessionStorage.removeItem(PREFIX + key);
}

/**
 * Проверить, было ли уже показано уведомление для матча с данным счётом
 * Ключ: notified:{matchId}:{score}
 */
export function isNotified(matchId, score) {
  return sessionGet(`notified:${matchId}:${score}`) === true;
}

export function markNotified(matchId, score) {
  sessionSet(`notified:${matchId}:${score}`, true);
}
