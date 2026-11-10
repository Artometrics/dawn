'use client';

import { ChevronLeft, Footprints, Maximize2, Square, Volume2 } from 'lucide-react';
import { routeProgress } from '../lib/tour.ts';
import type { Progress } from '../lib/progress.ts';
import type { Region, Route } from '../lib/types.ts';
import { SourceLinks } from './place-views.tsx';

export function ToursView({
  region,
  progress,
  activeRouteId,
  open,
  walking,
  canSpeak,
  listening,
  onOpen,
  onClose,
  onWalkNext,
  onStopWalking,
  onSelectStop,
  onFit,
  onListen,
}: {
  region: Region;
  progress: Progress;
  activeRouteId: string;
  open: boolean;
  walking: boolean;
  canSpeak: boolean;
  listening: boolean;
  onOpen: (routeId: string) => void;
  onClose: () => void;
  onWalkNext: () => void;
  onStopWalking: () => void;
  onSelectStop: (id: string) => void;
  onFit: () => void;
  onListen: () => void;
}) {
  const stops = new Map(region.stops.map((s) => [s.id, s]));
  const route: Route | undefined = region.routes.find((r) => r.id === activeRouteId);

  if (open && route) {
    const status = routeProgress(route, progress);
    const got = new Set(progress.unlocked);
    return (
      <div data-view="route" data-route={route.id}>
        <button type="button" className="at-back" onClick={onClose}>
          <ChevronLeft size={18} aria-hidden />
          All tours
        </button>
        <header className="at-card-head">
          <span className="at-row__icon" aria-hidden>
            {route.icon}
          </span>
          <div>
            <h2 className="at-card-title">{route.name}</h2>
            <div className="at-badges">
              <span className="at-badge">{route.km} km on foot</span>
              <span className="at-badge">{route.stops.length} stops</span>
              {status.complete && <span className="at-badge at-badge--clay">Complete</span>}
            </div>
          </div>
        </header>
        <div className="at-prose">
          <p>{route.description}</p>
        </div>
        <div className="at-bar" role="img" aria-label={`${status.done} of ${status.total} stops visited`}>
          <i style={{ width: `${(status.done / status.total) * 100}%` }} />
        </div>
        <div className="at-actions">
          {walking ? (
            <button type="button" className="at-btn" onClick={onStopWalking}>
              <Square size={16} aria-hidden />
              Stop walking
            </button>
          ) : status.complete ? (
            <button type="button" className="at-btn" onClick={onFit}>
              <Maximize2 size={18} aria-hidden />
              Show the tour
            </button>
          ) : (
            <button type="button" className="at-btn" data-action="walk-next" onClick={onWalkNext}>
              <Footprints size={18} aria-hidden />
              {status.done === 0 ? 'Start the walk' : 'Walk to the next stop'}
            </button>
          )}
          {canSpeak && (
            <button type="button" className="at-btn at-btn--ghost" onClick={onListen} aria-pressed={listening}>
              {listening ? <Square size={16} aria-hidden /> : <Volume2 size={18} aria-hidden />}
              {listening ? 'Stop' : 'Listen to the intro'}
            </button>
          )}
        </div>

        {route.prologue && (
          <>
            <h3 className="at-h">Before you start</h3>
            <div className="at-prose">
              <p>{route.prologue.text}</p>
            </div>
            <SourceLinks sources={route.prologue.sources} />
          </>
        )}

        <h3 className="at-h">Stops</h3>
        <ol className="at-list">
          {route.stops.map((id, i) => {
            const stop = stops.get(id);
            if (!stop) return null;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="at-step"
                  data-done={got.has(id)}
                  data-next={status.nextStopId === id}
                  onClick={() => onSelectStop(id)}
                >
                  <span className="at-step__n" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="at-row__text">
                    <span className="at-row__name">{stop.name}</span>
                    <span className="at-row__meta">
                      {stop.years}
                      {route.side?.stopId === id ? ' · side quest' : ''}
                    </span>
                  </span>
                  {got.has(id) && <span className="at-row__end">Visited</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div data-view="tours">
      <h2 className="at-h">Walking tours</h2>
      {region.routes.map((r) => {
        const status = routeProgress(r, progress);
        return (
          <button
            key={r.id}
            type="button"
            className="at-route-card"
            data-route-card={r.id}
            style={{ ['--at-route' as string]: r.color }}
            onClick={() => onOpen(r.id)}
          >
            <strong>
              {r.icon} {r.name}
            </strong>
            <small>
              {r.km} km · {r.stops.length} stops · {status.done}/{status.total} visited
              {r.id === activeRouteId ? ' · on the map' : ''}
            </small>
            <div className="at-bar" aria-hidden>
              <i style={{ width: `${(status.done / status.total) * 100}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
