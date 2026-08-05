# Play-Bio inventory: publishing and maintenance

The inventory is a static GitHub Pages page. Visitors do not need a GitHub or Google account.

## Public link

After these files are merged into `main`, the preferred address is:

`https://www.play-bio.com/inventory.html`

The GitHub Pages fallback is:

`https://caglargenc.github.io/play-bio/inventory.html`

The custom-domain address works because the repository already contains a `CNAME` file for `www.play-bio.com`.

## Publish through a pull request

1. Open the pull request created for the inventory.
2. Review the page in **Files changed**, then choose **Merge pull request**.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Wait a few minutes and open `https://www.play-bio.com/inventory.html`.

If GitHub Pages is already enabled for the site, steps 3–4 are already done.

## Keep the inventory synchronized

The website includes the current sheet as a local data snapshot, so it remains fast and available even if Google is down. The workflow `.github/workflows/update-inventory.yml` checks the sheet daily and commits a new snapshot only when something changed.

For automatic updates:

1. Keep the inventory tab published as CSV using **File → Share → Publish to web**. The website updater uses the published, read-only link; the editable spreadsheet itself does not need to be public.
2. In GitHub open **Settings → Actions → General → Workflow permissions**.
3. Select **Read and write permissions** and save.
4. Open **Actions → Update inventory from Google Sheets → Run workflow** once to test it.

Changes made in the sheet will then appear on the website after the next daily run. You can use **Run workflow** whenever an immediate refresh is needed.

If you replace the spreadsheet or republish it under a new URL, update `CSV_URL` in `scripts/update-inventory.mjs`.

## Spreadsheet columns

Do not rename these headers; the updater uses them to build the website:

- `Shelf/Drawer`
- `Item`
- `Quantity`
- `Used for (Material)`
- `Used for (process)`
- `Requires guidance while using`
- `Details/Notes`

Rows with an empty `Shelf/Drawer` or `Item` are ignored. A zero quantity is shown as out of stock.

## Adjust shelf locations

The clickable areas and their category mappings are near the top of `assets/js/inventory.js` in the `shelfAreas` array. Each area has a label, one or more spreadsheet locations, and percentage coordinates (`x`, `y`, `w`, `h`) over the illustration.
