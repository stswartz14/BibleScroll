import { BIBLE_BOOKS, getBookById, type BibleBook } from '../data/bibleBooks';
import { CHAPTER_VERSE_COUNTS } from '../data/bibleChapterVerseCounts';
import type { ChapterData, TranslationCode } from './scriptureApi';

export interface ParsedBibleReference {
  book: BibleBook;
  chapter: number;
  verse: number;
  hasExplicitVerse: boolean;
  displayReference: string;
}

export interface VerseSearchResult {
  bookId: string;
  bookName: string;
  bookIndex: number;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
  translation: TranslationCode;
  source: 'offline-cache' | 'full-bible';
}

interface IndexedSearchVerse extends VerseSearchResult {
  lowerText: string;
}

const BOOK_ALIASES: Record<string, string[]> = {
  GEN: ['genesis', 'gen', 'ge', 'gn'],
  EXO: ['exodus', 'exod', 'exo', 'ex'],
  LEV: ['leviticus', 'lev', 'le', 'lv'],
  NUM: ['numbers', 'num', 'nu', 'nm', 'nb'],
  DEU: ['deuteronomy', 'deut', 'deu', 'dt'],
  JOS: ['joshua', 'josh', 'jos', 'jsh'],
  JDG: ['judges', 'judg', 'jdg', 'jg', 'jdgs'],
  RUT: ['ruth', 'rut', 'rth', 'ru'],
  '1SA': ['1 samuel', '1samuel', '1 sam', '1sam', '1 sa', '1sa', '1 sm', '1sm', 'i samuel', 'i sam'],
  '2SA': ['2 samuel', '2samuel', '2 sam', '2sam', '2 sa', '2sa', '2 sm', '2sm', 'ii samuel', 'ii sam'],
  '1KI': ['1 kings', '1kings', '1 kgs', '1kgs', '1 ki', '1ki', '1 kg', '1kg', 'i kings'],
  '2KI': ['2 kings', '2kings', '2 kgs', '2kgs', '2 ki', '2ki', '2 kg', '2kg', 'ii kings'],
  '1CH': ['1 chronicles', '1chronicles', '1 chron', '1chron', '1 chr', '1chr', '1 ch', '1ch', 'i chronicles'],
  '2CH': ['2 chronicles', '2chronicles', '2 chron', '2chron', '2 chr', '2chr', '2 ch', '2ch', 'ii chronicles'],
  EZR: ['ezra', 'ezr', 'ez'],
  NEH: ['nehemiah', 'neh', 'ne'],
  EST: ['esther', 'esth', 'est', 'es'],
  JOB: ['job', 'jb'],
  PSA: ['psalms', 'psalm', 'psa', 'pss', 'ps'],
  PRO: ['proverbs', 'prov', 'pro', 'prv', 'pr'],
  ECC: ['ecclesiastes', 'eccles', 'eccl', 'ecc', 'ec', 'qoh'],
  SNG: ['song of solomon', 'song of songs', 'canticles', 'song', 'sos', 'sng', 'so'],
  ISA: ['isaiah', 'isa', 'is'],
  JER: ['jeremiah', 'jer', 'je', 'jr'],
  LAM: ['lamentations', 'lam', 'la'],
  EZK: ['ezekiel', 'ezek', 'ezk', 'eze'],
  DAN: ['daniel', 'dan', 'da', 'dn'],
  HOS: ['hosea', 'hos', 'ho'],
  JOL: ['joel', 'jol', 'jl'],
  AMO: ['amos', 'amo', 'am'],
  OBA: ['obadiah', 'obad', 'oba', 'ob'],
  JON: ['jonah', 'jon', 'jnh'],
  MIC: ['micah', 'mic', 'mc'],
  NAM: ['nahum', 'nah', 'nam', 'na'],
  HAB: ['habakkuk', 'hab', 'hb'],
  ZEP: ['zephaniah', 'zeph', 'zep', 'zp'],
  HAG: ['haggai', 'hag', 'hg'],
  ZEC: ['zechariah', 'zech', 'zec', 'zc'],
  MAL: ['malachi', 'mal', 'ml'],
  MAT: ['matthew', 'matt', 'mat', 'mt'],
  MRK: ['mark', 'mrk', 'mar', 'mk'],
  LUK: ['luke', 'luk', 'lk'],
  JHN: ['john', 'jhn', 'joh', 'jn'],
  ACT: ['acts', 'act', 'ac'],
  ROM: ['romans', 'rom', 'ro', 'rm'],
  '1CO': ['1 corinthians', '1corinthians', '1 cor', '1cor', '1 co', '1co', 'i corinthians', 'i cor'],
  '2CO': ['2 corinthians', '2corinthians', '2 cor', '2cor', '2 co', '2co', 'ii corinthians', 'ii cor'],
  GAL: ['galatians', 'gal', 'ga'],
  EPH: ['ephesians', 'eph', 'ep'],
  PHP: ['philippians', 'phil', 'php', 'pp'],
  COL: ['colossians', 'col', 'co'],
  '1TH': ['1 thessalonians', '1thessalonians', '1 thess', '1thess', '1 thes', '1thes', '1 th', '1th', 'i thessalonians'],
  '2TH': ['2 thessalonians', '2thessalonians', '2 thess', '2thess', '2 thes', '2thes', '2 th', '2th', 'ii thessalonians'],
  '1TI': ['1 timothy', '1timothy', '1 tim', '1tim', '1 ti', '1ti', 'i timothy', 'i tim'],
  '2TI': ['2 timothy', '2timothy', '2 tim', '2tim', '2 ti', '2ti', 'ii timothy', 'ii tim'],
  TIT: ['titus', 'tit', 'ti'],
  PHM: ['philemon', 'philem', 'phlm', 'phm', 'pm'],
  HEB: ['hebrews', 'heb', 'he'],
  JAS: ['james', 'jas', 'jam', 'jm'],
  '1PE': ['1 peter', '1peter', '1 pet', '1pet', '1 pe', '1pe', '1 pt', '1pt', 'i peter', 'i pet'],
  '2PE': ['2 peter', '2peter', '2 pet', '2pet', '2 pe', '2pe', '2 pt', '2pt', 'ii peter', 'ii pet'],
  '1JN': ['1 john', '1john', '1 jhn', '1jhn', '1 jn', '1jn', '1 jo', '1jo', 'i john'],
  '2JN': ['2 john', '2john', '2 jhn', '2jhn', '2 jn', '2jn', '2 jo', '2jo', 'ii john'],
  '3JN': ['3 john', '3john', '3 jhn', '3jhn', '3 jn', '3jn', '3 jo', '3jo', 'iii john'],
  JUD: ['jude', 'jud', 'jd'],
  REV: ['revelation', 'revelations', 'rev', 're', 'rv'],
};

