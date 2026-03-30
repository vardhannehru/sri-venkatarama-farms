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
