/**
 * SearchManager — поиск и фильтрация матчей
 * Поля: team name, league (dropdown), match status (dropdown), Apply Filters
 */

import { safeGetMatches } from '../services/matchSyncService.js';
import { renderMatches, showLoadingState } from '../utils/uiRenderer.js';

export class SearchManager {
  constructor() {
    this.searchQueryInput  = document.getElementById('search-query');
    this.filterLeagueSelect = document.getElementById('filter-league');
    this.filterStatusSelect = document.getElementById('filter-status');
    this.applyFiltersBtn   = document.getElementById('apply-filters');
    this.resultsInfoDiv    = document.querySelector('.search-results__info');
    this.resultsCountSpan  = document.querySelector('#results-count span');
    this.resultsContainer  = document.getElementById('results-container');
    this.matchesListContainer = document.querySelector('[data-matches-list]');

    this.allMatches     = [];
    this.filteredMatches = [];

    this.init();
  }

  init() {
    if (!this.searchQueryInput || !this.applyFiltersBtn) {
      console.error('[SearchManager] Required elements not found.');
      return;
    }

    this.applyFiltersBtn.addEventListener('click', () => this.performSearch());

    [this.searchQueryInput, this.filterLeagueSelect, this.filterStatusSelect].forEach((el) => {
      if (el) {
        el.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.performSearch();
        });
      }
    });

    console.log('[SearchManager] Initialized.');
  }

  // ─── Собрать матчи из DOM ────────────────────────────────────────────────────

  extractMatchesFromDOM() {
    if (!this.matchesListContainer) return [];

    const rows    = this.matchesListContainer.querySelectorAll('.match-row');
    const matches = [];

    rows.forEach((row) => {
      const payload = row.getAttribute('data-match-payload');
      if (!payload) return;
      try {
        const data = JSON.parse(decodeURIComponent(payload));
        // Также сохраним utcDate и status из data-атрибутов строки, если есть
        matches.push(data);
      } catch (e) {
        console.warn('[SearchManager] Failed to parse match payload:', e);
      }
    });

    console.log(`[SearchManager] Extracted ${matches.length} matches from DOM`);
    return matches;
  }

  // ─── Фильтрация ─────────────────────────────────────────────────────────────

  normalize(str) {
    return String(str ?? '').toLowerCase().trim();
  }

  matchesFilter(match, filters) {
    const { query, league, status } = filters;

    // 1. Фильтр по команде / тексту
    if (query) {
      const q    = this.normalize(query);
      const home = this.normalize(match.homeTeam);
      const away = this.normalize(match.awayTeam);
      const comp = this.normalize(match.competition);
      const date = match.utcDate ? match.utcDate.split('T')[0] : '';

      if (!home.includes(q) && !away.includes(q) && !comp.includes(q) && !date.includes(q)) {
        return false;
      }
    }

    // 2. Фильтр по лиге (dropdown)
    if (league) {
      const comp = this.normalize(match.competition);
      const leagueMap = {
        PL:  'premier',
        CL:  'champions',
        PD:  'liga',
        BL1: 'bundesliga',
        SA:  'serie',
      };
      const keyword = leagueMap[league] ?? this.normalize(league);
      if (!comp.includes(keyword)) return false;
    }

    // 3. Фильтр по статусу
    if (status) {
      const matchStatus = this.normalize(match.statusLabel ?? match.status ?? '');
      const filterStatus = this.normalize(status);
      if (!matchStatus.includes(filterStatus)) return false;
    }

    return true;
  }

  // ─── Выполнить поиск ─────────────────────────────────────────────────────────

  async performSearch() {
    const query  = this.searchQueryInput?.value.trim() ?? '';
    const league = this.filterLeagueSelect?.value.trim() ?? '';
    const status = this.filterStatusSelect?.value.trim() ?? '';

    console.log('[SearchManager] Search:', { query, league, status });

    // Нет фильтров → вернуть основной список
    if (!query && !league && !status) {
      this.hideResults();
      return;
    }

    // Если выбрана лига, но матчи этой лиги ещё не загружены —
    // загрузим их из API и добавим в DOM
    if (league) {
      await this.ensureLeagueLoaded(league);
    }

    this.allMatches = this.extractMatchesFromDOM();

    if (this.allMatches.length === 0) {
      this.showNoMatches('No matches available. Try loading a competition first.');
      return;
    }

    const filters = { query, league, status };
    this.filteredMatches = this.allMatches.filter((m) => this.matchesFilter(m, filters));

    console.log(`[SearchManager] Found ${this.filteredMatches.length} results`);

    if (this.filteredMatches.length === 0) {
      this.showNoMatches('No matches found. Try different search terms.');
    } else {
      this.displayResults();
    }
  }

  // ─── Загрузить лигу если её ещё нет в DOM ────────────────────────────────────

  async ensureLeagueLoaded(leagueCode) {
    if (!this.matchesListContainer) return;

    // Проверяем, есть ли уже матчи этой лиги
    const existing = this.extractMatchesFromDOM();
    const leagueMap = {
      PL:  'premier',
      CL:  'champions',
      PD:  'liga',
      BL1: 'bundesliga',
      SA:  'serie',
    };
    const keyword = leagueMap[leagueCode] ?? leagueCode.toLowerCase();
    const hasLeague = existing.some((m) => this.normalize(m.competition).includes(keyword));

    if (hasLeague) return; // уже есть

    // Загружаем
    console.log(`[SearchManager] Loading league ${leagueCode} from API...`);
    showLoadingState(this.matchesListContainer);
    const { data } = await safeGetMatches(leagueCode, 'SCHEDULED');
    if (data?.length) {
      renderMatches(this.matchesListContainer, data, false);
    }
  }

  // ─── Показать результаты ─────────────────────────────────────────────────────

  displayResults() {
    if (!this.resultsInfoDiv || !this.resultsContainer) return;

    // Скрываем основной список
    if (this.matchesListContainer) this.matchesListContainer.style.display = 'none';

    this.resultsInfoDiv.style.display = 'block';
    if (this.resultsCountSpan) this.resultsCountSpan.textContent = this.filteredMatches.length;
    this.resultsContainer.innerHTML = '';

    this.filteredMatches.forEach((match) => {
      this.resultsContainer.appendChild(this.createResultCard(match));
    });
  }

  // ─── Скрыть результаты и вернуть основной список ─────────────────────────────

  hideResults() {
    if (this.matchesListContainer) this.matchesListContainer.style.display = '';
    if (this.resultsInfoDiv) this.resultsInfoDiv.style.display = 'none';
  }

  // ─── Карточка результата ──────────────────────────────────────────────────────

  createResultCard(match) {
    const card = document.createElement('div');
    card.className = 'search-result-card';

    let scoreDisplay = 'vs';
    if (match.homeScore != null && match.awayScore != null) {
      scoreDisplay = `${match.homeScore} : ${match.awayScore}`;
    } else if (match.score) {
      scoreDisplay = match.score;
    }

    let dateDisplay = 'TBD';
    if (match.dateLabel) {
      dateDisplay = match.dateLabel;
    } else if (match.utcDate) {
      try {
        const d = new Date(match.utcDate);
        dateDisplay = d.toLocaleDateString('en-GB') + ' ' +
          d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } catch {
        dateDisplay = match.utcDate;
      }
    }

    card.innerHTML = `
      <div class="search-result-card__header">
        <h4 class="search-result-card__title">${this.esc(match.competition)}</h4>
        <span class="search-result-card__status">
          ${this.esc(match.statusLabel ?? match.status ?? 'TBD')}
        </span>
      </div>
      <div class="search-result-card__info">
        <div class="search-result-card__teams">
          <div class="search-result-card__team">
            ${match.homeCrest ? `<img src="${this.esc(match.homeCrest)}" alt="crest" class="search-result-card__team-crest" onerror="this.style.display='none'">` : ''}
            <span>${this.esc(match.homeTeam)}</span>
          </div>
          <span class="search-result-card__vs">VS</span>
          <div class="search-result-card__team">
            ${match.awayCrest ? `<img src="${this.esc(match.awayCrest)}" alt="crest" class="search-result-card__team-crest" onerror="this.style.display='none'">` : ''}
            <span>${this.esc(match.awayTeam)}</span>
          </div>
        </div>
        <div class="search-result-card__score">${this.esc(scoreDisplay)}</div>
        <div class="search-result-card__detail">
          <span class="search-result-card__label">Date:</span>
          <span class="search-result-card__value">${this.esc(dateDisplay)}</span>
        </div>
        ${match.stage ? `
          <div class="search-result-card__detail">
            <span class="search-result-card__label">Stage:</span>
            <span class="search-result-card__value">${this.esc(match.stage)}</span>
          </div>` : ''}
      </div>
    `;
    return card;
  }

  showNoMatches(message) {
    if (!this.resultsInfoDiv || !this.resultsContainer) return;
    if (this.matchesListContainer) this.matchesListContainer.style.display = 'none';

    this.resultsInfoDiv.style.display = 'block';
    this.resultsContainer.innerHTML = `
      <div class="search-no-results">
        <div class="search-no-results__icon">🔍</div>
        <p class="search-no-results__text">${this.esc(message)}</p>
      </div>
    `;
  }

  esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}