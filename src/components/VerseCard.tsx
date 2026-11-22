import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Heart,
  NotebookPen,
  Share2,
} from 'lucide-react';
import type { TranslationCode, VerseCardItem } from '../services/scriptureApi';
import type { FontFamilyOption, TextSizeOption } from '../services/userStore';
import { isRedLetterVerse, segmentRedLetterVerse } from '../data/redLetterVerses';

interface VerseCardProps {
  card: VerseCardItem;
  cardIndex: number;
  textSize: TextSizeOption;
  fontFamily: FontFamilyOption;
  redLetter: boolean;
  prevCardLastVerseWasRedLetter?: boolean;
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
  onOpenTranslationPicker: () => void;
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
  NLT: {
    fullName: 'New Living Translation',
    subtitle: 'API.Bible · Tyndale House Foundation',
    description:
      'A clear, natural thought-for-thought English translation designed for smooth, contemporary reading.',
  },
  NASB: {
    fullName: 'New American Standard Bible (2020)',
    subtitle: 'API.Bible · The Lockman Foundation',
    description:
      'A literal, word-for-word English translation renowned for close fidelity to the original biblical languages.',
  },
  CEV: {
    fullName: 'Contemporary English Version',
    subtitle: 'API.Bible · American Bible Society',
    description:
      'An accessible, plain-language English translation crafted for effortless clarity when read silently or aloud.',
  },
};

// Static Tailwind typography matrix: [short, medium, long, veryLong]
// Sans uses ~0.84x optical compensation for Plus Jakarta Sans's larger x-height vs Cormorant Garamond.
const TYPOGRAPHY_CLASSES: Record<
  FontFamilyOption,
  Record<TextSizeOption, readonly [string, string, string, string]>
> = {
  serif: {
    S: [
      'text-[clamp(1.34rem,2.9vw,1.95rem)] leading-[1.48]',
      'text-[clamp(1.16rem,2.4vw,1.62rem)] leading-[1.5]',
      'text-[clamp(1.02rem,2.0vw,1.34rem)] leading-[1.52]',
      'text-[clamp(0.94rem,1.75vw,1.16rem)] leading-[1.54]',
    ],
    M: [
      'text-[clamp(1.62rem,3.5vw,2.35rem)] leading-[1.45]',
      'text-[clamp(1.36rem,2.9vw,1.92rem)] leading-[1.48]',
      'text-[clamp(1.18rem,2.4vw,1.55rem)] leading-[1.5]',
      'text-[clamp(1.06rem,2vw,1.32rem)] leading-[1.52]',
    ],
    L: [
      'text-[clamp(1.86rem,4.1vw,2.72rem)] leading-[1.42]',
      'text-[clamp(1.56rem,3.4vw,2.22rem)] leading-[1.45]',
      'text-[clamp(1.34rem,2.8vw,1.8rem)] leading-[1.48]',
      'text-[clamp(1.2rem,2.35vw,1.52rem)] leading-[1.5]',
    ],
    XL: [
      'text-[clamp(2.12rem,4.7vw,3.05rem)] leading-[1.38]',
      'text-[clamp(1.78rem,3.9vw,2.52rem)] leading-[1.42]',
      'text-[clamp(1.52rem,3.2vw,2.05rem)] leading-[1.45]',
      'text-[clamp(1.36rem,2.7vw,1.74rem)] leading-[1.48]',
    ],
  },
  sans: {
    S: [
      'text-[clamp(1.08rem,2.35vw,1.54rem)] leading-[1.55]',
      'text-[clamp(0.96rem,2vw,1.32rem)] leading-[1.58]',
      'text-[clamp(0.88rem,1.7vw,1.14rem)] leading-[1.6]',
      'text-[clamp(0.82rem,1.5vw,1.02rem)] leading-[1.62]',
    ],
    M: [
      'text-[clamp(1.28rem,2.8vw,1.86rem)] leading-[1.52]',
      'text-[clamp(1.12rem,2.35vw,1.56rem)] leading-[1.55]',
      'text-[clamp(1rem,2vw,1.3rem)] leading-[1.58]',
      'text-[clamp(0.92rem,1.75vw,1.14rem)] leading-[1.6]',
    ],
    L: [
      'text-[clamp(1.48rem,3.3vw,2.16rem)] leading-[1.48]',
      'text-[clamp(1.28rem,2.75vw,1.8rem)] leading-[1.52]',
      'text-[clamp(1.14rem,2.35vw,1.5rem)] leading-[1.55]',
      'text-[clamp(1.04rem,2.05vw,1.32rem)] leading-[1.58]',
    ],
    XL: [
      'text-[clamp(1.68rem,3.8vw,2.46rem)] leading-[1.45]',
      'text-[clamp(1.46rem,3.15vw,2.04rem)] leading-[1.48]',
      'text-[clamp(1.28rem,2.65vw,1.72rem)] leading-[1.52]',
      'text-[clamp(1.16rem,2.35vw,1.5rem)] leading-[1.55]',
    ],
  },
};

