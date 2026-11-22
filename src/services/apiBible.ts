import { BIBLE_BOOKS, getBookById } from '../data/bibleBooks';
import type { VerseItem } from './scriptureApi';

export type ApiBibleTranslationCode = 'NLT' | 'NASB' | 'CEV';

export const API_BIBLE_BASE_URL = 'https://api.scripture.api.bible/v1';

export const API_BIBLE_COPYRIGHTS: Record<ApiBibleTranslationCode, string> = {
  NLT: 'Scripture quotations marked (NLT) are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation.',
  NASB: 'Scripture quotations taken from the (NASB®) New American Standard Bible®, Copyright © 1960, 1971, 1977, 1995, 2020 by The Lockman Foundation.',
  CEV: 'Scripture quotations marked (CEV) are from the Contemporary English Version Copyright © 1991, 1992, 1995 by American Bible Society.',
};

// Explicit 66-book standard 3-letter USFM code mapping
export const USFM_BOOK_CODES: Record<string, string> = {
  GEN: 'GEN',
  EXO: 'EXO',
  LEV: 'LEV',
  NUM: 'NUM',
  DEU: 'DEU',
  JOS: 'JOS',
  JDG: 'JDG',
  RUT: 'RUT',
  '1SA': '1SA',
  '2SA': '2SA',
  '1KI': '1KI',
  '2KI': '2KI',
  '1CH': '1CH',
  '2CH': '2CH',
  EZR: 'EZR',
  NEH: 'NEH',
  EST: 'EST',
  JOB: 'JOB',
  PSA: 'PSA',
  PRO: 'PRO',
  ECC: 'ECC',
  SNG: 'SNG',
  ISA: 'ISA',
  JER: 'JER',
  LAM: 'LAM',
  EZK: 'EZK',
  DAN: 'DAN',
  HOS: 'HOS',
  JOL: 'JOL',
  AMO: 'AMO',
  OBA: 'OBA',
  JON: 'JON',
  MIC: 'MIC',
  NAM: 'NAM',
  HAB: 'HAB',
  ZEP: 'ZEP',
  HAG: 'HAG',
  ZEC: 'ZEC',
  MAL: 'MAL',
  MAT: 'MAT',
  MRK: 'MRK',
  LUK: 'LUK',
  JHN: 'JHN',
  ACT: 'ACT',
  ROM: 'ROM',
  '1CO': '1CO',
  '2CO': '2CO',
  GAL: 'GAL',
  EPH: 'EPH',
  PHP: 'PHP',
  COL: 'COL',
  '1TH': '1TH',
  '2TH': '2TH',
  '1TI': '1TI',
  '2TI': '2TI',
  TIT: 'TIT',
  PHM: 'PHM',
  HEB: 'HEB',
  JAS: 'JAS',
  '1PE': '1PE',
  '2PE': '2PE',
  '1JN': '1JN',
  '2JN': '2JN',
  '3JN': '3JN',
  JUD: 'JUD',
  REV: 'REV',
};

export type ResolvedApiBibleIds = Partial<Record<ApiBibleTranslationCode, string>>;

interface CachedBibleIdsPayload {
  keyHash: string;
  ids: ResolvedApiBibleIds;
  resolvedAtMs: number;
}

interface ApiBibleListItem {
  id?: string;
  abbreviation?: string;
  abbreviationLocal?: string;
  name?: string;
  nameLocal?: string;
  description?: string;
  descriptionLocal?: string;
}

interface ApiBibleListResponse {
  data?: ApiBibleListItem[];
}

interface ApiBibleChapterResponse {
  data?: {
    id?: string;
    content?: string;
    reference?: string;
  };
}

interface ApiBibleSearchVerseItem {
  id?: string;
  bookId?: string;
  chapterId?: string;
  reference?: string;
  text?: string;
}

interface ApiBibleSearchResponse {
  data?: {
    total?: number;
    verses?: ApiBibleSearchVerseItem[];
  };
}

export class ApiBibleMissingKeyError extends Error {
  constructor() {
    super('Enter your API.Bible key in Settings to read NLT, NASB 2020, or CEV.');
    this.name = 'ApiBibleMissingKeyError';
  }
}

export class ApiBibleAuthError extends Error {
  constructor(message = 'API.Bible rejected this key. Double-check your key in Settings.') {
    super(message);
    this.name = 'ApiBibleAuthError';
  }
}

export class ApiBibleTranslationUnavailableError extends Error {
  constructor(translation: ApiBibleTranslationCode) {
    super(
      `${translation} was not found among the Bibles authorized for your API.Bible key. Check your API.Bible dashboard or switch translation.`,
    );
    this.name = 'ApiBibleTranslationUnavailableError';
  }
}

