import {
  getBookById,
  getNextChapterLocation,
  getPreviousChapterLocation,
} from '../data/bibleBooks';
import { getPersistedChapter, persistChapter } from './offlineChapterCache';

export type TranslationCode = 'BSB' | 'WEB';

export interface VerseItem {
  verse: number;
  text: string;
  reference: string;
  bookId: string;
  bookName: string;
  chapter: number;
  translation: TranslationCode;
  heading?: string;
}

export interface VerseCardItem {
  id: string;
  verses: VerseItem[];
  startVerse: number;
  endVerse: number;
  reference: string;
  combinedText: string;
  heading?: string;
  bookId: string;
  bookName: string;
  chapter: number;
  translation: TranslationCode;
}

export interface ChapterData {
  bookId: string;
  bookName: string;
  chapter: number;
  translation: TranslationCode;
  verses: VerseItem[];
}

interface HelloAoContentItem {
  type?: string;
  number?: number;
  text?: string;
}

interface HelloAoSimpleResponse {
  chapter?: {
    number?: number;
    content?: HelloAoContentItem[];
  };
}

interface BibleApiVerse {
  verse?: number;
  text?: string;
}

interface BibleApiResponse {
  verses?: BibleApiVerse[];
}

// In-memory session cache keyed by `${translation}:${bookId}:${chapter}`
const chapterSessionCache = new Map<string, ChapterData>();

function makeCacheKey(translation: TranslationCode, bookId: string, chapter: number): string {
  return `${translation}:${bookId}:${chapter}`;
}

export function getCachedChapter(
  translation: TranslationCode,
  bookId: string,
  chapter: number,
): ChapterData | undefined {
  return chapterSessionCache.get(makeCacheKey(translation, bookId, chapter));
}

