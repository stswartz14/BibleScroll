import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Search, X } from 'lucide-react';
import { BIBLE_BOOKS, type BibleBook, type Testament } from '../data/bibleBooks';
import {
  getChapterTotalVerses,
  type BibleReadStats,
} from '../data/bibleChapterVerseCounts';
import type { TranslationCode } from '../services/scriptureApi';

interface BooksDrawerProps {
  isOpen: boolean;
  currentBookId: string;
  currentChapter: number;
  translation: TranslationCode;
  readStats: BibleReadStats;
  onClose: () => void;
  onSelectChapter: (book: BibleBook, chapter: number) => void;
}

export function BooksDrawer({
  isOpen,
  currentBookId,
  currentChapter,
  translation,
  readStats,
  onClose,
  onSelectChapter,
}: BooksDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | Testament>('ALL');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BIBLE_BOOKS.filter((book) => {
      if (testamentFilter !== 'ALL' && book.testament !== testamentFilter) {
        return false;
      }
      if (!q) return true;
      return book.name.toLowerCase().includes(q) || book.id.toLowerCase().includes(q);
    });
  }, [searchQuery, testamentFilter]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedBook(null);
    onClose();
  };

  const selectedBookStats = selectedBook ? readStats.byBook[selectedBook.id] : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex"
      role="dialog"
      aria-modal="true"
      aria-label="Select Bible Book and Chapter"
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md h-full bg-[#161B19] border-r border-[#D4AF37]/20 flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          {selectedBook ? (
            <button
              type="button"
              onClick={() => setSelectedBook(null)}
              className="min-h-[44px] -ml-2 px-2 rounded-xl flex items-center gap-2 text-sm font-medium text-[#F5F2EA] hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
              <span>All Books</span>
            </button>
          ) : (
            <h2 className="text-base font-semibold tracking-wide text-[#F5F2EA]">
              Select Book
            </h2>
          )}

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close book selector"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedBook ? (
          /* Chapter Grid */
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <p
                className={`text-xs font-medium ${
                  selectedBook.testament === 'NT' ? 'text-[#6FD3D8]' : 'text-[#D4AF37]'
                }`}
              >
                {selectedBook.testament === 'OT' ? 'Old Testament' : 'New Testament'}
              </p>
              <h3 className="font-scripture text-3xl font-medium text-[#F5F2EA] mt-1">
                {selectedBook.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[#9CA8A2] mt-1 tabular-nums">
                <span>
                  {selectedBook.chapters} {selectedBook.chapters === 1 ? 'chapter' : 'chapters'}
                </span>
                {selectedBookStats && selectedBookStats.readVerses > 0 && (
                  <>
                    <span aria-hidden="true" className="text-white/25">
                      ·
                    </span>
                    <span className="text-[#F5F2EA]/85">
                      {selectedBookStats.chaptersCompleted}/{selectedBook.chapters} completed (
                      {Math.round(selectedBookStats.percent)}%)
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                const isActive = selectedBook.id === currentBookId && ch === currentChapter;
                const readInCh = selectedBookStats?.chapterReadCounts[ch] ?? 0;
                const totalInCh = getChapterTotalVerses(selectedBook.id, ch, translation);
                const chPct = totalInCh > 0 ? Math.min(100, (readInCh / totalInCh) * 100) : 0;
                const isCompleted = totalInCh > 0 && readInCh >= totalInCh;
                const accentBg =
                  selectedBook.testament === 'NT' ? 'bg-[#6FD3D8]' : 'bg-[#D4AF37]';

                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      onSelectChapter(selectedBook, ch);
                      setSelectedBook(null);
                    }}
                    aria-label={
                      isCompleted
                        ? `Chapter ${ch}, completed`
                        : readInCh > 0
                          ? `Chapter ${ch}, ${Math.round(chPct)}% read`
                          : `Chapter ${ch}`
                    }
                    className={`relative min-h-[46px] rounded-xl text-sm font-medium tabular-nums overflow-hidden flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                        : isCompleted
                          ? 'bg-[#D4AF37]/12 text-[#F5F2EA] border border-[#D4AF37]/45 hover:bg-[#D4AF37]/20'
                          : 'bg-white/[0.04] text-[#F5F2EA] border border-white/10 hover:border-[#D4AF37]/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{ch}</span>

                    {isCompleted && (
                      <Check
                        className={`w-2.5 h-2.5 absolute top-1.5 right-1.5 ${
                          isActive ? 'text-[#121514]' : 'text-[#D4AF37]'
                        }`}
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    )}

                    {!isCompleted && chPct > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10"
                      >
                        <span
                          className={`block h-full ${isActive ? 'bg-[#121514]/50' : accentBg}`}
                          style={{ width: `${chPct}%` }}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Book Search + List */
          <>
            <div className="p-4 space-y-3 border-b border-white/10">
              <div className="relative">
                <Search
                  className="w-4 h-4 text-[#9CA8A2] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 66 books..."
                  aria-label="Search Bible books"
                  className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[#0F1312] border border-white/10 text-sm text-[#F5F2EA] placeholder:text-[#9CA8A2]/70 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0F1312] border border-white/10">
                {(
                  [
                    { key: 'ALL', label: 'All (66)' },
                    { key: 'OT', label: 'Old' },
                    { key: 'NT', label: 'New' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTestamentFilter(tab.key)}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      testamentFilter === tab.key
                        ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                        : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
              {filteredBooks.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#9CA8A2]">
                  No books match &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredBooks.map((book) => {
                  const isCurrent = book.id === currentBookId;
                  const bookStats = readStats.byBook[book.id];
                  const readPct = bookStats?.percent ?? 0;
                  const isBookDone =
                    bookStats && bookStats.chaptersCompleted >= book.chapters && book.chapters > 0;
                  const isNT = book.testament === 'NT';

                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedBook(book)}
                      className={`w-full min-h-[58px] px-5 py-3 flex flex-col justify-center gap-1.5 text-left transition-colors hover:bg-white/[0.04] ${
                        isCurrent ? 'bg-[#D4AF37]/10' : ''
                      }`}
                    >
                      <div className="w-full flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`text-sm font-medium truncate ${
                              isCurrent ? 'text-[#D4AF37] font-semibold' : 'text-[#F5F2EA]'
                            }`}
                          >
                            {book.name}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              isNT ? 'text-[#6FD3D8]/80' : 'text-[#9CA8A2]'
                            }`}
                          >
                            {book.testament}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-[#9CA8A2] tabular-nums shrink-0">
                          {isBookDone ? (
                            <span className="inline-flex items-center gap-1 text-[#D4AF37] font-medium">
                              <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                              <span>Done</span>
                            </span>
                          ) : bookStats && bookStats.readVerses > 0 ? (
                            <span className={isNT ? 'text-[#6FD3D8]' : 'text-[#D4AF37]'}>
                              {Math.max(1, Math.round(readPct))}%
                            </span>
                          ) : null}
                          <span>{book.chapters} ch</span>
                        </div>
                      </div>

                      {bookStats && bookStats.readVerses > 0 && (
                        <div className="w-full h-[2px] rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isNT ? 'bg-[#6FD3D8]' : 'bg-[#D4AF37]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, readPct))}%` }}
                          />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
