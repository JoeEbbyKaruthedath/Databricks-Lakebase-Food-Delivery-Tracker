import { createLakebasePool } from '@databricks/appkit';
import { execSync } from 'node:child_process';
import {
  COUNT_EVENTS_SQL,
  CREATE_EVENTS_TABLE_SQL,
  CREATE_INDEXES_SQL,
  CREATE_SCHEMA_SQL,
  DELIVERY_SCHEMA,
} from '../server/routes/lakebase/delivery-schema.js';

const TARGET_EVENTS = 10_000;
const BATCH_SIZE = 500;

const METROS = [
  { city: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194, spread: 0.12 },
  { city: 'New York', state: 'NY', lat: 40.7128, lon: -74.006, spread: 0.18 },
  { city: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437, spread: 0.22 },
  { city: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298, spread: 0.14 },
  { city: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431, spread: 0.11 },
  { city: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321, spread: 0.11 },
  { city: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903, spread: 0.11 },
  { city: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918, spread: 0.13 },
  { city: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589, spread: 0.09 },
  { city: 'Atlanta', state: 'GA', lat: 33.749, lon: -84.388, spread: 0.13 },
  { city: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.797, spread: 0.14 },
  { city: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.074, spread: 0.13 },
] as const;

const RESTAURANTS = [
  'Burger Hub', 'Taco Express', 'Pizza Palace', 'Sushi Spot', 'Curry Corner',
  'Noodle House', 'Salad Bar', 'BBQ Pit', 'Thai Garden', 'Mediterranean Grill',
];

interface DeliveryEventRow {
  eventType: string;
  orderId: string;
  locationId: string;
  driverId: string;
  restaurantId: string;
  customerId: string;
  sequence: number;
  locLat: number;
  locLon: number;
  city: string;
  state: string;
  body: Record<string, unknown>;
  eventTimestamp: Date;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function pickMetro() {
  return METROS[randomInt(0, METROS.length - 1)];
}

function jitter(baseLat: number, baseLon: number, spread: number) {
  return {
    lat: baseLat + randomBetween(-spread, spread),
    lon: baseLon + randomBetween(-spread, spread),
  };
}

function interpolate(
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  t: number,
) {
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lon: start.lon + (end.lon - start.lon) * t,
  };
}

function generateOrderEvents(orderIndex: number, baseTime: Date): DeliveryEventRow[] {
  const metro = pickMetro();
  const orderId = `ORD-${String(orderIndex).padStart(6, '0')}`;
  const driverId = `DRV-${String(randomInt(1000, 9999))}`;
  const restaurantId = `RST-${String(randomInt(100, 999))}`;
  const customerId = `CUS-${String(randomInt(10000, 99999))}`;
  const restaurantName = RESTAURANTS[randomInt(0, RESTAURANTS.length - 1)];

  const restaurant = jitter(metro.lat, metro.lon, metro.spread * 0.4);
  const customer = jitter(metro.lat, metro.lon, metro.spread);
  const driverStart = interpolate(restaurant, customer, randomBetween(0.05, 0.2));

  const transitSteps = randomInt(4, 7);
  const timeline: Array<{ type: string; progress: number; locationId: string }> = [
    { type: 'order_placed', progress: 0, locationId: restaurantId },
    { type: 'driver_assigned', progress: 0, locationId: driverId },
    { type: 'en_route_to_restaurant', progress: 5, locationId: driverId },
    { type: 'at_restaurant', progress: 15, locationId: restaurantId },
    { type: 'picked_up', progress: 20, locationId: driverId },
  ];

  for (let i = 0; i < transitSteps; i++) {
    const progress = 20 + ((i + 1) / (transitSteps + 1)) * 65;
    timeline.push({ type: 'in_transit', progress, locationId: driverId });
  }

  timeline.push(
    { type: 'near_destination', progress: 92, locationId: driverId },
    { type: 'delivered', progress: 100, locationId: customerId },
  );

  const orderDurationMs = randomInt(18, 55) * 60 * 1000;
  const rows: DeliveryEventRow[] = [];

  timeline.forEach((step, sequence) => {
    let coords: { lat: number; lon: number };

    if (step.type === 'order_placed' || step.type === 'at_restaurant') {
      coords = restaurant;
    } else if (step.type === 'delivered') {
      coords = customer;
    } else if (step.type === 'driver_assigned' || step.type === 'en_route_to_restaurant') {
      const t = step.type === 'driver_assigned' ? 0.1 : 0.45;
      coords = interpolate(driverStart, restaurant, t);
    } else {
      const t = Math.min(0.98, step.progress / 100);
      coords = interpolate(restaurant, customer, t);
      coords = jitter(coords.lat, coords.lon, 0.002);
    }

    const elapsedMs = (sequence / (timeline.length - 1)) * orderDurationMs;
    const eventTimestamp = new Date(baseTime.getTime() + elapsedMs);
    const speedMph = step.type === 'in_transit' ? randomBetween(12, 28) : randomBetween(0, 8);
    const etaMinutes = Math.max(0, Math.round((100 - step.progress) * orderDurationMs / 60000 / 100));

    rows.push({
      eventType: step.type,
      orderId,
      locationId: step.locationId,
      driverId,
      restaurantId,
      customerId,
      sequence,
      locLat: Number(coords.lat.toFixed(8)),
      locLon: Number(coords.lon.toFixed(8)),
      city: metro.city,
      state: metro.state,
      body: {
        progress_pct: Number(step.progress.toFixed(1)),
        loc_lat: Number(coords.lat.toFixed(8)),
        loc_lon: Number(coords.lon.toFixed(8)),
        speed_mph: Number(speedMph.toFixed(1)),
        eta_minutes: etaMinutes,
        restaurant_name: restaurantName,
        items_count: randomInt(1, 5),
        order_total_usd: Number(randomBetween(12, 85).toFixed(2)),
        vehicle_type: randomInt(0, 1) === 0 ? 'car' : 'ebike',
      },
      eventTimestamp,
    });
  });

  return rows;
}

