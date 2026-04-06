const PUBLICATIONS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRKwkKKTjaOgm47Ff3E_oL4wBwzR6VUe3fwh9ZkjbGFD51lZ14NrSoY9K2gV8FugF29mlshHkqbNLEk/pub?output=csv';

const TOOLS = [
  {
    title: 'Shroom Cards',
    subtitle: 'A toolkit for exploring roles and purposes in more-than-human design',
    category: 'Design Cards',
    image: 'images/shroomcards.png',
    body: 'A set of design cards that aims to help us explore this shift by encouraging us to reflect on the MtH relationalities in design practice. They present initial starting points to articulate, reflect, and act on different relationalities in MtH design in practice.',
    link: 'shroomcards.html'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  if (page === 'publications') initPublications();
  if (page === 'tools') initTools();
});

async function initHome() {
  const outcomes = [];

  // Add tools first
  TOOLS.slice(0, 3).forEach(t => {
    outcomes.push({
      type: 'Tool',
      title: t.title,
      text: t.body,
      image: t.image,
      href: 'tools.html'
    });
  });

  // Then add publications
  try {
    const pubs = await loadPublications();
    pubs.slice(0, 3).forEach(p => {
      outcomes.push({
        type: 'Publication',
        title: p.title || 'Untitled publication',
        text: p.abstractShort || p.abstract || p.venue || 'Recent publication from the project.',
        image: p.image || 'images/publication-placeholder.jpg',
        href: 'publications.html'
      });
    });
  } catch (error) {
    console.error(error);
  }

  renderCarousel(outcomes.slice(0, 6));
}

async function initPublications() {
  const grid = document.getElementById('pub-grid');
  const search = document.getElementById('pub-search');
  if (!grid) return;

  grid.innerHTML = '<div class="loading">Loading publications…</div>';

  try {
    const publications = await loadPublications();
    let shown = publications.slice();

    const render = (items) => {
      if (!items.length) {
        grid.innerHTML = '<div class="error-state">No publications matched your search.</div>';
        return;
      }
      grid.innerHTML = items.map(renderPublicationCard).join('');
      attachPublicationToggleHandlers();
    };

    render(shown);

    if (search) {
      search.addEventListener('input', (event) => {
        const q = event.target.value.trim().toLowerCase();
        shown = publications.filter(item => {
          const haystack = [
            item.title, item.authors, item.venue, item.type,
            item.abstract, item.abstractShort, item.role, item.projectTags, item.methodTags
          ].join(' ').toLowerCase();
          return haystack.includes(q);
        });
        render(shown);
      });
    }
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<div class="error-state">Could not load publications data from the Google Sheet.</div>';
  }
}

function initTools() {
  const grid = document.getElementById('tools-grid');
  if (!grid) return;
  grid.innerHTML = TOOLS.map((tool) => renderToolCard(tool)).join('');
}

function renderCarousel(items) {
  const track = document.querySelector('[data-carousel-track]');
  const prev = document.querySelector('[data-carousel-prev]');
  const next = document.querySelector('[data-carousel-next]');
  if (!track || !prev || !next) return;

  track.innerHTML = items.map(item => `
    <div class="carousel-card">
      <div class="carousel-card__inner">
        <div class="carousel-card__thumb">
          <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.title)}">
        </div>
        <div class="carousel-card__content">
          <div class="carousel-card__type">${escapeHtml(item.type)}</div>
          <h3 class="carousel-card__title">${escapeHtml(item.title)}</h3>
          <p class="carousel-card__text">${escapeHtml(item.text)}</p>
          <a href="${escapeAttr(item.href)}">Open ${escapeHtml(item.type.toLowerCase())} →</a>
        </div>
      </div>
    </div>
  `).join('');

  const slides = Array.from(track.children);
  let current = 0;

  function update() {
    const width = slides[0] ? slides[0].getBoundingClientRect().width : 0;
    track.style.transform = `translateX(-${current * width}px)`;
  }

  prev.addEventListener('click', () => {
    current = current === 0 ? slides.length - 1 : current - 1;
    update();
  });

  next.addEventListener('click', () => {
    current = current === slides.length - 1 ? 0 : current + 1;
    update();
  });

  window.addEventListener('resize', update);
  update();
}

