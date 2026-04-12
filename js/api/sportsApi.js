/**
 * Browser-safe sports API layer.
 * Uses TheSportsDB for schedules, results and standings to avoid frontend CORS issues.
 */

import { API_CONFIG } from './config.js';
import { apiFetch } from './apiService.js';

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

  if (!normalized || normalized === 'NS') return 'SCHEDULED';
  if (['FT', 'AOT'].includes(normalized)) return 'FINISHED';
  if (['HT', 'BT', 'LIVE'].includes(normalized)) return 'IN_PLAY';
  if (normalized.startsWith('Q') || normalized.startsWith('IN')) return 'IN_PLAY';
  if (normalized === 'POST' || normalized === 'PST') return 'POSTPONED';
  if (normalized === 'CANC') return 'CANCELLED';
  if (normalized === 'ABD' || normalized === 'INT' || normalized === 'INTR') return 'SUSPENDED';

  return normalized;
}

function normalizeSportsDbMatch(event, fallbackCompetition = '', forcedStatus = '') {
  const status = forcedStatus || mapSportsDbStatus(event.strStatus);

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

async function fetchLeagueEvents(competitionCode, endpoint, forcedStatus = '') {
  const competition = getSportsDbCompetition(competitionCode);
  const url = `${API_CONFIG.SPORTSDB_BASE}/${endpoint}?id=${competition.id}`;
  const data = await apiFetch(url);
  return (data.events ?? []).map((event) => normalizeSportsDbMatch(event, competition.name, forcedStatus));
}

async function fetchLeagueEventsByDay(competitionCode, date) {
  const competition = getSportsDbCompetition(competitionCode);
  const url = `${API_CONFIG.SPORTSDB_BASE}/eventsday.php?d=${date}&l=${encodeURIComponent(competition.name)}`;
  const data = await apiFetch(url);
  return (data.events ?? []).map((event) => normalizeSportsDbMatch(event, competition.name));
}

export async function fetchMatches(competitionCode, status) {
  let matches = [];

  if (status === 'FINISHED') {
    matches = await fetchLeagueEvents(competitionCode, 'eventspastleague.php', 'FINISHED');
  } else if (status === 'LIVE' || status === 'IN_PLAY') {
    const today = new Date().toISOString().slice(0, 10);
    matches = await fetchLeagueEventsByDay(competitionCode, today);
    matches = matches.filter((match) => match.status === 'LIVE' || match.status === 'IN_PLAY');
  } else {
    matches = await fetchLeagueEvents(competitionCode, 'eventsnextleague.php', 'SCHEDULED');
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

  const url = `${API_CONFIG.SPORTSDB_BASE}/eventsnextleague.php?id=${competition.id}`;
  const data = await apiFetch(url);
  const events = (data.events ?? []).slice(0, 10);
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
  const url = `${API_CONFIG.SPORTSDB_BASE}/eventspastleague.php?id=4328`;
  const data = await apiFetch(url);
  return (data.events ?? []).slice(0, 6).map((ev) => ({
    id: ev.idEvent,
    homeTeam: ev.strHomeTeam,
    awayTeam: ev.strAwayTeam,
    homeScore: ev.intHomeScore,
    awayScore: ev.intAwayScore,
    date: ev.dateEvent,
    status: 'FINISHED',
    league: ev.strLeague,
    thumb: ev.strThumb ?? '',
  }));
}
