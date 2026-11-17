import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  Copy,
  Heart,
  NotebookPen,
  Share2,
} from 'lucide-react';
import type { TranslationCode, VerseCardItem } from '../services/scriptureApi';

interface VerseCardProps {
  card: VerseCardItem;
  cardIndex: number;
  isLiked: boolean;
  isBookmarked: boolean;
  hasNote: boolean;
  isRead: boolean;
  isLastCardInChapter: boolean;
  nextChapterLabel: string | null;
  onToggleLike: (card: VerseCardItem) => void;
  onToggleBookmark: (card: VerseCardItem) => void;
  onOpenNote: (card: VerseCardItem) => void;
  onShare: (card: VerseCardItem) => void;
  onCopy: (card: VerseCardItem) => void;
  onNextChapter: () => void;
  isCopied: boolean;
}

const TRANSLATION_DETAILS: Record<
  TranslationCode,
  { fullName: string; subtitle: string; description: string }
> = {
  BSB: {
    fullName: 'Berean Standard Bible',
    subtitle: 'Free Use Bible API · Open Standard',
    description:
      'A clear, modern English translation anchored directly to the underlying Hebrew, Aramaic, and Greek manuscripts.',
  },
  WEB: {
    fullName: 'World English Bible',
    subtitle: 'Bible-API · Public Domain',
    description:
      'A modern public-domain English update of the American Standard Version (1901), freely shareable worldwide.',
  },
};

function getVerseTypographyClass(text: string): string {
  const len = text.length;
  const lineCount = text.split('\n').length;

  if (len > 420 || lineCount > 9) {
    return 'text-[clamp(1.06rem,2vw,1.32rem)] leading-[1.52]';
  }
  if (len > 270 || lineCount > 6) {
    return 'text-[clamp(1.18rem,2.4vw,1.55rem)] leading-[1.5]';
  }
  if (len > 150 || lineCount > 4) {
    return 'text-[clamp(1.36rem,2.9vw,1.92rem)] leading-[1.48]';
  }
  return 'text-[clamp(1.62rem,3.5vw,2.35rem)] leading-[1.45]';
}