function renderPublicationCard(item) {
  const links = [];
  if (item.pdf) links.push(`<a class="btn" href="${escapeAttr(item.pdf)}" target="_blank" rel="noreferrer">PDF</a>`);
  if (item.doi) links.push(`<a class="btn" href="${escapeAttr(item.doi)}" target="_blank" rel="noreferrer">DOI</a>`);
  if (item.publisher) links.push(`<a class="btn btn-outline" href="${escapeAttr(item.publisher)}" target="_blank" rel="noreferrer">Publisher</a>`);

  return `
    <article class="pub-card">
      <div class="pub-thumb">
        <img src="${escapeAttr(item.image || 'images/publication-placeholder.jpg')}" alt="${escapeAttr(item.title || 'Publication image')}">
      </div>
      <div class="pub-meta">
        <div class="pub-kicker">${escapeHtml([item.year, item.type, item.venue].filter(Boolean).join(' • '))}</div>
        <h2 class="pub-title">${escapeHtml(item.title || 'Untitled publication')}</h2>
        ${item.authors ? `<p class="pub-authors">${escapeHtml(item.authors)}</p>` : ''}
        ${item.abstractShort || item.abstract ? `<p class="pub-abstract">${escapeHtml(item.abstractShort || item.abstract)}</p>` : ''}
        <div class="pub-actions">
          <button class="btn btn-outline js-toggle-details" type="button">Details</button>
          ${links.join('')}
        </div>
        <div class="pub-details">
          ${item.abstractFull ? `<p>${escapeHtml(item.abstractFull)}</p>` : ''}
          ${item.methodTags ? `<p><strong>Method tags:</strong> ${escapeHtml(item.methodTags)}</p>` : ''}
        </div>
      </div>
    </article>
  `;
}

function attachPublicationToggleHandlers() {
  document.querySelectorAll('.js-toggle-details').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.pub-card');
      if (!card) return;
      card.classList.toggle('open');
      button.textContent = card.classList.contains('open') ? 'Hide details' : 'Details';
    });
  });
}

function renderToolCard(tool) {
  return `
    <article class="tool-card">
      <div class="tool-card__inner">
        <div class="tool-card__media">
          <img src="${escapeAttr(tool.image)}" alt="${escapeAttr(tool.title)}">
        </div>
        <div class="tool-card__copy">
          <div class="tool-card__kicker">${escapeHtml(tool.category)}</div>
          <h2 class="tool-card__title">${escapeHtml(tool.title)}</h2>
          <p class="tool-card__subtitle">${escapeHtml(tool.subtitle)}</p>
          <p class="tool-card__text">${escapeHtml(tool.body)}</p>
          <a class="btn" href="${escapeAttr(tool.link || '#')}">Learn more</a>
        </div>
      </div>
    </article>
  `;
}

async function loadPublications() {
  const response = await fetch(PUBLICATIONS_CSV_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to fetch publications CSV');
  const csv = await response.text();
  return parseCSV(csv).map(normalizeRow).filter(item => item.title);
}

function normalizeRow(row) {
  const pick = (...keys) => {
    for (const key of keys) if (row[key]) return row[key];
    return '';
  };

  return {
    id: pick('id'),
    title: pick('title'),
    authors: pick('authors'),
    year: pick('year'),
    venue: pick('venue', 'venueshort', 'venue short'),
    type: pick('type'),
    abstract: pick('abstract'),
    abstractShort: pick('abstractshort', 'abstract short'),
    abstractFull: pick('abstractfull', 'abstract full'),
    image: normalizeAssetPath(pick('image', 'imageurl', 'thumbnail', 'thumb', 'img')) || 'images/publication-placeholder.jpg',
    pdf: normalizeAssetPath(pick('pdf', 'pdflink', 'pdf link')),
    doi: normalizeAssetPath(pick('doi')),
    publisher: normalizeAssetPath(pick('publisher', 'publisher link', 'acm')),
    projectTags: pick('projecttags', 'project tags'),
    methodTags: pick('methodtags', 'method tags'),
    role: pick('role', 'roles')
  };
}

function normalizeAssetPath(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (/^(https?:)?\/\//i.test(v) || v.startsWith('/') || v.startsWith('#') || v.startsWith('mailto:')) return v;
  return v.replace(/^\.?\//, '');
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(field);
      field = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(field);
      if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some(cell => String(cell).trim() !== '')) rows.push(row);
  }

  const headers = (rows.shift() || []).map(h => String(h).trim().toLowerCase());
  return rows.map(cells => {
    const obj = {};
    headers.forEach((header, idx) => obj[header] = String(cells[idx] || '').trim());
    return obj;
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', '&quot;');
}
