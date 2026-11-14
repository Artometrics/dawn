'use client';

import { MAP_H, MAP_W, LAND_PATH, project, unproject, type MapPin } from '@/lib/aftercare/world-map';

export function WorldMap({ pins, onPick }: { pins: MapPin[]; onPick?: (lat: number, lng: number) => void }) {
  return (
    <svg
      className="ac-map"
      viewBox={`0 20 ${MAP_W} 400`}
      role="img"
      aria-label={onPick ? 'World map. Click to set a birth place.' : `World map with ${pins.length} pinned ${pins.length === 1 ? 'place' : 'places'}.`}
      onClick={onPick ? (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * MAP_W;
        const y = 20 + ((event.clientY - rect.top) / rect.height) * 400;
        const spot = unproject(x, y);
        onPick(spot.lat, spot.lng);
      } : undefined}
    >
      <rect width={MAP_W} height={MAP_H} className="ac-map-sea" />
      <path d={LAND_PATH} className="ac-map-land" />
      {pins.map((pin, index) => {
        const { x, y } = project(pin.lat, pin.lng);
        const radius = pin.kind === 'birth' ? 9 : 6.5;
        return (
          <g key={`${pin.kind}-${index}`}>
            {pin.kind === 'birth' ? <circle cx={x} cy={y} r={radius + 7} className="ac-pin-ring" /> : null}
            <circle cx={x} cy={y} r={radius} className={`ac-pin ac-pin--${pin.kind}`}>
              <title>{pin.title ? `${pin.title}: ${pin.label}` : pin.label}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
