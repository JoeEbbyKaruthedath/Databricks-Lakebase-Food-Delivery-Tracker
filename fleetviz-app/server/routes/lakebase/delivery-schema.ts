export const DELIVERY_SCHEMA = 'delivery';

export const CREATE_SCHEMA_SQL = `CREATE SCHEMA IF NOT EXISTS ${DELIVERY_SCHEMA}`;

export const CREATE_EVENTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${DELIVERY_SCHEMA}.events (
    event_id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    order_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    driver_id TEXT,
    restaurant_id TEXT,
    customer_id TEXT,
    sequence INT NOT NULL DEFAULT 0,
    loc_lat DOUBLE PRECISION NOT NULL,
    loc_lon DOUBLE PRECISION NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    body JSONB NOT NULL DEFAULT '{}',
    event_timestamp TIMESTAMPTZ NOT NULL
  )
`;

export const CREATE_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_delivery_events_timestamp ON ${DELIVERY_SCHEMA}.events (event_timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_events_order_id ON ${DELIVERY_SCHEMA}.events (order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_events_order_ts ON ${DELIVERY_SCHEMA}.events (order_id, event_timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_delivery_events_type ON ${DELIVERY_SCHEMA}.events (event_type)`,
];

export const TABLE_EXISTS_SQL = `
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = '${DELIVERY_SCHEMA}' AND table_name = 'events'
`;

export const COUNT_EVENTS_SQL = `SELECT COUNT(*)::int AS count FROM ${DELIVERY_SCHEMA}.events`;
