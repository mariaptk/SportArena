/**
 * SearchManager - handles search and filtering of matches by league, team, and status
 */

export class SearchManager {
  constructor(config = {}) {
    this.searchQueryInput = document.getElementById('search-query');
    this.filterStatusSelect = document.getElementById('filter-status');
    this.applyFiltersBtn = document.getElementById('apply-filters');
    this.searchResultsContainer = document.getElementById('search-results');
    this.resultsInfoDiv = document.querySelector('.search-results__info');
    this.resultsCountSpan = document.querySelector('#results-count span');
    this.resultsContainer = document.getElementById('results-container');
    this.matchesListContainer = document.querySelector('[data-matches-list]');

    this.allMatches = [];
    this.filteredMatches = [];

    this.init();
  }

  init() {
    if (!this.searchQueryInput || !this.applyFiltersBtn) {
      console.error('[SearchManager] ✗ Search elements not found in DOM!');
      console.error('[SearchManager] searchQueryInput:', this.searchQueryInput);
      console.error('[SearchManager] applyFiltersBtn:', this.applyFiltersBtn);
      return;
    }

    console.log('[SearchManager] ✅ All elements found in DOM');
    console.log('[SearchManager] resultsInfoDiv:', this.resultsInfoDiv);
    console.log('[SearchManager] resultsContainer:', this.resultsContainer);
    console.log('[SearchManager] matchesListContainer:', this.matchesListContainer);

    this.attachEventListeners();
    console.log('[SearchManager] ✅ Initialized with universal search');
  }

