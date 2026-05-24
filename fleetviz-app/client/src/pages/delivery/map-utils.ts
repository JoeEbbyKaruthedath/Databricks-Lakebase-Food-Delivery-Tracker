import type { DeliveryEvent } from '../../types/delivery';

export interface MapDisplayPoint {
  event: DeliveryEvent;
  lat: number;
  lon: number;
  stackSize: number;
}

function coordKey(lat: number, lon: number) {
  return `${lat.toFixed(5)}|${lon.toFixed(5)}`;
}

/** Spread markers that share the same coordinates so stacked orders stay visible. */
export function spreadMapPositions(positions: DeliveryEvent[]): MapDisplayPoint[] {
  const buckets = new Map<string, DeliveryEvent[]>();

  for (const event of positions) {
    const key = coordKey(event.loc_lat, event.loc_lon);
    const group = buckets.get(key);
    if (group) group.push(event);
    else buckets.set(key, [event]);
  }

  const result: MapDisplayPoint[] = [];

  for (const group of buckets.values()) {
    group.forEach((event, index) => {
      const [lat, lon] = offsetStackedMarker(event.loc_lat, event.loc_lon, index, group.length);
      result.push({ event, lat, lon, stackSize: group.length });
    });
  }

  return result;
}

function offsetStackedMarker(
  lat: number,
  lon: number,
  index: number,
  total: number,
): [number, number] {
  if (total <= 1 || index === 0) return [lat, lon];

  const goldenAngle = 2.399963;
  const angle = index * goldenAngle;
  // ~250 m per ring step at mid-latitudes — enough to separate dots when zoomed in.
  const radiusDeg = 0.0022 * Math.sqrt(index);
  const latRad = (lat * Math.PI) / 180;
  const cosLat = Math.max(Math.cos(latRad), 0.25);

  return [
    lat + radiusDeg * Math.cos(angle),
    lon + (radiusDeg * Math.sin(angle)) / cosLat,
  ];
}
