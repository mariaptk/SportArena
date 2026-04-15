
import { API_CONFIG } from '../api/config.js';

const SCHEMA_VERSION = API_CONFIG.CACHE_SCHEMA_VERSION;
const PREFIX = 'sportarena:';



function makeKey(key) {
  return `${PREFIX}${key}`;
}

function now() {
  return Date.now();
}



/**
 * @param {string} key    
 * @param {any}    data
 * @param {number} ttl    
 */
export function cacheSet(key, data, ttl) {
  try {
    const record = {
      schemaVersion: SCHEMA_VERSION,
      lastSyncAt:    now(),
      expiresAt:     now() + ttl,
      fingerprint:   JSON.stringify(data).length,  
      data,
    };
    localStorage.setItem(makeKey(key), JSON.stringify(record));
    console.log(`[Cache] ✓ Сохранено: ${key} (TTL ${Math.round(ttl/1000)}s)`);
  } catch (err) {
    
    console.warn('[Cache] localStorage полон, очищаем протухшие записи...');
    clearExpired();
    try {
      localStorage.setItem(makeKey(key), JSON.stringify({ data, expiresAt: now() + ttl, schemaVersion: SCHEMA_VERSION, lastSyncAt: now() }));
    } catch {
      console.error('[Cache] Не удалось сохранить даже после очистки:', err);
    }
  }
}

/**
 * @param {string} key
 * @returns {{ data: any, isStale: boolean, lastSyncAt: number } | null}
 */
export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(makeKey(key));
    if (!raw) return null;

    const record = JSON.parse(raw);

    
    if (record.schemaVersion !== SCHEMA_VERSION) {
      localStorage.removeItem(makeKey(key));
      return null;
    }

    const isStale = now() > record.expiresAt;
    console.log(`[Cache] ${isStale ? '⚠ Stale' : '✓ Fresh'}: ${key}`);

    return {
      data:       record.data,
      isStale,
      lastSyncAt: record.lastSyncAt,
      expiresAt:  record.expiresAt,
    };
  } catch (err) {
    console.error('[Cache] Ошибка чтения:', err);
    return null;
  }
}


export function cacheDelete(key) {
  localStorage.removeItem(makeKey(key));
  console.log(`[Cache] Удалено: ${key}`);
}


export function clearExpired() {
  let count = 0;
  for (const storageKey of Object.keys(localStorage)) {
    if (!storageKey.startsWith(PREFIX)) continue;
    try {
      const record = JSON.parse(localStorage.getItem(storageKey));
      if (record?.expiresAt && now() > record.expiresAt) {
        localStorage.removeItem(storageKey);
        count++;
      }
    } catch {
      localStorage.removeItem(storageKey);
      count++;
    }
  }
  console.log(`[Cache] Очищено протухших записей: ${count}`);
  return count;
}


export function clearAllCache() {
  let count = 0;
  for (const storageKey of Object.keys(localStorage)) {
    if (storageKey.startsWith(PREFIX)) {
      localStorage.removeItem(storageKey);
      count++;
    }
  }
  console.log(`[Cache] Кэш полностью очищен (${count} записей)`);
  return count;
}


export function getCacheStats() {
  const stats = [];
  for (const storageKey of Object.keys(localStorage)) {
    if (!storageKey.startsWith(PREFIX)) continue;
    try {
      const record = JSON.parse(localStorage.getItem(storageKey));
      stats.push({
        key:        storageKey.replace(PREFIX, ''),
        isStale:    now() > (record.expiresAt ?? 0),
        lastSyncAt: record.lastSyncAt ? new Date(record.lastSyncAt).toLocaleTimeString() : '—',
        expiresAt:  record.expiresAt  ? new Date(record.expiresAt).toLocaleTimeString()  : '—',
        size:       localStorage.getItem(storageKey).length + ' bytes',
      });
    } catch {}
  }
  return stats;
}
