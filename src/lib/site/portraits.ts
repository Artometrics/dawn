'use client';

import { useSyncExternalStore } from 'react';

/** Account pictures: square face crops of public-domain paintings, from Wikimedia Commons. */
export type Portrait = { id: string; title: string; artist: string; year: string; src: string; source: string };

export const PORTRAITS: Portrait[] = [
  { id: 'mona-lisa', title: "Mona Lisa", artist: "Leonardo da Vinci", year: 'c. 1503–06', src: '/avatars/mona-lisa.webp', source: 'https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg' },
  { id: 'pearl-earring', title: "Girl with a Pearl Earring", artist: "Johannes Vermeer", year: 'c. 1665', src: '/avatars/pearl-earring.webp', source: 'https://commons.wikimedia.org/wiki/File:1665_Girl_with_a_Pearl_Earring.jpg' },
  { id: 'van-gogh', title: "Self-Portrait", artist: "Vincent van Gogh", year: '1887', src: '/avatars/van-gogh.webp', source: 'https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_(454045).jpg' },
  { id: 'rembrandt', title: "Self-Portrait", artist: "Rembrandt", year: '1659', src: '/avatars/rembrandt.webp', source: 'https://commons.wikimedia.org/wiki/File:Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg' },
  { id: 'ermine', title: "Lady with an Ermine", artist: "Leonardo da Vinci", year: 'c. 1490', src: '/avatars/ermine.webp', source: 'https://commons.wikimedia.org/wiki/File:Lady_with_an_Ermine_-_Leonardo_da_Vinci_-_Google_Art_Project.jpg' },
  { id: 'madame-x', title: "Madame X", artist: "John Singer Sargent", year: '1883–84', src: '/avatars/madame-x.webp', source: 'https://commons.wikimedia.org/wiki/File:Madame_X_(Madame_Pierre_Gautreau),_John_Singer_Sargent,_1884_(unfree_frame_crop).jpg' },
  { id: 'whistler-mother', title: "Whistler's Mother", artist: "James McNeill Whistler", year: '1871', src: '/avatars/whistler-mother.webp', source: 'https://commons.wikimedia.org/wiki/File:Whistlers_Mother_high_res.jpg' },
  { id: 'adele', title: "Adele Bloch-Bauer I", artist: "Gustav Klimt", year: '1907', src: '/avatars/adele.webp', source: 'https://commons.wikimedia.org/wiki/File:Gustav_Klimt_046.jpg' },
  { id: 'arnolfini', title: "Arnolfini Portrait", artist: "Jan van Eyck", year: '1434', src: '/avatars/arnolfini.webp', source: 'https://commons.wikimedia.org/wiki/File:Van_Eyck_-_Arnolfini_Portrait.jpg' },
];

const KEY = 'dawn-avatar';
const EVENT = 'dawn-avatar';
const subscribe = (notify: () => void) => {
  window.addEventListener(EVENT, notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener('storage', notify);
  };
};
const read = () => {
  try {
    return localStorage.getItem(KEY) ?? PORTRAITS[0].id;
  } catch {
    return PORTRAITS[0].id;
  }
};

export function portraitById(id: string): Portrait {
  return PORTRAITS.find((item) => item.id === id) ?? PORTRAITS[0];
}

export function useAvatar(): [Portrait, (id: string) => void] {
  const id = useSyncExternalStore(subscribe, read, () => PORTRAITS[0].id);
  const set = (next: string) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [portraitById(id), set];
}