function isSentenceComplete(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  // Ends with ., !, ? optionally followed by straight or curly closing quote
  return /[.!?]["”'’]?$/.test(trimmed);
}

function joinCardTexts(verses: VerseItem[]): string {
  if (verses.length === 1) return verses[0].text;
  let result = verses[0].text;
  for (let i = 1; i < verses.length; i++) {
    const prev = verses[i - 1].text;
    const curr = verses[i].text;
    const sep = prev.includes('\n') || curr.includes('\n') ? '\n' : ' ';
    result += sep + curr;
  }
  return result;
}

function finalizeCard(verses: VerseItem[]): VerseCardItem {
  const first = verses[0];
  const last = verses[verses.length - 1];
  const reference =
    verses.length === 1
      ? `${first.bookName} ${first.chapter}:${first.verse}`
      : `${first.bookName} ${first.chapter}:${first.verse}–${last.verse}`;

  const id =
    verses.length === 1
      ? `${first.bookId}_${first.chapter}_${first.verse}`
      : `${first.bookId}_${first.chapter}_${first.verse}-${last.verse}`;

  return {
    id,
    verses,
    startVerse: first.verse,
    endVerse: last.verse,
    reference,
    combinedText: joinCardTexts(verses),
    heading: first.heading,
    bookId: first.bookId,
    bookName: first.bookName,
    chapter: first.chapter,
    translation: first.translation,
  };
}

export function buildVerseCards(
  chapterData: ChapterData | null,
  smartGrouping: boolean,
): VerseCardItem[] {
  if (!chapterData || chapterData.verses.length === 0) return [];

  if (!smartGrouping) {
    return chapterData.verses.map((v) => finalizeCard([v]));
  }

  const cards: VerseCardItem[] = [];
  let currentGroup: VerseItem[] = [];
  let currentChars = 0;

  for (const verse of chapterData.verses) {
    if (currentGroup.length === 0) {
      currentGroup = [verse];
      currentChars = verse.text.length;
      continue;
    }

    const prevVerse = currentGroup[currentGroup.length - 1];

    // Rule 3: Always break into a new card when a BSB section heading occurs.
    if (verse.heading) {
      cards.push(finalizeCard(currentGroup));
      currentGroup = [verse];
      currentChars = verse.text.length;
      continue;
    }

    // Rule 1: Never split an incomplete sentence (unless not ending with . ! ? ." !" ?").
    const prevEndsSentence = isSentenceComplete(prevVerse.text);
    if (!prevEndsSentence && currentGroup.length < 8) {
      currentGroup.push(verse);
      currentChars += 1 + verse.text.length;
      continue;
    }

    // Rule 2: Group consecutive short verses until ~200 chars (max 4 verses),
    // unless a single verse already exceeds 180 chars on its own.
    const singleLongStart = currentGroup.length === 1 && currentGroup[0].text.length > 180;
    const nextIsLongSingle = verse.text.length > 180;
    const reachedMaxVerses = currentGroup.length >= 4;
    const reachedTargetChars = currentChars >= 200;
    const wouldOvershootSignificantly =
      currentChars >= 120 && currentChars + 1 + verse.text.length > 255;

    if (
      singleLongStart ||
      nextIsLongSingle ||
      reachedMaxVerses ||
      reachedTargetChars ||
      wouldOvershootSignificantly
    ) {
      cards.push(finalizeCard(currentGroup));
      currentGroup = [verse];
      currentChars = verse.text.length;
      continue;
    }

    currentGroup.push(verse);
    currentChars += 1 + verse.text.length;
  }

  if (currentGroup.length > 0) {
    cards.push(finalizeCard(currentGroup));
  }

  return cards;
}

export async function fetchChapter(params: {
  translation: TranslationCode;
  bookId: string;
  chapter: number;
  signal?: AbortSignal;
}): Promise<ChapterData> {
  const { translation, bookId, chapter, signal } = params;
  const book = getBookById(bookId);
  const safeChapter = Math.max(1, Math.min(chapter, book.chapters));
  const cacheKey = makeCacheKey(translation, book.id, safeChapter);

  const cached = chapterSessionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const persisted = await getPersistedChapter(cacheKey);
  if (persisted) {
    chapterSessionCache.set(cacheKey, persisted);
    return persisted;
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  let verses: VerseItem[] = [];

  if (translation === 'BSB') {
    const url = `https://bible.helloao.org/api/BSB/${encodeURIComponent(book.id)}/${safeChapter}.simple.json`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`BSB request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as HelloAoSimpleResponse;
    const rawContent = payload?.chapter?.content;
    if (!Array.isArray(rawContent)) {
      throw new Error('Invalid BSB chapter payload');
    }

    let pendingHeading: string | undefined;
    for (const item of rawContent) {
      if (item?.type === 'heading' && typeof item.text === 'string') {
        const cleaned = item.text.trim();
        if (cleaned) {
          pendingHeading = cleaned;
        }
        continue;
      }

      if (
        item?.type === 'verse' &&
        typeof item.number === 'number' &&
        typeof item.text === 'string' &&
        item.text.trim().length > 0
      ) {
        verses.push({
          verse: item.number,
          text: item.text.replace(/\r\n/g, '\n').trim(),
          reference: `${book.name} ${safeChapter}:${item.number}`,
          bookId: book.id,
          bookName: book.name,
          chapter: safeChapter,
          translation: 'BSB',
          ...(pendingHeading ? { heading: pendingHeading } : {}),
        });
        pendingHeading = undefined;
      }
    }
  } else {
    const url = `https://bible-api.com/${book.webQuery}+${safeChapter}?translation=web`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`WEB request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as BibleApiResponse;
    const rawVerses = payload?.verses;
    if (!Array.isArray(rawVerses)) {
      throw new Error('Invalid WEB chapter payload');
    }

    verses = rawVerses
      .filter(
        (item): item is { verse: number; text: string } =>
          typeof item?.verse === 'number' &&
          typeof item?.text === 'string' &&
          item.text.trim().length > 0,
      )
      .map((item) => ({
        verse: item.verse,
        text: item.text.replace(/\r\n/g, '\n').trim(),
        reference: `${book.name} ${safeChapter}:${item.verse}`,
        bookId: book.id,
        bookName: book.name,
        chapter: safeChapter,
        translation: 'WEB',
      }));
  }

  if (verses.length === 0) {
    throw new Error('No verses returned by scripture service');
  }

  const chapterData: ChapterData = {
    bookId: book.id,
    bookName: book.name,
    chapter: safeChapter,
    translation,
    verses,
  };

  chapterSessionCache.set(cacheKey, chapterData);
  void persistChapter(cacheKey, chapterData);
  return chapterData;
}

const inflightPrefetchKeys = new Set<string>();

async function prefetchSingleChapter(
  translation: TranslationCode,
  bookId: string,
  chapter: number,
): Promise<void> {
  const cacheKey = makeCacheKey(translation, bookId, chapter);

  if (chapterSessionCache.has(cacheKey) || inflightPrefetchKeys.has(cacheKey)) {
    return;
  }

  const persisted = await getPersistedChapter(cacheKey);
  if (persisted) {
    chapterSessionCache.set(cacheKey, persisted);
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return;
  }

  inflightPrefetchKeys.add(cacheKey);
  try {
    await fetchChapter({
      translation,
      bookId,
      chapter,
    });
  } catch {
    // Silent background prefetch failure when offline or throttled
  } finally {
    inflightPrefetchKeys.delete(cacheKey);
  }
}

export async function prefetchUpcomingChapters(params: {
  translation: TranslationCode;
  bookId: string;
  chapter: number;
  count?: number;
  includePrevious?: boolean;
}): Promise<void> {
  const { translation, bookId, chapter, count = 2, includePrevious = true } = params;

  // Quietly warm the immediately preceding chapter (crosses book boundaries too)
  if (includePrevious) {
    const prevLoc = getPreviousChapterLocation(bookId, chapter);
    if (prevLoc) {
      await prefetchSingleChapter(translation, prevLoc.bookId, prevLoc.chapter);
    }
  }

  let cursorBookId = bookId;
  let cursorChapter = chapter;

  for (let step = 0; step < count; step += 1) {
    const nextLoc = getNextChapterLocation(cursorBookId, cursorChapter);
    if (!nextLoc) break;

    cursorBookId = nextLoc.bookId;
    cursorChapter = nextLoc.chapter;
    await prefetchSingleChapter(translation, nextLoc.bookId, nextLoc.chapter);
  }
}
