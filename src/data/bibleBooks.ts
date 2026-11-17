export type Testament = 'OT' | 'NT';

export interface BibleBook {
  index: number;
  id: string;
  name: string;
  webQuery: string;
  chapters: number;
  testament: Testament;
}

export const BIBLE_BOOKS: BibleBook[] = [
  // Old Testament (39 books)
  { index: 0, id: 'GEN', name: 'Genesis', webQuery: 'Genesis', chapters: 50, testament: 'OT' },
  { index: 1, id: 'EXO', name: 'Exodus', webQuery: 'Exodus', chapters: 40, testament: 'OT' },
  { index: 2, id: 'LEV', name: 'Leviticus', webQuery: 'Leviticus', chapters: 27, testament: 'OT' },
  { index: 3, id: 'NUM', name: 'Numbers', webQuery: 'Numbers', chapters: 36, testament: 'OT' },
  { index: 4, id: 'DEU', name: 'Deuteronomy', webQuery: 'Deuteronomy', chapters: 34, testament: 'OT' },
  { index: 5, id: 'JOS', name: 'Joshua', webQuery: 'Joshua', chapters: 24, testament: 'OT' },
  { index: 6, id: 'JDG', name: 'Judges', webQuery: 'Judges', chapters: 21, testament: 'OT' },
  { index: 7, id: 'RUT', name: 'Ruth', webQuery: 'Ruth', chapters: 4, testament: 'OT' },
  { index: 8, id: '1SA', name: '1 Samuel', webQuery: '1+Samuel', chapters: 31, testament: 'OT' },
  { index: 9, id: '2SA', name: '2 Samuel', webQuery: '2+Samuel', chapters: 24, testament: 'OT' },
  { index: 10, id: '1KI', name: '1 Kings', webQuery: '1+Kings', chapters: 22, testament: 'OT' },
  { index: 11, id: '2KI', name: '2 Kings', webQuery: '2+Kings', chapters: 25, testament: 'OT' },
  { index: 12, id: '1CH', name: '1 Chronicles', webQuery: '1+Chronicles', chapters: 29, testament: 'OT' },
  { index: 13, id: '2CH', name: '2 Chronicles', webQuery: '2+Chronicles', chapters: 36, testament: 'OT' },
  { index: 14, id: 'EZR', name: 'Ezra', webQuery: 'Ezra', chapters: 10, testament: 'OT' },
  { index: 15, id: 'NEH', name: 'Nehemiah', webQuery: 'Nehemiah', chapters: 13, testament: 'OT' },
  { index: 16, id: 'EST', name: 'Esther', webQuery: 'Esther', chapters: 10, testament: 'OT' },
  { index: 17, id: 'JOB', name: 'Job', webQuery: 'Job', chapters: 42, testament: 'OT' },
  { index: 18, id: 'PSA', name: 'Psalms', webQuery: 'Psalms', chapters: 150, testament: 'OT' },
  { index: 19, id: 'PRO', name: 'Proverbs', webQuery: 'Proverbs', chapters: 31, testament: 'OT' },
  { index: 20, id: 'ECC', name: 'Ecclesiastes', webQuery: 'Ecclesiastes', chapters: 12, testament: 'OT' },
  { index: 21, id: 'SNG', name: 'Song of Solomon', webQuery: 'Song+of+Solomon', chapters: 8, testament: 'OT' },
  { index: 22, id: 'ISA', name: 'Isaiah', webQuery: 'Isaiah', chapters: 66, testament: 'OT' },
  { index: 23, id: 'JER', name: 'Jeremiah', webQuery: 'Jeremiah', chapters: 52, testament: 'OT' },
  { index: 24, id: 'LAM', name: 'Lamentations', webQuery: 'Lamentations', chapters: 5, testament: 'OT' },
  { index: 25, id: 'EZK', name: 'Ezekiel', webQuery: 'Ezekiel', chapters: 48, testament: 'OT' },
  { index: 26, id: 'DAN', name: 'Daniel', webQuery: 'Daniel', chapters: 12, testament: 'OT' },
  { index: 27, id: 'HOS', name: 'Hosea', webQuery: 'Hosea', chapters: 14, testament: 'OT' },
  { index: 28, id: 'JOL', name: 'Joel', webQuery: 'Joel', chapters: 3, testament: 'OT' },
  { index: 29, id: 'AMO', name: 'Amos', webQuery: 'Amos', chapters: 9, testament: 'OT' },
  { index: 30, id: 'OBA', name: 'Obadiah', webQuery: 'Obadiah', chapters: 1, testament: 'OT' },
  { index: 31, id: 'JON', name: 'Jonah', webQuery: 'Jonah', chapters: 4, testament: 'OT' },
  { index: 32, id: 'MIC', name: 'Micah', webQuery: 'Micah', chapters: 7, testament: 'OT' },
  { index: 33, id: 'NAM', name: 'Nahum', webQuery: 'Nahum', chapters: 3, testament: 'OT' },
  { index: 34, id: 'HAB', name: 'Habakkuk', webQuery: 'Habakkuk', chapters: 3, testament: 'OT' },
  { index: 35, id: 'ZEP', name: 'Zephaniah', webQuery: 'Zephaniah', chapters: 3, testament: 'OT' },
  { index: 36, id: 'HAG', name: 'Haggai', webQuery: 'Haggai', chapters: 2, testament: 'OT' },
  { index: 37, id: 'ZEC', name: 'Zechariah', webQuery: 'Zechariah', chapters: 14, testament: 'OT' },
  { index: 38, id: 'MAL', name: 'Malachi', webQuery: 'Malachi', chapters: 4, testament: 'OT' },

  // New Testament (27 books)
  { index: 39, id: 'MAT', name: 'Matthew', webQuery: 'Matthew', chapters: 28, testament: 'NT' },
  { index: 40, id: 'MRK', name: 'Mark', webQuery: 'Mark', chapters: 16, testament: 'NT' },
  { index: 41, id: 'LUK', name: 'Luke', webQuery: 'Luke', chapters: 24, testament: 'NT' },
  { index: 42, id: 'JHN', name: 'John', webQuery: 'John', chapters: 21, testament: 'NT' },
  { index: 43, id: 'ACT', name: 'Acts', webQuery: 'Acts', chapters: 28, testament: 'NT' },
  { index: 44, id: 'ROM', name: 'Romans', webQuery: 'Romans', chapters: 16, testament: 'NT' },
  { index: 45, id: '1CO', name: '1 Corinthians', webQuery: '1+Corinthians', chapters: 16, testament: 'NT' },
  { index: 46, id: '2CO', name: '2 Corinthians', webQuery: '2+Corinthians', chapters: 13, testament: 'NT' },
  { index: 47, id: 'GAL', name: 'Galatians', webQuery: 'Galatians', chapters: 6, testament: 'NT' },
  { index: 48, id: 'EPH', name: 'Ephesians', webQuery: 'Ephesians', chapters: 6, testament: 'NT' },
  { index: 49, id: 'PHP', name: 'Philippians', webQuery: 'Philippians', chapters: 4, testament: 'NT' },
  { index: 50, id: 'COL', name: 'Colossians', webQuery: 'Colossians', chapters: 4, testament: 'NT' },
  { index: 51, id: '1TH', name: '1 Thessalonians', webQuery: '1+Thessalonians', chapters: 5, testament: 'NT' },
  { index: 52, id: '2TH', name: '2 Thessalonians', webQuery: '2+Thessalonians', chapters: 3, testament: 'NT' },
  { index: 53, id: '1TI', name: '1 Timothy', webQuery: '1+Timothy', chapters: 6, testament: 'NT' },
  { index: 54, id: '2TI', name: '2 Timothy', webQuery: '2+Timothy', chapters: 4, testament: 'NT' },
  { index: 55, id: 'TIT', name: 'Titus', webQuery: 'Titus', chapters: 3, testament: 'NT' },
  { index: 56, id: 'PHM', name: 'Philemon', webQuery: 'Philemon', chapters: 1, testament: 'NT' },
  { index: 57, id: 'HEB', name: 'Hebrews', webQuery: 'Hebrews', chapters: 13, testament: 'NT' },
  { index: 58, id: 'JAS', name: 'James', webQuery: 'James', chapters: 5, testament: 'NT' },
  { index: 59, id: '1PE', name: '1 Peter', webQuery: '1+Peter', chapters: 5, testament: 'NT' },
  { index: 60, id: '2PE', name: '2 Peter', webQuery: '2+Peter', chapters: 3, testament: 'NT' },
  { index: 61, id: '1JN', name: '1 John', webQuery: '1+John', chapters: 5, testament: 'NT' },
  { index: 62, id: '2JN', name: '2 John', webQuery: '2+John', chapters: 1, testament: 'NT' },
  { index: 63, id: '3JN', name: '3 John', webQuery: '3+John', chapters: 1, testament: 'NT' },
  { index: 64, id: 'JUD', name: 'Jude', webQuery: 'Jude', chapters: 1, testament: 'NT' },
  { index: 65, id: 'REV', name: 'Revelation', webQuery: 'Revelation', chapters: 22, testament: 'NT' },
];

