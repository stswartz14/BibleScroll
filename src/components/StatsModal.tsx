import { useMemo, useState } from 'react';
import { Award, Flame, X } from 'lucide-react';
import { TOTAL_BIBLE_CHAPTERS, type BibleBook, type Testament, getBookById } from '../data/bibleBooks';
import { TOTAL_BIBLE_VERSES, type BibleReadStats } from '../data/bibleChapterVerseCounts';
import { getEffectiveCurrentStreak, type StreakStats } from '../services/userStore';

interface StatsModalProps {
  isOpen: boolean;
  isSignedIn: boolean;
  streak: StreakStats;
  readStats: BibleReadStats;
  onClose: () => void;
  onSelectBook: (book: BibleBook) => void;
}

function formatPct(pct: number): string {
  if (pct <= 0) return '0%';
  if (pct < 0.1) return '<0.1%';
  if (pct >= 99.95 && pct < 100) return '99.9%';
  return `${pct.toFixed(1)}%`;
}

export function StatsModal({
  isOpen,
  isSignedIn,
  streak,
  readStats,
  onClose,
  onSelectBook,
}: StatsModalProps) {
  const [filter, setFilter] = useState<'ALL' | Testament>('ALL');

  const filteredBooks = useMemo(() => {
    if (filter === 'ALL') return readStats.bookBreakdown;
    return readStats.bookBreakdown.filter((b) => b.testament === filter);
  }, [filter, readStats.bookBreakdown]);

  if (!isOpen) return null;

  const effectiveCurrentStreak = getEffectiveCurrentStreak(streak);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reading Statistics"
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full sm:max-w-xl max-h-[88dvh] rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/20 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#F5F2EA]">Reading Stats</h2>
            <p className="text-xs text-[#9CA8A2] mt-0.5">
              {isSignedIn
                ? 'Synced across your devices'
                : 'Saved on this device · Sign in via Settings to sync'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reading stats"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-6">
          {/* Streaks Row */}
          <section aria-label="Reading Streaks" className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#0F1312] border border-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#D4AF37]">
                <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Current Streak</span>
              </div>
              <p className="font-scripture text-3xl font-medium text-[#F5F2EA] mt-2 tabular-nums">
                {effectiveCurrentStreak}{' '}
                <span className="font-ui text-xs font-normal text-[#9CA8A2]">
                  {effectiveCurrentStreak === 1 ? 'day' : 'days'}
                </span>
              </p>
            </div>

            <div className="rounded-xl bg-[#0F1312] border border-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#D4AF37]">
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Longest Streak</span>
              </div>
              <p className="font-scripture text-3xl font-medium text-[#F5F2EA] mt-2 tabular-nums">
                {streak.longestStreak}{' '}
                <span className="font-ui text-xs font-normal text-[#9CA8A2]">
                  {streak.longestStreak === 1 ? 'day' : 'days'}
                </span>
              </p>
            </div>
          </section>

          {/* Overall Totals + Completion Bar */}
          <section aria-label="Overall Bible Completion" className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-left">
              <div>
                <p className="text-[11px] font-medium text-[#9CA8A2]">Verses Read</p>
                <p className="text-lg sm:text-xl font-semibold text-[#F5F2EA] tabular-nums mt-0.5">
                  {readStats.totalVersesRead.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#9CA8A2] tabular-nums">
                  of {TOTAL_BIBLE_VERSES.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[#9CA8A2]">Chapters</p>
                <p className="text-lg sm:text-xl font-semibold text-[#F5F2EA] tabular-nums mt-0.5">
                  {readStats.chaptersCompleted.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#9CA8A2] tabular-nums">
                  of {TOTAL_BIBLE_CHAPTERS.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[#9CA8A2]">Bible Complete</p>
                <p className="text-lg sm:text-xl font-semibold text-[#D4AF37] tabular-nums mt-0.5">
                  {formatPct(readStats.overallPercent)}
                </p>
                <p className="text-[11px] text-[#9CA8A2]">all 66 books</p>
              </div>
            </div>

            <div
              role="progressbar"
              aria-label="Overall Bible completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(readStats.overallPercent)}
              className="h-2 w-full rounded-full bg-white/10 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#6FD3D8] transition-[width] duration-300"
                style={{ width: `${Math.min(100, readStats.overallPercent)}%` }}
              />
            </div>
          </section>

          <div className="h-px bg-white/10" aria-hidden="true" />

          {/* Old Testament & New Testament Progress Bars */}
          <section aria-label="Testament Progress" className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="font-medium text-[#D4AF37]">Old Testament</span>
                <span className="text-[#9CA8A2]">
                  {readStats.otVersesRead.toLocaleString()} /{' '}
                  {readStats.otTotalVerses.toLocaleString()} ·{' '}
                  <strong className="text-[#F5F2EA] font-semibold">
                    {formatPct(readStats.otPercent)}
                  </strong>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Old Testament reading progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(readStats.otPercent)}
                className="h-2 w-full rounded-full bg-[#D4AF37]/15 overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-[#D4AF37] transition-[width] duration-300"
                  style={{ width: `${Math.min(100, readStats.otPercent)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs tabular-nums">
                <span className="font-medium text-[#6FD3D8]">New Testament</span>
                <span className="text-[#9CA8A2]">
                  {readStats.ntVersesRead.toLocaleString()} /{' '}
                  {readStats.ntTotalVerses.toLocaleString()} ·{' '}
                  <strong className="text-[#F5F2EA] font-semibold">
                    {formatPct(readStats.ntPercent)}
                  </strong>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="New Testament reading progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(readStats.ntPercent)}
                className="h-2 w-full rounded-full bg-[#6FD3D8]/15 overflow-hidden"
              >
                <div
                  className="h-full rounded-full bg-[#6FD3D8] transition-[width] duration-300"
                  style={{ width: `${Math.min(100, readStats.ntPercent)}%` }}
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-white/10" aria-hidden="true" />

          {/* 66-Book Breakdown */}
          <section aria-label="Per-book progress breakdown" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-[#D4AF37]">
                By Book (66)
              </h3>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0F1312] border border-white/10">
                {(
                  [
                    { key: 'ALL', label: 'All' },
                    { key: 'OT', label: 'OT' },
                    { key: 'NT', label: 'NT' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`min-h-[32px] px-2.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      filter === tab.key
                        ? 'bg-[#D4AF37] text-[#121514] font-semibold'
                        : 'text-[#9CA8A2] hover:text-[#F5F2EA]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-[#0F1312] overflow-hidden">
              {filteredBooks.map((item) => {
                const isNT = item.testament === 'NT';
                const accentBar = isNT ? 'bg-[#6FD3D8]' : 'bg-[#D4AF37]';
                const accentText = isNT ? 'text-[#6FD3D8]' : 'text-[#D4AF37]';

                return (
                  <button
                    key={item.bookId}
                    type="button"
                    onClick={() => {
                      onSelectBook(getBookById(item.bookId));
                      onClose();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-[#F5F2EA] truncate">
                          {item.bookName}
                        </span>
                        <span className="text-[11px] text-[#9CA8A2]">
                          {item.chaptersCompleted}/{item.totalChapters} ch
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#9CA8A2]">
                          {item.readVerses}/{item.totalVerses}
                        </span>
                        <span
                          className={`font-semibold min-w-[42px] text-right ${
                            item.readVerses > 0 ? accentText : 'text-[#9CA8A2]'
                          }`}
                        >
                          {formatPct(item.percent)}
                        </span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${accentBar}`}
                        style={{ width: `${Math.min(100, item.percent)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
