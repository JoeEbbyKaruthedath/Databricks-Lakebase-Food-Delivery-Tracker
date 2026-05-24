# FleetViz

A personal demo project: a delivery fleet tracker built on [Databricks AppKit](https://databricks.github.io/appkit/) and [Lakebase](https://docs.databricks.com/aws/en/database/postgres/) (Postgres on Databricks).

The app visualizes synthetic delivery events on a USA map and lets you scrub through time to see order positions change. Data is stored in Lakebase and served through an Express API.

## Features

- **Delivery tracker** — map view of in-progress and completed orders across US metros
- **Timeline scrubber** — drag through time to replay fleet activity
- **Filters** — narrow by time window, order ID, and event type
- **Lakebase backend** — Postgres schema with seeded demo data (~10k events)
- **Databricks Apps deployment** — bundle config for deploying to your workspace

## Tech stack

- **Backend:** Node.js, Express, AppKit Lakebase SDK
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Leaflet
- **UI:** AppKit UI (Radix / shadcn-style components)
- **Deploy:** Databricks Asset Bundles (DABs)

## Prerequisites

- Node.js v22+ and npm
- [Databricks CLI](https://docs.databricks.com/dev-tools/cli/) v0.239+
- A Databricks workspace with Lakebase Postgres enabled
- A Lakebase project with a branch and database (see [Lakebase docs](https://docs.databricks.com/aws/en/database/postgres/))

## Quick start (local)

```bash
npm install
cp .env.example .env
# Edit .env with your Lakebase connection details
npm run dev
```

Open http://localhost:8000/

### Environment variables

Copy `.env.example` to `.env` and fill in your values. **Do not commit `.env`.**

```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
PGDATABASE=your_postgres_database
LAKEBASE_ENDPOINT=your_postgres_endpoint_path
PGHOST=your_postgres_host
PGPORT=5432
PGSSLMODE=require
DATABRICKS_APP_PORT=8000
```

`PGUSER` is optional for local scripts — it is auto-detected from your Databricks CLI profile when omitted.

See the [Lakebase plugin docs](https://databricks.github.io/appkit/docs/plugins/lakebase) for how to obtain connection values from your workspace.

### Seed demo data

After Lakebase is configured, load synthetic delivery events:

```bash
npm run seed:delivery
```

Re-seed from scratch (truncates existing data):

```bash
npm run seed:delivery -- --force
```

Requires Databricks CLI auth (`databricks auth login` or a profile in `~/.databrickscfg`).

## Databricks CLI authentication

OAuth (recommended):

```bash
databricks auth login --host https://your-workspace.cloud.databricks.com
```

Or configure named profiles in `~/.databrickscfg`:

```ini
[demo]
host = https://your-workspace.cloud.databricks.com
```

Use a profile when deploying:

```bash
databricks bundle deploy --profile demo
```

## Deployment

### 1. Configure the bundle

Edit `databricks.yml` with your workspace and Lakebase resources. For a public repo, **avoid committing real workspace URLs or resource IDs** — use a CLI profile and pass variables at deploy time instead.

Example target configuration:

```yaml
targets:
  default:
    default: true
    workspace:
      profile: demo   # references ~/.databrickscfg, not a hardcoded host
```

Find your Lakebase branch and database names:

```bash
databricks postgres list-branches projects/{project-id} --profile demo
databricks postgres list-databases {branch-name} --profile demo
```

### 2. Validate and deploy

```bash
databricks bundle validate --profile demo \
  --var postgres_branch=projects/your-project/branches/production \
  --var postgres_database=projects/your-project/branches/production/databases/your-db

databricks bundle deploy --profile demo \
  --var postgres_branch=projects/your-project/branches/production \
  --var postgres_database=projects/your-project/branches/production/databases/your-db
```

### 3. Grant schema access to the deployed app

If you seeded data before deploying, the app service principal may need read access to the `delivery` schema. Set `POSTGRES_BRANCH` in `.env` (same value as `postgres_branch` in your bundle deploy), then run:

```bash
npm run grant:delivery-app
```

Then refresh the deployed app URL.

### 4. Run the app

```bash
databricks bundle run app --profile demo
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build (client + server) |
| `npm start` | Run production build locally |
| `npm run typecheck` | TypeScript check |
| `npm run lint` / `npm run format` | Lint and format |
| `npm run test:smoke` | Playwright smoke tests |
| `npm run seed:delivery` | Seed Lakebase with demo delivery events |
| `npm run grant:delivery-app` | Grant app service principal access to `delivery` schema |

## Project structure

```
client/              React frontend (delivery map, timeline, filters)
  src/pages/delivery/
server/              Express API and Lakebase routes
  routes/lakebase/
scripts/             Seed data and permission helpers
tests/               Playwright smoke tests
databricks.yml       DABs bundle config
app.yaml             Databricks App runtime config
.env.example         Environment variable template (copy to .env)
```

## Security notes

- Never commit `.env`, credentials, or personal access tokens.
- Prefer CLI profiles (`~/.databrickscfg`) over hardcoded workspace hosts in `databricks.yml`.
- Seed data is synthetic — no real customer or driver information.

## License

MIT — see [LICENSE](LICENSE).
