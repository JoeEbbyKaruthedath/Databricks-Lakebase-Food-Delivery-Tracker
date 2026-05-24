import { z } from 'zod';
import { Application, Request } from 'express';
import {
  COUNT_EVENTS_SQL,
  CREATE_EVENTS_TABLE_SQL,
  CREATE_INDEXES_SQL,
  CREATE_SCHEMA_SQL,
  DELIVERY_SCHEMA,
  TABLE_EXISTS_SQL,
} from './delivery-schema.js';

interface AppKitWithLakebase {
  lakebase: {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
  server: {
    extend(fn: (app: Application) => void): void;
  };
}

const EventsQuerySchema = z.object({
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  orderId: z.string().optional(),
  eventType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional().default(1000),
});

const PositionsAtQuerySchema = EventsQuerySchema.extend({
  at: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(5000).optional().default(1000),
});

const EVENT_COLUMNS = `
  event_id, event_type, order_id, location_id, driver_id, restaurant_id,
  customer_id, sequence, loc_lat, loc_lon, city, state, body, event_timestamp
`;

function parseQuery(req: Request) {
  return EventsQuerySchema.parse({
    from: req.query.from,
    to: req.query.to,
    orderId: req.query.orderId,
    eventType: req.query.eventType,
    limit: req.query.limit,
  });
}

function buildFilters(
  query: z.infer<typeof EventsQuerySchema>,
  startIndex = 1,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [];
  const parts: string[] = [];
  let idx = startIndex;

  if (query.from) {
    parts.push(`event_timestamp >= $${idx++}`);
    params.push(query.from);
  }
  if (query.to) {
    parts.push(`event_timestamp <= $${idx++}`);
    params.push(query.to);
  }
  if (query.orderId) {
    parts.push(`order_id = $${idx++}`);
    params.push(query.orderId);
  }
  if (query.eventType) {
    parts.push(`event_type = $${idx++}`);
    params.push(query.eventType);
  }

  return {
    clause: parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '',
    params,
  };
}

function buildPointInTimeFilters(
  query: z.infer<typeof PositionsAtQuerySchema>,
  startIndex = 1,
): { clause: string; params: unknown[] } {
  const params: unknown[] = [query.at];
  const parts: string[] = [`event_timestamp <= $${startIndex}`];
  let idx = startIndex + 1;

  if (query.from) {
    parts.push(`event_timestamp >= $${idx++}`);
    params.push(query.from);
  }
  if (query.orderId) {
    parts.push(`order_id = $${idx++}`);
    params.push(query.orderId);
  }
  if (query.eventType) {
    parts.push(`event_type = $${idx++}`);
    params.push(query.eventType);
  }

  return {
    clause: `WHERE ${parts.join(' AND ')}`,
    params,
  };
}

export async function setupDeliveryRoutes(appkit: AppKitWithLakebase) {
  try {
    const { rows } = await appkit.lakebase.query(TABLE_EXISTS_SQL);
    if (rows.length === 0) {
      await appkit.lakebase.query(CREATE_SCHEMA_SQL);
      await appkit.lakebase.query(CREATE_EVENTS_TABLE_SQL);
      for (const sql of CREATE_INDEXES_SQL) {
        await appkit.lakebase.query(sql);
      }
      console.log('[delivery] Created schema and delivery.events table');
    } else {
      console.log('[delivery] delivery.events table ready');
    }
  } catch (err) {
    console.warn('[delivery] Schema setup failed:', (err as Error).message);
  }

  appkit.server.extend((app) => {
    app.get('/api/delivery/meta', async (_req, res) => {
      try {
        const [countResult, rangeResult, typesResult] = await Promise.all([
          appkit.lakebase.query(COUNT_EVENTS_SQL),
          appkit.lakebase.query(
            `SELECT MIN(event_timestamp) AS min_ts, MAX(event_timestamp) AS max_ts FROM ${DELIVERY_SCHEMA}.events`,
          ),
          appkit.lakebase.query(
            `SELECT DISTINCT event_type FROM ${DELIVERY_SCHEMA}.events ORDER BY event_type`,
          ),
        ]);

        res.json({
          totalEvents: countResult.rows[0]?.count ?? 0,
          timeRange: rangeResult.rows[0] ?? null,
          eventTypes: typesResult.rows.map((r) => r.event_type),
        });
      } catch (err) {
        console.error('Failed to load delivery meta:', err);
        res.status(500).json({ error: 'Failed to load metadata' });
      }
    });

    app.get('/api/delivery/events', async (req, res) => {
      try {
        const query = parseQuery(req);
        const { clause, params } = buildFilters(query);
        const limitParam = params.length + 1;

        const result = await appkit.lakebase.query(
          `SELECT
            event_id, event_type, order_id, location_id, driver_id, restaurant_id,
            customer_id, sequence, loc_lat, loc_lon, city, state, body, event_timestamp
          FROM ${DELIVERY_SCHEMA}.events
          ${clause}
          ORDER BY event_timestamp DESC, sequence DESC
          LIMIT $${limitParam}`,
          [...params, query.limit],
        );

        res.json(result.rows);
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.message });
          return;
        }
        console.error('Failed to list delivery events:', err);
        res.status(500).json({ error: 'Failed to list events' });
      }
    });

