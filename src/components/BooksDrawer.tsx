import { useMemo, useState } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { BIBLE_BOOKS, type BibleBook, type Testament } from '../data/bibleBooks';

interface BooksDrawerProps {
  isOpen: boolean;
  currentBookId: string;
  currentChapter: number;
  onClose: () => void;
  onSelectChapter: (book: BibleBook, chapter: number) => void;
}

export function BooksDrawer({
  isOpen,
  currentBookId,
  currentChapter,
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
              <p className="text-xs font-medium text-[#D4AF37]">
                {selectedBook.testament === 'OT' ? 'Old Testament' : 'New Testament'}
              </p>
              <h3 className="font-scripture text-3xl font-medium text-[#F5F2EA] mt-1">
                {selectedBook.name}
              </h3>
              <p className="text-xs text-[#9CA8A2] mt-1 tabular-nums">
                {selectedBook.chapters} {selectedBook.chapters === 1 ? 'chapter' : 'chapters'}
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => {
                const isActive = selectedBook.id === currentBookId && ch === currentChapter;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      onSelectChapter(selectedBook, ch);
                      setSelectedBook(null);
                    }}
                    className={`min-h-[44px] rounded-xl text-sm font-medium tabular-nums transition-colors ${
                      isActive
                        ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                        : 'bg-white/[0.04] text-[#F5F2EA] border border-white/10 hover:border-[#D4AF37]/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    {ch}
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
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => setSelectedBook(book)}
                      className={`w-full min-h-[54px] px-5 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/[0.04] ${
                        isCurrent ? 'bg-[#D4AF37]/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-medium ${
                            isCurrent ? 'text-[#D4AF37] font-semibold' : 'text-[#F5F2EA]'
                          }`}
                        >
                          {book.name}
                        </span>
                        <span className="text-xs text-[#9CA8A2]">{book.testament}</span>
                      </div>
                      <span className="text-xs text-[#9CA8A2] tabular-nums">
                        {book.chapters} ch
                      </span>
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