const RESOLVED_IDS_STORAGE_KEY = 'biblescroll:apiBibleIds:v1';

let memoryResolvedCache: CachedBibleIdsPayload | null = null;
const inflightResolveByHash = new Map<string, Promise<ResolvedApiBibleIds>>();

function hashApiKey(apiKey: string): string {
  // Lightweight non-reversible FNV-1a fingerprint used only to invalidate cached Bible IDs when key changes
  let hash = 2166136261;
  for (let i = 0; i < apiKey.length; i += 1) {
    hash ^= apiKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${apiKey.length}:${(hash >>> 0).toString(36)}`;
}

function readStoredResolvedIds(keyHash: string): ResolvedApiBibleIds | null {
  if (memoryResolvedCache && memoryResolvedCache.keyHash === keyHash) {
    return memoryResolvedCache.ids;
  }
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(RESOLVED_IDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedBibleIdsPayload>;
    if (parsed?.keyHash !== keyHash || !parsed.ids || typeof parsed.ids !== 'object') {
      return null;
    }
    const cleaned: ResolvedApiBibleIds = {};
    if (typeof parsed.ids.NLT === 'string' && parsed.ids.NLT.trim()) cleaned.NLT = parsed.ids.NLT;
    if (typeof parsed.ids.NASB === 'string' && parsed.ids.NASB.trim()) cleaned.NASB = parsed.ids.NASB;
    if (typeof parsed.ids.CEV === 'string' && parsed.ids.CEV.trim()) cleaned.CEV = parsed.ids.CEV;
    memoryResolvedCache = {
      keyHash,
      ids: cleaned,
      resolvedAtMs: typeof parsed.resolvedAtMs === 'number' ? parsed.resolvedAtMs : Date.now(),
    };
    return cleaned;
  } catch {
    return null;
  }
}

function writeStoredResolvedIds(keyHash: string, ids: ResolvedApiBibleIds): void {
  const payload: CachedBibleIdsPayload = {
    keyHash,
    ids,
    resolvedAtMs: Date.now(),
  };
  memoryResolvedCache = payload;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RESOLVED_IDS_STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // Ignore storage quota issues
  }
}

export function clearCachedApiBibleIds(): void {
  memoryResolvedCache = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RESOLVED_IDS_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getCachedApiBibleIds(apiKey: string): ResolvedApiBibleIds | null {
  const trimmed = apiKey.trim();
  if (!trimmed) return null;
  return readStoredResolvedIds(hashApiKey(trimmed));
}

function pickBestMatch(
  bibles: ApiBibleListItem[],
  scorer: (item: ApiBibleListItem) => number,
): string | undefined {
  let bestId: string | undefined;
  let bestScore = 0;
  for (const item of bibles) {
    if (typeof item.id !== 'string' || !item.id.trim()) continue;
    const score = scorer(item);
    if (score > bestScore) {
      bestScore = score;
      bestId = item.id.trim();
    }
  }
  return bestId;
}

function matchTargetBibleIds(bibles: ApiBibleListItem[]): ResolvedApiBibleIds {
  const nltId = pickBestMatch(bibles, (item) => {
    const id = (item.id ?? '').trim();
    const abbr = (item.abbreviation ?? '').trim().toUpperCase();
    const abbrLocal = (item.abbreviationLocal ?? '').trim().toUpperCase();
    const name = `${item.name ?? ''} ${item.nameLocal ?? ''}`.toLowerCase();

    if (id === '71c6eab17ae5b667-01') return 100;
    if (abbr === 'NLT' || abbrLocal === 'NLT') return 90;
    if (name.includes('new living translation')) return 70;
    return 0;
  });

  const nasbId = pickBestMatch(bibles, (item) => {
    const abbr = (item.abbreviation ?? '').trim().toUpperCase();
    const abbrLocal = (item.abbreviationLocal ?? '').trim().toUpperCase();
    const name = `${item.name ?? ''} ${item.nameLocal ?? ''}`.toLowerCase();
    const desc = `${item.description ?? ''} ${item.descriptionLocal ?? ''}`.toLowerCase();
    const is2020 =
      abbr === 'NASB20' ||
      abbrLocal === 'NASB20' ||
      abbr === 'NASB2020' ||
      name.includes('2020') ||
      desc.includes('2020');

    if (abbr === 'NASB20' || abbrLocal === 'NASB20') return 100;
    if ((abbr === 'NASB' || abbrLocal === 'NASB') && is2020) return 95;
    if (name.includes('new american standard') && is2020) return 90;
    if (abbr === 'NASB' || abbrLocal === 'NASB') return 80;
    if (name.includes('new american standard')) return 70;
    return 0;
  });

  const cevId = pickBestMatch(bibles, (item) => {
    const abbr = (item.abbreviation ?? '').trim().toUpperCase();
    const abbrLocal = (item.abbreviationLocal ?? '').trim().toUpperCase();
    const name = `${item.name ?? ''} ${item.nameLocal ?? ''}`.toLowerCase();
    const desc = `${item.description ?? ''} ${item.descriptionLocal ?? ''}`.toLowerCase();
    const hasApocrypha =
      name.includes('deuterocanon') ||
      name.includes('apocrypha') ||
      desc.includes('deuterocanon') ||
      desc.includes('apocrypha');
    const isBritish =
      abbr.includes('UK') || name.includes('british') || desc.includes('british') || name.includes('anglicised');

    if (abbr === 'CEV' || abbrLocal === 'CEV') {
      return 100 - (hasApocrypha ? 8 : 0) - (isBritish ? 4 : 0);
    }
    if (abbr === 'CEVUS' || abbrLocal === 'CEVUS') {
      return 92 - (hasApocrypha ? 8 : 0);
    }
    if (name.includes('contemporary english version')) {
      return 80 - (hasApocrypha ? 8 : 0) - (isBritish ? 4 : 0);
    }
    return 0;
  });

  const resolved: ResolvedApiBibleIds = {};
  if (nltId) resolved.NLT = nltId;
  if (nasbId) resolved.NASB = nasbId;
  if (cevId) resolved.CEV = cevId;
  return resolved;
}

export async function resolveApiBibleIds(
  apiKey: string,
  options?: { forceRefresh?: boolean; signal?: AbortSignal },
): Promise<ResolvedApiBibleIds> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new ApiBibleMissingKeyError();
  }

  const keyHash = hashApiKey(trimmedKey);
  if (!options?.forceRefresh) {
    const cached = readStoredResolvedIds(keyHash);
    if (cached && Object.keys(cached).length > 0) {
      return cached;
    }
  }

  const existingPromise = inflightResolveByHash.get(keyHash);
  if (existingPromise && !options?.forceRefresh) {
    return existingPromise;
  }

  const promise = (async () => {
    const response = await fetch(`${API_BIBLE_BASE_URL}/bibles?language=eng`, {
      headers: {
        'api-key': trimmedKey,
      },
      signal: options?.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new ApiBibleAuthError();
    }
    if (!response.ok) {
      throw new Error(`API.Bible catalog request failed (${response.status})`);
    }

    const payload = (await response.json()) as ApiBibleListResponse;
    const bibles = Array.isArray(payload?.data) ? payload.data : [];
    const resolved = matchTargetBibleIds(bibles);
    writeStoredResolvedIds(keyHash, resolved);
    return resolved;
  })().finally(() => {
    inflightResolveByHash.delete(keyHash);
  });

  inflightResolveByHash.set(keyHash, promise);
  return promise;
}

function cleanVerseSegment(raw: string): string {
  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/¶/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0);
  return lines.join('\n').trim();
}

export function parseApiBibleChapterText(rawContent: string): Array<{ verse: number; text: string }> {
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
  const markerRegex = /\[(\d+)(?:\s*[-–—]\s*\d+)?\]/g;
  const matches: Array<{ verse: number; index: number; endIndex: number }> = [];

  let match: RegExpExecArray | null = markerRegex.exec(normalized);
  while (match !== null) {
    const verseNum = Number(match[1]);
    if (Number.isInteger(verseNum) && verseNum >= 1 && verseNum <= 200) {
      matches.push({
        verse: verseNum,
        index: match.index,
        endIndex: match.index + match[0].length,
      });
    }
    match = markerRegex.exec(normalized);
  }

  if (matches.length === 0) {
    const fallbackText = cleanVerseSegment(normalized);
    return fallbackText ? [{ verse: 1, text: fallbackText }] : [];
  }

  const versesByNumber = new Map<number, string>();
  const orderedNumbers: number[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const nextStart = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    const segment = cleanVerseSegment(normalized.slice(current.endIndex, nextStart));
    if (!segment) continue;

    const existing = versesByNumber.get(current.verse);
    if (existing) {
      versesByNumber.set(current.verse, `${existing}\n${segment}`);
    } else {
      versesByNumber.set(current.verse, segment);
      orderedNumbers.push(current.verse);
    }
  }

  return orderedNumbers.map((verse) => ({
    verse,
    text: versesByNumber.get(verse) ?? '',
  }));
}

export async function fetchApiBibleChapter(params: {
  translation: ApiBibleTranslationCode;
  bookId: string;
  chapter: number;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<VerseItem[]> {
  const { translation, bookId, chapter, apiKey, signal } = params;
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new ApiBibleMissingKeyError();
  }

  const book = getBookById(bookId);
  const safeChapter = Math.max(1, Math.min(chapter, book.chapters));
  const usfmCode = USFM_BOOK_CODES[book.id] ?? book.id;

  let resolvedIds = await resolveApiBibleIds(trimmedKey, { signal });
  let bibleId = resolvedIds[translation];
  if (!bibleId) {
    resolvedIds = await resolveApiBibleIds(trimmedKey, { forceRefresh: true, signal });
    bibleId = resolvedIds[translation];
  }
  if (!bibleId) {
    throw new ApiBibleTranslationUnavailableError(translation);
  }

  const chapterId = `${usfmCode}.${safeChapter}`;
  const url = `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(
    bibleId,
  )}/chapters/${encodeURIComponent(
    chapterId,
  )}?content-type=text&include-verse-numbers=true&include-titles=false&include-chapter-numbers=false`;

  const response = await fetch(url, {
    headers: {
      'api-key': trimmedKey,
    },
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    throw new ApiBibleAuthError();
  }
  if (!response.ok) {
    throw new Error(`API.Bible chapter request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiBibleChapterResponse;
  const rawContent = payload?.data?.content;
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    throw new Error(`No verse text returned by API.Bible for ${book.name} ${safeChapter}`);
  }

  const parsedVerses = parseApiBibleChapterText(rawContent);
  return parsedVerses.map((v) => ({
    verse: v.verse,
    text: v.text,
    reference: `${book.name} ${safeChapter}:${v.verse}`,
    bookId: book.id,
    bookName: book.name,
    chapter: safeChapter,
    translation,
  }));
}