const ALIAS_TO_BOOK = new Map<string, BibleBook>();

function normalizeBookAlias(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^first\s+/, '1 ')
    .replace(/^second\s+/, '2 ')
    .replace(/^third\s+/, '3 ')
    .replace(/^1st\s+/, '1 ')
    .replace(/^2nd\s+/, '2 ')
    .replace(/^3rd\s+/, '3 ')
    .trim();
}

for (const book of BIBLE_BOOKS) {
  const aliases = BOOK_ALIASES[book.id] ?? [book.name.toLowerCase(), book.id.toLowerCase()];
  for (const alias of aliases) {
    const normalized = normalizeBookAlias(alias);
    ALIAS_TO_BOOK.set(normalized, book);
    ALIAS_TO_BOOK.set(normalized.replace(/\s+/g, ''), book);
  }
}

export function parseBibleReference(rawQuery: string): ParsedBibleReference | null {
  const cleaned = rawQuery.trim().replace(/[–—]/g, '-');
  if (!cleaned) return null;

  const match = cleaned.match(
    /^((?:[1-3](?:st|nd|rd)?\s*|I{1,3}\s+)?[a-zA-Z.]+(?:\s+[a-zA-Z.]+)*?)\s*(\d+)(?:\s*[:.\s]\s*(\d+)(?:\s*-\s*\d+)?)?$/i,
  );
  if (!match) return null;

  const rawBook = normalizeBookAlias(match[1]);
  const book = ALIAS_TO_BOOK.get(rawBook) ?? ALIAS_TO_BOOK.get(rawBook.replace(/\s+/g, ''));
  if (!book) return null;

  const num1 = Number(match[2]);
  const num2 = match[3] ? Number(match[3]) : null;
  if (!Number.isInteger(num1) || num1 < 1) return null;

  let chapter = num1;
  let verse = num2 ?? 1;
  let hasExplicitVerse = num2 !== null;

  // Support shorthand for 1-chapter books such as "Jude 24" or "Phlm 6"
  if (book.chapters === 1 && num2 === null && num1 > 1) {
    chapter = 1;
    verse = num1;
    hasExplicitVerse = true;
  }

  if (chapter > book.chapters) return null;

  const verseCounts = CHAPTER_VERSE_COUNTS[book.id];
  const maxVerse = verseCounts?.[chapter - 1] ?? 176;
  if (verse < 1 || verse > maxVerse) return null;

  const displayReference = hasExplicitVerse
    ? `${book.name} ${chapter}:${verse}`
    : `${book.name} ${chapter}`;

  return {
    book,
    chapter,
    verse,
    hasExplicitVerse,
    displayReference,
  };
}

