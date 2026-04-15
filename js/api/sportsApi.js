
import { API_CONFIG } from './config.js';
import { apiFetch } from './apiService.js';

const MATCHES_TARGET_COUNT = 3;
const MATCH_SEARCH_WINDOW_DAYS = 7;

function getSportsDbCompetition(competitionCode) {
  return API_CONFIG.SPORTSDB_COMPETITIONS[competitionCode] ?? API_CONFIG.SPORTSDB_COMPETITIONS.PL;
}

function toUtcDate(dateEvent, timeValue = '00:00:00') {
  if (!dateEvent) return '';
  const cleanTime = (timeValue || '00:00:00').replace('Z', '');
  return `${dateEvent}T${cleanTime}Z`;
}

function mapSportsDbStatus(status) {
  const normalized = (status || '').toUpperCase();

  if (!normalized || ['NS', 'NOT STARTED', 'TBD', 'TIME TO BE DEFINED'].includes(normalized)) return 'SCHEDULED';
  if (['FT', 'AOT', 'MATCH FINISHED', 'AFTER EXTRA TIME', 'FULL TIME'].includes(normalized)) return 'FINISHED';
  if (['HT', 'BT', 'LIVE', 'IN PLAY', '1H', '2H'].includes(normalized)) return 'IN_PLAY';
  if (normalized.startsWith('Q') || normalized.startsWith('IN')) return 'IN_PLAY';
  if (normalized === 'POST' || normalized === 'PST') return 'POSTPONED';
  if (normalized === 'CANC') return 'CANCELLED';
  if (normalized === 'ABD' || normalized === 'INT' || normalized === 'INTR') return 'SUSPENDED';

  return normalized;
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayIsoDate() {
  return formatIsoDate(new Date());
}

function shiftIsoDate(isoDate, offsetDays) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return formatIsoDate(date);
}

function sortMatchesByDate(matches, direction = 'asc') {
  const sorted = [...matches].sort((first, second) => {
    const firstTime = first.utcDate ? new Date(first.utcDate).getTime() : 0;
    const secondTime = second.utcDate ? new Date(second.utcDate).getTime() : 0;
    return firstTime - secondTime;
  });

  return direction === 'desc' ? sorted.reverse() : sorted;
}

function getMatchTimestamp(match) {
  if (!match?.utcDate) return NaN;
  return new Date(match.utcDate).getTime();
}

function normalizeSportsDbMatch(event, fallbackCompetition = '') {
  const status = mapSportsDbStatus(event.strStatus);

  return {
    id: event.idEvent,
    competition: event.strLeague ?? fallbackCompetition ?? 'Unknown',
    compCode: event.idLeague ?? '',
    homeTeam: event.strHomeTeam ?? 'TBD',
    awayTeam: event.strAwayTeam ?? 'TBD',
    homeCrest: event.strHomeTeamBadge ?? '',
    awayCrest: event.strAwayTeamBadge ?? '',
    status,
    utcDate: toUtcDate(event.dateEvent, event.strTime),
    homeScore: event.intHomeScore != null ? Number(event.intHomeScore) : null,
    awayScore: event.intAwayScore != null ? Number(event.intAwayScore) : null,
    halfHome: event.intHomeScore != null ? Number(event.intHomeScore) : null,
    halfAway: event.intAwayScore != null ? Number(event.intAwayScore) : null,
    winner: null,
    stage: event.strRound ?? event.strEventAlternate ?? '',
    matchday: event.intRound != null ? Number(event.intRound) : null,
  };
}

function normalizeSportsDbStanding(row) {
  const goalsFor = Number(row.intGoalsFor ?? 0);
  const goalsAgainst = Number(row.intGoalsAgainst ?? 0);

  return {
    position: Number(row.intRank ?? row.intPosition ?? 0),
    team: row.strTeam ?? 'Unknown',
    crest: row.strBadge ?? '',
    played: Number(row.intPlayed ?? 0),
    won: Number(row.intWin ?? 0),
    draw: Number(row.intDraw ?? 0),
    lost: Number(row.intLoss ?? 0),
    goalsFor,
    goalsAgainst,
    goalDiff: Number(row.intGoalDifference ?? (goalsFor - goalsAgainst)),
    points: Number(row.intPoints ?? 0),
  };
}

function matchesRequestedStatus(matchStatus, requestedStatus = '') {
  if (!requestedStatus) return true;
  if (requestedStatus === 'LIVE') return matchStatus === 'LIVE' || matchStatus === 'IN_PLAY';
  if (requestedStatus === 'IN_PLAY') return matchStatus === 'IN_PLAY' || matchStatus === 'LIVE';
  return matchStatus === requestedStatus;
}

function matchesRequestedTime(match, requestedStatus = '', now = Date.now()) {
  if (requestedStatus !== 'SCHEDULED' && requestedStatus !== 'FINISHED') return true;

  const timestamp = getMatchTimestamp(match);
  if (Number.isNaN(timestamp)) return matchesRequestedStatus(match.status, requestedStatus);

  if (requestedStatus === 'SCHEDULED') return timestamp > now;
  return timestamp <= now;
}

function alignMatchStatus(match, requestedStatus = '') {
  if (requestedStatus !== 'SCHEDULED' && requestedStatus !== 'FINISHED') return match;
  return { ...match, status: requestedStatus };
}

