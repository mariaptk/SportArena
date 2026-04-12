/**
 * dataParser.js — утилиты форматирования данных для UI
 */

/**
 * Форматирует дату матча в читаемый вид
 * @param {string} utcDate  ISO строка
 * @returns {string}
 */
export function formatMatchDate(utcDate) {
  if (!utcDate) return 'Дата неизвестна';
  const date = new Date(utcDate);
  return date.toLocaleString('ru-RU', {
    day:    '2-digit',
    month:  'long',
    hour:   '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Возвращает метку статуса матча
 */
export function getStatusLabel(status) {
  const labels = {
    SCHEDULED:  '🕐 Запланирован',
    LIVE:       '🔴 LIVE',
    IN_PLAY:    '🔴 Идёт матч',
    PAUSED:     '⏸ Перерыв',
    FINISHED:   '✅ Завершён',
    POSTPONED:  '⏳ Перенесён',
    CANCELLED:  '❌ Отменён',
    SUSPENDED:  '⚠️ Приостановлен',
    TIMED:      '🕐 Ожидание',
    UNKNOWN:    '❓ Статус неизвестен',
  };
  return labels[status] ?? status;
}

/**
 * Форматирует счёт матча
 */
export function formatScore(match) {
  if (match.homeScore === null || match.awayScore === null) return '— : —';
  return `${match.homeScore} : ${match.awayScore}`;
}

/**
 * Проверяет, является ли матч "свежим" (live или завершён <2ч назад)
 */
export function isRecentMatch(match) {
  if (match.status === 'LIVE' || match.status === 'IN_PLAY') return true;
  if (match.status !== 'FINISHED') return false;
  const matchDate = new Date(match.utcDate).getTime();
  return Date.now() - matchDate < 2 * 60 * 60 * 1000;
}

/**
 * Группирует матчи по дате (YYYY-MM-DD)
 */
export function groupMatchesByDate(matches) {
  return matches.reduce((acc, match) => {
    const dateKey = match.utcDate ? match.utcDate.slice(0, 10) : 'unknown';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {});
}

/**
 * Формирует строку для дедупликации уведомлений
 */
export function matchScoreKey(match) {
  return `${match.homeScore ?? '-'}:${match.awayScore ?? '-'}`;
}
