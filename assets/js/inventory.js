(function () {
  'use strict';

  const items = Array.isArray(window.PLAYBIO_INVENTORY) ? window.PLAYBIO_INVENTORY : [];
  const locations = [...new Set(items.map(item => item.location))].sort((a, b) => a.localeCompare(b));
  const searchInput = document.getElementById('inventory-search');
  const searchWrap = searchInput && searchInput.closest('.inventory-search');
  const clearButton = document.getElementById('inventory-clear');
  const showAllButton = document.getElementById('show-all');
  const stockCheckbox = document.getElementById('in-stock-only');
  const filters = document.getElementById('shelf-filters');
  const hotspots = document.getElementById('shelf-hotspots');
  const list = document.getElementById('inventory-list');
  const count = document.getElementById('result-count');
  const context = document.getElementById('results-context');
  let selectedLocations = [];

  // Locations are grouped into the physical areas shown in the illustration.
  const shelfAreas = [
    { label: 'Ingredients', short: 'Ingredients', locations: ['Biomaterial Ingredients'], x: 24, y: 10, w: 42, h: 13 },
    { label: 'Samples & seeds', short: 'Samples', locations: ['Biomaterial Samples / Seeds'], x: 31, y: 25, w: 36, h: 12 },
    { label: 'Sterile culture supplies', short: 'Sterile', locations: ['Sterile Culture Supplies', 'Sterile Culture Supplies / Filters', 'Sterile Culture Supplies / Syringes'], x: 27, y: 39, w: 41, h: 13 },
    { label: 'Cleaning & safety', short: 'Safety', locations: ['Cleaning & Safety'], x: 34, y: 54, w: 33, h: 11 },
    { label: 'Disposable supplies', short: 'Disposable', locations: ['Disposable & Consumables'], x: 21, y: 66, w: 28, h: 10 },
    { label: 'Moulds & containers', short: 'Containers', locations: ['Moulds & Containers'], x: 48, y: 65, w: 29, h: 10 },
    { label: 'Processing tools', short: 'Processing', locations: ['Processing Tools'], x: 23, y: 77, w: 48, h: 12 },
    { label: 'Measuring tools', short: 'Measuring', locations: ['Measuring'], x: 23, y: 89, w: 21, h: 8 },
    { label: 'Miscellaneous tools', short: 'Misc. tools', locations: ['Misc. Tools & Accs.'], x: 45, y: 89, w: 24, h: 8 },
    { label: 'BioStuff', short: 'BioStuff', locations: ['BioStuff'], x: 70, y: 77, w: 10, h: 20 }
  ];

  function init() {
    if (!list || !searchInput) return;
    renderFilters();
    renderHotspots();
    restoreState();
    bindEvents();
    render();
  }

  function bindEvents() {
    searchInput.addEventListener('input', render);
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.focus();
      render();
    });
    showAllButton.addEventListener('click', () => {
      selectedLocations = [];
      searchInput.value = '';
      stockCheckbox.checked = false;
      render();
    });
    stockCheckbox.addEventListener('change', render);
    list.addEventListener('click', event => {
      const button = event.target.closest('[data-location]');
      if (button) toggleLocation(button.dataset.location);
    });
  }

  function renderFilters() {
    filters.innerHTML = locations.map(location => `<button class="shelf-filter" type="button" data-location="${escapeAttr(location)}" aria-pressed="false">${escapeHtml(location)}</button>`).join('');
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-location]');
      if (!button) return;
      toggleLocation(button.dataset.location);
    });
  }

  function renderHotspots() {
    hotspots.innerHTML = shelfAreas.map((area, index) => `<button class="shelf-hotspot" type="button" data-area="${index}" data-short="${escapeAttr(area.short)}" aria-label="Show ${escapeAttr(area.label)}" aria-pressed="false" style="left:${area.x}%;top:${area.y}%;width:${area.w}%;height:${area.h}%"></button>`).join('');
    hotspots.addEventListener('click', event => {
      const button = event.target.closest('[data-area]');
      if (!button) return;
      const area = shelfAreas[Number(button.dataset.area)];
      const allSelected = area.locations.every(location => selectedLocations.includes(location));
      selectedLocations = allSelected ? selectedLocations.filter(location => !area.locations.includes(location)) : [...new Set([...selectedLocations, ...area.locations])];
      render();
      document.getElementById('results-heading').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function toggleLocation(location) {
    selectedLocations = selectedLocations.includes(location)
      ? selectedLocations.filter(value => value !== location)
      : [...selectedLocations, location];
    render();
  }

  function restoreState() {
    const params = new URLSearchParams(window.location.search);
    searchInput.value = params.get('q') || '';
    const requested = params.getAll('location');
    selectedLocations = requested.filter(location => locations.includes(location));
    stockCheckbox.checked = params.get('stock') === '1';
  }

  function render() {
    const query = normalize(searchInput.value);
    const inStockOnly = stockCheckbox.checked;
    const shown = items.filter(item => {
      const locationMatch = !selectedLocations.length || selectedLocations.includes(item.location);
      const stockMatch = !inStockOnly || Number(item.quantity) > 0;
      const searchMatch = !query || normalize([item.item, item.location, item.material, item.process, item.guidance, item.notes].join(' ')).includes(query);
      return locationMatch && stockMatch && searchMatch;
    });

    searchWrap.classList.toggle('has-value', Boolean(searchInput.value));
    count.textContent = shown.length;
    context.textContent = makeContext(query);
    updateControls();
    updateUrl(query, inStockOnly);

    if (!shown.length) {
      list.innerHTML = `<div class="empty-state"><h3>No materials found</h3><p>Try a broader word, clear the selected locations, or include out-of-stock materials.</p></div>`;
      return;
    }

    list.innerHTML = shown.map(renderCard).join('');
  }

  function makeContext(query) {
    const place = selectedLocations.length === 0 ? 'All locations' : selectedLocations.length === 1 ? selectedLocations[0] : `${selectedLocations.length} selected locations`;
    return query ? `${place} • Search: “${searchInput.value.trim()}”` : place;
  }

  function updateControls() {
    document.querySelectorAll('[data-location]').forEach(button => {
      const active = selectedLocations.includes(button.dataset.location);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-area]').forEach(button => {
      const area = shelfAreas[Number(button.dataset.area)];
      const active = area.locations.every(location => selectedLocations.includes(location));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function updateUrl(query, inStockOnly) {
    const params = new URLSearchParams();
    if (query) params.set('q', searchInput.value.trim());
    selectedLocations.forEach(location => params.append('location', location));
    if (inStockOnly) params.set('stock', '1');
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState(null, '', next);
  }

  function renderCard(item) {
    const guidance = normalize(item.guidance) === 'yes';
    return `<article class="inventory-card">
      <div class="inventory-card__top">
        <h3>${escapeHtml(item.item)}</h3>
        <span class="quantity${Number(item.quantity) === 0 ? ' is-empty' : ''}" title="Quantity">×${escapeHtml(item.quantity)}</span>
      </div>
      <button class="location-pill" type="button" data-location="${escapeAttr(item.location)}" aria-label="Filter by ${escapeAttr(item.location)}">${escapeHtml(item.location)}</button>
      <dl>
        <div><dt>Used for material</dt><dd>${value(item.material)}</dd></div>
        <div><dt>Process</dt><dd>${value(item.process)}</dd></div>
        <div><dt>Guidance required</dt><dd class="${guidance ? 'guidance-yes' : ''}">${guidance ? 'Yes — ask before use' : 'No'}</dd></div>
        <div><dt>Details / notes</dt><dd>${value(item.notes)}</dd></div>
      </dl>
    </article>`;
  }

  function value(input) { return input ? escapeHtml(input) : '—'; }
  function normalize(input) { return String(input || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
  function escapeHtml(input) { return String(input ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
  function escapeAttr(input) { return escapeHtml(input).replaceAll('"', '&quot;'); }

  init();
}());