  attachEventListeners() {
    this.applyFiltersBtn.addEventListener('click', () => this.performSearch());
    
    // Allow Enter key to trigger search
    [this.searchQueryInput, this.filterStatusSelect].forEach((input) => {
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.performSearch();
        });
      }
    });
  }

  /**
   * Extract matches from the DOM or from cache
   */
  extractMatchesFromDOM() {
    if (!this.matchesListContainer) {
      console.error('[SearchManager] Matches list container not found!');
      return [];
    }

    const matches = [];
    const matchButtons = this.matchesListContainer.querySelectorAll('.match-row');

    console.log(`[SearchManager] Found ${matchButtons.length} match rows in DOM`);

    matchButtons.forEach((button, index) => {
      const payload = button.getAttribute('data-match-payload');
      if (payload) {
        try {
          const data = JSON.parse(decodeURIComponent(payload));
          matches.push(data);
          console.log(`[SearchManager] Parsed match ${index + 1}:`, data.homeTeam, 'vs', data.awayTeam);
        } catch (e) {
          console.warn('[SearchManager] Failed to parse match payload:', e);
        }
      }
    });

    console.log(`[SearchManager] ✅ Extracted ${matches.length} matches`);
    return matches;
  }

  /**
   * Normalize search strings for comparison
   */
  normalizeString(str) {
    return String(str || '').toLowerCase().trim();
  }

  /**
   * Check if a match matches all filters
   */
  matchesFilter(match, filters) {
    const { query, status } = filters;

    // Filter by query (league, team, or date)
    if (query) {
      const normalizedQuery = this.normalizeString(query);
      const competition = this.normalizeString(match.competition || '');
      const homeTeam = this.normalizeString(match.homeTeam || '');
      const awayTeam = this.normalizeString(match.awayTeam || '');
      const date = match.utcDate ? match.utcDate.split('T')[0] : '';
      if (!competition.includes(normalizedQuery) && !homeTeam.includes(normalizedQuery) && !awayTeam.includes(normalizedQuery) && !date.includes(normalizedQuery)) {
        console.log(`[Filter] ✗ Query: "${query}" not found in competition, teams, or date`);
        return false;
      }
      console.log(`[Filter] ✓ Query: "${query}" found`);
    }

    // Filter by status
    if (status && match.statusLabel) {
      const normalizedStatus = this.normalizeString(status);
      const matchStatus = this.normalizeString(match.statusLabel);
      if (!matchStatus.includes(normalizedStatus)) {
        console.log(`[Filter] ✗ Status: "${status}" not in "${match.statusLabel}"`);
        return false;
      }
      console.log(`[Filter] ✓ Status: "${status}" matches`);
    }

    return true;
  }

  /**
   * Perform the search with current filter values
   */
  performSearch() {
    const query = this.searchQueryInput.value.trim();
    const status = this.filterStatusSelect.value.trim();

    console.log('[SearchManager] performSearch called with:', { query, status });

    // If no filters applied, show main list
    if (!query && !status) {
      // Show main matches list
      if (this.matchesListContainer) {
        this.matchesListContainer.style.display = '';
      }
      if (this.resultsInfoDiv) {
        this.resultsInfoDiv.style.display = 'none';
      }
      console.log('[SearchManager] No filters - showing main matches list');
      return;
    }

    // Extract all available matches
    this.allMatches = this.extractMatchesFromDOM();

    if (this.allMatches.length === 0) {
      this.showNoMatches('No matches available in the system.');
      return;
    }

    // Apply filters
    const filters = { query, status };
    console.log(`[SearchManager] Filtering ${this.allMatches.length} matches...`);
    
    this.filteredMatches = this.allMatches.filter((match) => {
      const result = this.matchesFilter(match, filters);
      if (result) {
        console.log(`[SearchManager] ✓ Match passed filter: ${match.homeTeam} vs ${match.awayTeam}`);
      }
      return result;
    });

    console.log(`[SearchManager] Filter result: ${this.filteredMatches.length} matches found`);

    if (this.filteredMatches.length === 0) {
      this.showNoMatches('No matches found matching your filters. Try different search terms.');
      return;
    }

    this.displayResults();
  }

  /**
   * Display search results
   */
  displayResults() {
    if (!this.resultsInfoDiv || !this.resultsContainer) {
      console.error('[SearchManager] Results container not found!');
      return;
    }

    // Скрыть основной список матчей
    if (this.matchesListContainer) {
      this.matchesListContainer.style.display = 'none';
    }

    this.resultsInfoDiv.style.display = 'block';
    this.resultsCountSpan.textContent = this.filteredMatches.length;
    this.resultsContainer.innerHTML = '';

    console.log(`[SearchManager] Creating ${this.filteredMatches.length} result cards...`);

    this.filteredMatches.forEach((match, index) => {
      const card = this.createResultCard(match);
      this.resultsContainer.appendChild(card);
      console.log(`[SearchManager] Card ${index + 1} added to DOM`);
    });

    console.log(`[SearchManager] ✅ Displayed ${this.filteredMatches.length} results`);
  }

  /**
   * Create a result card element
   */
  createResultCard(match) {
    const card = document.createElement('div');
    card.className = 'search-result-card';

    // Вычисляем score
    let scoreDisplay = 'vs';
    if (match.homeScore != null && match.awayScore != null) {
      scoreDisplay = `${match.homeScore} : ${match.awayScore}`;
    } else if (match.score) {
      scoreDisplay = match.score;
    }

    // Вычисляем дату
    let dateDisplay = 'TBD';
    if (match.dateLabel) {
      dateDisplay = match.dateLabel;
    } else if (match.utcDate) {
      try {
        const date = new Date(match.utcDate);
        dateDisplay = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        dateDisplay = match.utcDate;
      }
    }

    const statusClass = `search-result-card__status--${(match.statusLabel || match.status || 'unknown').toLowerCase()}`;

    const html = `
      <div class="search-result-card__header">
        <h4 class="search-result-card__title">${this.escapeHtml(match.competition)}</h4>
        <span class="search-result-card__status ${statusClass}">
          ${this.escapeHtml(match.statusLabel || match.status || 'TBD')}
        </span>
      </div>

      <div class="search-result-card__info">
        <div class="search-result-card__teams">
          <div class="search-result-card__team">
            ${match.homeCrest ? `<img src="${this.escapeHtml(match.homeCrest)}" alt="crest" class="search-result-card__team-crest" onerror="this.style.display='none'">` : ''}
            <span>${this.escapeHtml(match.homeTeam)}</span>
          </div>
          <span class="search-result-card__vs">VS</span>
          <div class="search-result-card__team">
            ${match.awayCrest ? `<img src="${this.escapeHtml(match.awayCrest)}" alt="crest" class="search-result-card__team-crest" onerror="this.style.display='none'">` : ''}
            <span>${this.escapeHtml(match.awayTeam)}</span>
          </div>
        </div>

        <div class="search-result-card__score">
          ${this.escapeHtml(scoreDisplay)}
        </div>

        <div class="search-result-card__detail">
          <span class="search-result-card__label">Date:</span>
          <span class="search-result-card__value">${this.escapeHtml(dateDisplay)}</span>
        </div>

        ${match.stage ? `
          <div class="search-result-card__detail">
            <span class="search-result-card__label">Stage:</span>
            <span class="search-result-card__value">${this.escapeHtml(match.stage)}</span>
          </div>
        ` : ''}
      </div>
    `;

    card.innerHTML = html;
    console.log('[SearchManager] Created card for:', match.homeTeam, 'vs', match.awayTeam);
    return card;
  }

  /**
   * Show "no matches" message
   */
  showNoMatches(message) {
    if (!this.resultsInfoDiv || !this.resultsContainer) return;

    // Скрыть основной список матчей
    if (this.matchesListContainer) {
      this.matchesListContainer.style.display = 'none';
    }

    this.resultsInfoDiv.style.display = 'block';
    this.resultsContainer.innerHTML = `
      <div class="search-no-results">
        <div class="search-no-results__icon">🔍</div>
        <p class="search-no-results__text">${this.escapeHtml(message)}</p>
      </div>
    `;
  }



  /**
   * Escape HTML special characters
   */
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
