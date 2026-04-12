export function formatMatchDate(utcDate) {
  if (!utcDate) return 'Date unavailable';

  const date = new Date(utcDate);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function getStatusLabel(status) {
  const labels = {
    SCHEDULED: 'Scheduled',
    LIVE: 'Live',
    IN_PLAY: 'In Play',
    PAUSED: 'Halftime',
    FINISHED: 'Finished',
    POSTPONED: 'Postponed',
    CANCELLED: 'Cancelled',
    SUSPENDED: 'Suspended',
    TIMED: 'Awaiting Kick-off',
    UNKNOWN: 'Status Unknown',
  };

  return labels[status] ?? status;
}

export function formatScore(match) {
  if (match.homeScore === null || match.awayScore === null) return 'vs';
  return `${match.homeScore} : ${match.awayScore}`;
}

export function isRecentMatch(match) {
  if (match.status === 'LIVE' || match.status === 'IN_PLAY') return true;
  if (match.status !== 'FINISHED') return false;

  const matchDate = new Date(match.utcDate).getTime();
  return Date.now() - matchDate < 2 * 60 * 60 * 1000;
}

export function groupMatchesByDate(matches) {
  return matches.reduce((acc, match) => {
    const dateKey = match.utcDate ? match.utcDate.slice(0, 10) : 'unknown';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {});
}

export function matchScoreKey(match) {
  return `${match.homeScore ?? '-'}:${match.awayScore ?? '-'}`;
}