const BOOK_BY_ID = new Map<string, BibleBook>(BIBLE_BOOKS.map((book) => [book.id, book]));

export function getBookById(bookId: string): BibleBook {
  return BOOK_BY_ID.get(bookId) ?? BIBLE_BOOKS[0];
}

export function getNextChapterLocation(
  bookId: string,
  chapter: number,
): { bookId: string; bookName: string; chapter: number } | null {
  const current = getBookById(bookId);
  if (chapter < current.chapters) {
    return {
      bookId: current.id,
      bookName: current.name,
      chapter: chapter + 1,
    };
  }
  const nextBook = BIBLE_BOOKS[current.index + 1];
  if (!nextBook) {
    return null;
  }
  return {
    bookId: nextBook.id,
    bookName: nextBook.name,
    chapter: 1,
  };
}

export function getPreviousChapterLocation(
  bookId: string,
  chapter: number,
): { bookId: string; bookName: string; chapter: number } | null {
  const current = getBookById(bookId);
  if (chapter > 1) {
    return {
      bookId: current.id,
      bookName: current.name,
      chapter: chapter - 1,
    };
  }
  const prevBook = BIBLE_BOOKS[current.index - 1];
  if (!prevBook) {
    return null;
  }
  return {
    bookId: prevBook.id,
    bookName: prevBook.name,
    chapter: prevBook.chapters,
  };
}

