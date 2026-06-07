# Curiosity Link

Curiosity Link is a production-ready Instagram bio landing page with private analytics. It records privacy-conscious visit metadata, shows a playful landing page, and protects analytics/settings behind an admin login.

## Folder Structure

```text
curiosity-link/
  database/schema.sql
  scripts/create-admin.ts
  src/client/
    App.tsx
    api.ts
    main.tsx
    styles.css
  src/server/
    auth.ts
    db.ts
    index.ts
    security.ts
    validation.ts
  .env.example
  docker-compose.yml
  index.html
  package.json
  tsconfig.json
  tsconfig.server.json
  vite.config.ts
```

## Environment Variables

Copy `.env.example` to `.env` and change every secret before deployment.

```bash
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://curiosity:curiosity@localhost:5432/curiosity_link
DATABASE_SSL=false
SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeMe123!
APP_ORIGIN=http://localhost:5173
```

## Local Installation

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:schema
npm run admin:create
npm run dev
```

Open `http://localhost:5173` for the landing page and `http://localhost:5173/admin` for the dashboard.

For a production-mode local smoke test after `npm run build`, run `npm start` and open `http://localhost:8080`.

Sample testing credentials from `.env.example`:

```text
Username: admin
Password: ChangeMe123!
```

Change them immediately before using the app publicly.

## Production Deployment

### Fastest Path: Render Blueprint

This repo includes `render.yaml`, which creates:

- A Node web service
- A managed PostgreSQL database
- Generated `SESSION_SECRET`
- Health checks
- Automatic schema/admin setup on service start

Steps:

1. Push this repo to GitHub.
2. In Render, choose **New > Blueprint**.
3. Select the GitHub repo.
4. Before the first deploy, set:
   - `ADMIN_PASSWORD`: a strong private password
   - `APP_ORIGIN`: your Render service URL, for example `https://curiosity-link.onrender.com`
5. Deploy.
6. Visit `/admin` and log in with `ADMIN_USERNAME` plus your password.

The start command runs `npm run db:migrate` and `npm run admin:create` automatically. Both are idempotent.

### Generic Node Host

1. Create a PostgreSQL database on Render, Railway, Fly.io, Supabase, Neon, or another managed provider.
2. Set production environment variables:
   - `NODE_ENV=production`
   - `DATABASE_URL`
   - `DATABASE_SSL=true` if your database requires SSL
   - `SESSION_SECRET`
   - `APP_ORIGIN=https://your-domain.com`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
3. Run `npm install`, `npm run build`, `npm run db:migrate`, and `npm run admin:create`.
4. Start the app with `npm start`.
5. Put your deployed URL in your Instagram bio.

## Privacy Notes

The app stores timestamp, device/browser/OS, screen resolution, language, approximate GeoIP country/city, referrer, and a generated visitor identifier. It does not attempt to collect Instagram usernames, Instagram passwords, phone numbers, email addresses, or private social media account information.

## Admin Features

- Total, unique, daily, and weekly visit metrics.
- Country, device, browser breakdowns.
- Daily traffic chart.
- Recent visitor table.
- Editable landing copy, button text, and theme colors.
- CSV export.
- Delete/reset analytics records.
