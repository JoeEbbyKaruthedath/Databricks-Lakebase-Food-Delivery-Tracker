import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { useState, useEffect } from 'react';
import type { DeliveryEvent, DeliveryMeta } from '../../types/delivery';
import { formatEventType } from '../../types/delivery';

const SAMPLE_LIMIT = 10;

function formatTimestamp(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function LakebasePage() {
  const [meta, setMeta] = useState<DeliveryMeta | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/delivery/meta'),
      fetch(`/api/delivery/events?limit=${SAMPLE_LIMIT}`),
    ])
      .then(async ([metaRes, eventsRes]) => {
        if (!metaRes.ok) {
          throw new Error(`Failed to load metadata: ${metaRes.statusText}`);
        }
        if (!eventsRes.ok) {
          throw new Error(`Failed to load events: ${eventsRes.statusText}`);
        }
        const [metaJson, eventsJson] = await Promise.all([
          metaRes.json() as Promise<DeliveryMeta>,
          eventsRes.json() as Promise<DeliveryEvent[]>,
        ]);
        setMeta(metaJson);
        setEvents(eventsJson);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load Lakebase data'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Delivery events (Lakebase)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Sample rows from <code className="text-xs">delivery.events</code> in Databricks
            Lakebase (PostgreSQL).
          </p>

          {error && (
            <div className="text-destructive bg-destructive/10 p-3 rounded-md mb-4">{error}</div>
          )}

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-48" />
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={`skeleton-${i}`} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!loading && !error && meta && (
            <p className="text-sm text-muted-foreground mb-4">
              {meta.totalEvents === 0
                ? 'No events in the database yet.'
                : `Showing ${events.length} of ${meta.totalEvents.toLocaleString()} events`}
              {meta.timeRange?.min_ts && meta.timeRange?.max_ts && meta.totalEvents > 0 && (
                <>
                  {' '}
                  · {formatTimestamp(meta.timeRange.min_ts)} –{' '}
                  {formatTimestamp(meta.timeRange.max_ts)}
                </>
              )}
            </p>
          )}

          {!loading && !error && events.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              The table is empty. Run{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                npx tsx --env-file-if-exists=./.env ./scripts/seed-delivery-data.ts
              </code>{' '}
              to load sample delivery data.
            </p>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Event</th>
                    <th className="px-3 py-2 font-medium">Order</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">City</th>
                    <th className="px-3 py-2 font-medium">Lat / Lon</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.event_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {formatTimestamp(event.event_timestamp)}
                      </td>
                      <td className="px-3 py-2">{formatEventType(event.event_type)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{event.order_id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{event.location_id}</td>
                      <td className="px-3 py-2">
                        {event.city}, {event.state}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                        {event.loc_lat.toFixed(4)}, {event.loc_lon.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
