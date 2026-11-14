'use client';

import { useMemo, useState } from 'react';
import { asProfile, exportBackup, importBackup, type AftercareData } from '@/lib/aftercare/desk';
import { customPlace, searchPlaces } from '@/lib/aftercare/places';
import { buildView, guessTheme, redactView } from '@/lib/aftercare/second-self';
import { shareUrl } from '@/lib/aftercare/share';
import { THEMES } from '@/lib/aftercare/themes';
import type { FavoriteKind, Place, Visibility } from '@/lib/aftercare/types';
import { DeskSwitch } from '../switch';
import { SecondSelf } from './second-self';
import { WorldMap } from './world-map';

const KINDS: { id: FavoriteKind; label: string }[] = [
  { id: 'movie', label: 'Movie' },
  { id: 'book', label: 'Book' },
  { id: 'thing', label: 'Thing' },
];

const VISIBILITY: { id: keyof Visibility; label: string; note: string }[] = [
  { id: 'birth', label: 'Birth date', note: 'Exact date on a share link.' },
  { id: 'numbers', label: 'Numbers', note: 'Life path, name numbers, sun sign.' },
  { id: 'map', label: 'Map', note: 'Pins for birth and favorites.' },
  { id: 'favorites', label: 'Favorites', note: 'Titles you saved.' },
  { id: 'connections', label: 'Connections', note: 'Needs favorites on, since the lines quote them.' },
];

