import { getBookById } from './bibleBooks';

export type BookSectionKey =
  | 'pentateuch'
  | 'history'
  | 'wisdom'
  | 'prophets'
  | 'gospels'
  | 'epistles';

export interface BookSectionTheme {
  key: BookSectionKey;
  label: string;
  topColor: string;
  midColor: string;
  bottomColor: string;
}

const SECTION_THEMES: Record<BookSectionKey, BookSectionTheme> = {
  pentateuch: {
    key: 'pentateuch',
    label: 'Law',
    topColor: '#07271E',
    midColor: '#0C1E19',
    bottomColor: '#121514',
  },
  history: {
    key: 'history',
    label: 'History',
    topColor: '#0B2226',
    midColor: '#0E1C1E',
    bottomColor: '#121514',
  },
  wisdom: {
    key: 'wisdom',
    label: 'Wisdom & Poetry',
    topColor: '#0B1829',
    midColor: '#0E1621',
    bottomColor: '#111418',
  },
  prophets: {
    key: 'prophets',
    label: 'Prophets',
    topColor: '#220E19',
    midColor: '#1B1016',
    bottomColor: '#141113',
  },
  gospels: {
    key: 'gospels',
    label: 'Gospels & Acts',
    topColor: '#072825',
    midColor: '#0B1E1C',
    bottomColor: '#111514',
  },
  epistles: {
    key: 'epistles',
    label: 'Epistles & Revelation',
    topColor: '#131126',
    midColor: '#12121D',
    bottomColor: '#121215',
  },
};

export function getBookSectionTheme(bookId: string): BookSectionTheme {
  const book = getBookById(bookId);
  const idx = book.index;

  if (idx <= 4) return SECTION_THEMES.pentateuch;
  if (idx <= 16) return SECTION_THEMES.history;
  if (idx <= 21) return SECTION_THEMES.wisdom;
  if (idx <= 38) return SECTION_THEMES.prophets;
  if (idx <= 43) return SECTION_THEMES.gospels;
  return SECTION_THEMES.epistles;
}
