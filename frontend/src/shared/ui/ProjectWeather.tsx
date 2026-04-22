import { useEffect, useMemo, useState } from 'react';
import { CloudSun, Droplets, Wind } from 'lucide-react';
import clsx from 'clsx';

interface ProjectWeatherProps {
  lat?: number | null;
  lng?: number | null;
  variant?: 'summary' | 'detail';
  className?: string;
}

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  wind: number;
}

interface OpenMeteoResponse {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
  };
}

export function ProjectWeather({
  lat,
  lng,
  variant = 'detail',
  className,
}: ProjectWeatherProps) {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [loading, setLoading] = useState(false);

  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const url = useMemo(() => {
    if (!hasCoords) return null;
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'wind_speed_10m_max',
      ].join(','),
      forecast_days: variant === 'summary' ? '1' : '7',
      timezone: 'auto',
    });
    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }, [hasCoords, lat, lng, variant]);

  useEffect(() => {
    if (!url) {
      setForecast([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OpenMeteoResponse | null) => {
        const daily = data?.daily;
        const dates = daily?.time ?? [];
        setForecast(
          dates.map((date, index) => ({
            date,
            tempMax: daily?.temperature_2m_max?.[index] ?? 0,
            tempMin: daily?.temperature_2m_min?.[index] ?? 0,
            precipitation: daily?.precipitation_probability_max?.[index] ?? 0,
            wind: daily?.wind_speed_10m_max?.[index] ?? 0,
          })),
        );
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setForecast([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url]);

  if (!hasCoords) {
    return (
      <div className={clsx('rounded-lg border border-border-light bg-surface-secondary p-3 text-xs text-content-tertiary', className)}>
        Weather appears after the project location is resolved.
      </div>
    );
  }

  if (variant === 'summary') {
    const day = forecast[0];
    return (
      <div className={clsx('flex items-center gap-2 text-2xs text-content-tertiary', className)}>
        <CloudSun size={12} className="text-amber-500" />
        {loading || !day ? (
          <span>Weather loading...</span>
        ) : (
          <span>
            {Math.round(day.tempMin)}-{Math.round(day.tempMax)}C
            {' '}
            <span className="text-content-quaternary">rain {Math.round(day.precipitation)}%</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('rounded-lg border border-border-light bg-surface-elevated p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CloudSun size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-content-primary">Site weather</h3>
        </div>
        {loading && <span className="text-2xs text-content-tertiary">Loading...</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        {forecast.slice(0, 7).map((day) => (
          <div key={day.date} className="rounded-md border border-border-light bg-surface-secondary px-2 py-2">
            <div className="text-2xs font-medium uppercase tracking-wider text-content-tertiary">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="mt-1 text-sm font-semibold text-content-primary">
              {Math.round(day.tempMin)}-{Math.round(day.tempMax)}C
            </div>
            <div className="mt-1 flex items-center gap-3 text-2xs text-content-tertiary">
              <span className="inline-flex items-center gap-1">
                <Droplets size={10} />
                {Math.round(day.precipitation)}%
              </span>
              <span className="inline-flex items-center gap-1">
                <Wind size={10} />
                {Math.round(day.wind)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