function getVerseTypographyClass(
  text: string,
  textSize: TextSizeOption,
  fontFamily: FontFamilyOption,
): string {
  const len = text.length;
  const lineCount = text.split('\n').length;
  const scale = TYPOGRAPHY_CLASSES[fontFamily][textSize];

  if (len > 420 || lineCount > 9) return scale[3];
  if (len > 270 || lineCount > 6) return scale[2];
  if (len > 150 || lineCount > 4) return scale[1];
  return scale[0];
}

export function VerseCard({
  card,
  cardIndex,
  textSize,
  fontFamily,
  redLetter,
  prevCardLastVerseWasRedLetter = false,
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
  onOpenTranslationPicker,
  isCopied,
}: VerseCardProps) {
  const textBoxRef = useRef<HTMLDivElement | null>(null);
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
    const rafId = requestAnimationFrame(checkScroll);
    window.addEventListener('resize', checkScroll);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(checkScroll);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', checkScroll);
    };
  }, [card.combinedText, textSize, fontFamily]);

  const handleInnerScroll = () => {
    const el = textBoxRef.current;
    if (!el) return;
    setIsAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 8);
  };

  const typographyClass = getVerseTypographyClass(card.combinedText, textSize, fontFamily);
  const fontClass =
    fontFamily === 'sans'
      ? 'font-ui font-normal tracking-[-0.005em]'
      : 'font-scripture font-normal tracking-[0.01em]';
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
          <p className={`${fontClass} text-[#F5F2EA] whitespace-pre-line ${typographyClass}`}>
            {card.verses.map((v, idx) => {
              const prevVerse = idx > 0 ? card.verses[idx - 1] : null;
              const prevText = prevVerse ? prevVerse.text : '';
              const sep =
                idx === 0 ? '' : prevText.includes('\n') || v.text.includes('\n') ? '\n' : ' ';
              const prevWasRedLetter =
                idx === 0
                  ? prevCardLastVerseWasRedLetter
                  : prevVerse !== null &&
                    isRedLetterVerse(prevVerse.bookId, prevVerse.chapter, prevVerse.verse);
              const segments = redLetter
                ? segmentRedLetterVerse({
                    bookId: v.bookId,
                    chapter: v.chapter,
                    verse: v.verse,
                    text: v.text,
                    prevVerseWasRedLetter: prevWasRedLetter,
                  })
                : null;

              return (
                <Fragment key={v.verse}>
                  {sep}
                  <sup className="font-ui text-[0.46em] font-semibold text-[#D4AF37] mr-1.5 align-super tabular-nums select-none">
                    {v.verse}
                  </sup>
                  {segments
                    ? segments.map((seg, segIdx) =>
                        seg.isRedLetter ? (
                          <span key={segIdx} className="text-[#E06C65]">
                            {seg.text}
                          </span>
                        ) : (
                          <Fragment key={segIdx}>{seg.text}</Fragment>
                        ),
                      )
                    : v.text}
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
              onClick={() => {
                setShowTranslationInfo(false);
                onOpenTranslationPicker();
              }}
              onMouseEnter={() => setShowTranslationInfo(true)}
              onMouseLeave={() => setShowTranslationInfo(false)}
              onFocus={() => setShowTranslationInfo(true)}
              onBlur={() => setShowTranslationInfo(false)}
              aria-label={`Current translation ${card.translation}: ${translationInfo.fullName}. Click to change translation.`}
              aria-haspopup="dialog"
              className="relative inline-flex items-center gap-1 min-h-[44px] px-2 -mx-1.5 -my-2.5 rounded-lg text-[#D4AF37] font-semibold hover:bg-[#D4AF37]/12 active:scale-[0.97] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#D4AF37] select-none touch-manipulation transition-colors whitespace-nowrap"
            >
              <span>{card.translation}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" aria-hidden="true" />
            </button>

            {showTranslationInfo && (
              <div
                role="tooltip"
                className="pointer-events-none hidden sm:block absolute bottom-full left-0 mb-2.5 w-64 sm:w-72 rounded-xl bg-[#161B19]/95 backdrop-blur-md border border-[#D4AF37]/45 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] z-30"
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
                <p className="text-[11px] font-medium text-[#D4AF37]/90 mt-2">
                  Click to switch translation
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
