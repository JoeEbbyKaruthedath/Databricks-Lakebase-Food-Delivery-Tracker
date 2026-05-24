# Databricks Lakebase Food Delivery Tracker

A personal portfolio project: **FleetViz**, a food delivery fleet tracker built on [Databricks AppKit](https://databricks.github.io/appkit/) and [Lakebase](https://docs.databricks.com/aws/en/database/postgres/) (Postgres on Databricks).

Explore synthetic delivery events on a USA map, scrub through time to replay fleet activity, and filter by order or event type. Data is stored in Lakebase and served through an Express API.

## Highlights

- Interactive **Leaflet map** with order markers across US metros
- **Timeline scrubber** to replay delivery activity over time
- **Lakebase Postgres** backend with ~10k seeded demo events
- Deployable as a **Databricks App** via Asset Bundles (DABs)

## Tech stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Leaflet |
| Backend | Node.js, Express, AppKit Lakebase SDK |
| Data | Lakebase Postgres (Autoscaling) |
| Deploy | Databricks Asset Bundles, Databricks Apps |

## Quick start

All application code lives in [`fleetviz-app/`](fleetviz-app/).

```bash
cd fleetviz-app
npm install
cp .env.example .env
# Edit .env with your Lakebase connection details
npm run dev
```

Open http://localhost:8000/

For seeding demo data, Databricks CLI auth, deployment, and the full script reference, see **[fleetviz-app/README.md](fleetviz-app/README.md)**.

## Repository layout

```
fleetviz-app/     Databricks App (client, server, scripts, bundle config)
LICENSE           MIT license
AGENTS.md         Agent/dev workflow notes
```

## Security

- Do not commit `.env` or credentials.
- `databricks.yml` uses CLI profiles — pass Lakebase resource IDs via `--var` at deploy time.
- Seed data is synthetic; no real customer or driver information.

## License

MIT — see [LICENSE](LICENSE).

## Author

Joe Karuthedath — [GitHub](https://github.com/JoeEbbyKaruthedath)
