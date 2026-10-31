'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { YOU_LOOKS } from '@/lib/agents';

const FALLBACK: [number, number] = [37.4275, -122.1697];

export function AtlasMap({
  avatar,
  focusToken = 0,
}: {
  avatar: number;
  focusToken?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [place, setPlace] = useState<'here' | 'stand-in'>('stand-in');

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    let dead = false;
    void import('leaflet').then((leaflet) => {
      if (dead || mapRef.current) return;
      const L = leaflet.default;
      const map = L.map(parent, { zoomControl: false, attributionControl: true }).setView(FALLBACK, 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);
      const icon = L.divIcon({
        className: '',
        html: `<img src="${YOU_LOOKS[avatar] ?? YOU_LOOKS[0]}" alt="" width="32" height="32" style="image-rendering:pixelated;width:32px;height:32px" />`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      markerRef.current = L.marker(FALLBACK, { icon, title: 'You' }).addTo(map);
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 150);
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next: [number, number] = [position.coords.latitude, position.coords.longitude];
          markerRef.current?.setLatLng(next);
          map.setView(next, 15);
          setPlace('here');
        },
        () => setPlace('stand-in'),
        { enableHighAccuracy: false, timeout: 5000 },
      );
    });
    return () => {
      dead = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [avatar]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || focusToken === 0) return;
    map.setView(marker.getLatLng(), 15);
  }, [focusToken]);

  return (
    <div className="dawn-map relative h-full min-h-0">
      <p className="pointer-events-none absolute top-16 left-4 z-[400] max-w-[16rem] text-[13px] text-[var(--dawn-secondary)]">
        {place === 'here' ? 'You are on the map.' : 'Stand-in spot until location is allowed.'}
      </p>
      <div ref={host} className="h-full min-h-[240px]" />
    </div>
  );
}
