import { describe, expect, it } from 'vitest';
import type { DeliveryEvent } from '../../types/delivery';
import { spreadMapPositions } from './map-utils';

function makeEvent(orderId: string, lat: number, lon: number): DeliveryEvent {
  return {
    event_id: 1,
    event_type: 'in_transit',
    order_id: orderId,
    location_id: 'loc',
    driver_id: 'drv',
    restaurant_id: 'rst',
    customer_id: 'cus',
    sequence: 1,
    loc_lat: lat,
    loc_lon: lon,
    city: 'Austin',
    state: 'TX',
    body: {},
    event_timestamp: '2025-01-01T00:00:00.000Z',
  };
}

describe('spreadMapPositions', () => {
  it('offsets stacked markers at the same coordinate', () => {
    const events = [
      makeEvent('ORD-001', 30.27, -97.74),
      makeEvent('ORD-002', 30.27, -97.74),
      makeEvent('ORD-003', 30.27, -97.74),
    ];

    const spread = spreadMapPositions(events);

    expect(spread).toHaveLength(3);
    expect(spread[0].lat).toBe(30.27);
    expect(spread[0].lon).toBe(-97.74);
    expect(spread[1].lat).not.toBe(spread[0].lat);
    expect(spread[2].lon).not.toBe(spread[0].lon);
  });
});
