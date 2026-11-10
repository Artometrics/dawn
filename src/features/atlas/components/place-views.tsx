'use client';

import { ChevronLeft, ExternalLink, Footprints, MapPin, Square, Volume2 } from 'lucide-react';
import { osmUrl } from '../lib/places.ts';
import { quizOrder, type Progress } from '../lib/progress.ts';
import type { AtlasPlace, PlaceMapState, Region, Route, Source, Thread } from '../lib/types.ts';

export type PlaceFilter = 'all' | 'stops' | 'visited' | 'other';

export const FILTERS: { id: PlaceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'stops', label: 'Story stops' },
  { id: 'visited', label: 'Visited' },
  { id: 'other', label: 'Other places' },
];

const STATE_TEXT: Record<PlaceMapState, string> = {
  stop: '',
  pin: '',
  'off-map': 'Off the map frame',
  line: 'A line, not a point',
  'needs-point': 'No map point yet',
  'no-pin': 'No pin on purpose',
};

export function placeMeta(place: AtlasPlace, visited: boolean): string {
  if (place.stop) return `${place.stop.years} · ${visited ? 'Visited' : 'Not yet'}`;
  const bits = [STATE_TEXT[place.mapState]];
  if (place.catalog?.privateProperty) bits.push('Private');
  else if (place.catalog?.offCampus) bits.push('Off campus');
  return bits.filter(Boolean).join(' · ') || 'Place';
}

export function filterPlaces(places: AtlasPlace[], filter: PlaceFilter, visited: Set<string>): AtlasPlace[] {
  switch (filter) {
    case 'stops':
      return places.filter((p) => p.kind === 'stop');
    case 'visited':
      return places.filter((p) => visited.has(p.id));
    case 'other':
      return places.filter((p) => p.kind === 'catalog');
    default:
      return places;
  }
}

export function PlacesView({
  places,
  progress,
  filter,
  onFilter,
  onSelect,
  query,
}: {
  places: AtlasPlace[];
  progress: Progress;
  filter: PlaceFilter;
  onFilter: (filter: PlaceFilter) => void;
  onSelect: (id: string) => void;
  query: string;
}) {
  const visited = new Set(progress.unlocked);
  return (
    <div>
      <div className="at-chips" role="group" aria-label="Filter places">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="at-chip" aria-pressed={filter === f.id} onClick={() => onFilter(f.id)}>
            <span>{f.label}</span>
          </button>
        ))}
      </div>
      <ul className="at-list" aria-label="Places">
        {places.map((place) => (
          <li key={place.id}>
            <button type="button" className="at-row" data-row={place.id} onClick={() => onSelect(place.id)}>
              <span className="at-row__icon" aria-hidden>
                {place.icon}
              </span>
              <span className="at-row__text">
                <span className="at-row__name">{place.name}</span>
                <span className="at-row__meta">{placeMeta(place, visited.has(place.id))}</span>
              </span>
              {visited.has(place.id) && <span className="at-row__end">Visited</span>}
            </button>
          </li>
        ))}
        {places.length === 0 && (
          <li className="at-muted" style={{ padding: '12px 8px' }}>
            {query ? 'No places match.' : 'Nothing here yet.'}
          </li>
        )}
      </ul>
    </div>
  );
}

