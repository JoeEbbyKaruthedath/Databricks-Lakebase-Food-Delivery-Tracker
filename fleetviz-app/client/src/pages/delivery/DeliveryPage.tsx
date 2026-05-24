import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { DeliveryMap } from './DeliveryMap';
import { DeliveryTimeline } from './DeliveryTimeline';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { DeliveryEvent, DeliveryMeta } from '../../types/delivery';
import { formatEventType, toIsoTimestamp } from '../../types/delivery';

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function DeliveryPage() {
  const { resolvedTheme } = useTheme();
  const mapTheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const [meta, setMeta] = useState<DeliveryMeta | null>(null);
  const [minTs, setMinTs] = useState(0);
  const [maxTs, setMaxTs] = useState(0);
  const [scrubAt, setScrubAt] = useState(0);
  const [windowFrom, setWindowFrom] = useState('');
  const [orderId, setOrderId] = useState('');
  const [eventType, setEventType] = useState('');
  const [positions, setPositions] = useState<DeliveryEvent[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedScrubAt = useDebouncedValue(scrubAt, 200);

  const queryParams = useMemo(
    () => ({
      at: debouncedScrubAt > 0 ? new Date(debouncedScrubAt).toISOString() : undefined,
      from: windowFrom ? toIsoTimestamp(windowFrom) : undefined,
      orderId: orderId.trim() || undefined,
      eventType: eventType || undefined,
      limit: '1000',
    }),
    [debouncedScrubAt, windowFrom, orderId, eventType],
  );

  const loadMeta = useCallback(async () => {
    const res = await fetch('/api/delivery/meta');
    if (!res.ok) throw new Error('Failed to load metadata');
    const data = (await res.json()) as DeliveryMeta;
    setMeta(data);

    if (data.timeRange?.min_ts && data.timeRange?.max_ts) {
      const min = new Date(data.timeRange.min_ts).getTime();
      const max = new Date(data.timeRange.max_ts).getTime();
      setMinTs(min);
      setMaxTs(max);
      setScrubAt(max);
      setWindowFrom(toLocalInputValue(data.timeRange.min_ts));
    }
  }, []);

  const loadPositionsAt = useCallback(async () => {
    if (!queryParams.at) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/delivery/orders/positions-at${buildQuery(queryParams)}`);
      if (!res.ok) throw new Error(`Failed to load positions: ${res.statusText}`);
      const data = (await res.json()) as DeliveryEvent[];
      setPositions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    loadMeta().catch((err) => setError(err instanceof Error ? err.message : 'Failed to init'));
  }, [loadMeta]);

  useEffect(() => {
    if (debouncedScrubAt > 0) loadPositionsAt();
  }, [debouncedScrubAt, loadPositionsAt]);

  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
  };

  const filteredPositions = useMemo(() => {
    if (!orderId.trim()) return positions;
    return positions.filter((p) => p.order_id.includes(orderId.trim()));
  }, [positions, orderId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Delivery Tracker</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {meta ? `${meta.totalEvents.toLocaleString()} events across the USA` : 'Loading...'}
          {' — '}scrub the timeline to see every delivery at any point in time.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Window start (optional)</span>
            <Input
              type="datetime-local"
              value={windowFrom}
              onChange={(e) => setWindowFrom(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <Input placeholder="ORD-000123" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Event type</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">All types</option>
              {(meta?.eventTypes ?? []).map((t) => (
                <option key={t} value={t}>
                  {formatEventType(t)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button onClick={loadPositionsAt} disabled={loading} className="w-full">
              Refresh map
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="text-destructive bg-destructive/10 p-3 rounded-md text-sm">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <Skeleton className="h-[520px] w-full rounded-lg" />
          ) : (
            <DeliveryMap
              positions={filteredPositions}
              selectedOrderId={selectedOrderId}
              onSelectOrder={handleSelectOrder}
              theme={mapTheme}
            />
          )}

          {minTs > 0 && maxTs > minTs && (
            <DeliveryTimeline
              minTs={minTs}
              maxTs={maxTs}
              value={scrubAt}
              onChange={setScrubAt}
              orderCount={filteredPositions.length}
            />
          )}
        </div>

        <Card className="max-h-[640px] overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders ({filteredPositions.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 p-0">
            {loading && (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {!loading && filteredPositions.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No orders at this point in time.</p>
            )}
            {!loading &&
              filteredPositions.map((event) => (
                <button
                  key={event.order_id}
                  type="button"
                  onClick={() => handleSelectOrder(event.order_id)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    selectedOrderId === event.order_id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="font-medium text-sm">{event.order_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatEventType(event.event_type)} · {event.city}, {event.state}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.event_timestamp).toLocaleString()} ·{' '}
                    {event.body?.progress_pct ?? 0}% complete
                  </div>
                </button>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