interface HelloAoCompleteVerse {
  type?: string;
  number?: number;
  content?: Array<string | { text?: string; lineBreak?: boolean; noteId?: number }>;
}

interface HelloAoCompleteChapter {
  chapter?: {
    number?: number;
    content?: HelloAoCompleteVerse[];
  };
}

interface HelloAoCompleteBook {
  id?: string;
  name?: string;
  chapters?: HelloAoCompleteChapter[];
}

interface HelloAoCompleteResponse {
  books?: HelloAoCompleteBook[];
}

const fullBibleIndexCache = new Map<TranslationCode, IndexedSearchVerse[]>();
const fullBiblePromiseCache = new Map<TranslationCode, Promise<IndexedSearchVerse[]>>();

function extractCompleteVerseText(content: HelloAoCompleteVerse['content']): string {
  if (!Array.isArray(content)) return '';
  let out = '';
  for (const part of content) {
    if (typeof part === 'string') {
      out += (out && !out.endsWith(' ') && !part.startsWith(' ') ? ' ' : '') + part;
    } else if (part && typeof part === 'object') {
      if (typeof part.text === 'string') {
        out += (out && !out.endsWith(' ') && !part.text.startsWith(' ') ? ' ' : '') + part.text;
      } else if (part.lineBreak && out && !out.endsWith(' ')) {
        out += ' ';
      }
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function getCachedFullBibleIndex(
  translation: TranslationCode,
): IndexedSearchVerse[] | undefined {
  return fullBibleIndexCache.get(translation);
}

export async function ensureFullBibleSearchIndex(
  translation: TranslationCode,
): Promise<IndexedSearchVerse[]> {
  const existing = fullBibleIndexCache.get(translation);
  if (existing) return existing;

  const pending = fullBiblePromiseCache.get(translation);
  if (pending) return pending;

  const translationFolder = translation === 'BSB' ? 'BSB' : 'ENGWEBP';
  const url = `https://bible.helloao.org/api/${translationFolder}/complete.json`;

  const promise = (async () => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Search index request failed (${response.status})`);
    }
    const payload = (await response.json()) as HelloAoCompleteResponse;
    const rawBooks = payload?.books;
    if (!Array.isArray(rawBooks)) {
      throw new Error('Invalid Bible search index payload');
    }

    const verses: IndexedSearchVerse[] = [];
    for (const rawBook of rawBooks) {
      if (!rawBook?.id || !Array.isArray(rawBook.chapters)) continue;
      const canonicalBook = BIBLE_BOOKS.find((b) => b.id === rawBook.id);
      if (!canonicalBook) continue;

      for (const rawCh of rawBook.chapters) {
        const chapterNum = rawCh?.chapter?.number;
        const content = rawCh?.chapter?.content;
        if (typeof chapterNum !== 'number' || !Array.isArray(content)) continue;

        for (const item of content) {
          if (item?.type !== 'verse' || typeof item.number !== 'number') continue;
          const text = extractCompleteVerseText(item.content);
          if (!text) continue;
          verses.push({
            bookId: canonicalBook.id,
            bookName: canonicalBook.name,
            bookIndex: canonicalBook.index,
            chapter: chapterNum,
            verse: item.number,
            text,
            lowerText: text.toLowerCase(),
            reference: `${canonicalBook.name} ${chapterNum}:${item.number}`,
            translation,
            source: 'full-bible',
          });
        }
      }
    }

    fullBibleIndexCache.set(translation, verses);
    return verses;
  })().catch((err) => {
    fullBiblePromiseCache.delete(translation);
    throw err;
  });

  fullBiblePromiseCache.set(translation, promise);
  return promise;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreAndFilterVerses(
  query: string,
  verses: IndexedSearchVerse[],
  limit = 60,
): { results: VerseSearchResult[]; totalMatches: number } {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized.length < 2) {
    return { results: [], totalMatches: 0 };
  }

  const tokens = normalized.split(' ').filter((t) => t.length >= 2);
  const phraseWordRegex = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i');

  const exactWordMatches: IndexedSearchVerse[] = [];
  const exactSubstringMatches: IndexedSearchVerse[] = [];
  const allTokenMatches: IndexedSearchVerse[] = [];

  for (const v of verses) {
    if (v.lowerText.includes(normalized)) {
      if (phraseWordRegex.test(v.lowerText)) {
        exactWordMatches.push(v);
      } else {
        exactSubstringMatches.push(v);
      }
      continue;
    }

    if (tokens.length > 1 && tokens.every((tok) => v.lowerText.includes(tok))) {
      allTokenMatches.push(v);
    }
  }

  const combined = [...exactWordMatches, ...exactSubstringMatches, ...allTokenMatches];
  return {
    results: combined.slice(0, limit),
    totalMatches: combined.length,
  };
}

export function searchOfflineChapters(
  query: string,
  chapters: ChapterData[],
  limit = 60,
): { results: VerseSearchResult[]; totalMatches: number } {
  const sortedChapters = [...chapters].sort((a, b) => {
    const bookDiff = getBookById(a.bookId).index - getBookById(b.bookId).index;
    return bookDiff !== 0 ? bookDiff : a.chapter - b.chapter;
  });

  const indexed: IndexedSearchVerse[] = [];
  for (const chapterData of sortedChapters) {
    const book = getBookById(chapterData.bookId);
    for (const v of chapterData.verses) {
      const clean = v.text.replace(/\s+/g, ' ').trim();
      indexed.push({
        bookId: book.id,
        bookName: book.name,
        bookIndex: book.index,
        chapter: chapterData.chapter,
        verse: v.verse,
        text: clean,
        lowerText: clean.toLowerCase(),
        reference: `${book.name} ${chapterData.chapter}:${v.verse}`,
        translation: chapterData.translation,
        source: 'offline-cache',
      });
    }
  }

  return scoreAndFilterVerses(query, indexed, limit);
}

export function searchFullBibleIndex(
  query: string,
  index: IndexedSearchVerse[],
  limit = 60,
): { results: VerseSearchResult[]; totalMatches: number } {
  return scoreAndFilterVerses(query, index, limit);
}
