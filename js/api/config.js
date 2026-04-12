/**
 * SportArena API configuration.
 * The app now prefers TheSportsDB for browser-safe requests without CORS issues.
 * football-data.org stays available as an optional proxy-backed fallback.
 */

const isLocalDev =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const FOOTBALL_DATA_BASE = isLocalDev
  ? 'http://localhost:3000/api'
  : 'https://api.football-data.org/v4';

export const API_CONFIG = {
  FOOTBALL_DATA_KEY: '2653331a276f4ce3bc6592eaa77d2a5b',
  FOOTBALL_DATA_BASE,
  SPORTSDB_BASE: 'https://www.thesportsdb.com/api/v1/json/123',

  COMPETITIONS: {
    PL: 'PL',
    CL: 'CL',
    PD: 'PD',
    BL1: 'BL1',
    SA: 'SA',
  },

  SPORTSDB_COMPETITIONS: {
    PL: {
      id: '4328',
      name: 'English Premier League',
    },
    CL: {
      id: '4480',
      name: 'UEFA Champions League',
    },
    PD: {
      id: '4335',
      name: 'Spanish La Liga',
    },
    BL1: {
      id: '4331',
      name: 'German Bundesliga',
    },
    SA: {
      id: '4332',
      name: 'Italian Serie A',
    },
  },

  CACHE_TTL: {
    LIVE: 1 * 60 * 1000,
    SCHEDULED: 5 * 60 * 1000,
    FINISHED: 15 * 60 * 1000,
    STANDINGS: 60 * 60 * 1000,
    NEWS: 10 * 60 * 1000,
  },

  POLL_INTERVAL_ACTIVE: 90 * 1000,
  POLL_INTERVAL_HIDDEN: 300 * 1000,

  CACHE_SCHEMA_VERSION: '1.0.3',
  REQUEST_TIMEOUT_MS: 8000,
};
