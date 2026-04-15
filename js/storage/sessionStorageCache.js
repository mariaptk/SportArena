

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


export function isNotified(matchId, score) {
  return sessionGet(`notified:${matchId}:${score}`) === true;
}

export function markNotified(matchId, score) {
  sessionSet(`notified:${matchId}:${score}`, true);
}
