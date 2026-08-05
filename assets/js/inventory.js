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
  const shelfMap = document.getElementById('shelf-map');
  const list = document.getElementById('inventory-list');
  const count = document.getElementById('result-count');
  const context = document.getElementById('results-context');
  let selectedLocations = [];
  let selectedMaterialLocation = '';
  let hoveredAreaIndex = null;

  // Locations are grouped into the physical areas shown in the illustration.
  const shelfAreas = [
    { label: 'Material Processing Tools', display: 'Material<br><strong>Processing <br>Tools</strong>', locations: ['Processing Tools'], line: '32,6.8 42,13', tx: 31, ty: 6, align: 'right'},
    { label: 'Moulds & Containers', display: 'Moulds &amp;<br><strong>Containers</strong>', locations: ['Moulds & Containers'], line: '78,10 62,18.5', tx: 79, ty: 9.4, align: 'left'},
    { label: 'Biomaterial Ingredients', display: 'Biomaterial<br><strong>Ingredients</strong>', locations: ['Biomaterial Ingredients'], line: '23,26 40,23', tx: 22, ty: 27, align: 'right'},
    { label: 'Biomaterial Samples', display: 'Biomaterial<br><strong>Samples</strong>', locations: ['Biomaterial Samples / Seeds'], line: '22,44.5 40,35', tx: 21, ty: 45, align: 'right'},
    { label: 'Sterile Culture Supplies', display: 'Sterile<br><strong>Culture <br>Supplies</strong>', locations: ['Sterile Culture Supplies', 'Sterile Culture Supplies / Filters', 'Sterile Culture Supplies / Syringes'], line: '81,30 62,30', tx: 82, ty: 30, align: 'left'},
    { label: 'Cleaning & Safety', display: 'Cleaning &amp;<br><strong>Safety</strong>', locations: ['Cleaning & Safety'], line: '79,49 65,45', tx: 80, ty: 50, align: 'left'},
    { label: 'Tools for Measuring', display: 'Tools for<br><strong>Measuring</strong>', locations: ['Measuring'], line: '77,62 63,52', tx: 78, ty: 66, align: 'left' },
    { label: 'Miscellaneous Tools & Accessories', display: 'Misc.<br><strong>Tools &amp;<br> Accs.</strong>', locations: ['Misc. Tools & Accs.'], line: '17,73 30,72', tx: 16, ty: 73, align: 'right'},
    { label: 'Bio-stuff', display: '<strong>Bio-stuff</strong>', locations: ['BioStuff'], line: '23,89 30,83', tx: 30, ty: 92, align: 'right'},
    { label: 'Disposable & Consumables', display: 'Disposable &amp;<br><strong>Consumables</strong>', locations: ['Disposable & Consumables'], line: '58,92 53,83', tx: 63, ty: 96, align: 'center'}
  ];

  function init() {
    if (!list || !searchInput) return;
    renderFilters();
    renderHotspots();
    bindSpotlight();
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
      selectedMaterialLocation = '';
      hoveredAreaIndex = null;
      searchInput.value = '';
      stockCheckbox.checked = false;
      render();
    });
    stockCheckbox.addEventListener('change', render);
    list.addEventListener('click', event => {
      const button = event.target.closest('[data-location]');
      if (button && button.classList.contains('location-pill')) {
        toggleLocation(button.dataset.location);
        return;
      }
      const card = event.target.closest('.inventory-card');
      if (card) selectMaterialLocation(card.dataset.materialLocation);
    });
    list.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('.inventory-card');
      if (!card || event.target.closest('button')) return;
      event.preventDefault();
      selectMaterialLocation(card.dataset.materialLocation);
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
    const lines = shelfAreas.map((area, index) => {
      const points = area.line.split(' ').map(point => point.split(',').map(Number));
      const [start, end] = points;
      return `<g class="shelf-callout-line" data-area="${index}"><line x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}"/><circle cx="${start[0]}" cy="${start[1]}" r=".7"/></g>`;
    }).join('');
    const labels = shelfAreas.map((area, index) => `<button class="shelf-callout-label is-${area.align}" type="button" data-area="${index}" aria-label="Show ${escapeAttr(area.label)}" aria-pressed="false" style="left:${area.tx}%;top:${area.ty}%">${area.display}</button>`).join('');
    const shelfButtons = shelfAreas.map((area, index) => `<button class="shelf-hotspot" type="button" data-area="${index}" aria-label="Show ${escapeAttr(area.label)}" aria-pressed="false" style="left:${area.x}%;top:${area.y}%;width:${area.w}%;height:${area.h}%"></button>`).join('');
    hotspots.innerHTML = `<svg class="shelf-callout-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${labels}${shelfButtons}`;
    hotspots.addEventListener('click', event => {
      const button = event.target.closest('[data-area]');
      if (!button) return;
      const area = shelfAreas[Number(button.dataset.area)];
      const allSelected = area.locations.every(location => selectedLocations.includes(location));
      selectedMaterialLocation = '';
      selectedLocations = allSelected ? selectedLocations.filter(location => !area.locations.includes(location)) : [...new Set([...selectedLocations, ...area.locations])];
      render();
      document.getElementById('results-heading').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    hotspots.addEventListener('pointerover', event => setCalloutHover(event.target.closest('[data-area]'), true));
    hotspots.addEventListener('pointerout', event => {
      const target = event.target.closest('[data-area]');
      if (!target || event.relatedTarget?.closest?.(`[data-area="${target.dataset.area}"]`)) return;
      setCalloutHover(target, false);
    });
  }

  function bindSpotlight() {
    updateSpotlights();
  }

  function updateSpotlights() {
    if (!shelfMap) return;
    const activeIndexes = shelfAreas.reduce((indexes, area, index) => {
      const active = area.locations.some(location => location === selectedMaterialLocation)
        || area.locations.every(location => selectedLocations.includes(location));
      if (active) indexes.push(index);
      return indexes;
    }, []);
    if (hoveredAreaIndex !== null && !activeIndexes.includes(hoveredAreaIndex)) activeIndexes.push(hoveredAreaIndex);

    const circles = shelfMap.querySelector('#shelf-spotlight-circles');
    if (!circles) return;
    circles.replaceChildren();
    activeIndexes.forEach(index => {
      // The marker circle is drawn at the first point; reveal the opposite endpoint.
      const end = shelfAreas[index].line.trim().split(/\s+/).at(-1).split(',').map(Number);
      circles.insertAdjacentHTML('beforeend', `<ellipse class="shelf-spotlight-circle" cx="${end[0]}" cy="${end[1]}" rx="13" ry="11.28" fill="black"/>`);
    });
    shelfMap.classList.toggle('is-spotlight-visible', activeIndexes.length > 0);
  }

  function setCalloutHover(target, hovered) {
    if (!target) return;
    hotspots.querySelectorAll(`[data-area="${target.dataset.area}"]`).forEach(element => element.classList.toggle('is-hovered', hovered));
    hoveredAreaIndex = hovered ? Number(target.dataset.area) : null;
    updateSpotlights();
  }

  function toggleLocation(location) {
    selectedMaterialLocation = '';
    selectedLocations = selectedLocations.includes(location)
      ? selectedLocations.filter(value => value !== location)
      : [...selectedLocations, location];
    render();
  }

  function selectMaterialLocation(location) {
    selectedMaterialLocation = selectedMaterialLocation === location ? '' : location;
    updateControls();
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
      list.innerHTML = `<div class="empty-state"><h3>No materials or tools found</h3><p>Try a broader word, clear the selected locations, or include out-of-stock items.</p></div>`;
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
      const active = area.locations.some(location => location === selectedMaterialLocation) || area.locations.every(location => selectedLocations.includes(location));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.shelf-callout-line').forEach(line => {
      const area = shelfAreas[Number(line.dataset.area)];
      line.classList.toggle('is-active', area.locations.some(location => location === selectedMaterialLocation) || area.locations.every(location => selectedLocations.includes(location)));
    });
    document.querySelectorAll('.inventory-card').forEach(card => card.classList.toggle('is-selected', card.dataset.materialLocation === selectedMaterialLocation));
    updateSpotlights();
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
    return `<article class="inventory-card" data-material-location="${escapeAttr(item.location)}" tabindex="0" aria-label="Highlight shelf for ${escapeAttr(item.item)}">
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
