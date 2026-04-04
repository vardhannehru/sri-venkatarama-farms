# Sri Venkatarama Integrated Farms

Quail farm management app with:

- product management
- billing / POS
- daily bird targets
- login settings
- admin and salesman access

## Local development

Install dependencies:

```bash
npm install
```

Start the backend:

```bash
npm run server
```

Start the frontend in another terminal:

```bash
npm run dev
```

## Production run

Build the frontend:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

The backend serves the built frontend from `dist` and exposes the API from the same server.

## Online deployment

This project is ready for single-service deployment.

### Render

This repo includes `render.yaml`.

Steps:

1. Push the project to GitHub
2. Create a new Render Web Service from the repo
3. Render will also create a PostgreSQL database from the blueprint
4. Render will use:
   - build: `npm ci && npm run build`
   - start: `npm run start`
   - `DATABASE_URL` from the Render Postgres service
5. After deploy, open the app URL from Render

The server now behaves like this:

- local without `DATABASE_URL`: uses `backend/data/db.json`
- online with `DATABASE_URL`: uses PostgreSQL for saved data

### Docker

Build image:

```bash
docker build -t shop-app .
```

Run container:

```bash
docker run -p 4000:4000 shop-app
```

## Important note about data

For real online saving, set `DATABASE_URL` and the app will use PostgreSQL automatically.

If `DATABASE_URL` is missing, the app falls back to `backend/data/db.json` for local development.

## Google Sheets sync

The app database remains the main source of truth. Google Sheets can be used as a live mirror of all sales in one single sheet.

How it works:

- every time a sale is created or deleted, the backend sends the full sales register to Google Sheets
- the target sheet is fully refreshed from the app database
- this avoids missing rows and keeps the sheet in sync with the app

Setup:

1. Create a new Google Sheet
2. Open `Extensions -> Apps Script`
3. Paste the code from [docs/google-sheets-apps-script.js](C:\Users\vardh\.openclaw\workspace\shop-app-frontend\docs\google-sheets-apps-script.js)
4. Deploy it as a `Web app`
5. Set access to `Anyone with the link`
6. Copy the web app URL
7. Set this environment variable in your app:

```bash
GOOGLE_SHEETS_WEBHOOK_URL=your_google_apps_script_web_app_url
```

After that, all sales will be mirrored into a single sheet named `Sales Register`.
