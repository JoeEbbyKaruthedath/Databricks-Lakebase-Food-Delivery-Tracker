import { formatEventType, EVENT_TYPE_COLORS, EVENT_TYPE_ORDER } from '../../types/delivery';

export function DeliveryMapLegend() {
  return (
    <div
      className="delivery-map-legend pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[220px] rounded-lg border border-border bg-background/95 p-3 shadow-md backdrop-blur-sm"
      aria-label="Event type legend"
    >
      <p className="text-xs font-semibold text-foreground mb-0.5">Event type</p>
      <p className="text-[10px] text-muted-foreground mb-2 leading-snug">One dot = latest stage per order</p>
      <ul className="space-y-1.5">
        {EVENT_TYPE_ORDER.map((type) => (
          <li key={type} className="flex items-center gap-2 text-xs text-foreground">
            <span
              className="h-3 w-3 shrink-0 rounded-full border-2 border-background shadow-sm"
              style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
              aria-hidden
            />
            <span>{formatEventType(type)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
