import { writeFile } from 'node:fs/promises';

// Published CSV URL for the inventory tab. This endpoint is intentionally
// read-only and does not require a visitor or GitHub Actions to sign in.
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFqotpaATHNnW0zRCsh9_2SZKvRn1N7DJRU74eKmSJiOWffIINmo8b_Rc50VBH0g/pub?output=csv';
const OUTPUT = new URL('../assets/js/inventory-data.js', import.meta.url);

const response = await fetch(CSV_URL);
if (!response.ok) throw new Error(`Google Sheet download failed (${response.status})`);

const table = parseCsv(await response.text());
const headers = table.shift() || [];
const expected = ['Shelf/Drawer', 'Item', 'Quantity', 'Used for (Material)', 'Used for (process)', 'Requires guidance while using', 'Details/Notes'];
for (const column of expected) {
  if (!headers.includes(column)) throw new Error(`Required column is missing: ${column}`);
}

const valueAt = (row, name) => String(row[headers.indexOf(name)] || '').trim();
const records = table
  .filter(row => row.some(value => String(value).trim()))
  .map(row => ({
    location: valueAt(row, 'Shelf/Drawer'),
    item: valueAt(row, 'Item'),
    quantity: Number(valueAt(row, 'Quantity')) || 0,
    material: valueAt(row, 'Used for (Material)'),
    process: valueAt(row, 'Used for (process)'),
    guidance: valueAt(row, 'Requires guidance while using'),
    notes: valueAt(row, 'Details/Notes')
  }))
  .filter(record => record.location && record.item);

await writeFile(OUTPUT, `window.PLAYBIO_INVENTORY = ${JSON.stringify(records)};\n`, 'utf8');
console.log(`Updated ${records.length} inventory records.`);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (quoted && next === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