    app.get('/api/delivery/orders/positions', async (req, res) => {
      try {
        const query = parseQuery(req);
        const { clause, params } = buildFilters(query);
        const limitParam = params.length + 1;

        const result = await appkit.lakebase.query(
          `WITH filtered AS (
            SELECT *
            FROM ${DELIVERY_SCHEMA}.events
            ${clause}
          )
          SELECT DISTINCT ON (order_id)
            event_id, event_type, order_id, location_id, driver_id, restaurant_id,
            customer_id, sequence, loc_lat, loc_lon, city, state, body, event_timestamp
          FROM filtered
          ORDER BY order_id, event_timestamp DESC, sequence DESC
          LIMIT $${limitParam}`,
          [...params, query.limit],
        );

        res.json(result.rows);
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.message });
          return;
        }
        console.error('Failed to list order positions:', err);
        res.status(500).json({ error: 'Failed to list order positions' });
      }
    });

    app.get('/api/delivery/orders/positions-at', async (req, res) => {
      try {
        const query = PositionsAtQuerySchema.parse({
          at: req.query.at,
          from: req.query.from,
          to: req.query.to,
          orderId: req.query.orderId,
          eventType: req.query.eventType,
          limit: req.query.limit,
        });
        const { clause, params } = buildPointInTimeFilters(query);
        const limitParam = params.length + 1;

        const result = await appkit.lakebase.query(
          `WITH filtered AS (
            SELECT *
            FROM ${DELIVERY_SCHEMA}.events
            ${clause}
          )
          SELECT DISTINCT ON (order_id)
            ${EVENT_COLUMNS}
          FROM filtered
          ORDER BY order_id, event_timestamp DESC, sequence DESC
          LIMIT $${limitParam}`,
          [...params, query.limit],
        );

        res.json(result.rows);
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: err.message });
          return;
        }
        console.error('Failed to list positions at time:', err);
        res.status(500).json({ error: 'Failed to list positions at time' });
      }
    });

    app.get('/api/delivery/orders/:orderId', async (req, res) => {
      try {
        const orderId = req.params.orderId;
        const query = EventsQuerySchema.partial().parse({
          from: req.query.from,
          to: req.query.to,
          eventType: req.query.eventType,
        });

        const filters = buildFilters({ ...query, limit: 5000 });
        const extra = filters.clause ? `${filters.clause} AND` : 'WHERE';
        const params = [...filters.params, orderId];

        const result = await appkit.lakebase.query(
          `SELECT
            event_id, event_type, order_id, location_id, driver_id, restaurant_id,
            customer_id, sequence, loc_lat, loc_lon, city, state, body, event_timestamp
          FROM ${DELIVERY_SCHEMA}.events
          ${extra} order_id = $${params.length}
          ORDER BY sequence ASC, event_timestamp ASC`,
          params,
        );

        res.json(result.rows);
      } catch (err) {
        console.error('Failed to load order track:', err);
        res.status(500).json({ error: 'Failed to load order track' });
      }
    });
  });
}
