'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ACHIEVEMENTS, achievementValue, FIRST_STEPS, noteFirstSteps } from './lib/achievements.ts';
import { bossDrink, bossStrike, startBoss, type BossFight } from './lib/combat.ts';
import { demoStep, nearestRoute, type DemoCursor } from './lib/demo.ts';
import { distance, pacificDay } from './lib/geo.ts';
import { events, distanceMul } from './lib/events.ts';
import { HEROES, ITEMS, RARITY, sellPrice, spriteUrl } from './lib/items.ts';
import { applyBagItem } from './lib/loot.ts';
import { DEFAULT_CENTER, scanPlaces } from './lib/poi.ts';
import { claimQuests, ensureQuests, qTarget, qprog } from './lib/quests.ts';
import { loadWalk, saveWalk } from './lib/save.ts';
import { acceptStep, addXp, attackOf, defenseOf, emptyDay, emptyWalk, heal, lvlOf, maxHp, rollDay } from './lib/state.ts';
import { festival, visitPlace } from './lib/visit.ts';
import type { DayState, LngLat, Place, PoiSeed, TileFeature, WalkState } from './lib/types.ts';
import { WalkMap } from './walk-map.tsx';
import './walk.css';

function subscribeReduced(notify: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}

function motionReduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Sheet = 'journal' | 'boss' | 'hero' | null;
type Tab = 'quests' | 'bag' | 'feats';
type Loc = 'off' | 'asking' | 'on' | 'denied' | 'unsupported';

const LOC_TEXT: Record<Loc, string> = {
  off: 'Location stays off until you ask.',
  asking: 'Asking for location…',
  on: 'Using your location. Only steps between half a metre and 500 metres count.',
  denied: 'Location stayed off. Demo walk works without it.',
  unsupported: 'This browser has no location. Demo walk works without it.',
};

function levelFill(xp: number): number {
  const level = lvlOf(xp);
  const start = (level - 1) ** 2 * 100;
  const end = level * level * 100;
  return Math.max(0, Math.min(100, ((xp - start) / (end - start)) * 100));
}

