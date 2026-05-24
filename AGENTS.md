# FleetViz — Agent Dev Workflow

Repository: [Chera-AI/Databricks-Demo](https://github.com/Chera-AI/Databricks-Demo)

App code lives in `fleetviz-app/` (Databricks AppKit + Lakebase).

## Git workflow (required)

1. **Start from `main`**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a feature branch** — never commit feature work directly on `main`
   ```bash
   git checkout -b feature/<short-kebab-description>
   # examples: feature/timeline-scrubber, fix/map-usa-bounds
   ```

3. **Make changes** in `fleetviz-app/` (and root files like this doc when needed).

4. **Validate before commit**
   ```bash
   cd fleetviz-app
   npm run typecheck
   ```

5. **Commit** with a clear message focused on *why* (one logical change per commit when possible).

6. **Push branch and open a PR**
   ```bash
   git push -u origin HEAD
   gh pr create --title "..." --body "..."
   ```
   Do not force-push to `main`.

## Local development

```bash
cd fleetviz-app
npm install
npm run dev
```

App: http://localhost:8000/

### Lakebase seed data

```bash
cd fleetviz-app
npm run seed:delivery          # skip if already seeded
npm run seed:delivery -- --force # truncate and reseed
```

Requires Databricks CLI auth (`--profile demo` or `DATABRICKS_CONFIG_PROFILE` in `.env`).

## Databricks

- **Profile:** `demo` (confirm with user if multiple profiles exist).
- **Lakebase project:** `fleetviz`
- **Validate bundle:** `databricks bundle validate --profile demo`
- **Deploy:** `databricks bundle deploy --profile demo`

Deploy the app before relying on Lakebase schema permissions in production; see Databricks Lakebase docs for service-principal ownership.

## Project conventions

- App name: `fleetviz-app` (≤26 chars, lowercase/hyphens).
- Delivery UI is the landing page (`/`).
- Map is constrained to continental USA bounds.
- Do not commit `.env`, `node_modules/`, or build artifacts.

## Smoke tests

```bash
cd fleetviz-app
npm run test:smoke
```

Update `tests/smoke.spec.ts` when changing visible headings or primary routes.