export function VerseCard({
  card,
  cardIndex,
  isLiked,
  isBookmarked,
  hasNote,
  isRead,
  isLastCardInChapter,
  nextChapterLabel,
  onToggleLike,
  onToggleBookmark,
  onOpenNote,
  onShare,
  onCopy,
  onNextChapter,
  isCopied,
}: VerseCardProps) {
  const textBoxRef = useRef<HTMLDivElement | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [showTranslationInfo, setShowTranslationInfo] = useState(false);

  useEffect(() => {
    const el = textBoxRef.current;
    if (!el) return;

    let cancelled = false;
    const checkScroll = () => {
      if (cancelled) return;
      const overflows = el.scrollHeight > el.clientHeight + 6;
      setHasOverflow(overflows);
      setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(checkScroll);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('resize', checkScroll);
    };
  }, [card.combinedText]);

  const handleInnerScroll = () => {
    const el = textBoxRef.current;
    if (!el) return;
    setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  };

  const typographyClass = getVerseTypographyClass(card.combinedText);
  const translationInfo = TRANSLATION_DETAILS[card.translation];

  return (
    <article
      data-card-index={cardIndex}
      data-start-verse={card.startVerse}
      data-end-verse={card.endVerse}
      className="h-[100dvh] w-full shrink-0 snap-start snap-always relative flex flex-col justify-between pt-[calc(env(safe-area-inset-top,0px)+64px)] pb-12 pl-9 pr-14 sm:px-16 md:px-20 overflow-hidden touch-pan-y"
    >
      {/* Centered editorial scripture column */}
      <div className="relative z-10 max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center min-h-0">
        {card.heading && (
          <h2 className="pb-2.5 text-xs sm:text-sm font-medium tracking-wide text-[#D4AF37]/90">
            {card.heading}
          </h2>
        )}

        {/* Upper gold hairline divider */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-[#D4AF37]/50 via-[#D4AF37]/30 to-transparent shrink-0"
        />

        {/* Scroll-safe verse body supporting poetry line breaks, grouped inline superscripts & long verses */}
        <div
          ref={textBoxRef}
          onScroll={handleInnerScroll}
          data-verse-scrollable={hasOverflow ? 'true' : undefined}
          className={`relative max-h-[52dvh] no-scrollbar py-5 sm:py-7 ${
            hasOverflow ? 'overflow-y-auto overscroll-y-auto pr-1' : 'overflow-hidden'
          }`}
        >
          <p
            className={`font-scripture font-normal tracking-[0.01em] text-[#F5F2EA] whitespace-pre-line ${typographyClass}`}
          >
            {card.verses.map((v, idx) => {
              const prevText = idx > 0 ? card.verses[idx - 1].text : '';
              const sep =
                idx === 0 ? '' : prevText.includes('\n') || v.text.includes('\n') ? '\n' : ' ';
              return (
                <Fragment key={v.verse}>
                  {sep}
                  <sup className="font-ui text-[0.46em] font-semibold text-[#D4AF37] mr-1.5 align-super tabular-nums select-none">
                    {v.verse}
                  </sup>
                  {v.text}
                </Fragment>
              );
            })}
          </p>
        </div>

        {hasOverflow && !isAtBottom && (
          <div className="pb-2 text-[11px] font-medium text-[#9CA8A2] tracking-wide">
            Scroll inside verse to read more
          </div>
        )}

        {/* Lower gold hairline divider */}
        <div
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-[#D4AF37]/50 via-[#D4AF37]/30 to-transparent shrink-0"
        />

        {/* Bottom-left Reference + Read Checkmark + Interactive Translation Info & One-Thumb Chapter Advance */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex items-center gap-2 text-xs sm:text-sm font-medium tracking-wide">
            <span className="text-[#F5F2EA]/90 tabular-nums">{card.reference}</span>

            {isRead && (
              <span
                title="Read"
                aria-label="Marked as read"
                className="inline-flex items-center text-[#D4AF37]/80"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            )}

            <span aria-hidden="true" className="text-[#D4AF37]/60">
              ·
            </span>

            <button
              type="button"
              onMouseEnter={() => setShowTranslationInfo(true)}
              onMouseLeave={() => setShowTranslationInfo(false)}
              onFocus={() => setShowTranslationInfo(true)}
              onBlur={() => setShowTranslationInfo(false)}
              onPointerDown={(e) => {
                if (e.pointerType !== 'mouse') {
                  pointerDownTimeRef.current = Date.now();
                  setShowTranslationInfo(true);
                }
              }}
              onPointerUp={(e) => {
                if (e.pointerType !== 'mouse') {
                  const heldMs = Date.now() - pointerDownTimeRef.current;
                  if (heldMs >= 220) {
                    setShowTranslationInfo(false);
                  }
                }
              }}
              onPointerCancel={() => setShowTranslationInfo(false)}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={`${card.translation}: ${translationInfo.fullName}. Hold or hover for translation details.`}
              className="relative inline-flex items-center px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded-md text-[#D4AF37] font-semibold hover:bg-[#D4AF37]/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#D4AF37] select-none touch-manipulation transition-colors"
            >
              {card.translation}
            </button>

            {showTranslationInfo && (
              <div
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-0 mb-2.5 w-64 sm:w-72 rounded-xl bg-[#161B19]/95 backdrop-blur-md border border-[#D4AF37]/45 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] z-30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#F5F2EA]">
                    {translationInfo.fullName}
                  </span>
                  <span className="text-[11px] font-semibold text-[#D4AF37]">
                    {card.translation}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[#D4AF37]/85 mt-0.5">
                  {translationInfo.subtitle}
                </p>
                <p className="text-[11px] text-[#9CA8A2] leading-relaxed mt-1.5">
                  {translationInfo.description}
                </p>
              </div>
            )}
          </div>

          {isLastCardInChapter && nextChapterLabel && (
            <button
              type="button"
              onClick={onNextChapter}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-[#D4AF37]/40 bg-[#161B19]/80 text-[#F5F2EA] hover:border-[#D4AF37] hover:bg-[#161B19] text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors active:scale-[0.98]"
            >
              <span>Next Chapter</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Action Bar: Like, Bookmark, Share, Copy */}
        <div
          role="toolbar"
          aria-label={`Actions for ${card.reference}`}
          className="pt-3 flex items-center gap-1.5 sm:gap-2"
        >
          <button
            type="button"
            onClick={() => onToggleLike(card)}
            aria-label={isLiked ? `Unlike ${card.reference}` : `Like ${card.reference}`}
            aria-pressed={isLiked}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors active:scale-[0.96] ${
              isLiked
                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35'
                : 'text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 border border-transparent'
            }`}
          >
            <Heart
              className={`w-[18px] h-[18px] transition-transform duration-150 ${
                isLiked ? 'fill-[#D4AF37] text-[#D4AF37] scale-105' : ''
              }`}
            />
            <span className="hidden sm:inline whitespace-nowrap">Like</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleBookmark(card)}
            aria-label={
              isBookmarked ? `Remove bookmark for ${card.reference}` : `Bookmark ${card.reference}`
            }
            aria-pressed={isBookmarked}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors active:scale-[0.96] ${
              isBookmarked
                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35'
                : 'text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 border border-transparent'
            }`}
          >
            <Bookmark
              className={`w-[18px] h-[18px] transition-transform duration-150 ${
                isBookmarked ? 'fill-[#D4AF37] text-[#D4AF37] scale-105' : ''
              }`}
            />
            <span className="hidden sm:inline whitespace-nowrap">Bookmark</span>
          </button>

          <button
            type="button"
            onClick={() => onShare(card)}
            aria-label={`Share ${card.reference}`}
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 border border-transparent transition-colors active:scale-[0.96]"
          >
            <Share2 className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline whitespace-nowrap">Share</span>
          </button>

          <button
            type="button"
            onClick={() => onCopy(card)}
            aria-label={`Copy ${card.reference}`}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors active:scale-[0.96] ${
              isCopied
                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35'
                : 'text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 border border-transparent'
            }`}
          >
            {isCopied ? (
              <Check className="w-[18px] h-[18px] text-[#D4AF37]" />
            ) : (
              <Copy className="w-[18px] h-[18px]" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">
              {isCopied ? 'Copied' : 'Copy'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNote(card)}
            aria-label={
              hasNote
                ? `View or edit note or prayer for ${card.reference}`
                : `Add note or prayer for ${card.reference}`
            }
            aria-pressed={hasNote}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-colors active:scale-[0.96] ${
              hasNote
                ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35'
                : 'text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 border border-transparent'
            }`}
          >
            <NotebookPen
              className={`w-[18px] h-[18px] transition-transform duration-150 ${
                hasNote ? 'text-[#D4AF37] scale-105' : ''
              }`}
            />
            <span className="hidden sm:inline whitespace-nowrap">Notes</span>
          </button>
        </div>
      </div>
    </article>
  );
}