export async function searchApiBibleVerses(params: {
  translation: ApiBibleTranslationCode;
  query: string;
  apiKey: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{
  totalMatches: number;
  verses: Array<{
    bookId: string;
    bookName: string;
    bookIndex: number;
    chapter: number;
    verse: number;
    text: string;
    reference: string;
    translation: ApiBibleTranslationCode;
  }>;
}> {
  const { translation, query, apiKey, limit = 40, signal } = params;
  const trimmedKey = apiKey.trim();
  const trimmedQuery = query.trim();
  if (!trimmedKey || trimmedQuery.length < 2) {
    return { totalMatches: 0, verses: [] };
  }

  const resolvedIds = await resolveApiBibleIds(trimmedKey, { signal });
  const bibleId = resolvedIds[translation];
  if (!bibleId) {
    return { totalMatches: 0, verses: [] };
  }

  const url = `${API_BIBLE_BASE_URL}/bibles/${encodeURIComponent(
    bibleId,
  )}/search?query=${encodeURIComponent(trimmedQuery)}&limit=${limit}&sort=relevance`;

  const response = await fetch(url, {
    headers: {
      'api-key': trimmedKey,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`API.Bible search failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiBibleSearchResponse;
  const rawVerses = Array.isArray(payload?.data?.verses) ? payload.data.verses : [];
  const bookByUsfm = new Map(BIBLE_BOOKS.map((b) => [b.id, b]));
  const normalizedVerses: Array<{
    bookId: string;
    bookName: string;
    bookIndex: number;
    chapter: number;
    verse: number;
    text: string;
    reference: string;
    translation: ApiBibleTranslationCode;
  }> = [];

  for (const item of rawVerses) {
    const idParts = typeof item.id === 'string' ? item.id.split('.') : [];
    const usfm = (item.bookId ?? idParts[0] ?? '').toUpperCase();
    const book = bookByUsfm.get(usfm);
    const chapter = Number(idParts[1]);
    const verse = Number(idParts[2]);
    const text =
      typeof item.text === 'string'
        ? item.text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : '';

    if (!book || !Number.isInteger(chapter) || !Number.isInteger(verse) || !text) {
      continue;
    }

    normalizedVerses.push({
      bookId: book.id,
      bookName: book.name,
      bookIndex: book.index,
      chapter,
      verse,
      text,
      reference: `${book.name} ${chapter}:${verse}`,
      translation,
    });
  }

  return {
    totalMatches:
      typeof payload?.data?.total === 'number' ? payload.data.total : normalizedVerses.length,
    verses: normalizedVerses,
  };
}