export function BirthPanel({ data, onChange }: { data: AftercareData; onChange: (next: AftercareData) => void }) {
  const [placeQuery, setPlaceQuery] = useState('');
  const [kind, setKind] = useState<FavoriteKind>('movie');
  const [title, setTitle] = useState('');
  const [themeId, setThemeId] = useState('');
  const [favQuery, setFavQuery] = useState('');
  const [favPlace, setFavPlace] = useState<Place | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState('');
  const places = useMemo(() => searchPlaces(placeQuery), [placeQuery]);
  const favPlaces = useMemo(() => searchPlaces(favQuery), [favQuery]);
  const profile = asProfile(data);
  const view = profile ? buildView(profile) : null;

  function addFavorite() {
    const clean = title.trim().slice(0, 100);
    if (!clean) {
      setMessage('Name the favorite first.');
      return;
    }
    if (data.favorites.length >= 40) {
      setMessage('The favorites list is full.');
      return;
    }
    onChange({
      ...data,
      favorites: [...data.favorites, {
        id: `f-${Date.now().toString(36)}`,
        kind,
        title: clean,
        themeId: themeId || guessTheme(clean),
        place: favPlace,
      }],
    });
    setTitle('');
    setFavPlace(undefined);
    setFavQuery('');
    setMessage('Added. It stays on this phone.');
  }

  function copyShare() {
    if (!profile) return;
    const link = shareUrl(window.location.origin, redactView(buildView(profile), data.visibility));
    setShareLink(link);
    void navigator.clipboard?.writeText(link).then(
      () => setMessage('Share link copied. Only the parts you switched on are in it, and only in the fragment.'),
      () => setMessage('The link is in the box. Copy it from there.'),
    );
  }

  function download() {
    const blob = new Blob([JSON.stringify(exportBackup(data), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `aftercare-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function restore(file: File) {
    try {
      const next = importBackup(JSON.parse(await file.text()));
      if (!next) {
        setMessage('That file is not an Aftercare backup.');
        return;
      }
      onChange(next);
      setMessage('Backup restored on this phone.');
    } catch {
      setMessage('That file could not be read.');
    }
  }

  return (
    <div className="ac-birth">
      <div className="desk-stage">
        <label className="dw-label">
          Name
          <input className="dw-field" value={data.name} maxLength={80} onChange={(event) => onChange({ ...data, name: event.target.value.slice(0, 80) })} />
        </label>
        <label className="dw-label">
          Birth date
          <input className="dw-field" type="date" value={data.birthDate} onChange={(event) => onChange({ ...data, birthDate: event.target.value })} />
        </label>
        <label className="dw-label">
          Birth time, optional
          <input className="dw-field" type="time" value={data.birthTime} onChange={(event) => onChange({ ...data, birthTime: event.target.value })} />
        </label>
        <label className="dw-label">
          Birth place
          <input className="dw-field" value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="Search a city, or click the map" />
        </label>
        {places.length ? (
          <div className="dw-actions dw-actions--chips">
            {places.map((place) => (
              <button key={place.label} type="button" className="dw-btn dw-btn--chip" onClick={() => { onChange({ ...data, birthPlace: place }); setPlaceQuery(''); }}>{place.label}</button>
            ))}
          </div>
        ) : null}
        {data.birthPlace ? (
          <p className="dw-note">
            {data.birthPlace.label}
            {' '}
            <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onChange({ ...data, birthPlace: undefined })}>Clear place</button>
          </p>
        ) : <p className="dw-note">No geocoding. The list is built in, and a click drops a pin.</p>}
        <WorldMap
          pins={data.birthPlace ? [{ ...data.birthPlace, kind: 'birth' }] : []}
          onPick={(lat, lng) => onChange({ ...data, birthPlace: customPlace(lat, lng) })}
        />
        <article className="dw-card desk-stage">
          <p className="dw-card-title">Favorites</p>
          <DeskSwitch label="Kind" views={KINDS} current={kind} onChange={(id) => setKind(id as FavoriteKind)} />
          <label className="dw-label">
            Title
            <input className="dw-field" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="dw-label">
            Theme
            <select className="dw-field" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
              <option value="">Choose from the title</option>
              {THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
            </select>
          </label>
          <label className="dw-label">
            Place for this favorite, optional
            <input className="dw-field" value={favQuery} onChange={(event) => setFavQuery(event.target.value)} placeholder="City" />
          </label>
          {favPlaces.length ? (
            <div className="dw-actions dw-actions--chips">
              {favPlaces.map((place) => (
                <button key={place.label} type="button" className="dw-btn dw-btn--chip" onClick={() => { setFavPlace(place); setFavQuery(place.label); }}>{place.label}</button>
              ))}
            </div>
          ) : null}
          {favPlace ? <p className="dw-note">{favPlace.label}</p> : null}
          <button type="button" className="dw-btn dw-btn--primary" onClick={addFavorite}>Add favorite</button>
          {data.favorites.map((favorite) => (
            <p key={favorite.id} className="ac-fav-row">
              <span><strong>{favorite.title}</strong> <span className="dw-note">{favorite.kind}{favorite.place ? ` · ${favorite.place.label}` : ''}</span></span>
              <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onChange({ ...data, favorites: data.favorites.filter((item) => item.id !== favorite.id) })}>Remove</button>
            </p>
          ))}
        </article>
        <fieldset className="dw-card desk-stage">
          <legend className="dw-card-title">Share link</legend>
          <p className="dw-note">A share link keeps the profile in the URL fragment. Nothing is uploaded. Birth date and favorites stay off unless you switch them on.</p>
          {VISIBILITY.map((item) => (
            <label key={item.id} className="desk-check">
              <input
                type="checkbox"
                checked={data.visibility[item.id]}
                onChange={(event) => onChange({ ...data, visibility: { ...data.visibility, [item.id]: event.target.checked } })}
              />
              <span>{item.label}<span className="dw-note">{item.note}</span></span>
            </label>
          ))}
          <div className="dw-actions">
            <button type="button" className="dw-btn dw-btn--primary" disabled={!profile} onClick={copyShare}>Copy share link</button>
            <button type="button" className="dw-btn" onClick={download}>Export backup</button>
            <label className="dw-btn">
              Import backup
              <input className="dw-sr-only" type="file" accept="application/json,.json" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void restore(file);
                event.target.value = '';
              }} />
            </label>
          </div>
          {shareLink ? <input className="dw-field" readOnly value={shareLink} aria-label="Share link" onFocus={(event) => event.currentTarget.select()} /> : null}
        </fieldset>
        {message ? <p className="dw-note" role="status">{message}</p> : null}
      </div>
      <div className="desk-stage">
        {view ? <SecondSelf view={view} /> : <p className="dw-note">Add a name and a real birth date to see the second self, the map, and the constellation.</p>}
      </div>
    </div>
  );
}
