import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  Undo2,
} from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  getBibleProgressStats,
  getBookById,
  getNextChapterLocation,
  getPreviousChapterLocation,
  makeVerseKey,
  type BibleBook,
} from './data/bibleBooks';
import { getBookSectionTheme } from './data/bookThemes';
import {
  fetchChapter,
  getCachedChapter,
  type ChapterData,
  type TranslationCode,
  type VerseItem,
} from './services/scriptureApi';
import {
  auth,
  checkRedirectSignIn,
  signInWithGoogleSmart,
  signOutAccount,
} from './firebase';
import {
  loadGuestBookmarks,
  loadGuestLikes,
  loadGuestReadingState,
  mergeGuestDataIntoFirestore,
  saveGuestBookmarks,
  saveGuestLikes,
  saveGuestReadingState,
  subscribeUserCloudData,
  toggleCloudSavedVerse,
  updateCloudReadingState,
  verseToSavedRecord,
  type ReadingState,
  type SavedVerseRecord,
} from './services/userStore';
import { VerseCard } from './components/VerseCard';
import { WaveBookScrubber } from './components/WaveBookScrubber';
import { BooksDrawer } from './components/BooksDrawer';
import { BookmarksModal } from './components/BookmarksModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [readingState, setReadingState] = useState<ReadingState>(() => loadGuestReadingState());
  const [likesMap, setLikesMap] = useState<Record<string, SavedVerseRecord>>(() => loadGuestLikes());
  const [bookmarksMap, setBookmarksMap] = useState<Record<string, SavedVerseRecord>>(() =>
    loadGuestBookmarks(),
  );

  const [chapterData, setChapterData] = useState<ChapterData | null>(() => {
    const initial = loadGuestReadingState();
    return getCachedChapter(initial.translation, initial.bookId, initial.chapter) ?? null;
  });
  const [isLoadingChapter, setIsLoadingChapter] = useState<boolean>(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const [activeVerseIndex, setActiveVerseIndex] = useState<number>(0);
  const [isBooksOpen, setIsBooksOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<Error | null>(null);

  const [copiedVerseKey, setCopiedVerseKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [jumpHistory, setJumpHistory] = useState<
    Array<{ bookId: string; bookName: string; chapter: number; verse: number }>
  >([]);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const pendingTargetVerseRef = useRef<number | null>(readingState.verse);
  const readingStateRef = useRef<ReadingState>(readingState);
  readingStateRef.current = readingState;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!copiedVerseKey) return;
    const timer = window.setTimeout(() => setCopiedVerseKey(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedVerseKey]);

  // Surface Firestore errors cleanly through React ErrorBoundary if thrown
  if (cloudError) {
    throw cloudError;
  }

  // Handle redirect sign-in completion if popup fell back to redirect
  useEffect(() => {
    void checkRedirectSignIn();
  }, []);

  // Auth + Cloud Firestore sync lifecycle
  useEffect(() => {
    let unsubCloud: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (unsubCloud) {
        unsubCloud();
        unsubCloud = null;
      }

      setUser(nextUser);
      setAuthError(null);

      if (!nextUser) {
        setLikesMap(loadGuestLikes());
        setBookmarksMap(loadGuestBookmarks());
        return;
      }

      try {
        const guestState = readingStateRef.current;
        const guestLikes = loadGuestLikes();
        const guestBookmarks = loadGuestBookmarks();

        const resolvedState = await mergeGuestDataIntoFirestore(
          nextUser.uid,
          guestState,
          guestLikes,
          guestBookmarks,
        );

        // If cloud reading state differs and user hasn't switched mid-session, sync to cloud state
        if (
          resolvedState.bookId !== guestState.bookId ||
          resolvedState.chapter !== guestState.chapter ||
          resolvedState.verse !== guestState.verse ||
          resolvedState.translation !== guestState.translation
        ) {
          pendingTargetVerseRef.current = resolvedState.verse;
          setReadingState(resolvedState);
          saveGuestReadingState(resolvedState);
        }

        unsubCloud = subscribeUserCloudData(nextUser.uid, {
          onReadingState: (cloudState) => {
            // Only adopt remote changes if different from current local pointer
            const cur = readingStateRef.current;
            if (
              cloudState.bookId !== cur.bookId ||
              cloudState.chapter !== cur.chapter ||
              cloudState.translation !== cur.translation
            ) {
              pendingTargetVerseRef.current = cloudState.verse;
              setReadingState(cloudState);
              saveGuestReadingState(cloudState);
            }
          },
          onLikes: (cloudLikes) => {
            setLikesMap(cloudLikes);
          },
          onBookmarks: (cloudBookmarks) => {
            setBookmarksMap(cloudBookmarks);
          },
          onError: (err) => {
            setCloudError(err);
          },
        });
      } catch (err) {
        setCloudError(err instanceof Error ? err : new Error(String(err)));
      }
    });

    return () => {
      unsubAuth();
      if (unsubCloud) {
        unsubCloud();
      }
    };
  }, []);

  // Fetch active chapter verbatim from BSB (HelloAO) or WEB (bible-api.com)
  useEffect(() => {
    const controller = new AbortController();
    const { translation, bookId, chapter } = readingState;

    const cached = getCachedChapter(translation, bookId, chapter);
    if (cached) {
      setChapterData(cached);
      setChapterError(null);
      setIsLoadingChapter(false);
      return () => controller.abort();
    }

    setIsLoadingChapter(true);
    setChapterError(null);

    fetchChapter({
      translation,
      bookId,
      chapter,
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setChapterData(data);
        setChapterError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Scripture load error:', err);
        setChapterData(null);
        setChapterError('Unable to load scripture—check connection or switch translation.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingChapter(false);
        }
      });

    return () => controller.abort();
  }, [readingState.translation, readingState.bookId, readingState.chapter, reloadNonce]);

  // Scroll to target verse and observe active centered verse card inside the snap container
  useEffect(() => {
    const container = feedRef.current;
    if (!container || !chapterData || chapterData.verses.length === 0) return;

    const desiredVerse = pendingTargetVerseRef.current ?? 1;
    pendingTargetVerseRef.current = null;

    const targetIdx =
      desiredVerse === -1
        ? chapterData.verses.length - 1
        : Math.max(
            0,
            chapterData.verses.findIndex((v) => v.verse === desiredVerse),
          );
    setActiveVerseIndex(targetIdx);

    let observer: IntersectionObserver | null = null;
    const rafId = requestAnimationFrame(() => {
      const targetEl = container.querySelector<HTMLElement>(
        `[data-verse="${chapterData.verses[targetIdx].verse}"]`,
      );
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }

      const cards = Array.from(container.querySelectorAll<HTMLElement>('article[data-verse]'));
      if (cards.length === 0) return;

      observer = new IntersectionObserver(
        (entries) => {
          let bestEntry: IntersectionObserverEntry | null = null;
          for (const entry of entries) {
            if (
              entry.isIntersecting &&
              (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio)
            ) {
              bestEntry = entry;
            }
          }
          if (bestEntry) {
            const verseNum = Number(bestEntry.target.getAttribute('data-verse'));
            const idx = chapterData.verses.findIndex((v) => v.verse === verseNum);
            if (idx >= 0) {
              setActiveVerseIndex(idx);
              setReadingState((prev) =>
                prev.verse === verseNum &&
                prev.bookId === chapterData.bookId &&
                prev.chapter === chapterData.chapter
                  ? prev
                  : {
                      ...prev,
                      bookId: chapterData.bookId,
                      bookName: chapterData.bookName,
                      chapter: chapterData.chapter,
                      verse: verseNum,
                    },
              );
            }
          }
        },
        {
          root: container,
          threshold: [0.55, 0.75],
        },
      );

      cards.forEach((card) => observer?.observe(card));
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [chapterData]);

  // Debounced cloud reading progress update
  useEffect(() => {
    saveGuestReadingState(readingState);
    if (!user) return;

    const timer = window.setTimeout(() => {
      void updateCloudReadingState(user.uid, readingState).catch((err) => {
        setCloudError(err instanceof Error ? err : new Error(String(err)));
      });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [readingState, user]);

  const navigateToLocation = useCallback(
    (bookId: string, chapter: number, verse = 1, options?: { recordHistory?: boolean }) => {
      const book = getBookById(bookId);
      const safeChapter = Math.max(1, Math.min(chapter, book.chapters));
      const cur = readingStateRef.current;

      if (
        options?.recordHistory !== false &&
        (cur.bookId !== book.id || cur.chapter !== safeChapter || cur.verse !== verse)
      ) {
        setJumpHistory((prev) => {
          const entry = {
            bookId: cur.bookId,
            bookName: cur.bookName,
            chapter: cur.chapter,
            verse: cur.verse,
          };
          const last = prev[prev.length - 1];
          if (
            last &&
            last.bookId === entry.bookId &&
            last.chapter === entry.chapter &&
            last.verse === entry.verse
          ) {
            return prev;
          }
          return [...prev.slice(-19), entry];
        });
      }

      pendingTargetVerseRef.current = verse;
      setReadingState((prev) => ({
        ...prev,
        bookId: book.id,
        bookName: book.name,
        chapter: safeChapter,
        verse: verse === -1 ? 1 : verse,
      }));
    },
    [],
  );

  const handleGoBackToPreviousLocation = useCallback(() => {
    const target = jumpHistory[jumpHistory.length - 1];
    if (!target) return;
    setJumpHistory((prev) => prev.slice(0, -1));
    navigateToLocation(target.bookId, target.chapter, target.verse, { recordHistory: false });
    showToast(`Returned to ${target.bookName} ${target.chapter}:${target.verse}`);
  }, [jumpHistory, navigateToLocation, showToast]);

  const handleSelectChapterFromDrawer = useCallback(
    (book: BibleBook, chapter: number) => {
      navigateToLocation(book.id, chapter, 1);
      setIsBooksOpen(false);
    },
    [navigateToLocation],
  );

  const handleSelectBookFromScrubber = useCallback(
    (book: BibleBook) => {
      navigateToLocation(book.id, 1, 1);
      showToast(`${book.name} 1`);
    },
    [navigateToLocation, showToast],
  );

  const previousChapter = useMemo(
    () => getPreviousChapterLocation(readingState.bookId, readingState.chapter),
    [readingState.bookId, readingState.chapter],
  );

  const stepVerse = useCallback(
    (delta: -1 | 1) => {
      const container = feedRef.current;
      if (!container || !chapterData) return;

      if (delta === -1 && activeVerseIndex <= 0) {
        if (previousChapter) {
          navigateToLocation(previousChapter.bookId, previousChapter.chapter, -1, {
            recordHistory: false,
          });
        }
        return;
      }

      const nextIndex = Math.max(
        0,
        Math.min(chapterData.verses.length - 1, activeVerseIndex + delta),
      );
      if (nextIndex === activeVerseIndex) return;
      const targetVerse = chapterData.verses[nextIndex];
      const targetEl = container.querySelector<HTMLElement>(`[data-verse="${targetVerse.verse}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [activeVerseIndex, chapterData, navigateToLocation, previousChapter],
  );

  // Keyboard arrow support for desktop navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBooksOpen || isBookmarksOpen || isSettingsOpen) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        stepVerse(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        stepVerse(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBooksOpen, isBookmarksOpen, isSettingsOpen, stepVerse]);

  const handleToggleLike = useCallback(
    (verse: VerseItem) => {
      const key = makeVerseKey(verse.bookId, verse.chapter, verse.verse);
      const currentlyLiked = Boolean(likesMap[key]);
      const nextLiked = !currentlyLiked;

      setLikesMap((prev) => {
        const next = { ...prev };
        if (nextLiked) {
          next[key] = verseToSavedRecord(verse);
        } else {
          delete next[key];
        }
        if (!user) {
          saveGuestLikes(next);
        }
        return next;
      });

      if (user) {
        void toggleCloudSavedVerse(
          user.uid,
          'likes',
          verse,
          nextLiked,
          readingStateRef.current,
        ).catch((err) => {
          setCloudError(err instanceof Error ? err : new Error(String(err)));
        });
      }
    },
    [likesMap, user],
  );

  const handleToggleBookmark = useCallback(
    (verse: VerseItem) => {
      const key = makeVerseKey(verse.bookId, verse.chapter, verse.verse);
      const currentlyBookmarked = Boolean(bookmarksMap[key]);
      const nextBookmarked = !currentlyBookmarked;

      setBookmarksMap((prev) => {
        const next = { ...prev };
        if (nextBookmarked) {
          next[key] = verseToSavedRecord(verse);
        } else {
          delete next[key];
        }
        if (!user) {
          saveGuestBookmarks(next);
        }
        return next;
      });

      showToast(nextBookmarked ? `Bookmarked ${verse.reference}` : `Removed bookmark`);

      if (user) {
        void toggleCloudSavedVerse(
          user.uid,
          'bookmarks',
          verse,
          nextBookmarked,
          readingStateRef.current,
        ).catch((err) => {
          setCloudError(err instanceof Error ? err : new Error(String(err)));
        });
      }
    },
    [bookmarksMap, showToast, user],
  );

  const copyVerseText = useCallback(
    async (verse: VerseItem, customToast?: string) => {
      const key = makeVerseKey(verse.bookId, verse.chapter, verse.verse);
      const formatted = `"${verse.text}" — ${verse.reference} (${verse.translation})`;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(formatted);
        } else {
          const area = document.createElement('textarea');
          area.value = formatted;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          document.body.removeChild(area);
        }
        setCopiedVerseKey(key);
        showToast(customToast ?? `Copied ${verse.reference}`);
      } catch {
        showToast('Unable to copy to clipboard');
      }
    },
    [showToast],
  );

  const handleShare = useCallback(
    async (verse: VerseItem) => {
      const formatted = `"${verse.text}" — ${verse.reference} (${verse.translation})`;
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `${verse.reference} (${verse.translation})`,
            text: formatted,
          });
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
        }
      }
      await copyVerseText(verse, `Copied ${verse.reference} to share`);
    },
    [copyVerseText],
  );

  const handleChangeTranslation = useCallback(
    (nextTranslation: TranslationCode) => {
      if (nextTranslation === readingState.translation) return;
      pendingTargetVerseRef.current = readingState.verse;
      setReadingState((prev) => ({
        ...prev,
        translation: nextTranslation,
      }));
      showToast(
        nextTranslation === 'BSB'
          ? 'Switched to Berean Standard Bible (BSB)'
          : 'Switched to World English Bible (WEB)',
      );
    },
    [readingState.translation, readingState.verse, showToast],
  );

  const handleGoogleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    const outcome = await signInWithGoogleSmart();
    setAuthLoading(false);

    if (outcome.status === 'signed_in') {
      showToast('Signed in — syncing likes & bookmarks');
    } else if (outcome.status === 'cancelled' || outcome.status === 'error') {
      setAuthError(outcome.message);
    }
  }, [showToast]);

  const handleSignOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signOutAccount();
      showToast('Signed out');
    } finally {
      setAuthLoading(false);
    }
  }, [showToast]);

  const handleJumpToSaved = useCallback(
    (record: SavedVerseRecord) => {
      navigateToLocation(record.bookId, record.chapter, record.verse);
      setIsBookmarksOpen(false);
    },
    [navigateToLocation],
  );

  const handleRemoveSaved = useCallback(
    (kind: 'bookmarks' | 'likes', record: SavedVerseRecord) => {
      const versePayload: VerseItem = {
        verse: record.verse,
        text: record.text,
        reference: record.reference,
        bookId: record.bookId,
        bookName: record.bookName,
        chapter: record.chapter,
        translation: record.translation,
      };
      if (kind === 'bookmarks') {
        handleToggleBookmark(versePayload);
      } else {
        handleToggleLike(versePayload);
      }
    },
    [handleToggleBookmark, handleToggleLike],
  );

  const nextChapter = useMemo(
    () => getNextChapterLocation(readingState.bookId, readingState.chapter),
    [readingState.bookId, readingState.chapter],
  );

  const handleNextChapter = useCallback(() => {
    if (!nextChapter) return;
    navigateToLocation(nextChapter.bookId, nextChapter.chapter, 1);
  }, [navigateToLocation, nextChapter]);

  const sortedBookmarks = useMemo(
    () => Object.values(bookmarksMap).sort((a, b) => b.createdAtMs - a.createdAtMs),
    [bookmarksMap],
  );
  const sortedLikes = useMemo(
    () => Object.values(likesMap).sort((a, b) => b.createdAtMs - a.createdAtMs),
    [likesMap],
  );

  const totalVerses = chapterData?.verses.length ?? 0;
  const progressPercent =
    totalVerses > 0 ? Math.min(100, ((activeVerseIndex + 1) / totalVerses) * 100) : 0;

  const bibleProgress = useMemo(
    () =>
      getBibleProgressStats(
        readingState.bookId,
        readingState.chapter,
        activeVerseIndex,
        totalVerses,
      ),
    [readingState.bookId, readingState.chapter, activeVerseIndex, totalVerses],
  );

  const sectionTheme = useMemo(
    () => getBookSectionTheme(readingState.bookId),
    [readingState.bookId],
  );

  const themeStyle = {
    '--bg-top': sectionTheme.topColor,
    '--bg-mid': sectionTheme.midColor,
    '--bg-bottom': sectionTheme.bottomColor,
  } as React.CSSProperties;

  return (
    <div
      style={themeStyle}
      className="relative h-[100dvh] w-full overflow-hidden book-theme-bg text-[#F5F2EA] select-none sm:select-text"
    >
      {/* Top Bar: Books (left), BIBLE REEL (center), Bookmarks & Settings (right) */}
      <header
        style={{
          backgroundColor: `${sectionTheme.topColor}D9`,
          transition: 'background-color 700ms ease',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          height: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        }}
        className="fixed top-0 left-0 right-0 z-30 px-3 sm:px-6 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between gap-4"
      >
        <button
          type="button"
          onClick={() => setIsBooksOpen(true)}
          aria-label="Open books and chapters menu"
          className="min-h-[44px] px-2.5 sm:px-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-medium text-[#F5F2EA] hover:bg-white/5 transition-colors whitespace-nowrap shrink-0"
        >
          <BookOpen className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
          <span>Books</span>
        </button>

        <h1 className="text-xs sm:text-sm font-semibold tracking-[0.22em] text-[#F5F2EA] whitespace-nowrap shrink-0">
          BIBLE REEL
        </h1>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsBookmarksOpen(true)}
            aria-label="Open saved bookmarks and likes"
            className="relative min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <Bookmark className="w-[18px] h-[18px]" />
            {sortedBookmarks.length > 0 && (
              <span className="sr-only">{sortedBookmarks.length} bookmarks</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings and translation selector"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Left-Edge 66-Book Wave Scrubber */}
      <WaveBookScrubber
        currentBookId={readingState.bookId}
        onSelectBook={handleSelectBookFromScrubber}
      />

      {/* Right-Edge Floating Up/Down Chevrons */}
      {!isLoadingChapter && !chapterError && totalVerses > 0 && (
        <div
          aria-label="Verse navigation controls"
          className="fixed right-2.5 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2"
        >
          <button
            type="button"
            onClick={() => stepVerse(-1)}
            disabled={activeVerseIndex <= 0 && !previousChapter}
            aria-label={
              activeVerseIndex <= 0 && previousChapter
                ? `Go to previous chapter (${previousChapter.bookName} ${previousChapter.chapter})`
                : 'Previous verse'
            }
            title={
              activeVerseIndex <= 0 && previousChapter
                ? `Previous: ${previousChapter.bookName} ${previousChapter.chapter}`
                : 'Previous verse'
            }
            className="min-h-[44px] min-w-[44px] rounded-full bg-[#161B19]/80 backdrop-blur-md border border-[#D4AF37]/25 text-[#F5F2EA] hover:border-[#D4AF37] flex items-center justify-center transition-colors disabled:opacity-25 disabled:pointer-events-none active:scale-[0.94]"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <span className="text-[11px] font-medium text-[#9CA8A2] tabular-nums py-0.5">
            {activeVerseIndex + 1}/{totalVerses}
          </span>

          <button
            type="button"
            onClick={() => stepVerse(1)}
            disabled={activeVerseIndex >= totalVerses - 1}
            aria-label="Next verse"
            title="Next verse"
            className="min-h-[44px] min-w-[44px] rounded-full bg-[#161B19]/80 backdrop-blur-md border border-[#D4AF37]/25 text-[#F5F2EA] hover:border-[#D4AF37] flex items-center justify-center transition-colors disabled:opacity-25 disabled:pointer-events-none active:scale-[0.94]"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* One-tap Return to Previous Verse after jumping books or chapters */}
      {jumpHistory.length > 0 && (
        <button
          type="button"
          onClick={handleGoBackToPreviousLocation}
          aria-label={`Back to ${jumpHistory[jumpHistory.length - 1].bookName} ${
            jumpHistory[jumpHistory.length - 1].chapter
          }:${jumpHistory[jumpHistory.length - 1].verse}`}
          className="fixed bottom-12 right-3 sm:right-6 z-30 min-h-[40px] px-3.5 py-2 rounded-full bg-[#161B19]/90 backdrop-blur-md border border-[#D4AF37]/40 text-xs font-medium text-[#F5F2EA] hover:border-[#D4AF37] shadow-lg flex items-center gap-2 transition-colors active:scale-[0.97]"
        >
          <Undo2 className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden="true" />
          <span className="whitespace-nowrap tabular-nums">
            Back to {jumpHistory[jumpHistory.length - 1].bookName}{' '}
            {jumpHistory[jumpHistory.length - 1].chapter}:
            {jumpHistory[jumpHistory.length - 1].verse}
          </span>
        </button>
      )}

      {/* Main Full-Screen Snap Feed */}
      <main
        ref={feedRef}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {isLoadingChapter ? (
          <div className="h-[100dvh] w-full flex flex-col justify-center px-10 sm:px-16">
            <div className="max-w-2xl w-full mx-auto space-y-6 animate-pulse">
              <div className="h-px w-full bg-[#D4AF37]/25" />
              <div className="space-y-3 py-4">
                <div className="h-6 bg-white/10 rounded w-11/12" />
                <div className="h-6 bg-white/10 rounded w-9/12" />
                <div className="h-6 bg-white/10 rounded w-7/12" />
              </div>
              <div className="h-px w-full bg-[#D4AF37]/25" />
              <div className="h-4 bg-[#D4AF37]/20 rounded w-36" />
            </div>
          </div>
        ) : chapterError ? (
          <div className="h-[100dvh] w-full flex items-center justify-center px-8">
            <div className="max-w-md w-full rounded-2xl bg-[#161B19] border border-[#D4AF37]/25 p-6 text-center space-y-4">
              <div className="w-11 h-11 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className="font-scripture text-2xl font-medium text-[#F5F2EA]">
                Scripture Unavailable
              </h2>
              <p className="text-sm text-[#9CA8A2] leading-relaxed">{chapterError}</p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setReloadNonce((n) => n + 1)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#D4AF37] text-[#121514] text-xs font-semibold flex items-center gap-2 hover:bg-[#E2BF4E] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-white/15 text-xs font-medium text-[#F5F2EA] hover:bg-white/5 transition-colors"
                >
                  Open Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          chapterData?.verses.map((verse, idx) => {
            const key = makeVerseKey(verse.bookId, verse.chapter, verse.verse);
            return (
              <VerseCard
                key={`${verse.translation}_${key}`}
                verse={verse}
                isLiked={Boolean(likesMap[key])}
                isBookmarked={Boolean(bookmarksMap[key])}
                isLastVerseInChapter={idx === chapterData.verses.length - 1}
                nextChapterLabel={
                  nextChapter ? `${nextChapter.bookName} ${nextChapter.chapter}` : null
                }
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
                onShare={handleShare}
                onCopy={copyVerseText}
                onNextChapter={handleNextChapter}
                isCopied={copiedVerseKey === key}
              />
            );
          })
        )}
      </main>

      {/* Improved Bottom Progress Footer: Chapter Progress + Overall OT/NT Bible Progress */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 sm:px-6 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] bg-[#0A110E]/75 backdrop-blur-md border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-[10px] font-medium text-[#9CA8A2] tabular-nums">
            <span className="truncate">
              {readingState.bookName} {readingState.chapter}
              {totalVerses > 0 ? ` · ${activeVerseIndex + 1}/${totalVerses}` : ''}
            </span>
            <span className="whitespace-nowrap shrink-0 flex items-center gap-1.5">
              <span>Bible</span>
              <span aria-hidden="true" className="text-white/25">
                ·
              </span>
              <span
                className={
                  bibleProgress.testament === 'NT' ? 'text-[#6FD3D8]' : 'text-[#D4AF37]'
                }
              >
                {bibleProgress.testament}
              </span>
              <span>
                {bibleProgress.overallPercent > 0 && bibleProgress.overallPercent < 0.1
                  ? '<0.1%'
                  : `${bibleProgress.overallPercent.toFixed(1)}%`}
              </span>
            </span>
          </div>

          {/* Current Chapter Progress Bar */}
          <div
            role="progressbar"
            aria-label="Chapter reading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            className="h-[3px] w-full rounded-full bg-white/10 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-200 ease-out ${
                bibleProgress.testament === 'NT' ? 'bg-[#6FD3D8]' : 'bg-[#D4AF37]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Overall Bible Progress Bar (OT Gold vs NT Cyan) */}
          <div
            role="progressbar"
            aria-label="Overall Bible reading progress across Old and New Testaments"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(bibleProgress.overallPercent)}
            className="h-[3px] w-full rounded-full overflow-hidden flex gap-[2px]"
          >
            <div
              style={{ width: `${bibleProgress.otSegmentSharePercent}%` }}
              className="h-full bg-[#D4AF37]/20 rounded-l-full overflow-hidden"
            >
              <div
                className="h-full bg-[#D4AF37] transition-[width] duration-300 ease-out"
                style={{ width: `${bibleProgress.otFillPercent}%` }}
              />
            </div>
            <div
              style={{ width: `${bibleProgress.ntSegmentSharePercent}%` }}
              className="h-full bg-[#6FD3D8]/20 rounded-r-full overflow-hidden"
            >
              <div
                className="h-full bg-[#6FD3D8] transition-[width] duration-300 ease-out"
                style={{ width: `${bibleProgress.ntFillPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transient Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-14 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-[#161B19]/95 border border-[#D4AF37]/40 text-xs font-medium text-[#F5F2EA] shadow-xl whitespace-nowrap pointer-events-none"
        >
          {toastMessage}
        </div>
      )}

      {/* Drawers & Modals */}
      <BooksDrawer
        isOpen={isBooksOpen}
        currentBookId={readingState.bookId}
        currentChapter={readingState.chapter}
        onClose={() => setIsBooksOpen(false)}
        onSelectChapter={handleSelectChapterFromDrawer}
      />

      <BookmarksModal
        isOpen={isBookmarksOpen}
        isSignedIn={Boolean(user)}
        bookmarks={sortedBookmarks}
        likes={sortedLikes}
        onClose={() => setIsBookmarksOpen(false)}
        onJumpToVerse={handleJumpToSaved}
        onRemoveSaved={handleRemoveSaved}
        onOpenSettings={() => {
          setIsBookmarksOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        translation={readingState.translation}
        user={user}
        authLoading={authLoading}
        authError={authError}
        onClose={() => setIsSettingsOpen(false)}
        onChangeTranslation={handleChangeTranslation}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
