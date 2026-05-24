import { useMemo } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import {
  EVENT_TYPE_ORDER,
  formatEventType,
  getEventTypeColor,
} from '../../types/delivery';

const HOUR_MS = 60 * 60 * 1000;
/** 0–1000 gives smooth dragging without huge millisecond values (breaks native range inputs). */
const SLIDER_STEPS = 1000;

interface DeliveryTimelineProps {
  minTs: number;
  maxTs: number;
  value: number;
  onChange: (ms: number) => void;
  orderCount: number;
  eventTypeCounts: Map<string, number>;
}

function clampTime(ms: number, minTs: number, maxTs: number) {
  return Math.min(maxTs, Math.max(minTs, ms));
}

export function DeliveryTimeline({
  minTs,
  maxTs,
  value,
  onChange,
  orderCount,
  eventTypeCounts,
}: DeliveryTimelineProps) {
  const span = Math.max(maxTs - minTs, 1);
  const percent = ((value - minTs) / span) * 100;
  const sliderValue = Math.round((percent / 100) * SLIDER_STEPS);

  const handleSlider = (nextSliderValue: number) => {
    const ratio = nextSliderValue / SLIDER_STEPS;
    onChange(minTs + ratio * span);
  };

  const formatted = useMemo(
    () =>
      new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [value],
  );

  const nudge = (deltaMs: number) => {
    onChange(clampTime(value + deltaMs, minTs, maxTs));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Drag the slider to scrub through time. Each dot on the map is one order&apos;s latest stage
          at that moment.
        </p>

        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Selected time</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{formatted}</p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{orderCount.toLocaleString()}</span> orders
            on map
          </p>
        </div>

        <div className="delivery-timeline-slider-wrap space-y-3 rounded-lg border border-border bg-muted/20 px-4 py-5">
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{new Date(minTs).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
            <span>{new Date(maxTs).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>

          <input
            type="range"
            min={0}
            max={SLIDER_STEPS}
            step={1}
            value={sliderValue}
            onInput={(e) => handleSlider(Number(e.currentTarget.value))}
            onChange={(e) => handleSlider(Number(e.currentTarget.value))}
            className="delivery-timeline-slider w-full touch-none"
            style={{ '--slider-progress': `${percent}%` } as React.CSSProperties}
            aria-label="Scrub delivery timeline"
            aria-valuemin={minTs}
            aria-valuemax={maxTs}
            aria-valuenow={value}
            aria-valuetext={formatted}
          />
          <p className="text-center text-xs text-muted-foreground">Drag the handle to scrub through time</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(minTs)}>
            <SkipBack className="h-4 w-4" aria-hidden />
            Start
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudge(-6 * HOUR_MS)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            −6h
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudge(-HOUR_MS)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
            −1h
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudge(HOUR_MS)}>
            +1h
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => nudge(6 * HOUR_MS)}>
            +6h
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(maxTs)}>
            End
            <SkipForward className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {eventTypeCounts.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPE_ORDER.filter((type) => eventTypeCounts.has(type)).map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-foreground"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getEventTypeColor(type) }}
                  aria-hidden
                />
                {formatEventType(type)} ({eventTypeCounts.get(type)})
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