async function fetchLeagueEvents(competitionCode, endpoint) {
  const competition = getSportsDbCompetition(competitionCode);
  const url = `${API_CONFIG.SPORTSDB_BASE}/${endpoint}?id=${competition.id}`;
  const data = await apiFetch(url);
  return (data.events ?? []).map((event) => normalizeSportsDbMatch(event, competition.name));
}

async function fetchLeagueEventsByDay(competitionCode, date) {
  const competition = getSportsDbCompetition(competitionCode);
  const url = `${API_CONFIG.SPORTSDB_BASE}/eventsday.php?d=${date}&s=Soccer&l=${encodeURIComponent(competition.name)}`;
  const data = await apiFetch(url);
  return (data.events ?? []).map((event) => normalizeSportsDbMatch(event, competition.name));
}

async function fetchLeagueEventsWindow(
  competitionCode,
  {
    direction = 'forward',
    minMatches = MATCHES_TARGET_COUNT,
    maxDays = MATCH_SEARCH_WINDOW_DAYS,
    requestedStatus = '',
    startDate = getTodayIsoDate(),
  } = {}
) {
  const seenIds = new Set();
  const collected = [];
  const now = Date.now();

  for (let step = 0; step < maxDays && collected.length < minMatches; step += 1) {
    const offset = direction === 'backward' ? -step : step;
    const date = shiftIsoDate(startDate, offset);
    const dayMatches = await fetchLeagueEventsByDay(competitionCode, date);

    for (const match of dayMatches) {
      if (!matchesRequestedTime(match, requestedStatus, now)) continue;
      if (seenIds.has(match.id)) continue;
      seenIds.add(match.id);
      collected.push(alignMatchStatus(match, requestedStatus));
    }
  }

  return sortMatchesByDate(collected, direction === 'backward' ? 'desc' : 'asc').slice(0, minMatches);
}

export async function fetchMatches(competitionCode, status) {
  let matches = [];

  if (status === 'FINISHED') {
    matches = await fetchLeagueEventsWindow(competitionCode, {
      direction: 'backward',
      requestedStatus: 'FINISHED',
    });
  } else if (status === 'LIVE' || status === 'IN_PLAY') {
    const today = getTodayIsoDate();
    matches = await fetchLeagueEventsByDay(competitionCode, today);
    matches = matches.filter((match) => matchesRequestedStatus(match.status, status));
  } else {
    matches = await fetchLeagueEventsWindow(competitionCode, {
      direction: 'forward',
      requestedStatus: 'SCHEDULED',
    });
  }

  console.log(`[sportsApi] Received ${matches.length} matches (${competitionCode}${status ? '/' + status : ''})`);
  return matches;
}

export async function fetchUpcomingMatches(competitionCode) {
  return fetchMatches(competitionCode, 'SCHEDULED');
}

export async function fetchFinishedMatches(competitionCode) {
  return fetchMatches(competitionCode, 'FINISHED');
}

export async function fetchLiveMatches(competitionCode) {
  const [live, inPlay] = await Promise.allSettled([
    fetchMatches(competitionCode, 'LIVE'),
    fetchMatches(competitionCode, 'IN_PLAY'),
  ]);

  const result = [];
  if (live.status === 'fulfilled') result.push(...live.value);
  if (inPlay.status === 'fulfilled') result.push(...inPlay.value);
  return result;
}

export async function fetchStandings(competitionCode) {
  const competition = getSportsDbCompetition(competitionCode);
  const url = `${API_CONFIG.SPORTSDB_BASE}/lookuptable.php?l=${competition.id}`;
  const data = await apiFetch(url);
  const standings = (data.table ?? []).map(normalizeSportsDbStanding);
  console.log(`[sportsApi] Received ${standings.length} standings rows (${competitionCode})`);
  return standings;
}

export async function fetchSportsDBEvents(leagueName) {
  const competition = Object.values(API_CONFIG.SPORTSDB_COMPETITIONS)
    .find((item) => item.name === leagueName) ?? API_CONFIG.SPORTSDB_COMPETITIONS.PL;

  const events = await fetchLeagueEventsWindow(
    Object.entries(API_CONFIG.SPORTSDB_COMPETITIONS).find(([, item]) => item.id === competition.id)?.[0] ?? 'PL',
    {
      direction: 'forward',
      minMatches: 3,
      requestedStatus: 'SCHEDULED',
    }
  );
  console.log(`[sportsApi] TheSportsDB: ${events.length} events`);
  return events;
}

export async function fetchTeamInfo(teamName) {
  const encoded = encodeURIComponent(teamName);
  const url = `${API_CONFIG.SPORTSDB_BASE}/searchteams.php?t=${encoded}`;
  const data = await apiFetch(url);
  return data.teams?.[0] ?? null;
}

export async function fetchRecentResults() {
  const results = await fetchLeagueEventsWindow('PL', {
    direction: 'backward',
    minMatches: 6,
    requestedStatus: 'FINISHED',
  });

  return results.map((match) => ({
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    date: match.utcDate.slice(0, 10),
    status: 'FINISHED',
    league: match.competition,
    thumb: '',
  }));
}
