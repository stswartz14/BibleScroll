import { getBookById } from '../data/bibleBooks';

export type TranslationCode = 'BSB' | 'WEB';

export interface VerseItem {
  verse: number;
  text: string;
  reference: string;
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

    verses = rawContent
      .filter(
        (item): item is { type: 'verse'; number: number; text: string } =>
          item?.type === 'verse' &&
          typeof item.number === 'number' &&
          typeof item.text === 'string' &&
          item.text.trim().length > 0,
      )
      .map((item) => ({
        verse: item.number,
        text: item.text.replace(/\r\n/g, '\n').trim(),
        reference: `${book.name} ${safeChapter}:${item.number}`,
        bookId: book.id,
        bookName: book.name,
        chapter: safeChapter,
        translation: 'BSB',
      }));
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
  return chapterData;
}