export function makeVerseKey(bookId: string, chapter: number, verse: number): string {
  return `${bookId}_${chapter}_${verse}`;
}

export const TOTAL_OT_CHAPTERS = BIBLE_BOOKS.filter((b) => b.testament === 'OT').reduce(
  (sum, b) => sum + b.chapters,
  0,
);
export const TOTAL_NT_CHAPTERS = BIBLE_BOOKS.filter((b) => b.testament === 'NT').reduce(
  (sum, b) => sum + b.chapters,
  0,
);
export const TOTAL_BIBLE_CHAPTERS = TOTAL_OT_CHAPTERS + TOTAL_NT_CHAPTERS;

export interface BibleProgressStats {
  testament: Testament;
  otSegmentSharePercent: number;
  ntSegmentSharePercent: number;
  otFillPercent: number;
  ntFillPercent: number;
  overallPercent: number;
}

export function getBibleProgressStats(
  bookId: string,
  chapter: number,
  activeVerseIndex: number,
  totalVerses: number,
): BibleProgressStats {
  const book = getBookById(bookId);
  const chapterProgress = totalVerses > 0 ? (activeVerseIndex + 1) / totalVerses : 0;

  let chaptersBefore = 0;
  for (let i = 0; i < book.index; i++) {
    chaptersBefore += BIBLE_BOOKS[i].chapters;
  }

  const completedUnits = chaptersBefore + Math.max(0, chapter - 1) + chapterProgress;
  const otSegmentSharePercent = (TOTAL_OT_CHAPTERS / TOTAL_BIBLE_CHAPTERS) * 100;
  const ntSegmentSharePercent = (TOTAL_NT_CHAPTERS / TOTAL_BIBLE_CHAPTERS) * 100;

  const otFillPercent = Math.min(100, Math.max(0, (completedUnits / TOTAL_OT_CHAPTERS) * 100));
  const ntCompletedUnits = Math.max(0, completedUnits - TOTAL_OT_CHAPTERS);
  const ntFillPercent = Math.min(100, Math.max(0, (ntCompletedUnits / TOTAL_NT_CHAPTERS) * 100));
  const overallPercent = Math.min(100, Math.max(0, (completedUnits / TOTAL_BIBLE_CHAPTERS) * 100));

  return {
    testament: book.testament,
    otSegmentSharePercent,
    ntSegmentSharePercent,
    otFillPercent,
    ntFillPercent,
    overallPercent,
  };
}
