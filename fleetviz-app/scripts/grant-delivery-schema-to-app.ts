import { createLakebasePool } from '@databricks/appkit';
import { execSync } from 'node:child_process';
import { DELIVERY_SCHEMA } from '../server/routes/lakebase/delivery-schema.js';

function profile() {
  return process.env.DATABRICKS_CONFIG_PROFILE ?? 'demo';
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in .env or export it before running grant:delivery-app.`,
    );
  }
  return value;
}

function appName() {
  return process.env.DATABRICKS_APP_NAME?.trim() || 'fleetviz-app';
}

function getAppPostgresRole(postgresBranch: string) {
  const name = appName();
  const appJson = execSync(`databricks apps get ${name} --profile ${profile()} -o json`, {
    encoding: 'utf8',
  });
  const clientId = JSON.parse(appJson).service_principal_client_id as string;

  const rolesJson = execSync(
    `databricks postgres list-roles ${postgresBranch} --profile ${profile()} -o json`,
    { encoding: 'utf8' },
  );
  const roles = JSON.parse(rolesJson) as Array<{
    status: { postgres_role: string; identity_type: string };
  }>;

  const appRole = roles.find(
    (role) =>
      role.status.identity_type === 'SERVICE_PRINCIPAL' &&
      role.status.postgres_role === clientId,
  );
  if (!appRole) {
    throw new Error(`Lakebase role not found for app service principal ${clientId}`);
  }
  return appRole.status.postgres_role;
}

async function main() {
  const postgresBranch = requireEnv('POSTGRES_BRANCH');

  if (!process.env.PGUSER && !process.env.DATABRICKS_CLIENT_ID) {
    const userJson = execSync(`databricks current-user me --profile ${profile()} -o json`, {
      encoding: 'utf8',
    });
    process.env.PGUSER = JSON.parse(userJson).userName as string;
  }

  const appRole = getAppPostgresRole(postgresBranch);
  const pool = createLakebasePool();

  console.log(`[grant] Granting ${DELIVERY_SCHEMA} access to app role ${appRole}...`);

  await pool.query(`GRANT USAGE ON SCHEMA ${DELIVERY_SCHEMA} TO "${appRole}"`);
  await pool.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${DELIVERY_SCHEMA} TO "${appRole}"`,
  );
  await pool.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${DELIVERY_SCHEMA} TO "${appRole}"`,
  );
  await pool.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${DELIVERY_SCHEMA} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${appRole}"`,
  );

  const { rows } = await pool.query(
    `SELECT has_schema_privilege($1, $2, 'USAGE') AS schema_usage`,
    [appRole, DELIVERY_SCHEMA],
  );
  console.log(`[grant] schema USAGE for app role: ${rows[0]?.schema_usage ?? 'unknown'}`);
  await pool.end();
}

main().catch((err) => {
  console.error('[grant] Failed:', err);
  process.exit(1);
});