function generateEvents(target: number): DeliveryEventRow[] {
  const events: DeliveryEventRow[] = [];
  const windowStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let orderIndex = 1;

  while (events.length < target) {
    const baseTime = new Date(windowStart + Math.random() * 7 * 24 * 60 * 60 * 1000);
    const orderEvents = generateOrderEvents(orderIndex++, baseTime);
    for (const event of orderEvents) {
      if (events.length >= target) break;
      events.push(event);
    }
  }

  return events.sort((a, b) => a.eventTimestamp.getTime() - b.eventTimestamp.getTime());
}

async function insertBatch(pool: ReturnType<typeof createLakebasePool>, batch: DeliveryEventRow[]) {
  const values: unknown[] = [];
  const placeholders: string[] = [];
  const cols = 13;

  batch.forEach((row, i) => {
    const offset = i * cols;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`,
    );
    values.push(
      row.eventType,
      row.orderId,
      row.locationId,
      row.driverId,
      row.restaurantId,
      row.customerId,
      row.sequence,
      row.locLat,
      row.locLon,
      row.city,
      row.state,
      JSON.stringify(row.body),
      row.eventTimestamp.toISOString(),
    );
  });

  await pool.query(
    `INSERT INTO ${DELIVERY_SCHEMA}.events (
      event_type, order_id, location_id, driver_id, restaurant_id, customer_id,
      sequence, loc_lat, loc_lon, city, state, body, event_timestamp
    ) VALUES ${placeholders.join(', ')}`,
    values,
  );
}

async function main() {
  const force = process.argv.includes('--force');

  if (!process.env.PGUSER && !process.env.DATABRICKS_CLIENT_ID) {
    const profile = process.env.DATABRICKS_CONFIG_PROFILE ?? 'DEFAULT';
    const userJson = execSync(`databricks current-user me --profile ${profile} -o json`, {
      encoding: 'utf8',
    });
    process.env.PGUSER = JSON.parse(userJson).userName as string;
  }

  const pool = createLakebasePool();

  console.log('[seed] Ensuring delivery schema...');
  await pool.query(CREATE_SCHEMA_SQL);
  await pool.query(CREATE_EVENTS_TABLE_SQL);
  for (const sql of CREATE_INDEXES_SQL) {
    await pool.query(sql);
  }

  const { rows: countRows } = await pool.query(COUNT_EVENTS_SQL);
  const existing = (countRows[0]?.count as number) ?? 0;

  if (existing >= TARGET_EVENTS && !force) {
    console.log(`[seed] Already have ${existing} events (target ${TARGET_EVENTS}). Use --force to reseed.`);
    await pool.end();
    return;
  }

  if (force && existing > 0) {
    console.log(`[seed] Truncating ${existing} existing events...`);
    await pool.query(`TRUNCATE TABLE ${DELIVERY_SCHEMA}.events RESTART IDENTITY`);
  }

  console.log(`[seed] Generating ${TARGET_EVENTS} synthetic USA delivery events...`);
  const events = generateEvents(TARGET_EVENTS);
  const uniqueOrders = new Set(events.map((e) => e.orderId)).size;
  console.log(`[seed] Generated ${events.length} events across ${uniqueOrders} orders`);

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    await insertBatch(pool, batch);
    console.log(`[seed] Inserted ${Math.min(i + BATCH_SIZE, events.length)} / ${events.length}`);
  }

  const { rows: finalRows } = await pool.query(COUNT_EVENTS_SQL);
  console.log(`[seed] Done. Total events in Lakebase: ${finalRows[0]?.count}`);
  await pool.end();
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
