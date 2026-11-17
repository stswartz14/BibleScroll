import { useCallback, useRef, useState } from 'react';
import { BIBLE_BOOKS, getBookById, type BibleBook } from '../data/bibleBooks';

interface WaveBookScrubberProps {
  currentBookId: string;
  onSelectBook: (book: BibleBook) => void;
}

const TOTAL_BOOKS = BIBLE_BOOKS.length;
const CANCEL_PULL_RIGHT_PX = 76;

export function WaveBookScrubber({ currentBookId, onSelectBook }: WaveBookScrubberProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [hoverFloatIndex, setHoverFloatIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [bubbleTopPx, setBubbleTopPx] = useState<number>(120);
  const [bubbleLeftPx, setBubbleLeftPx] = useState<number>(56);

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = stripRef.current;
    if (!el) return { picked: null as BibleBook | null, cancelled: false };
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return { picked: null as BibleBook | null, cancelled: false };

    const cancelled = clientX - rect.left > CANCEL_PULL_RIGHT_PX;
    const clampedRatio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const floatIdx = clampedRatio * (TOTAL_BOOKS - 1);
    const nearestIdx = Math.round(floatIdx);

    setIsCancelled(cancelled);
    setHoverFloatIndex(floatIdx);
    setActiveIndex(nearestIdx);

    // Clamp pill position in viewport pixels so it stays readable and clear of the thumb
    const rawY = rect.top + clampedRatio * rect.height;
    const minY = Math.max(rect.top + 16, 84);
    const maxY = Math.min(rect.bottom - 16, window.innerHeight - 52);
    setBubbleTopPx(Math.max(minY, Math.min(maxY, rawY)));

    const safeLeft = Math.min(
      Math.max(56, clientX + 26),
      Math.max(56, window.innerWidth - 190),
    );
    setBubbleLeftPx(safeLeft);

    return {
      picked: cancelled ? null : (BIBLE_BOOKS[nearestIdx] ?? null),
      cancelled,
    };
  }, []);

  const resetScrubber = () => {
    setIsDragging(false);
    setIsCancelled(false);
    setHoverFloatIndex(null);
    setActiveIndex(null);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const { picked, cancelled } = updateFromPointer(e.clientX, e.clientY);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetScrubber();
    if (!cancelled && picked) {
      onSelectBook(picked);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    resetScrubber();
  };

  const activeBook = activeIndex !== null ? BIBLE_BOOKS[activeIndex] : null;
  const currentBook = getBookById(currentBookId);
  const isActiveNT = activeBook?.testament === 'NT';

  return (
    <div
      ref={stripRef}
      role="slider"
      aria-label="Quick scrub through the 66 books of the Bible. Slide right to cancel."
      aria-valuemin={1}
      aria-valuemax={TOTAL_BOOKS}
      aria-valuenow={(activeIndex ?? BIBLE_BOOKS.findIndex((b) => b.id === currentBookId)) + 1}
      aria-valuetext={
        isCancelled
          ? `Cancelled, staying in ${currentBook.name}`
          : activeBook
            ? `${activeBook.testament === 'OT' ? 'Old Testament' : 'New Testament'}: ${activeBook.name}`
            : currentBook.name
      }
      tabIndex={-1}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        touchAction: 'none',
        top: 'calc(env(safe-area-inset-top, 0px) + 68px)',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 42px)',
      }}
      className="fixed left-0 w-[28px] z-50 flex flex-col justify-between items-start py-1 pl-2 select-none cursor-ns-resize"
    >
      {BIBLE_BOOKS.map((book, idx) => {
        const isCurrent = book.id === currentBookId;
        const isActive = !isCancelled && activeIndex === idx;
        const isNT = book.testament === 'NT';

        let translateX = 0;
        let scale = 1;
        let opacity = isCurrent ? 1 : isNT ? 0.48 : 0.34;

        if (isDragging && !isCancelled && hoverFloatIndex !== null) {
          const dist = Math.abs(idx - hoverFloatIndex);
          // Smooth curved wave outward toward the right (~26px at apex)
          const wave = Math.exp(-(dist * dist) / 14);
          translateX = wave * 26;
          scale = 1 + wave * 0.95;
          opacity = Math.max(0.32, (isNT ? 0.45 : 0.34) + wave * 0.65);
          if (isActive) {
            scale = 2.2;
            opacity = 1;
          }
        }

        const dotColorClass = isNT
          ? isActive || isCurrent
            ? 'bg-[#6FD3D8]'
            : 'bg-[#6FD3D8]/85'
          : isActive || isCurrent
            ? 'bg-[#D4AF37]'
            : 'bg-[#F5F2EA]';

        return (
          <span
            key={book.id}
            aria-hidden="true"
            style={{
              transform: `translate3d(${translateX.toFixed(2)}px, 0, 0) scale(${scale.toFixed(2)})${
                isNT ? ' rotate(45deg)' : ''
              }`,
              opacity,
            }}
            className={`block w-[4px] h-[4px] transition-transform duration-100 ease-out will-change-transform ${
              isNT ? 'rounded-[1px]' : 'rounded-full'
            } ${dotColorClass}`}
          />
        );
      })}

      {/* Compact readable pill bubble differentiating OT vs NT (hidden when pulled right to cancel) */}
      {isDragging && !isCancelled && activeBook && (
        <div
          aria-live="polite"
          style={{
            top: `${bubbleTopPx}px`,
            left: `${bubbleLeftPx}px`,
            transform: 'translateY(-50%)',
          }}
          className={`pointer-events-none fixed z-50 w-max whitespace-nowrap rounded-full px-3.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center gap-2 border ${
            isActiveNT
              ? 'bg-[#101C20] border-[#6FD3D8]'
              : 'bg-[#161B19] border-[#D4AF37]'
          }`}
        >
          <span
            className={`text-[10px] font-bold tracking-wider ${
              isActiveNT ? 'text-[#6FD3D8]' : 'text-[#D4AF37]'
            }`}
          >
            {activeBook.testament}
          </span>
          <span aria-hidden="true" className="text-white/25 text-xs">
            ·
          </span>
          <span className="text-xs font-semibold tracking-wide text-[#F5F2EA]">
            {activeBook.name}
          </span>
          <span aria-hidden="true" className="text-white/25 text-xs">
            ·
          </span>
          <span className="text-[11px] font-medium text-[#9CA8A2] tabular-nums">
            Ch. 1
          </span>
        </div>
      )}
    </div>
  );
}
