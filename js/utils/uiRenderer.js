/**
 * uiRenderer.js — рендер данных из API в существующую разметку SportArena
 * Не меняет дизайн, только заполняет существующие блоки данными
 */

import { formatMatchDate, getStatusLabel, formatScore } from './dataParser.js';

// ─── Состояние ──────────────────────────────────────────────────────────────

let currentError = null;

// ─── Утилиты ────────────────────────────────────────────────────────────────

/**
 * Показать/скрыть баннер ошибки
 */
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
    // Вставляем после hero-секции
    const heroSection = document.querySelector('.hero') ?? document.body;
    heroSection.insertAdjacentElement('afterend', banner);
  }

  banner.innerHTML = `
    <span>⚠️</span>
    <span>${message}${isFromCache ? ' <em>(показаны кэшированные данные)</em>' : ''}</span>
    <button onclick="this.parentElement.remove()" style="margin-left:auto;background:none;border:none;color:inherit;cursor:pointer;font-size:18px;">×</button>
  `;
  banner.style.display = 'flex';
}

export function hideErrorBanner() {
  const banner = document.getElementById('sa-error-banner');
  if (banner) banner.style.display = 'none';
}

// ─── Индикатор загрузки ───────────────────────────────────────────────────────

export function showLoadingState(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="
      padding: 40px;
      text-align: center;
      color: rgba(248,250,252,0.6);
      font-family: 'Source Code Pro', monospace;
    ">
      <div style="font-size:32px;margin-bottom:12px;animation:spin 1.5s linear infinite;display:inline-block;">⚽</div>
      <p>Загрузка данных...</p>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
  `;
}

// ─── Рендер карточки матча ────────────────────────────────────────────────────

function renderMatchCard(match) {
  const isLive = match.status === 'LIVE' || match.status === 'IN_PLAY';
  const isFinished = match.status === 'FINISHED';

  return `
    <div class="event-card" itemscope itemtype="https://schema.org/SportsEvent" data-match-id="${match.id}">
      <div class="event-card__header">
        <h3 class="event-card__name" itemprop="name">${match.competition}</h3>
        <p class="event-card__date" itemprop="startDate">${formatMatchDate(match.utcDate)}</p>
        ${match.matchday ? `<p class="event-card__date">Тур ${match.matchday}</p>` : ''}
      </div>
      <div class="event-card__content">
        <div class="event-card__competitors">
          ${match.homeCrest ? `<img src="${match.homeCrest}" alt="${match.homeTeam}" style="width:24px;height:24px;object-fit:contain;margin-right:6px;">` : ''}
          <span class="event-card__team" itemprop="homeTeam">${match.homeTeam}</span>
          <span class="event-card__vs">
            ${(isFinished || isLive) ? formatScore(match) : 'vs'}
          </span>
          ${match.awayCrest ? `<img src="${match.awayCrest}" alt="${match.awayTeam}" style="width:24px;height:24px;object-fit:contain;margin-right:6px;">` : ''}
          <span class="event-card__team" itemprop="awayTeam">${match.awayTeam}</span>
        </div>
        <p class="event-card__description" style="${isLive ? 'color:#ef4444;font-weight:700;' : ''}">
          ${getStatusLabel(match.status)}
        </p>
        ${match.stage ? `<p class="event-card__description" style="font-size:12px;opacity:0.7;">${match.stage}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Отрендерить список матчей в контейнер
 * @param {HTMLElement} container
 * @param {NormalizedMatch[]} matches
 * @param {boolean} fromCache  показывать метку кэша
 */
export function renderMatches(container, matches, fromCache = false) {
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = `
      <div style="padding:30px;text-align:center;color:rgba(248,250,252,0.5);font-family:'Source Code Pro',monospace;">
        Матчи не найдены.
      </div>
    `;
    return;
  }

  const cacheLabel = fromCache
    ? `<p style="font-size:11px;color:rgba(248,250,252,0.4);margin-bottom:8px;font-family:'Source Code Pro',monospace;">
        📦 Данные из кэша
       </p>`
    : '';

  container.innerHTML = cacheLabel + matches.map(renderMatchCard).join('');
}

// ─── Рендер таблицы лиги ─────────────────────────────────────────────────────

/**
 * Отрендерить таблицу в элемент с data-sort-enabled или в указанный контейнер
 */
export function renderStandings(container, standings) {
  if (!container || !standings?.length) return;

  container.innerHTML = `
    <div class="table-sorter">
      <table class="league-table" id="api-standings-table" data-sort-enabled>
        <thead>
          <tr>
            <th data-sort="position" style="width:40px;">#</th>
            <th data-sort="team">Команда</th>
            <th data-sort="played">И</th>
            <th data-sort="won">В</th>
            <th data-sort="draw">Н</th>
            <th data-sort="lost">П</th>
            <th data-sort="goalDiff">РМ</th>
            <th data-sort="points" style="font-weight:700;">О</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map(row => `
            <tr>
              <td>${row.position}</td>
              <td>
                ${row.crest ? `<img src="${row.crest}" alt="${row.team}" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px;">` : ''}
                ${row.team}
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

// ─── Рендер последних результатов (TheSportsDB) ───────────────────────────────

export function renderRecentResults(container, results) {
  if (!container || !results?.length) return;

  container.innerHTML = results.map(r => `
    <div class="news-item" style="cursor:default;min-height:auto;">
      <p class="news-item__title" style="font-size:14px;">
        ${r.homeTeam} <strong>${r.homeScore} : ${r.awayScore}</strong> ${r.awayTeam}
      </p>
      <p class="news-item__text" style="-webkit-line-clamp:unset;">
        ${r.league} · ${r.date}
      </p>
      ${r.thumb ? `
        <figure class="news-item__figure">
          <img src="${r.thumb}" alt="${r.homeTeam} vs ${r.awayTeam}" class="news-item__image" onerror="this.style.display='none'">
        </figure>
      ` : ''}
    </div>
  `).join('');
}

// ─── Метка "последнее обновление" ────────────────────────────────────────────

export function renderLastUpdated(container, timestamp) {
  if (!container) return;
  const time = timestamp ? new Date(timestamp).toLocaleTimeString('ru-RU') : 'неизвестно';
  let label = container.querySelector('.sa-last-updated');
  if (!label) {
    label = document.createElement('p');
    label.className = 'sa-last-updated';
    label.style.cssText = 'font-size:11px;color:rgba(248,250,252,0.4);margin-top:8px;font-family:"Source Code Pro",monospace;';
    container.appendChild(label);
  }
  label.textContent = `Обновлено: ${time}`;
}
