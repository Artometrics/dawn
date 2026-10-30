export type Place = {
  name: string;
  lat: number;
  lng: number;
};

export type QuestStop = {
  /** Name shown on the quest card. */
  label: string;
  /** Exact `name` in data/atlas/stanford-places.json. */
  placeName: string;
};

/**
 * Cardinal Quest, in the order the stops unlock.
 * El Palo Alto uses the dataset row "El Palo Alto Tree".
 */
export const CARDINAL_QUEST: QuestStop[] = [
  { label: 'El Palo Alto', placeName: 'El Palo Alto Tree' },
  { label: 'Stanford Red Barn', placeName: 'Stanford Red Barn' },
  { label: 'Arizona Garden', placeName: 'Arizona Garden' },
  { label: 'Lake Lagunita', placeName: 'Lake Lagunita' },
  { label: 'Hanna House', placeName: 'Hanna House' },
];

/** Where the day starts, before the first walk. */
export const DAY_START_NAME = 'The Stanford Oval';

export const CARDINAL_NOTE = 'Cardinal note coming soon';

export function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const place = value as Record<string, unknown>;
  const keys = Object.keys(place).sort();
  return (
    keys.length === 3 &&
    keys[0] === 'lat' &&
    keys[1] === 'lng' &&
    keys[2] === 'name' &&
    typeof place.name === 'string' &&
    place.name.trim().length > 0 &&
    typeof place.lat === 'number' &&
    Number.isFinite(place.lat) &&
    typeof place.lng === 'number' &&
    Number.isFinite(place.lng)
  );
}

export function findPlace(places: Place[], name: string): Place | undefined {
  return places.find((place) => place.name === name);
}

export function questPlaces(places: Place[]): Array<QuestStop & Place> {
  return CARDINAL_QUEST.map((stop) => {
    const place = findPlace(places, stop.placeName);
    if (!place) throw new Error(`Missing quest place: ${stop.placeName}`);
    return { ...stop, name: place.name, lat: place.lat, lng: place.lng };
  });
}
