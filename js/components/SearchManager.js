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
  }

  extractMatchesFromDOM() {
    if (!this.matchesListContainer) return [];

    const rows = this.matchesListContainer.querySelectorAll('.match-row');
    const matches = [];

    rows.forEach((row) => {
      const payload = row.getAttribute('data-match-payload');
      if (!payload) return;
      try {
        matches.push(JSON.parse(decodeURIComponent(payload)));
      } catch (e) {
        console.warn('[SearchManager] Failed to parse match payload:', e);
      }
    });

    return matches;
  }

  normalize(str) {
    return String(str ?? '').toLowerCase().trim();
  }

  matchesFilter(match, filters) {
    const { query, league, status } = filters;

    if (query) {
      const q = this.normalize(query);
      const home = this.normalize(match.homeTeam);
      const away = this.normalize(match.awayTeam);
      const comp = this.normalize(match.competition);
      const date = match.utcDate ? match.utcDate.split('T')[0] : '';

      if (!home.includes(q) && !away.includes(q) && !comp.includes(q) && !date.includes(q)) {
        return false;
      }
    }

    if (league) {
      const comp = this.normalize(match.competition);
      const leagueMap = {
        PL: 'premier',
        CL: 'champions',
        PD: 'liga',
        BL1: 'bundesliga',
        SA: 'serie',
      };
      const keyword = leagueMap[league] ?? this.normalize(league);
      if (!comp.includes(keyword)) return false;
    }

    if (status) {
      const matchStatus = this.normalize(match.statusLabel ?? match.status ?? '');
      const filterStatus = this.normalize(status);
      if (!matchStatus.includes(filterStatus)) return false;
    }

    return true;
  }

  async performSearch() {
    const query = this.searchQueryInput?.value.trim() ?? '';
    const league = this.filterLeagueSelect?.value.trim() ?? '';
    const status = this.filterStatusSelect?.value.trim() ?? '';

    if (!query && !league && !status) {
      this.hideResults();
      return;
    }

    if (league) {
      await this.ensureLeagueLoaded(league, status);
    }

    this.allMatches = this.extractMatchesFromDOM();

    if (this.allMatches.length === 0) {
      this.showNoMatches('No matches available. Try loading a competition first.');
      return;
    }

    const filters = { query, league, status };
    this.filteredMatches = this.allMatches.filter((m) => this.matchesFilter(m, filters));

    if (this.filteredMatches.length === 0) {
      this.showNoMatches('No matches found. Try different search terms.');
    } else {
      this.displayResults();
    }
  }

  async ensureLeagueLoaded(leagueCode, status = '') {
    if (!this.matchesListContainer) return;

    const existing = this.extractMatchesFromDOM();
    const leagueMap = {
      PL: 'premier',
      CL: 'champions',
      PD: 'liga',
      BL1: 'bundesliga',
      SA: 'serie',
    };
    const keyword = leagueMap[leagueCode] ?? leagueCode.toLowerCase();
    const hasLeague = existing.some((m) => this.normalize(m.competition).includes(keyword));

    if (hasLeague) return;

    const statuses = status ? [status] : ['LIVE', 'FINISHED', 'SCHEDULED'];
    showLoadingState(this.matchesListContainer);

    const results = await Promise.allSettled(statuses.map((st) => safeGetMatches(leagueCode, st)));
    const matches = results
      .filter((result) => result.status === 'fulfilled' && result.value.data)
      .flatMap((result) => result.value.data);

    if (matches.length) {
      renderMatches(this.matchesListContainer, matches, false);
    }
  }

  displayResults() {
    if (!this.resultsInfoDiv || !this.resultsContainer) return;

    if (this.matchesListContainer) this.matchesListContainer.style.display = 'none';

    this.resultsInfoDiv.style.display = 'block';
    if (this.resultsCountSpan) this.resultsCountSpan.textContent = this.filteredMatches.length;
    this.resultsContainer.innerHTML = '';

    this.filteredMatches.forEach((match) => {
      this.resultsContainer.appendChild(this.createResultCard(match));
    });
  }

  hideResults() {
    if (this.matchesListContainer) this.matchesListContainer.style.display = '';
    if (this.resultsInfoDiv) this.resultsInfoDiv.style.display = 'none';
  }

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