import { formatMatchDate, getStatusLabel, formatScore } from './dataParser.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMatchPayload(match, statusLabel, dateLabel, scoreLabel, stageLabel) {
  return encodeURIComponent(JSON.stringify({
    competition: match.competition,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeCrest: match.homeCrest,
    awayCrest: match.awayCrest,
    statusLabel,
    dateLabel,
    score: scoreLabel,
    stage: stageLabel,
  }));
}

export function showErrorBanner(message, isFromCache = false) {
  let banner = document.getElementById('sa-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'sa-error-banner';
    banner.style.cssText = `
      background: rgba(220, 38, 38, 0.15);
      border: 1px solid rgba(220, 38, 38, 0.4);
      border-radius: 12px;
      padding: 12px 18px;
      color: #fca5a5;
      font-size: 14px;
      margin: 12px 0;
      font-family: 'Source Code Pro', monospace;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    const heroSection = document.querySelector('.hero') ?? document.body;
    heroSection.insertAdjacentElement('afterend', banner);
  }

  banner.innerHTML = `
    <span>Alert</span>
    <span>${escapeHtml(message)}${isFromCache ? ' <em>(cached data shown)</em>' : ''}</span>
    <button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;font-size:18px;">×</button>
  `;
  banner.style.display = 'flex';
}

export function hideErrorBanner() {
  const banner = document.getElementById('sa-error-banner');
  if (banner) banner.style.display = 'none';
}

export function showLoadingState(container) {
  if (!container) return;

  container.innerHTML = `
    <div style="
      padding: 40px;
      text-align: center;
      color: rgba(248,250,252,0.6);
      font-family: 'Source Code Pro', monospace;
    ">
      <div style="font-size:32px;margin-bottom:12px;animation:spin 1.5s linear infinite;display:inline-block;">⏳</div>
      <p>Loading matches...</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `;
}

function renderMatchRow(match) {
  const isLive = match.status === 'LIVE' || match.status === 'IN_PLAY';
  const isFinished = match.status === 'FINISHED';
  const statusLabel = getStatusLabel(match.status);
  const dateLabel = formatMatchDate(match.utcDate);
  const scoreLabel = isFinished || isLive ? formatScore(match) : 'vs';
  const stageLabel = [match.stage, match.matchday ? `Matchday ${match.matchday}` : '']
    .filter(Boolean)
    .join(' • ');
  const payload = buildMatchPayload(match, statusLabel, dateLabel, scoreLabel, stageLabel);

  return `
    <button
      type="button"
      class="match-row"
      data-match-payload="${payload}"
      aria-label="Open details for ${escapeHtml(match.homeTeam)} versus ${escapeHtml(match.awayTeam)}"
    >
      <span class="match-row__header">
        <span class="match-row__competition">${escapeHtml(match.competition)}</span>
        <span class="match-row__date">${escapeHtml(dateLabel)}</span>
      </span>
      <span class="match-row__body">
        <span class="match-row__teams">
          <span class="match-row__team">
            ${match.homeCrest ? `<img src="${escapeHtml(match.homeCrest)}" alt="${escapeHtml(match.homeTeam)} crest" class="match-row__crest">` : ''}
            <span class="match-row__team-name">${escapeHtml(match.homeTeam)}</span>
          </span>
          <span class="match-row__team">
            ${match.awayCrest ? `<img src="${escapeHtml(match.awayCrest)}" alt="${escapeHtml(match.awayTeam)} crest" class="match-row__crest">` : ''}
            <span class="match-row__team-name">${escapeHtml(match.awayTeam)}</span>
          </span>
        </span>
        <span class="match-row__summary">
          <span class="match-row__score">${escapeHtml(scoreLabel)}</span>
          <span class="match-row__status ${isLive ? 'match-row__status--live' : ''}">${escapeHtml(statusLabel)}</span>
          ${stageLabel ? `<span class="match-row__stage">${escapeHtml(stageLabel)}</span>` : ''}
        </span>
      </span>
    </button>
  `;
}

export function renderMatches(container, matches, fromCache = false) {
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = `
      <div style="padding:30px;text-align:center;color:rgba(248,250,252,0.5);font-family:'Source Code Pro',monospace;">
        No matches found.
      </div>
    `;
    return;
  }

  const cacheLabel = fromCache
    ? `<p style="font-size:11px;color:rgba(248,250,252,0.4);margin-bottom:8px;font-family:'Source Code Pro',monospace;">
        Cached snapshot
       </p>`
    : '';

  container.innerHTML = `
    ${cacheLabel}
    <div class="sa-match-list">
      ${matches.map(renderMatchRow).join('')}
    </div>
  `;
}

export function renderStandings(container, standings) {
  if (!container) return;

  if (!standings?.length) {
    container.innerHTML = `
      <div class="table-sorter">
        <p style="color:rgba(248,250,252,0.7);padding:16px;font-family:'Source Code Pro',monospace;">
          Standings are not available for this competition in TheSportsDB.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-sorter">
      <table class="league-table" id="league-table" data-sort-enabled>
        <thead>
          <tr>
            <th data-sort="position" style="width:40px;">#</th>
            <th data-sort="team">Team</th>
            <th data-sort="played">Played</th>
            <th data-sort="won">Won</th>
            <th data-sort="draw">Draw</th>
            <th data-sort="lost">Lost</th>
            <th data-sort="goalDiff">GD</th>
            <th data-sort="points" style="font-weight:700;">Pts</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map((row) => `
            <tr>
              <td>${row.position}</td>
              <td>
                ${row.crest ? `<img src="${escapeHtml(row.crest)}" alt="${escapeHtml(row.team)} crest" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px;">` : ''}
                ${escapeHtml(row.team)}
              </td>
              <td>${row.played}</td>
              <td>${row.won}</td>
              <td>${row.draw}</td>
              <td>${row.lost}</td>
              <td>${row.goalDiff > 0 ? '+' : ''}${row.goalDiff}</td>
              <td><strong>${row.points}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function renderRecentResults(container, results) {
  if (!container || !results?.length) return;

  container.innerHTML = results.map((result) => `
    <div class="news-item" style="cursor:default;min-height:auto;">
      <p class="news-item__title" style="font-size:14px;">
        ${escapeHtml(result.homeTeam)} <strong>${escapeHtml(result.homeScore)} : ${escapeHtml(result.awayScore)}</strong> ${escapeHtml(result.awayTeam)}
      </p>
      <p class="news-item__text" style="-webkit-line-clamp:unset;">
        ${escapeHtml(result.league)} · ${escapeHtml(result.date)}
      </p>
      ${result.thumb ? `
        <figure class="news-item__figure">
          <img src="${escapeHtml(result.thumb)}" alt="${escapeHtml(result.homeTeam)} vs ${escapeHtml(result.awayTeam)}" class="news-item__image" onerror="this.style.display='none'">
        </figure>
      ` : ''}
    </div>
  `).join('');
}

export function renderLastUpdated(container, timestamp) {
  if (!container) return;

  const time = timestamp ? new Date(timestamp).toLocaleTimeString('en-GB') : 'unknown';
  let label = container.querySelector('.sa-last-updated');
  if (!label) {
    label = document.createElement('p');
    label.className = 'sa-last-updated';
    label.style.cssText = 'font-size:11px;color:rgba(248,250,252,0.4);margin-top:8px;font-family:"Source Code Pro",monospace;';
    container.appendChild(label);
  }
  label.textContent = `Updated: ${time}`;
}
