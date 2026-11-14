'use client';

import { useEffect, useRef, useState } from 'react';
import { spriteUrl } from './lib/items.ts';
import type { LngLat, Place, TileFeature } from './lib/types.ts';

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

type WalkMapProps = {
  places: Place[];
  hero: string;
  here: LngLat;
  follow: boolean;
  reduced: boolean;
  visited: readonly string[];
  beaten: readonly string[];
  festiveId: string | null;
  questIds: readonly string[];
  focus: LngLat | null;
  onScan: (features: TileFeature[]) => void;
  onPlace: (id: string) => void;
  onDrag: () => void;
  onReady: (ok: boolean) => void;
};

/** MapLibre, loaded only when Walk mounts. Tiles are the free OpenFreeMap liberty style. */
export function WalkMap(props: WalkMapProps) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markers = useRef<import('maplibre-gl').Marker[]>([]);
  const heroMarker = useRef<import('maplibre-gl').Marker | null>(null);
  const heroImg = useRef<HTMLImageElement | null>(null);
  const onScan = useRef(props.onScan);
  const onPlace = useRef(props.onPlace);
  const onDrag = useRef(props.onDrag);
  const onReady = useRef(props.onReady);
  const [born, setBorn] = useState(false);
  useEffect(() => {
    onScan.current = props.onScan;
    onPlace.current = props.onPlace;
    onDrag.current = props.onDrag;
    onReady.current = props.onReady;
  }, [props.onScan, props.onPlace, props.onDrag, props.onReady]);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    let dead = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void (async () => {
      try {
        const maplibre = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        if (dead) return;
        const map = new maplibre.Map({
          container: parent,
          style: MAP_STYLE,
          center: props.here,
          zoom: 15,
          attributionControl: { compact: true },
          fadeDuration: reduced ? 0 : 280,
          pitchWithRotate: false,
          dragRotate: false,
        });
        mapRef.current = map;
        const fit = () => {
          const wide = parent.clientWidth >= 900;
          map.setPadding(wide ? { top: 168, bottom: 88, left: 20, right: 20 } : { top: 228, bottom: 132, left: 12, right: 12 });
          map.resize();
        };
        fit();
        map.on('dragstart', () => onDrag.current());
        map.on('error', () => undefined);
        let painted = false;
        map.on('styledata', () => {
          if (painted) return;
          const style = map.getStyle();
          if (!style?.layers?.length) return;
          painted = true;
          for (const layer of style.layers) {
            try {
              if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#161816');
              else if (layer.type === 'fill') {
                const id = layer.id;
                const water = /water/.test(id);
                const green = /park|wood|grass|landcover/.test(id);
                const building = /building/.test(id);
                map.setPaintProperty(id, 'fill-color', water ? '#1a3358' : green ? '#245033' : building ? '#2c332c' : '#242824');
              } else if (layer.type === 'line' && /road|street|highway|path|bridge/.test(layer.id)) {
                map.setPaintProperty(layer.id, 'line-color', /casing/.test(layer.id) ? '#141210' : '#8a938c');
              } else if (layer.type === 'fill-extrusion') map.setLayoutProperty(layer.id, 'visibility', 'none');
              else if (layer.type === 'symbol' && /poi/.test(layer.id)) map.setLayoutProperty(layer.id, 'visibility', 'none');
              else if (layer.type === 'symbol') map.setPaintProperty(layer.id, 'text-color', '#c4bdb3');
            } catch {
              /* A layer may not accept this paint key. Leave it. */
            }
          }
        });
        let last = 0;
        map.on('idle', () => {
          const now = Date.now();
          if (now - last < 4000) return;
          last = now;
          try {
            const found = map.querySourceFeatures('openmaptiles', { sourceLayer: 'poi' });
            if (!found.length) return;
            onScan.current(
              found.map((feature) => ({
                id: feature.id,
                properties: {
                  class: typeof feature.properties?.class === 'string' ? feature.properties.class : undefined,
                  subclass: typeof feature.properties?.subclass === 'string' ? feature.properties.subclass : undefined,
                  name: typeof feature.properties?.name === 'string' ? feature.properties.name : undefined,
                },
                geometry:
                  feature.geometry?.type === 'Point'
                    ? { type: 'Point', coordinates: feature.geometry.coordinates as number[] }
                    : undefined,
              })),
            );
          } catch {
            /* Style is not ready yet. */
          }
        });
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wk-hero';
        button.setAttribute('aria-label', 'You');
        const img = document.createElement('img');
        img.alt = '';
        img.width = 44;
        img.height = 44;
        button.appendChild(img);
        heroImg.current = img;
        heroMarker.current = new maplibre.Marker({ element: button, anchor: 'center' }).setLngLat(props.here).addTo(map);
        if (!dead) {
          setBorn(true);
          onReady.current(true);
        }
      } catch {
        if (!dead) onReady.current(false);
      }
    })();
    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      const node = host.current;
      if (!map || !node) return;
      const wide = node.clientWidth >= 900;
      map.setPadding(wide ? { top: 168, bottom: 88, left: 20, right: 20 } : { top: 228, bottom: 132, left: 12, right: 12 });
      map.resize();
    });
    observer.observe(parent);
    return () => {
      dead = true;
      observer.disconnect();
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      heroMarker.current?.remove();
      heroMarker.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once. Later effects move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !born) return;
    if (props.follow) {
      if (props.reduced) map.jumpTo({ center: props.here });
      else map.easeTo({ center: props.here, duration: 450 });
    }
    heroMarker.current?.setLngLat(props.here);
    if (heroImg.current) heroImg.current.src = spriteUrl(props.hero);
  }, [born, props.follow, props.here, props.hero, props.reduced]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !born || !props.focus) return;
    if (props.reduced) map.jumpTo({ center: props.focus, zoom: 16 });
    else map.easeTo({ center: props.focus, zoom: 16, duration: 600 });
  }, [born, props.focus, props.reduced]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !born) return;
    let cancelled = false;
    void import('maplibre-gl').then((maplibre) => {
      if (cancelled) return;
      markers.current.forEach((marker) => marker.remove());
      markers.current = props.places.map((place) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'wk-pin';
        button.dataset.place = place.id;
        if (place.boss) button.dataset.boss = 'true';
        if (props.visited.includes(place.id) || props.beaten.includes(place.id)) button.dataset.done = 'true';
        if (props.festiveId === place.id) button.dataset.fest = 'true';
        if (props.questIds.includes(place.id)) button.dataset.quest = 'true';
        const label = place.boss ? `${place.bossKind[1]} at ${place.name}` : `${place.kind[1]}${place.name ? `, ${place.name}` : ''}`;
        button.title = label;
        const img = document.createElement('img');
        img.alt = '';
        img.width = place.boss ? 46 : 32;
        img.height = place.boss ? 46 : 32;
        img.src = spriteUrl(place.boss ? place.bossKind[0] : place.kind[0]);
        button.appendChild(img);
        button.addEventListener('click', () => onPlace.current(place.id));
        const marker = new maplibre.Marker({ element: button, anchor: 'center' }).setLngLat(place.ll).addTo(map);
        marker.getElement().setAttribute('aria-label', label);
        return marker;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [born, props.places, props.visited, props.beaten, props.festiveId, props.questIds]);

  return <div ref={host} className="wk-map" data-map="walk" />;
}