function SourceLinks({ sources }: { sources: Source[] }) {
  return (
    <ul className="at-list">
      {sources.map((source) => (
        <li key={source.url}>
          <a className="at-link" href={source.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} aria-hidden />
            <span>
              {source.title}
              {/wikipedia\.org/.test(source.url) ? ' (secondary)' : ''}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
export { SourceLinks };

export type PlaceCardProps = {
  place: AtlasPlace;
  region: Region;
  progress: Progress;
  tour: { route: Route; index: number; bridge: string | null; outro: string | null; sideQuest: string | null } | null;
  walking: boolean;
  canSpeak: boolean;
  listening: boolean;
  onBack: () => void;
  onWalk: () => void;
  onStamp: () => void;
  onQuiz: (answer: number) => void;
  onListen: () => void;
  onShow: () => void;
  onThread: (threadId: string) => void;
};

function flagsFor(place: AtlasPlace): string[] {
  const c = place.catalog;
  if (!c) return [];
  const flags: string[] = [];
  if (c.privateProperty) flags.push('Private property. See it from the outside only.');
  if (c.exteriorOnly) flags.push('Exterior only');
  if (c.offCampus) flags.push('Off campus');
  if (c.linear) flags.push('A line on the map, not a single point');
  if (c.needsPoint) flags.push('Needs a map point: the site is not pinned yet');
  if (c.noPin) flags.push('Not pinned on purpose');
  return flags;
}

export function PlaceCard(props: PlaceCardProps) {
  const { place, region, progress, tour, walking, canSpeak, listening, onBack, onWalk, onStamp, onQuiz, onListen, onShow, onThread } = props;
  const stop = place.stop;
  const catalog = place.catalog;
  const visited = progress.unlocked.includes(place.id);
  const threads: Thread[] = stop ? region.threads.filter((t) => t.stops.includes(stop.id)) : [];
  const answered = stop ? progress.quiz[stop.id] : undefined;
  const osm = catalog ? osmUrl(catalog) : null;
  const flags = flagsFor(place);
  const pinned = place.mapState === 'stop' || place.mapState === 'pin';

  return (
    <article aria-label={place.name} data-card={place.id}>
      <button type="button" className="at-back" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden />
        Back
      </button>
      <header className="at-card-head">
        <span className="at-row__icon" aria-hidden>
          {place.icon}
        </span>
        <div>
          <h2 className="at-card-title">{place.name}</h2>
          <div className="at-badges">
            {stop && <span className="at-badge">{stop.years}</span>}
            {stop && visited && <span className="at-badge at-badge--clay">Visited</span>}
            {!stop && STATE_TEXT[place.mapState] && <span className="at-badge">{STATE_TEXT[place.mapState]}</span>}
            {tour && (
              <span className="at-badge">
                {tour.route.name}: stop {tour.index + 1} of {tour.route.stops.length}
              </span>
            )}
          </div>
        </div>
      </header>

      {tour?.bridge && <p className="at-note">{tour.bridge}</p>}

      {stop && (
        <div className="at-prose">
          <p>{stop.story}</p>
        </div>
      )}
      {tour?.sideQuest && (
        <p className="at-note">
          <strong>Side quest.</strong> {tour.sideQuest}
        </p>
      )}
      {tour?.outro && (
        <p className="at-note">
          <strong>End of the tour.</strong> {tour.outro}
        </p>
      )}

      {stop && stop.facts.length > 0 && (
        <>
          <h3 className="at-h">Key facts</h3>
          <ul className="at-facts">
            {stop.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </>
      )}

      {catalog && (
        <>
          <h3 className="at-h">{stop ? 'Place notes' : 'About this place'}</h3>
          <p className="at-note" style={{ marginTop: 0 }}>
            {catalog.note}
          </p>
          {flags.length > 0 && (
            <div className="at-badges">
              {flags.map((flag) => (
                <span key={flag} className="at-badge">
                  {flag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {place.markerOffsetFlag && place.markerOffsetM !== null && (
        <p className="at-note" data-flag="marker-offset">
          <strong>Marker check.</strong> The story marker and the OpenStreetMap point for this building are {Math.round(place.markerOffsetM)} m apart. The marker stays where
          Cardinal Quest set it. This is flagged in the data notes.
        </p>
      )}

      {stop && (
        <>
          <h3 className="at-h">Check yourself</h3>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{stop.quiz.question}</p>
          <div className="at-answers" role="group" aria-label="Answers">
            {quizOrder(stop.id, stop.quiz.answers.length).map((i) => {
              const right = answered !== undefined && i === stop.quiz.correct;
              return (
                <button
                  key={i}
                  type="button"
                  className={`at-answer${right ? ' is-right' : ''}`}
                  disabled={answered !== undefined}
                  onClick={() => onQuiz(i)}
                >
                  {stop.quiz.answers[i]}
                </button>
              );
            })}
          </div>
          {answered !== undefined && <p className="at-muted">{answered ? 'You got it. +50 XP' : 'Not quite. The right answer is marked.'}</p>}
        </>
      )}

      {threads.length > 0 && (
        <>
          <h3 className="at-h">In the Cardinal story</h3>
          <div className="at-chips">
            {threads.map((thread) => (
              <button key={thread.id} type="button" className="at-chip" onClick={() => onThread(thread.id)}>
                <span>
                  {thread.icon} {thread.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {stop && stop.sources.length > 0 && (
        <>
          <h3 className="at-h">Sources</h3>
          <SourceLinks sources={stop.sources} />
        </>
      )}

      {catalog && (catalog.bookScenes.length > 0 || catalog.podcastSegments.length > 0) && (
        <details className="at-details">
          <summary>In the book and podcast</summary>
          <ul className="at-facts">
            {catalog.bookScenes.map((scene) => (
              <li key={scene.file}>Book: {scene.context ?? scene.file}</li>
            ))}
            {catalog.podcastSegments.map((segment) => (
              <li key={segment}>Podcast: {segment}</li>
            ))}
          </ul>
        </details>
      )}

      {stop && (
        <details className="at-details">
          <summary>About this pin</summary>
          <p className="at-muted">
            {stop.coordinateSource} Added in Cardinal Quest {stop.addedIn}. Photos are not shown because none are licensed for Dawn.
          </p>
        </details>
      )}
      {osm && (
        <a className="at-link" href={osm} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} aria-hidden />
          <span>Open this place on OpenStreetMap</span>
        </a>
      )}

      <div className="at-actions">
        {stop && (
          <button type="button" className="at-btn" onClick={onWalk}>
            <Footprints size={18} aria-hidden />
            {walking ? 'Stop walking' : visited ? 'Walk here again' : 'Walk here'}
          </button>
        )}
        {stop && !visited && (
          <button type="button" className="at-btn at-btn--ghost" onClick={onStamp}>
            Mark visited
          </button>
        )}
        {pinned && (
          <button type="button" className="at-btn at-btn--ghost" onClick={onShow}>
            <MapPin size={18} aria-hidden />
            Show on map
          </button>
        )}
        {stop && canSpeak && (
          <button type="button" className="at-btn at-btn--ghost" onClick={onListen} aria-pressed={listening}>
            {listening ? <Square size={16} aria-hidden /> : <Volume2 size={18} aria-hidden />}
            {listening ? 'Stop' : 'Listen'}
          </button>
        )}
      </div>
    </article>
  );
}
