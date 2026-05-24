export interface DeliveryEvent {
  event_id: number;
  event_type: string;
  order_id: string;
  location_id: string;
  driver_id: string | null;
  restaurant_id: string | null;
  customer_id: string | null;
  sequence: number;
  loc_lat: number;
  loc_lon: number;
  city: string;
  state: string;
  body: {
    progress_pct?: number;
    loc_lat?: number;
    loc_lon?: number;
    speed_mph?: number;
    eta_minutes?: number;
    restaurant_name?: string;
    items_count?: number;
    order_total_usd?: number;
    vehicle_type?: string;
  };
  event_timestamp: string;
}

export interface DeliveryMeta {
  totalEvents: number;
  timeRange: { min_ts: string; max_ts: string } | null;
  eventTypes: string[];
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  order_placed: 'Order placed',
  driver_assigned: 'Driver assigned',
  en_route_to_restaurant: 'En route to restaurant',
  at_restaurant: 'At restaurant',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  near_destination: 'Near destination',
  delivered: 'Delivered',
};

/** Distinct colors per event type — used on map markers and legend */
export const EVENT_TYPE_COLORS: Record<string, string> = {
  order_placed: '#6366f1',
  driver_assigned: '#ec4899',
  en_route_to_restaurant: '#a855f7',
  at_restaurant: '#f59e0b',
  picked_up: '#f97316',
  in_transit: '#2563eb',
  near_destination: '#14b8a6',
  delivered: '#16a34a',
};

export const EVENT_TYPE_ORDER = [
  'order_placed',
  'driver_assigned',
  'en_route_to_restaurant',
  'at_restaurant',
  'picked_up',
  'in_transit',
  'near_destination',
  'delivered',
] as const;

export function getEventTypeColor(type: string) {
  return EVENT_TYPE_COLORS[type] ?? '#64748b';
}

export function formatEventType(type: string) {
  return EVENT_TYPE_LABELS[type] ?? type.replaceAll('_', ' ');
}

export function toIsoTimestamp(localValue: string) {
  if (!localValue) return '';
  const normalized = localValue.length === 16 ? `${localValue}:00` : localValue;
  return new Date(normalized).toISOString();
}
