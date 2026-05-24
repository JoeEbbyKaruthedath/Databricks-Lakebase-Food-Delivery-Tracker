import { useCallback, useRef } from 'react';

interface DeliveryTimeSliderProps {
  minTs: number;
  maxTs: number;
  value: number;
  onChange: (ms: number) => void;
  ariaValueText: string;
}

function clampTime(ms: number, minTs: number, maxTs: number) {
  return Math.min(maxTs, Math.max(minTs, ms));
}

export function DeliveryTimeSlider({
  minTs,
  maxTs,
  value,
  onChange,
  ariaValueText,
}: DeliveryTimeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const span = Math.max(maxTs - minTs, 1);
  const percent = ((clampTime(value, minTs, maxTs) - minTs) / span) * 100;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return minTs + ratio * span;
    },
    [minTs, span, value],
  );

  const startDrag = useCallback(
    (clientX: number) => {
      draggingRef.current = true;
      onChange(valueFromClientX(clientX));
    },
    [onChange, valueFromClientX],
  );

  const moveDrag = useCallback(
    (clientX: number) => {
      if (!draggingRef.current) return;
      onChange(valueFromClientX(clientX));
    },
    [onChange, valueFromClientX],
  );

  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div className="delivery-time-slider">
      <div
        ref={trackRef}
        className="delivery-time-slider__track"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          startDrag(e.clientX);
        }}
        onPointerMove={(e) => moveDrag(e.clientX)}
        onPointerUp={(e) => {
          endDrag();
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={endDrag}
        role="slider"
        aria-label="Scrub delivery timeline"
        aria-valuemin={minTs}
        aria-valuemax={maxTs}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = span / 100;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(clampTime(value - step, minTs, maxTs));
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(clampTime(value + step, minTs, maxTs));
          }
          if (e.key === 'Home') {
            e.preventDefault();
            onChange(minTs);
          }
          if (e.key === 'End') {
            e.preventDefault();
            onChange(maxTs);
          }
        }}
      >
        <div className="delivery-time-slider__fill" style={{ width: `${percent}%` }} />
        <div className="delivery-time-slider__thumb" style={{ left: `${percent}%` }} />
      </div>
    </div>
  );
}