export function WalkApp() {
  const [state, setState] = useState<WalkState>(emptyWalk);
  const [day, setDay] = useState<DayState>(emptyDay);
  const [places, setPlaces] = useState<Place[]>([]);
  const [here, setHere] = useState<LngLat>(DEFAULT_CENTER);
  const [ready, setReady] = useState(false);
  const [demoOn, setDemoOn] = useState(false);
  const [follow, setFollow] = useState(true);
  const [focus, setFocus] = useState<LngLat | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [tab, setTab] = useState<Tab>('quests');
  const [fight, setFight] = useState<BossFight | null>(null);
  const [log, setLog] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc>('off');
  const [mapOk, setMapOk] = useState(true);
  const [heroPick, setHeroPick] = useState('hero_wizard');
  const [name, setName] = useState('Wanderer');
  const reduced = useSyncExternalStore(subscribeReduced, motionReduced, () => false);

  const stateRef = useRef(state);
  const dayRef = useRef(day);
  const placesRef = useRef(places);
  const hereRef = useRef(here);
  const demoRef = useRef(false);
  const fightRef = useRef<BossFight | null>(null);
  const watchRef = useRef<number | null>(null);
  const poolRef = useRef(new Map<string, PoiSeed>());
  const toastTimer = useRef(0);
  const movedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
    dayRef.current = day;
    placesRef.current = places;
    hereRef.current = here;
    demoRef.current = demoOn;
    fightRef.current = fight;
  }, [state, day, places, here, demoOn, fight]);

  const say = useCallback((message: string | null) => {
    if (!message) return;
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const publish = useCallback(
    (next: WalkState, board: DayState, notes: string[], opened = false) => {
      const now = new Date();
      const rolled = rollDay(next, board, now);
      const claimed = claimQuests(rolled.state, rolled.day, placesRef.current, now);
      const noted = noteFirstSteps(claimed.state, claimed.day, now, opened);
      stateRef.current = noted.state;
      dayRef.current = noted.day;
      setState(noted.state);
      setDay(noted.day);
      const line = [...notes, rolled.message, ...claimed.messages, ...noted.messages].filter((item): item is string => !!item);
      if (line.length) say(line[line.length - 1]);
    },
    [say],
  );

  const openBoss = useCallback((place: Place, from = stateRef.current, board = dayRef.current) => {
    const next = startBoss(from, board, place);
    if (!next) {
      say(`${place.bossKind[1]} is defeated until tomorrow.`);
      return;
    }
    setFight(next);
    fightRef.current = next;
    setLog(`${next.name} holds ${next.placeName}.`);
    setSheet('boss');
  }, [say]);

  const moveTo = useCallback(
    (to: LngLat) => {
      const now = new Date();
      const from = movedRef.current ? hereRef.current : null;
      let next = stateRef.current;
      let board = dayRef.current;
      const notes: string[] = [];
      if (from && acceptStep(distance(from, to))) {
        const metres = distance(from, to);
        next = { ...next, metres: next.metres + metres };
        board = { ...board, dm: board.dm + metres };
        const before = Math.floor((next.metres - metres) / 10);
        const after = Math.floor(next.metres / 10);
        if (after > before) {
          const gained = addXp(next, board, (after - before) * 2 * distanceMul(now), now);
          next = gained.state;
          board = gained.day;
          if (gained.leveled) notes.push(`Level ${lvlOf(next.xp)}. Fully healed.`);
        }
        next = heal(next, metres / 25);
        for (const place of placesRef.current) {
          if (place.boss || board.dv.includes(place.id) || distance(to, place.ll) >= 25) continue;
          const result = visitPlace(next, board, place, { tap: false, pos: to, places: placesRef.current, center: to, now });
          if (result.ok) {
            next = result.state;
            board = result.day;
            notes.push(result.message);
          }
        }
        if (!fightRef.current) {
          const boss = placesRef.current.find((place) => place.boss && !board.db.includes(place.id) && distance(to, place.ll) < 30);
          if (boss) openBoss(boss, next, board);
        }
      }
      movedRef.current = true;
      hereRef.current = to;
      setHere(to);
      publish(next, board, notes);
    },
    [openBoss, publish],
  );

  useEffect(() => {
    const loaded = loadWalk(window.localStorage);
    const now = new Date();
    const rolled = rollDay(loaded.state, loaded.day, now);
    const seeded = scanPlaces([], DEFAULT_CENTER).places;
    const board = ensureQuests(rolled.day, seeded, DEFAULT_CENTER, pacificDay(now));
    placesRef.current = seeded;
    /* eslint-disable react-hooks/set-state-in-effect -- the save exists only in localStorage, so it is read after mount */
    setPlaces(seeded);
    setHeroPick(rolled.state.sprite);
    setName(rolled.state.name);
    publish(rolled.state, board, rolled.message ? [rolled.message] : []);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      window.clearTimeout(toastTimer.current);
    };
    // Hydrate once from this phone's save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveWalk(window.localStorage, state, day);
  }, [ready, state, day]);

  useEffect(() => {
    if (!demoOn) return;
    let cursor: DemoCursor = { route: nearestRoute(hereRef.current), index: 0, t: 0 };
    const id = window.setInterval(() => {
      const step = demoStep(cursor);
      cursor = step.cursor;
      moveTo(step.at);
    }, 500);
    return () => window.clearInterval(id);
  }, [demoOn, moveTo]);

  const stopWatch = () => {
    if (watchRef.current != null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
  };

  const askLocation = () => {
    if (!navigator.geolocation) {
      setLoc('unsupported');
      say(LOC_TEXT.unsupported);
      return;
    }
    if (loc === 'on') {
      stopWatch();
      setLoc('off');
      return;
    }
    setDemoOn(false);
    setLoc('asking');
    setFollow(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLoc('on');
        moveTo([position.coords.longitude, position.coords.latitude]);
      },
      () => {
        stopWatch();
        setLoc('denied');
        say(LOC_TEXT.denied);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 },
    );
  };

  const onPlace = (id: string) => {
    const place = placesRef.current.find((row) => row.id === id);
    if (!place) return;
    const now = new Date();
    if (place.boss) {
      if (dayRef.current.db.includes(place.id)) {
        say(`${place.bossKind[1]} is defeated until tomorrow.`);
        return;
      }
      const pos = movedRef.current ? hereRef.current : null;
      if (!demoRef.current && !pos) {
        say('Turn on location, or start the demo walk, to approach a boss.');
        return;
      }
      if (!demoRef.current && pos && distance(pos, place.ll) > 80) {
        say(`${place.bossKind[1]} is ${Math.round(distance(pos, place.ll))} m away.`);
        return;
      }
      openBoss(place);
      return;
    }
    const pos = movedRef.current ? hereRef.current : null;
    const result = visitPlace(stateRef.current, dayRef.current, place, {
      tap: true,
      pos,
      places: placesRef.current,
      center: pos ?? place.ll,
      now,
    });
    if (!result.ok) {
      say(result.reason === 'done' ? `${place.kind[1]} is done until tomorrow.` : `${Math.round(result.metres ?? 0)} m away.`);
      return;
    }
    publish(result.state, result.day, [result.message]);
  };

  const onScan = (features: TileFeature[]) => {
    const center = hereRef.current;
    const scanned = scanPlaces(features, center, poolRef.current);
    poolRef.current = scanned.pool;
    placesRef.current = scanned.places;
    setPlaces(scanned.places);
    setDay((current) => ensureQuests(current, scanned.places, center, pacificDay(new Date())));
  };

  const strike = () => {
    if (!fight) return;
    const step = bossStrike(stateRef.current, dayRef.current, fight, Math.random, new Date());
    setLog(step.log);
    if (step.outcome === 'ongoing' && step.fight) {
      setFight(step.fight);
      publish(step.state, step.day, []);
      return;
    }
    setFight(null);
    setSheet(null);
    publish(step.state, step.day, [step.log]);
  };

  const drink = () => {
    if (!fight) return;
    const step = bossDrink(stateRef.current, fight, Math.random);
    if (!step) return;
    setLog(step.log);
    if (step.outcome === 'down') {
      setFight(null);
      setSheet(null);
    }
    publish(step.state, dayRef.current, [step.log]);
  };

  const openJournal = () => {
    setTab('quests');
    setSheet('journal');
    publish(stateRef.current, ensureQuests(dayRef.current, placesRef.current, hereRef.current, pacificDay(new Date())), [], true);
  };

  const fest = useMemo(() => festival(places, here, day.day || pacificDay(new Date())), [places, here, day.day]);
  const questLeft = day.q.filter((quest) => !day.qc.includes(quest.id)).length;
  const banner = [
    ...events(new Date()).map((event) => event.text),
    fest ? `Festival at ${fest.name || fest.kind[1]}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const counts = new Map<string, number>();
  for (const id of state.loot) counts.set(id, (counts.get(id) ?? 0) + 1);
  const healLeft = state.loot.filter((id) => ITEMS[id]?.kind === 'heal').length;

  return (
    <div className="wk-root" data-ready={ready ? 'true' : 'false'} data-xp={state.xp} data-demo={demoOn ? 'on' : 'off'} data-loc={loc}>
      <WalkMap
        places={places}
        hero={state.sprite}
        here={here}
        follow={follow}
        reduced={reduced}
        visited={day.dv}
        beaten={day.db}
        festiveId={fest?.id ?? null}
        questIds={day.q.filter((quest) => !day.qc.includes(quest.id)).map((quest) => qTarget(quest, day)).filter((id): id is string => !!id)}
        focus={focus}
        onScan={onScan}
        onPlace={onPlace}
        onDrag={() => setFollow(false)}
        onReady={setMapOk}
      />
      {!mapOk && (
        <ul className="wk-fallback">
          {places.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => onPlace(place.id)}>
                {place.boss ? place.bossKind[1] : place.kind[1]}
                {place.name ? ` · ${place.name}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
      <header className="wk-hud">
        <div className="wk-row">
          <button type="button" className="wk-hero-btn" aria-label="Choose your hero" onClick={() => { setHeroPick(state.sprite); setName(state.name); setSheet('hero'); }}>
            <img src={spriteUrl(state.sprite)} alt="" width={32} height={32} />
          </button>
          <span className="wk-level">Lv {lvlOf(state.xp)}</span>
          <span className="wk-bar" aria-hidden><span style={{ width: `${levelFill(state.xp)}%` }} /></span>
          <span className="wk-stat" data-xp-label>{state.xp} XP</span>
          <span className="wk-stat">{state.gold} g</span>
        </div>
        <div className="wk-row">
          <span className="wk-stat">{Math.ceil(state.rpg.hp)}/{maxHp(state.xp)}</span>
          <span className="wk-bar is-hp" aria-label="Health"><span style={{ width: `${(state.rpg.hp / maxHp(state.xp)) * 100}%` }} /></span>
          <span className="wk-stat">Streak {state.rpg.streak || 1}</span>
          <span className="wk-stat">Atk {attackOf(state)}</span>
          <span className="wk-stat">Def {defenseOf(state)}</span>
        </div>
        <p className="wk-banner">{banner}</p>
        <p className="wk-status">{LOC_TEXT[loc]}</p>
        <p className="wk-note">Map tiles come from OpenFreeMap, which sees the area you view. Nothing else leaves this phone.</p>
      </header>
      {sheet === null && (
        <div className="wk-actions">
          <button type="button" onClick={askLocation}>{loc === 'on' ? 'Stop location' : 'Use my location'}</button>
          <button type="button" aria-pressed={demoOn} onClick={() => { setDemoOn((on) => !on); setFollow(true); if (loc === 'on') { stopWatch(); setLoc('off'); } }}>
            {demoOn ? 'Stop demo' : 'Demo walk'}
          </button>
          <button type="button" onClick={openJournal}>
            Quests{questLeft > 0 ? <span className="wk-badge">{questLeft}</span> : null}
          </button>
          {!follow && (
            <button type="button" onClick={() => { setFollow(true); setFocus(null); }}>
              Recenter
            </button>
          )}
        </div>
      )}
      {sheet === 'journal' && (
        <section className="wk-sheet" aria-label="Journal" data-panel="quests">
          <div className="wk-tabs" role="tablist">
            {(['quests', 'bag', 'feats'] as Tab[]).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {id === 'quests' ? 'Quests' : id === 'bag' ? 'Bag' : 'Feats'}
              </button>
            ))}
          </div>
          {tab === 'quests' && (
            <>
              {!state.fs.all && (
                <div className="wk-step">
                  <p>
                    First steps
                    {FIRST_STEPS.map((step) => (
                      <small key={step.k}>{state.fs[step.k] ? 'Done' : 'To do'} · {step.t}</small>
                    ))}
                  </p>
                </div>
              )}
              {day.q.length === 0 && <p>Walk a little and the day’s quests appear.</p>}
              {day.q.map((quest) => {
                const [done, goal] = qprog(quest, day, places);
                const target = qTarget(quest, day);
                const place = target ? places.find((row) => row.id === target) : undefined;
                const claimed = day.qc.includes(quest.id);
                return (
                  <div key={quest.id} className={claimed ? 'wk-quest is-done' : 'wk-quest'}>
                    <img src={spriteUrl(quest.ic)} alt="" width={28} height={28} />
                    <p>
                      {quest.t}
                      <small>{done}/{goal} · {quest.xp} XP · {quest.g} gold</small>
                    </p>
                    {place && !claimed && (
                      <button type="button" onClick={() => { setFocus(place.ll); setFollow(false); setSheet(null); }}>
                        Go
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}
          {tab === 'bag' && (
            <>
              {state.rpg.eq.map((id) => (
                <div key={id} className="wk-item">
                  <img src={spriteUrl(id)} alt="" width={28} height={28} />
                  <p>{ITEMS[id]?.name}<small>Equipped</small></p>
                </div>
              ))}
              {[...counts.entries()].map(([id, count]) => {
                const item = ITEMS[id];
                if (!item) return null;
                const verb = item.kind === 'heal' ? 'Use' : item.kind === 'xp' ? 'Read' : item.kind === 'chest' ? 'Open' : item.kind === 'atk' || item.kind === 'def' ? 'Equip' : '';
                return (
                  <div key={id} className="wk-item">
                    <img src={spriteUrl(id)} alt="" width={28} height={28} />
                    <p>
                      {item.name} ×{count}
                      <small>{RARITY[item.rarity]}</small>
                    </p>
                    {verb && (
                      <button type="button" onClick={() => {
                        const used = applyBagItem(stateRef.current, dayRef.current, id, 'use', new Date(), Math.random);
                        if (used) publish(used.state, used.day, [used.message]);
                      }}>{verb}</button>
                    )}
                    <button type="button" onClick={() => {
                      const sold = applyBagItem(stateRef.current, dayRef.current, id, 'sell', new Date(), Math.random);
                      if (sold) publish(sold.state, sold.day, [sold.message]);
                    }}>Sell {sellPrice(id)}</button>
                  </div>
                );
              })}
              {counts.size === 0 && <p>Your bag is empty. Visit a place.</p>}
            </>
          )}
          {tab === 'feats' &&
            ACHIEVEMENTS.map((feat) => {
              const value = Math.min(achievementValue(state, feat.k), feat.g);
              const label = feat.k === 'm' ? `${(value / 1000).toFixed(2)} / ${feat.g / 1000} km` : `${value} / ${feat.g}`;
              return (
                <div key={feat.t} className="wk-step">
                  <p>{value >= feat.g ? 'Done' : 'Open'} · {feat.t}<small>{label}</small></p>
                </div>
              );
            })}
          <button type="button" className="wk-close" onClick={() => setSheet(null)}>Close</button>
        </section>
      )}
      {sheet === 'boss' && fight && (
        <section className="wk-sheet" aria-label="Boss fight" data-panel="boss">
          <div className="wk-boss-art"><img src={spriteUrl(fight.sprite)} alt="" width={96} height={96} /></div>
          <h2>{fight.name}</h2>
          <p className="wk-status">{fight.placeName} · level {fight.level}</p>
          <div className="wk-row">
            <span className="wk-stat">{Math.max(0, Math.ceil(fight.hp))}/{fight.max}</span>
            <span className="wk-bar" aria-label="Boss health"><span style={{ width: `${Math.max(0, (fight.hp / fight.max) * 100)}%`, background: 'var(--dawn-neon-orange)' }} /></span>
          </div>
          <p className="wk-log">{log}</p>
          <div className="wk-fight">
            <button type="button" onClick={strike}>Strike</button>
            <button type="button" onClick={drink} disabled={healLeft === 0}>Potion ({healLeft})</button>
          </div>
          <button type="button" className="wk-close" onClick={() => { setFight(null); setSheet(null); say('You retreat.'); }}>Retreat</button>
        </section>
      )}
      {sheet === 'hero' && (
        <section className="wk-sheet" aria-label="Choose your hero">
          <h2>Choose your hero</h2>
          <div className="wk-grid">
            {HEROES.map((id) => (
              <button key={id} type="button" aria-pressed={heroPick === id} onClick={() => setHeroPick(id)}>
                <img src={spriteUrl(id)} alt="" width={40} height={40} />
                {id.replace('hero_', '').replace('star', '')}
              </button>
            ))}
          </div>
          <label className="wk-field">
            Name
            <input value={name} maxLength={20} onChange={(event) => setName(event.target.value)} />
          </label>
          <button type="button" className="wk-close" onClick={() => {
            const sprite = heroPick;
            const nextName = name.replace(/[<>]/g, '').trim().slice(0, 20) || 'Wanderer';
            publish({ ...stateRef.current, sprite, name: nextName }, dayRef.current, [`${nextName} sets out.`]);
            setSheet(null);
          }}>Set out</button>
        </section>
      )}
      {toast && sheet === null && <p className="wk-toast" role="status">{toast}</p>}
    </div>
  );
}
