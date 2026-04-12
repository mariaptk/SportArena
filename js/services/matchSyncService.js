/**
 * matchSyncService.js — сервис синхронизации матчей
 * Стратегия: stale-while-revalidate
 * Показываем кэш мгновенно → тихо обновляем из API → обновляем UI
 */

import { API_CONFIG } from '../api/config.js';
import { fetchMatches, fetchStandings, fetchRecentResults } from '../api/sportsApi.js';
import { cacheGet, cacheSet } from '../storege/localStorageCache.js';
import { NetworkError, ApiError } from '../api/apiService.js';

// ─── Ключи кэша ──────────────────────────────────────────────────────────────

export function matchesCacheKey(competition, status) {
  return `matches:${competition}:${status ?? 'ALL'}`;
}

export function standingsCacheKey(competition) {
  return `standings:${competition}`;
}

export const RECENT_RESULTS_KEY = 'matches:recent:thesportsdb';

// ─── TTL по статусу ──────────────────────────────────────────────────────────

function getTtl(status) {
  if (status === 'LIVE' || status === 'IN_PLAY') return API_CONFIG.CACHE_TTL.LIVE;
  if (status === 'FINISHED') return API_CONFIG.CACHE_TTL.FINISHED;
  if (status === 'standings') return API_CONFIG.CACHE_TTL.STANDINGS;
  return API_CONFIG.CACHE_TTL.SCHEDULED;
}

// ─── Stale-While-Revalidate ───────────────────────────────────────────────────

/**
 * Возвращает данные: сначала кэш (быстро), затем обновляет из API (тихо).
 * @param {string}   cacheKey
 * @param {Function} fetcher     async функция без аргументов
 * @param {number}   ttl
 * @param {Function} onUpdate    вызывается с новыми данными после фонового обновления
 * @returns {Promise<any>}       кэшированные или свежие данные
 */
export async function staleWhileRevalidate(cacheKey, fetcher, ttl, onUpdate) {
  const cached = cacheGet(cacheKey);

  if (cached && !cached.isStale) {
    // Кэш свежий — просто возвращаем, без запроса
    console.log(`[Sync] Свежий кэш: ${cacheKey}`);
    return cached.data;
  }

  if (cached && cached.isStale) {
    // Кэш есть, но протух — показываем сразу, обновляем в фоне
    console.log(`[Sync] Stale кэш: ${cacheKey} — фоновое обновление...`);
    refreshInBackground(cacheKey, fetcher, ttl, onUpdate);
    return cached.data;
  }

  // Кэша нет — ждём API
  console.log(`[Sync] Нет кэша: ${cacheKey} — загружаем из API...`);
  return await fetchAndCache(cacheKey, fetcher, ttl);
}

async function fetchAndCache(cacheKey, fetcher, ttl) {
  const data = await fetcher();
  cacheSet(cacheKey, data, ttl);
  return data;
}

async function refreshInBackground(cacheKey, fetcher, ttl, onUpdate) {
  try {
    const freshData = await fetchAndCache(cacheKey, fetcher, ttl);
    if (typeof onUpdate === 'function') onUpdate(freshData);
  } catch (err) {
    console.warn(`[Sync] Фоновое обновление не удалось (${cacheKey}):`, err.message);
  }
}

// ─── Публичные методы ─────────────────────────────────────────────────────────

/**
 * Загрузить матчи (scheduled/finished/live) с кэшем
 */
export async function getMatches(competition, status, onUpdate) {
  const key = matchesCacheKey(competition, status);
  const ttl = getTtl(status);
  return staleWhileRevalidate(
    key,
    () => fetchMatches(competition, status),
    ttl,
    onUpdate
  );
}

/**
 * Загрузить таблицу с кэшем
 */
export async function getStandings(competition, onUpdate) {
  const key = standingsCacheKey(competition);
  return staleWhileRevalidate(
    key,
    () => fetchStandings(competition),
    getTtl('standings'),
    onUpdate
  );
}

/**
 * Загрузить последние результаты из TheSportsDB
 */
export async function getRecentResults(onUpdate) {
  return staleWhileRevalidate(
    RECENT_RESULTS_KEY,
    fetchRecentResults,
    API_CONFIG.CACHE_TTL.FINISHED,
    onUpdate
  );
}

// ─── Обработка ошибок для UI ─────────────────────────────────────────────────

/**
 * Безопасная загрузка — при ошибке возвращает кэш или null
 * @returns {{ data: any|null, error: string|null, fromCache: boolean }}
 */
export async function safeGetMatches(competition, status) {
  try {
    const data = await getMatches(competition, status);
    return { data, error: null, fromCache: false };
  } catch (err) {
    // Пробуем достать протухший кэш
    const cached = cacheGet(matchesCacheKey(competition, status));
    if (cached) {
      console.warn('[Sync] API недоступен, используется старый кэш.');
      return { data: cached.data, error: err.message, fromCache: true };
    }
    return { data: null, error: err.message, fromCache: false };
  }
}
