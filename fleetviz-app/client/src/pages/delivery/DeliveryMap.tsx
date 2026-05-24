import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import type { DeliveryEvent } from '../../types/delivery';
import { formatEventType } from '../../types/delivery';
import 'leaflet/dist/leaflet.css';

const USA_CENTER: [number, number] = [39.8283, -98.5795];

/** Continental United States — keeps the map focused on USA only */
const USA_BOUNDS: [[number, number], [number, number]] = [
  [24.396308, -124.848974],
  [49.384358, -66.885444],
];

const USA_MIN_ZOOM = 4;
const USA_MAX_ZOOM = 12;

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const;

const STATUS_COLORS: Record<string, string> = {
  order_placed: '#6366f1',
  driver_assigned: '#8b5cf6',
  en_route_to_restaurant: '#a855f7',
  at_restaurant: '#f59e0b',
  picked_up: '#f97316',
  in_transit: '#3b82f6',
  near_destination: '#14b8a6',
  delivered: '#22c55e',
};

function createIcon(color: string, selected: boolean) {
  const size = selected ? 14 : 10;
  const selectedClass = selected ? ' delivery-marker--selected' : '';
  return L.divIcon({
    className: 'delivery-marker-wrap',
    html: `<div class="delivery-marker${selectedClass}" style="width:${size}px;height:${size}px;background:${color};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({ positions }: { positions: DeliveryEvent[] }) {
  const map = useMap();

  useEffect(() => {
    const usaBounds = L.latLngBounds(USA_BOUNDS);

    if (positions.length === 0) {
      map.fitBounds(usaBounds);
      return;
    }

    const markerBounds = L.latLngBounds(positions.map((p) => [p.loc_lat, p.loc_lon]));
    map.fitBounds(markerBounds.pad(0.15), { maxZoom: USA_MAX_ZOOM });
  }, [map, positions]);

  return null;
}

interface DeliveryMapProps {
  positions: DeliveryEvent[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  theme: 'light' | 'dark';
}

export function DeliveryMap({ positions, selectedOrderId, onSelectOrder, theme }: DeliveryMapProps) {
  return (
    <div className="h-[520px] w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={USA_CENTER}
        zoom={USA_MIN_ZOOM}
        minZoom={USA_MIN_ZOOM}
        maxZoom={USA_MAX_ZOOM}
        maxBounds={USA_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={TILE_URLS[theme]}
        />
        <FitBounds positions={positions} />

        {positions.map((event) => {
          const selected = event.order_id === selectedOrderId;
          const color = STATUS_COLORS[event.event_type] ?? '#64748b';
          return (
            <Marker
              key={`${event.order_id}-${event.event_id}`}
              position={[event.loc_lat, event.loc_lon]}
              icon={createIcon(color, selected)}
              eventHandlers={{ click: () => onSelectOrder(event.order_id) }}
            >
              <Popup>
                <strong>{event.order_id}</strong>
                <br />
                {formatEventType(event.event_type)}
                <br />
                {event.city}, {event.state}
                <br />
                {new Date(event.event_timestamp).toLocaleString()}
                <br />
                Progress: {event.body?.progress_pct ?? 0}%
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
