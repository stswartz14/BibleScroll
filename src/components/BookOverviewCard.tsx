import { ChevronDown } from 'lucide-react';
import type { BibleBook } from '../data/bibleBooks';
import { parseBookKeyReference, type BookOverview } from '../data/bookOverviews';

interface BookOverviewCardProps {
  book: BibleBook;
  overview: BookOverview;
  cardIndex: number;
  onJumpToReference: (bookId: string, chapter: number, verse: number) => void;
  onContinueToChapter: () => void;
}

export function BookOverviewCard({
  book,
  overview,
  cardIndex,
  onJumpToReference,
  onContinueToChapter,
}: BookOverviewCardProps) {
  const chapterCountLabel = `${book.chapters} ${book.chapters === 1 ? 'CHAPTER' : 'CHAPTERS'}`;

  return (
    <article
      data-card-index={cardIndex}
      data-card-kind="overview"
      className="h-[100dvh] w-full shrink-0 snap-start snap-always relative flex flex-col justify-between pt-[calc(env(safe-area-inset-top,0px)+64px)] pb-14 pl-9 pr-14 sm:px-16 md:px-20 overflow-hidden touch-pan-y"
    >
      <div className="relative z-10 max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center min-h-0">
        {/* Section & Chapter Count Kicker */}
        <p className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#D4AF37]/90 tabular-nums">
          <span>{overview.section}</span>
          <span aria-hidden="true" className="mx-2 text-[#D4AF37]/55">
            ·
          </span>
          <span>{chapterCountLabel}</span>
        </p>

        {/* Book Title */}
        <h2 className="mt-2 font-scripture text-4xl sm:text-5xl md:text-[3.5rem] font-medium tracking-tight leading-[1.06] text-[#F5F2EA] text-balance">
          {book.name}
        </h2>

        {/* Upper gold hairline divider */}
        <div
          aria-hidden="true"
          className="mt-4 h-px w-full bg-gradient-to-r from-[#D4AF37]/50 via-[#D4AF37]/30 to-transparent shrink-0"
        />

        {/* 3-Column Metadata Strip: Author, Timeframe, Theme */}
        <div className="py-3.5 sm:py-4 grid grid-cols-3 gap-3 sm:gap-6">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium tracking-[0.14em] uppercase text-[#9CA8A2]">
              Author
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#F5F2EA] leading-snug mt-0.5">
              {overview.author}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium tracking-[0.14em] uppercase text-[#9CA8A2]">
              Timeframe
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#F5F2EA] leading-snug mt-0.5 tabular-nums">
              {overview.timeframe}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium tracking-[0.14em] uppercase text-[#9CA8A2]">
              Theme
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#F5F2EA] leading-snug mt-0.5">
              {overview.theme}
            </div>
          </div>
        </div>

        {/* Hairline before summary */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-[#D4AF37]/30 via-[#D4AF37]/15 to-transparent shrink-0"
        />

        {/* Summary Paragraph */}
        <div className="py-4 sm:py-5 max-h-[34dvh] overflow-y-auto no-scrollbar">
          <p className="font-scripture text-lg sm:text-[1.35rem] leading-[1.48] tracking-[0.01em] text-[#F5F2EA]/92">
            {overview.summary}
          </p>
        </div>

        {/* Lower gold hairline divider */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-[#D4AF37]/50 via-[#D4AF37]/30 to-transparent shrink-0"
        />

        {/* Tappable Key Reference Chips */}
        <div className="pt-3.5 sm:pt-4 space-y-2">
          <div className="text-[11px] font-medium text-[#9CA8A2] tracking-wide">
            Key Verses
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overview.keyReferences.map((refStr) => {
              const parsed = parseBookKeyReference(refStr);
              return (
                <button
                  key={refStr}
                  type="button"
                  onClick={() => onJumpToReference(book.id, parsed.chapter, parsed.verse)}
                  aria-label={`Jump to ${book.name} ${refStr}`}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-full border border-[#D4AF37]/35 bg-[#161B19]/75 hover:border-[#D4AF37] hover:bg-[#D4AF37]/15 text-xs font-medium text-[#F5F2EA] tabular-nums whitespace-nowrap shrink-0 transition-colors active:scale-[0.97]"
                >
                  {book.chapters === 1 && refStr.startsWith('1:')
                    ? `${book.name} ${refStr}`
                    : refStr}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subtle Bottom Cue */}
      <div className="relative z-10 max-w-2xl w-full mx-auto flex justify-center pt-2 shrink-0">
        <button
          type="button"
          onClick={onContinueToChapter}
          className="min-h-[44px] px-4 py-2 rounded-xl inline-flex items-center gap-2 text-xs font-medium tracking-wide text-[#9CA8A2] hover:text-[#D4AF37] transition-colors active:scale-[0.98]"
        >
          <span>Swipe up for Chapter 1</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]/85" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
