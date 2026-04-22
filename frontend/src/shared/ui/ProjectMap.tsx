import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import clsx from 'clsx';

export interface LatLng {
  lat: number;
  lng: number;
}

interface ProjectMapProps {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  label?: string | null;
  variant?: 'card' | 'detail';
  className?: string;
  onResolved?: (coords: LatLng) => void;
}

interface NominatimPlace {
  lat: string;
  lon: string;
}

export function buildGeocodeQuery({
  address,
  city,
  country,
}: Pick<ProjectMapProps, 'address' | 'city' | 'country'>): string {
  return [address, city, country].filter(Boolean).join(', ');
}

export function ProjectMap({
  lat,
  lng,
  address,
  city,
  country,
  label,
  variant = 'detail',
  className,
  onResolved,
}: ProjectMapProps) {
  const query = useMemo(
    () => buildGeocodeQuery({ address, city, country }),
    [address, city, country],
  );
  const [coords, setCoords] = useState<LatLng | null>(
    typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null,
  );

  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      const next = { lat, lng };
      setCoords(next);
      onResolved?.(next);
    }
  }, [lat, lng, onResolved]);

  useEffect(() => {
    if (coords || !query) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
    });

    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((places: NominatimPlace[]) => {
        const place = places[0];
        if (!place) return;
        const next = { lat: Number(place.lat), lng: Number(place.lon) };
        if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;
        setCoords(next);
        onResolved?.(next);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });

    return () => controller.abort();
  }, [coords, query, onResolved]);

  const height = variant === 'card' ? 'h-28' : 'h-64';
  const zoom = variant === 'card' ? 13 : 15;
  const title = label || query || 'Project location';

  if (!coords) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-content-tertiary',
          height,
          className,
        )}
      >
        <div className="flex items-center gap-2 text-xs">
          <MapPin size={14} />
          <span>{query ? 'Resolving project location...' : 'No project location'}</span>
        </div>
      </div>
    );
  }

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01}%2C${coords.lat - 0.006}%2C${coords.lng + 0.01}%2C${coords.lat + 0.006}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
  const link = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=${zoom}/${coords.lat}/${coords.lng}`;

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-lg border border-border-light bg-surface-secondary',
        height,
        className,
      )}
    >
      <iframe
        title={title}
        src={src}
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded bg-surface-elevated/95 px-2 py-1 text-[10px] font-medium text-content-secondary shadow-sm backdrop-blur hover:text-content-primary"
      >
        <span className="inline-flex items-center gap-1 truncate">
          <MapPin size={11} />
          {title}
        </span>
      </a>
    </div>
  );
}

