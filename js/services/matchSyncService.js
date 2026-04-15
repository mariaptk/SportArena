

import { API_CONFIG } from '../api/config.js';
import { fetchMatches, fetchStandings, fetchRecentResults } from '../api/sportsApi.js';
import { cacheGet, cacheSet } from '../storage/localStorageCache.js';
import { NetworkError, ApiError } from '../api/apiService.js';


export function matchesCacheKey(competition, status) {
  return `matches:${competition}:${status ?? 'ALL'}`;
}

export function standingsCacheKey(competition) {
  return `standings:${competition}`;
}

export const RECENT_RESULTS_KEY = 'matches:recent:thesportsdb';

function normalizeMatchesForRequestedStatus(matches, status) {
  if (!Array.isArray(matches)) return matches;
  if (status !== 'SCHEDULED' && status !== 'FINISHED') return matches;

  const now = Date.now();

  return matches
    .filter((match) => {
      if (!match?.utcDate) return true;

      const timestamp = new Date(match.utcDate).getTime();
      if (Number.isNaN(timestamp)) return true;

      return status === 'SCHEDULED' ? timestamp > now : timestamp <= now;
    })
    .map((match) => ({
      ...match,
      status,
    }));
}


function getTtl(status) {
  if (status === 'LIVE' || status === 'IN_PLAY') return API_CONFIG.CACHE_TTL.LIVE;
  if (status === 'FINISHED') return API_CONFIG.CACHE_TTL.FINISHED;
  if (status === 'standings') return API_CONFIG.CACHE_TTL.STANDINGS;
  return API_CONFIG.CACHE_TTL.SCHEDULED;
}



/**
 * @param {string}   cacheKey
 * @param {Function} fetcher     
 * @param {number}   ttl
 * @param {Function} onUpdate    
 * @returns {Promise<any>}       
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


export async function getStandings(competition, onUpdate) {
  const key = standingsCacheKey(competition);
  return staleWhileRevalidate(
    key,
    () => fetchStandings(competition),
    getTtl('standings'),
    onUpdate
  );
}

export async function getRecentResults(onUpdate) {
  return staleWhileRevalidate(
    RECENT_RESULTS_KEY,
    fetchRecentResults,
    API_CONFIG.CACHE_TTL.FINISHED,
    onUpdate
  );
}



/**
 * @returns {{ data: any|null, error: string|null, fromCache: boolean }}
 */
export async function safeGetMatches(competition, status) {
  try {
    const data = normalizeMatchesForRequestedStatus(await getMatches(competition, status), status);
    return { data, error: null, fromCache: false };
  } catch (err) {
    // Пробуем достать протухший кэш
    const cached = cacheGet(matchesCacheKey(competition, status));
    if (cached) {
      console.warn('[Sync] API недоступен, используется старый кэш.');
      return {
        data: normalizeMatchesForRequestedStatus(cached.data, status),
        error: err.message,
        fromCache: true,
      };
    }
    return { data: null, error: err.message, fromCache: false };
  }
}
