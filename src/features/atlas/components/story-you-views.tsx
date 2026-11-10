'use client';

import { ChevronDown, ChevronRight, LocateFixed } from 'lucide-react';
import { ERAS, RANKS, erasDone, huntPicks, huntStreak, quizzesCorrect, rankFor, xp, type Progress } from '../lib/progress.ts';
import type { Region } from '../lib/types.ts';
import { SourceLinks } from './place-views.tsx';

export function StoryView({
  region,
  progress,
  eraFilter,
  openThread,
  onEra,
  onThread,
  onSelectStop,
}: {
  region: Region;
  progress: Progress;
  eraFilter: number;
  openThread: string | null;
  onEra: (index: number) => void;
  onThread: (id: string | null) => void;
  onSelectStop: (id: string) => void;
}) {
  const got = new Set(progress.unlocked);
  const stops = new Map(region.stops.map((s) => [s.id, s]));
  const era = eraFilter >= 0 ? ERAS[eraFilter] : null;
  const events = region.events.filter((e) => !era || (e.year >= era.from && e.year <= era.to));

  return (
    <div data-view="story">
      <h2 className="at-h">Threads from the book</h2>
      {region.threads.map((thread) => {
        const done = thread.stops.filter((id) => got.has(id)).length;
        const isOpen = openThread === thread.id;
        return (
          <section key={thread.id} className="at-thread" data-thread={thread.id}>
            <button type="button" aria-expanded={isOpen} onClick={() => onThread(isOpen ? null : thread.id)}>
              <span className="at-row__icon" aria-hidden>
                {thread.icon}
              </span>
              <span className="at-row__text">
                <span className="at-row__name">{thread.name}</span>
                <span className="at-row__meta">
                  {done}/{thread.stops.length} stops · {thread.book}
                </span>
              </span>
              {isOpen ? <ChevronDown size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
            </button>
            {isOpen && (
              <div className="at-thread__body">
                <div className="at-prose">
                  <p>{thread.description}</p>
                </div>
                <div className="at-chips">
                  {thread.stops.map((id) => (
                    <button key={id} type="button" className="at-chip" onClick={() => onSelectStop(id)}>
                      <span>
                        {got.has(id) ? '✓ ' : ''}
                        {stops.get(id)?.name ?? id}
                      </span>
                    </button>
                  ))}
                </div>
                {thread.facts.map((fact) => (
                  <div key={fact.text}>
                    <div className="at-prose">
                      <p style={{ marginTop: 8 }}>{fact.text}</p>
                    </div>
                    <SourceLinks sources={fact.sources} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <h2 className="at-h">Timeline</h2>
      <div className="at-chips" role="group" aria-label="Filter by era">
        <button type="button" className="at-chip" aria-pressed={eraFilter < 0} onClick={() => onEra(-1)}>
          <span>All eras</span>
        </button>
        {ERAS.map((e, i) => (
          <button key={e.name} type="button" className="at-chip" aria-pressed={eraFilter === i} onClick={() => onEra(eraFilter === i ? -1 : i)}>
            <span>
              {e.icon} {e.name}
            </span>
          </button>
        ))}
      </div>
      <ul className="at-timeline">
        {events.map((event) => (
          <li key={`${event.year}-${event.text}`}>
            <b>{event.year}</b>
            <div>
              <p>{event.text}</p>
              <a className="at-link" href={event.source.url} target="_blank" rel="noopener noreferrer">
                {event.source.title}
              </a>
              {event.stopId && stops.get(event.stopId) && (
                <button type="button" className="at-chip" onClick={() => onSelectStop(event.stopId as string)}>
                  <span>{stops.get(event.stopId)?.name}</span>
                </button>
              )}
            </div>
          </li>
        ))}
        {events.length === 0 && <li className="at-muted">No events in this era.</li>}
      </ul>
    </div>
  );
}

export type GpsState = { on: boolean; status: string };

export function YouView({
  region,
  progress,
  today,
  gps,
  onGps,
  resetArmed,
  onReset,
  onSelectStop,
}: {
  region: Region;
  progress: Progress;
  today: string;
  gps: GpsState;
  onGps: () => void;
  resetArmed: boolean;
  onReset: () => void;
  onSelectStop: (id: string) => void;
}) {
  const total = xp(progress);
  const { rank, next } = rankFor(total);
  const eras = erasDone(progress, region.stops);
  const picks = huntPicks(
    today,
    region.stops.map((s) => s.id),
  );
  const found = new Set(progress.hunt[today]?.found ?? []);
  const stops = new Map(region.stops.map((s) => [s.id, s]));
  const streak = huntStreak(progress, today);
  const floor = RANKS.reduce((lo, [at]) => (total >= at ? at : lo), 0);
  const pct = next ? Math.min(100, ((total - floor) / (next.at - floor)) * 100) : 100;

  return (
    <div data-view="you">
      <h2 className="at-h">Rank</h2>
      <p className="at-rank" data-rank>
        {rank}
      </p>
      <p className="at-muted" style={{ margin: '4px 0 0' }}>
        {total} XP{next ? ` · ${next.at - total} to ${next.rank}` : ' · top rank'}
      </p>
      <div className="at-bar" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </div>

      <h2 className="at-h">Progress</h2>
      <div className="at-stat-grid">
        <div className="at-stat">
          <b data-stat="stops">
            {progress.unlocked.length}/{region.stops.length}
          </b>
          <span>Stops visited</span>
        </div>
        <div className="at-stat">
          <b>
            {quizzesCorrect(progress)}/{region.stops.length}
          </b>
          <span>Quizzes right</span>
        </div>
        <div className="at-stat">
          <b>
            {progress.routesDone.length}/{region.routes.length}
          </b>
          <span>Tours done</span>
        </div>
        <div className="at-stat">
          <b>
            {progress.threadsDone.length}/{region.threads.length}
          </b>
          <span>Threads done</span>
        </div>
      </div>

      <h2 className="at-h">Era stamps</h2>
      {ERAS.map((era, i) => (
        <div key={era.name} className="at-era" data-done={eras[i]}>
          <span aria-hidden>{eras[i] ? era.icon : '○'}</span>
          <span>
            {era.name} <span className="at-muted">{era.from}–{era.to > 2000 ? 'now' : era.to}</span>
          </span>
        </div>
      ))}

      <h2 className="at-h">Daily hunt</h2>
      <p className="at-muted" style={{ margin: 0 }}>
        Three stops a day, picked the same way for everyone. {streak > 0 ? `${streak}-day streak.` : 'Find all three for a streak.'}
      </p>
      <div className="at-hunt">
        {picks.map((id) => (
          <button key={id} type="button" className="at-chip" aria-pressed={found.has(id)} onClick={() => onSelectStop(id)}>
            <span>
              {found.has(id) ? '✓ ' : ''}
              {stops.get(id)?.name}
            </span>
          </button>
        ))}
      </div>
      <p className="at-muted">{region.dailyNote}</p>

      <h2 className="at-h">Location</h2>
      <button type="button" className="at-btn at-btn--ghost" aria-pressed={gps.on} onClick={onGps} data-action="gps">
        <LocateFixed size={18} aria-hidden />
        {gps.on ? 'Stop using my location' : 'Unlock stops where I stand'}
      </button>
      <p className="at-muted">{gps.status}</p>

      <h2 className="at-h">About this map</h2>
      <p className="at-muted">
        Map drawn from OpenStreetMap data (© OpenStreetMap contributors, ODbL), baked into one file in Dawn. Stories, quizzes and sources come from Kyle&apos;s Cardinal book and podcast notes.
        Progress stays on this device.
      </p>
      <div className="at-actions">
        <button type="button" className="at-btn at-btn--ghost" onClick={onReset} data-action="reset">
          {resetArmed ? 'Tap again to erase progress' : 'Reset progress'}
        </button>
      </div>
    </div>
  );
}
