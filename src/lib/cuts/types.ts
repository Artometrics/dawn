/** A cut is one video on the board. Captions and the chapter block are derived, never stored. */

export const VOICES = ['Kore', 'Puck', 'Charon', 'Zephyr', 'Fenrir', 'Leda', 'Orus', 'Aoede'] as const;

export type VoiceName = (typeof VOICES)[number];

export const COLUMNS = [
  { id: 'idea', label: 'Idea' },
  { id: 'script', label: 'Script' },
  { id: 'narration', label: 'Voice' },
  { id: 'visuals', label: 'Picture' },
  { id: 'package', label: 'Package' },
  { id: 'ready', label: 'Ready' },
] as const;

export type ColumnId = (typeof COLUMNS)[number]['id'];

export const LICENSES = [
  'owned',
  'public-domain',
  'cc0',
  'cc-by',
  'cc-by-sa',
  'cc-by-nd',
  'cc-by-nc',
  'cc-by-nc-sa',
  'cc-by-nc-nd',
] as const;

export type LicenseId = (typeof LICENSES)[number];

export const LICENSE_LABELS: Record<LicenseId, string> = {
  owned: 'Owned upload',
  'public-domain': 'Public domain',
  cc0: 'CC0',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nc-nd': 'CC BY-NC-ND',
};

export interface Chapter {
  title: string;
  summary: string;
  startSeconds: number;
}

export interface Visual {
  atSeconds: number;
  kind: string;
  direction: string;
  chartTitle: string;
  chartType: string;
  chartLabels: string[];
  chartValues: number[];
}

export interface ThumbnailConcept {
  headline: string;
  layout: string;
  foreground: string;
  background: string;
}

export interface ScriptPackage {
  titles: string[];
  description: string;
  tags: string[];
  scriptText: string;
  chapters: Chapter[];
  visuals: Visual[];
  thumbnailConcepts: ThumbnailConcept[];
}

export type RunStatus = 'idle' | 'running' | 'ready' | 'error';

export interface Cut {
  id: string;
  title: string;
  topic: string;
  sourceUrl: string;
  sourceExcerpt: string;
  column: ColumnId;
  scriptText: string;
  chapters: Chapter[];
  visuals: Visual[];
  titles: string[];
  description: string;
  tags: string[];
  thumbnailConcepts: ThumbnailConcept[];
  packageStatus: RunStatus;
  generationProvider: '' | 'gemini' | 'draft';
  generationModel: string;
  generationWarning: string;
  errorMessage: string;
  createdAt: number;
  updatedAt: number;
}

export type CutFields = Omit<Cut, 'id' | 'createdAt' | 'updatedAt'>;

/** A license row. No file bytes. */
export interface ShelfItem {
  id: string;
  title: string;
  url: string;
  creator: string;
  license: LicenseId;
  notes: string;
  createdAt: number;
}

export interface CutsData {
  cuts: Cut[];
  media: ShelfItem[];
}
