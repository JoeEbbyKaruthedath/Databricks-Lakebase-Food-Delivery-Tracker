import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import type { DeliveryEvent } from '../../types/delivery';
import { formatEventType, getEventTypeColor } from '../../types/delivery';
import { DeliveryMapLegend } from './DeliveryMapLegend';
import { spreadMapPositions } from './map-utils';
import 'leaflet/dist/leaflet.css';

const USA_CENTER: [number, number] = [39.8283, -98.5795];

/** Continental United States — keeps the map focused on USA only */
const USA_BOUNDS: [[number, number], [number, number]] = [
  [24.396308, -124.848974],
  [49.384358, -66.885444],
];

const USA_MIN_ZOOM = 4;
const USA_MAX_ZOOM = 12;
const NATIONAL_VIEW_MAX_ZOOM = 6;

const TILE_URLS = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const;

function createIcon(color: string, selected: boolean, stackSize: number) {
  const size = selected ? 16 : stackSize > 1 ? 12 : 10;
  const selectedClass = selected ? ' delivery-marker--selected' : '';
  return L.divIcon({
    className: 'delivery-marker-wrap',
    html: `<div class="delivery-marker${selectedClass}" style="width:${size}px;height:${size}px;background:${color};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitBounds({
  points,
  selectedOrderId,
}: {
  points: Array<{ lat: number; lon: number }>;
  selectedOrderId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const usaBounds = L.latLngBounds(USA_BOUNDS);

    if (points.length === 0) {
      map.fitBounds(usaBounds);
      return;
    }

    const markerBounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    const latSpan = markerBounds.getNorth() - markerBounds.getSouth();
    const lonSpan = markerBounds.getEast() - markerBounds.getWest();
    const isTinyCluster = latSpan < 0.05 && lonSpan < 0.05;

    if (selectedOrderId && points.length === 1) {
      map.setView([points[0].lat, points[0].lon], Math.min(10, USA_MAX_ZOOM));
      return;
    }

    if (isTinyCluster) {
      map.setView(markerBounds.getCenter(), Math.min(8, USA_MAX_ZOOM));
      return;
    }

    map.fitBounds(markerBounds.pad(0.08), {
      maxZoom: points.length > 20 ? NATIONAL_VIEW_MAX_ZOOM : USA_MAX_ZOOM,
    });
  }, [map, points, selectedOrderId]);

  return null;
}

interface DeliveryMapProps {
  positions: DeliveryEvent[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  theme: 'light' | 'dark';
}

export function DeliveryMap({ positions, selectedOrderId, onSelectOrder, theme }: DeliveryMapProps) {
  const displayPoints = useMemo(() => spreadMapPositions(positions), [positions]);

  return (
    <div className="relative h-[520px] w-full rounded-lg overflow-hidden border border-border">
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
        <FitBounds
          points={displayPoints.map((p) => ({ lat: p.lat, lon: p.lon }))}
          selectedOrderId={selectedOrderId}
        />

        {displayPoints.map(({ event, lat, lon, stackSize }) => {
          const selected = event.order_id === selectedOrderId;
          const color = getEventTypeColor(event.event_type);
          return (
            <Marker
              key={`${event.order_id}-${event.event_id}`}
              position={[lat, lon]}
              icon={createIcon(color, selected, stackSize)}
              eventHandlers={{ click: () => onSelectOrder(event.order_id) }}
            >
              <Popup>
                <strong>{event.order_id}</strong>
                <br />
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full border border-background"
                    style={{ backgroundColor: color }}
                  />
                  {formatEventType(event.event_type)}
                </span>
                <br />
                {event.city}, {event.state}
                <br />
                {new Date(event.event_timestamp).toLocaleString()}
                <br />
                Progress: {event.body?.progress_pct ?? 0}%
                {stackSize > 1 && (
                  <>
                    <br />
                    <span className="text-muted-foreground">{stackSize} orders at this spot</span>
                  </>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <DeliveryMapLegend />
      {positions.length > 0 && (
        <div className="pointer-events-none absolute top-3 right-3 z-[1000] rounded-md border border-border bg-background/95 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
          {positions.length.toLocaleString()} orders
        </div>
      )}
    </div>
  );
}
