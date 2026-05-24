import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input } from '@databricks/appkit-ui/react';

function toLocalInputValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(localValue: string) {
  if (!localValue) return null;
  const parsed = new Date(localValue.length === 16 ? `${localValue}:00` : localValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

interface DeliveryTimelineProps {
  minTs: number;
  maxTs: number;
  value: number;
  onChange: (ms: number) => void;
  orderCount: number;
}

export function DeliveryTimeline({ minTs, maxTs, value, onChange, orderCount }: DeliveryTimelineProps) {
  const span = Math.max(maxTs - minTs, 1);
  const percent = ((value - minTs) / span) * 100;

  const formatted = useMemo(
    () =>
      new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [value],
  );

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = Number(e.target.value) / 100;
    onChange(minTs + ratio * span);
  };

  const handleDatetime = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ms = fromLocalInputValue(e.target.value);
    if (ms === null) return;
    onChange(Math.min(maxTs, Math.max(minTs, ms)));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Point in time</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            Scrub the timeline to see where each delivery was at a specific moment.
          </span>
          <span className="font-medium text-foreground tabular-nums">{formatted}</span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={percent}
          onChange={handleSlider}
          className="delivery-timeline-slider w-full"
          aria-label="Delivery timeline scrubber"
        />

        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1 text-sm flex-1 min-w-[200px]">
            <span className="text-muted-foreground">Jump to date and time</span>
            <Input
              type="datetime-local"
              value={toLocalInputValue(value)}
              min={toLocalInputValue(minTs)}
              max={toLocalInputValue(maxTs)}
              onChange={handleDatetime}
            />
          </label>
          <p className="text-sm text-muted-foreground pb-2">
            <span className="font-medium text-foreground">{orderCount}</span> orders visible on map
          </p>
        </div>

        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{new Date(minTs).toLocaleString()}</span>
          <span>{new Date(maxTs).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
