import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Menu,
  NotebookPen,
  RefreshCw,
  Search,
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
import { computeBibleReadStats, makeReadVerseId } from './data/bibleChapterVerseCounts';
import { getBookSectionTheme } from './data/bookThemes';
import { getBookOverview, type BookOverview } from './data/bookOverviews';
import { isRedLetterVerse } from './data/redLetterVerses';
import {
  buildVerseCards,
  fetchChapter,
  getCachedChapter,
  isApiBibleTranslation,
  prefetchUpcomingChapters,
  TRANSLATION_NAMES,
  type ChapterData,
  type TranslationCode,
  type VerseCardItem,
} from './services/scriptureApi';
import {
  ApiBibleAuthError,
  ApiBibleMissingKeyError,
  ApiBibleTranslationUnavailableError,
  clearCachedApiBibleIds,
  getCachedApiBibleIds,
  resolveApiBibleIds,
  type ApiBibleTranslationCode,
  type ResolvedApiBibleIds,
} from './services/apiBible';
import {
  auth,
  checkRedirectSignIn,
  signInWithGoogleSmart,
  signOutAccount,
} from './firebase';
import {
  applyReadTodayToStreak,
  buildVerseNoteRecord,
  cardToSavedRecord,
  deleteCloudVerseNote,
  loadGuestApiBibleKey,
  loadGuestBookmarks,
  loadGuestLikes,
  loadGuestNotes,
  loadGuestReadingState,
  loadGuestReadVerses,
  loadGuestStreak,
  markBookVersesReadInCloud,
  mergeGuestDataIntoFirestore,
  sanitizeApiBibleKey,
  saveCloudVerseNote,
  saveGuestApiBibleKey,
  saveGuestBookmarks,
  saveGuestLikes,
  saveGuestNotes,
  saveGuestReadingState,
  saveGuestReadVerses,
  saveGuestStreak,
  subscribeUserCloudData,
  toggleCloudSavedRecord,
  updateCloudApiBibleKey,
  updateCloudReadingState,
  updateCloudStreak,
  type FontFamilyOption,
  type NoteKind,
  type ReadingState,
  type SavedVerseRecord,
  type StreakStats,
  type TextSizeOption,
  type VerseNoteRecord,
} from './services/userStore';
import { VerseCard } from './components/VerseCard';
import { BookOverviewCard } from './components/BookOverviewCard';
import { WaveBookScrubber } from './components/WaveBookScrubber';
import { BooksDrawer } from './components/BooksDrawer';
import { BookmarksModal } from './components/BookmarksModal';
import { NotesModal } from './components/NotesModal';
import { SearchModal } from './components/SearchModal';
import { SettingsModal, type SaveApiBibleKeyResult } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { TranslationPickerModal } from './components/TranslationPickerModal';
import { VerseNoteModal, type VerseNoteTarget } from './components/VerseNoteModal';

interface JumpLocation {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
}

type FeedItem =
  | {
      kind: 'overview';
      id: string;
      book: BibleBook;
      overview: BookOverview;
    }
  | {
      kind: 'verse';
      id: string;
      card: VerseCardItem;
      verseCardIndex: number;
    };

export default function App() {
  const [readingState, setReadingState] = useState<ReadingState>(() => loadGuestReadingState());
  const [likesMap, setLikesMap] = useState<Record<string, SavedVerseRecord>>(() => loadGuestLikes());
  const [bookmarksMap, setBookmarksMap] = useState<Record<string, SavedVerseRecord>>(() =>
    loadGuestBookmarks(),
  );
  const [notesMap, setNotesMap] = useState<Record<string, VerseNoteRecord>>(() => loadGuestNotes());
  const [readVersesMap, setReadVersesMap] = useState<Record<string, boolean>>(() =>
    loadGuestReadVerses(),
  );
  const [streakStats, setStreakStats] = useState<StreakStats>(() => loadGuestStreak());
  const [apiBibleKey, setApiBibleKey] = useState<string>(() => loadGuestApiBibleKey());
  const [resolvedApiBibleIds, setResolvedApiBibleIds] = useState<ResolvedApiBibleIds | null>(() =>
    getCachedApiBibleIds(loadGuestApiBibleKey()),
  );

  const [chapterData, setChapterData] = useState<ChapterData | null>(() => {
    const initial = loadGuestReadingState();
    return getCachedChapter(initial.translation, initial.bookId, initial.chapter) ?? null;
  });
  const [isLoadingChapter, setIsLoadingChapter] = useState<boolean>(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isBooksOpen, setIsBooksOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsFocusApiKey, setSettingsFocusApiKey] = useState<boolean>(false);
  const [settingsMissingKeyFor, setSettingsMissingKeyFor] =
    useState<ApiBibleTranslationCode | null>(null);
  const [isTranslationPickerOpen, setIsTranslationPickerOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [noteModalTarget, setNoteModalTarget] = useState<VerseNoteTarget | null>(null);
  const [isDocumentVisible, setIsDocumentVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<Error | null>(null);

  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [jumpHistory, setJumpHistory] = useState<JumpLocation[]>([]);
  const [searchReturnSpot, setSearchReturnSpot] = useState<JumpLocation | null>(null);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const pendingTargetVerseRef = useRef<number | null>(readingState.verse);
  const pendingSkipOverviewRef = useRef<boolean>(readingState.verse > 1);
  const searchReturnTimerRef = useRef<number | null>(null);
  const readingStateRef = useRef<ReadingState>(readingState);
  readingStateRef.current = readingState;
  const readVersesMapRef = useRef<Record<string, boolean>>(readVersesMap);
  readVersesMapRef.current = readVersesMap;
  const streakStatsRef = useRef<StreakStats>(streakStats);
  streakStatsRef.current = streakStats;
  const apiBibleKeyRef = useRef<string>(apiBibleKey);
  apiBibleKeyRef.current = apiBibleKey;

  const touchGestureRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    startTime: number;
    lastMoveTime: number;
    startScrollTop: number;
    startIndex: number;
    scrollableTarget: HTMLElement | null;
    startInnerScrollTop: number;
  } | null>(null);
  const boundaryTransitionAtRef = useRef<number>(0);
  const lastCardSettledAtRef = useRef<number>(0);
  const wheelBoundaryAccumRef = useRef<{ deltaY: number; lastEventAt: number }>({
    deltaY: 0,
    lastEventAt: 0,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!copiedCardId) return;
    const timer = window.setTimeout(() => setCopiedCardId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copiedCardId]);

  useEffect(() => {
    return () => {
      if (searchReturnTimerRef.current !== null) {
        window.clearTimeout(searchReturnTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setIsDocumentVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
        setNotesMap(loadGuestNotes());
        setReadVersesMap(loadGuestReadVerses());
        setStreakStats(loadGuestStreak());
        const guestKey = loadGuestApiBibleKey();
        setApiBibleKey(guestKey);
        setResolvedApiBibleIds(getCachedApiBibleIds(guestKey));
        return;
      }

      try {
        const guestState = readingStateRef.current;
        const guestLikes = loadGuestLikes();
        const guestBookmarks = loadGuestBookmarks();
        const guestNotes = loadGuestNotes();
        const guestReadVerses = loadGuestReadVerses();
        const guestStreak = streakStatsRef.current;
        const guestApiBibleKey = apiBibleKeyRef.current;

        const {
          state: resolvedState,
          streak: resolvedStreak,
          apiBibleKey: resolvedKey,
        } = await mergeGuestDataIntoFirestore(
          nextUser.uid,
          guestState,
          guestLikes,
          guestBookmarks,
          guestNotes,
          guestReadVerses,
          guestStreak,
          guestApiBibleKey,
        );

        setStreakStats(resolvedStreak);
        saveGuestStreak(resolvedStreak);

        if (resolvedKey !== apiBibleKeyRef.current) {
          setApiBibleKey(resolvedKey);
          saveGuestApiBibleKey(resolvedKey);
          const cachedIds = getCachedApiBibleIds(resolvedKey);
          setResolvedApiBibleIds(cachedIds);
          if (resolvedKey && !cachedIds) {
            void resolveApiBibleIds(resolvedKey)
              .then((ids) => setResolvedApiBibleIds(ids))
              .catch(() => {
                // Silent background resolution; surfaces on chapter fetch if needed
              });
          }
        }

        if (
          resolvedState.bookId !== guestState.bookId ||
          resolvedState.chapter !== guestState.chapter ||
          resolvedState.verse !== guestState.verse ||
          resolvedState.translation !== guestState.translation ||
          resolvedState.smartGrouping !== guestState.smartGrouping ||
          resolvedState.textSize !== guestState.textSize ||
          resolvedState.fontFamily !== guestState.fontFamily ||
          resolvedState.redLetter !== guestState.redLetter
        ) {
          const locationOrLayoutChanged =
            resolvedState.bookId !== guestState.bookId ||
            resolvedState.chapter !== guestState.chapter ||
            resolvedState.verse !== guestState.verse ||
            resolvedState.translation !== guestState.translation ||
            resolvedState.smartGrouping !== guestState.smartGrouping;
          if (locationOrLayoutChanged) {
            pendingTargetVerseRef.current = resolvedState.verse;
          }
          setReadingState(resolvedState);
          saveGuestReadingState(resolvedState);
        }

        unsubCloud = subscribeUserCloudData(nextUser.uid, {
          onReadingState: (cloudState) => {
            const cur = readingStateRef.current;
            const locationOrLayoutChanged =
              cloudState.bookId !== cur.bookId ||
              cloudState.chapter !== cur.chapter ||
              cloudState.translation !== cur.translation ||
              cloudState.smartGrouping !== cur.smartGrouping;
            const displayChanged =
              cloudState.textSize !== cur.textSize ||
              cloudState.fontFamily !== cur.fontFamily ||
              cloudState.redLetter !== cur.redLetter;

            if (locationOrLayoutChanged || displayChanged) {
              if (locationOrLayoutChanged) {
                pendingTargetVerseRef.current = cloudState.verse;
              }
              setReadingState(cloudState);
              saveGuestReadingState(cloudState);
            }
          },
          onStreak: (cloudStreak) => {
            setStreakStats(cloudStreak);
            saveGuestStreak(cloudStreak);
          },
          onApiBibleKey: (cloudKey) => {
            if (cloudKey !== apiBibleKeyRef.current) {
              setApiBibleKey(cloudKey);
              saveGuestApiBibleKey(cloudKey);
              const cachedIds = getCachedApiBibleIds(cloudKey);
              setResolvedApiBibleIds(cachedIds);
              if (cloudKey && !cachedIds) {
                void resolveApiBibleIds(cloudKey)
                  .then((ids) => setResolvedApiBibleIds(ids))
                  .catch(() => {
                    // Silent background resolution
                  });
              }
            }
          },
          onLikes: (cloudLikes) => {
            setLikesMap(cloudLikes);
          },
          onBookmarks: (cloudBookmarks) => {
            setBookmarksMap(cloudBookmarks);
          },
          onNotes: (cloudNotes) => {
            setNotesMap(cloudNotes);
          },
          onReadVerses: (cloudReadVerses) => {
            setReadVersesMap(cloudReadVerses);
            saveGuestReadVerses(cloudReadVerses);
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

  // Fetch active chapter (memory -> IndexedDB -> API) & automatically cache next 2 chapters
  useEffect(() => {
    const controller = new AbortController();
    const { translation, bookId, chapter } = readingState;

    const cached = getCachedChapter(translation, bookId, chapter);
    if (cached) {
      setChapterData(cached);
      setChapterError(null);
      setIsLoadingChapter(false);
      void prefetchUpcomingChapters({
        translation,
        bookId,
        chapter,
        apiKey: apiBibleKey,
        count: 2,
      });
      return () => controller.abort();
    }

    setIsLoadingChapter(true);
    setChapterError(null);

    fetchChapter({
      translation,
      bookId,
      chapter,
      apiKey: apiBibleKey,
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setChapterData(data);
        setChapterError(null);
        setIsLoadingChapter(false);
        if (isApiBibleTranslation(translation) && apiBibleKey.trim()) {
          const updatedIds = getCachedApiBibleIds(apiBibleKey);
          if (updatedIds) {
            setResolvedApiBibleIds(updatedIds);
          }
        }
        void prefetchUpcomingChapters({
          translation,
          bookId,
          chapter,
          apiKey: apiBibleKey,
          count: 2,
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Scripture load error:', err);
        setChapterData(null);
        if (
          err instanceof ApiBibleMissingKeyError ||
          err instanceof ApiBibleAuthError ||
          err instanceof ApiBibleTranslationUnavailableError
        ) {
          setChapterError(err.message);
        } else {
          setChapterError('Unable to load scripture—check connection or switch translation.');
        }
        setIsLoadingChapter(false);
      });

    return () => controller.abort();
  }, [readingState.translation, readingState.bookId, readingState.chapter, apiBibleKey, reloadNonce]);

  const cards = useMemo(
    () => buildVerseCards(chapterData, readingState.smartGrouping),
    [chapterData, readingState.smartGrouping],
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    if (cards.length === 0) return [];
    const verseItems: FeedItem[] = cards.map((card, verseCardIndex) => ({
      kind: 'verse',
      id: `${card.translation}_${card.id}`,
      card,
      verseCardIndex,
    }));

    if (chapterData?.chapter === 1) {
      const book = getBookById(chapterData.bookId);
      return [
        {
          kind: 'overview',
          id: `overview_${book.id}`,
          book,
          overview: getBookOverview(book.id),
        },
        ...verseItems,
      ];
    }

    return verseItems;
  }, [cards, chapterData?.bookId, chapterData?.chapter]);

  const activeFeedItem = feedItems[activeCardIndex] ?? null;
  const isOnOverviewCard = activeFeedItem?.kind === 'overview';
  const activeVerseCardIndex =
    activeFeedItem?.kind === 'verse' ? activeFeedItem.verseCardIndex : -1;

  useEffect(() => {
    lastCardSettledAtRef.current = Date.now();
  }, [activeCardIndex, readingState.bookId, readingState.chapter]);

  // Scroll to target verse card (or Book Overview Card) and observe active card in snap container
  useEffect(() => {
    const container = feedRef.current;
    if (!container || isLoadingChapter || Boolean(chapterError) || feedItems.length === 0) return;

    const desiredVerse = pendingTargetVerseRef.current ?? 1;
    const skipOverview = pendingSkipOverviewRef.current;
    pendingTargetVerseRef.current = null;
    pendingSkipOverviewRef.current = false;

    const hasOverview = feedItems[0]?.kind === 'overview';
    const overviewOffset = hasOverview ? 1 : 0;

    let targetIdx = 0;
    if (desiredVerse === -1) {
      targetIdx = feedItems.length - 1;
    } else if (hasOverview && !skipOverview && desiredVerse <= 1) {
      targetIdx = 0;
    } else {
      const verseIdx = Math.max(
        0,
        cards.findIndex((c) => desiredVerse >= c.startVerse && desiredVerse <= c.endVerse),
      );
      targetIdx = overviewOffset + verseIdx;
    }

    setActiveCardIndex(targetIdx);
    lastCardSettledAtRef.current = Date.now();

    const targetItem = feedItems[targetIdx];
    if (targetItem?.kind === 'verse') {
      const tc = targetItem.card;
      setReadingState((prev) =>
        prev.verse === tc.startVerse &&
        prev.bookId === tc.bookId &&
        prev.chapter === tc.chapter
          ? prev
          : {
              ...prev,
              bookId: tc.bookId,
              bookName: tc.bookName,
              chapter: tc.chapter,
              verse: tc.startVerse,
            },
      );
    }

    let observer: IntersectionObserver | null = null;
    const rafId = requestAnimationFrame(() => {
      const targetEl = container.querySelector<HTMLElement>(`[data-card-index="${targetIdx}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        container.scrollTo({ top: 0, behavior: 'auto' });
      }

      const cardEls = Array.from(container.querySelectorAll<HTMLElement>('article[data-card-index]'));
      if (cardEls.length === 0) return;

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
            const idx = Number(bestEntry.target.getAttribute('data-card-index'));
            const item = feedItems[idx];
            if (!item) return;

            setActiveCardIndex(idx);
            if (item.kind === 'overview') {
              setReadingState((prev) =>
                prev.verse === 1 && prev.bookId === item.book.id && prev.chapter === 1
                  ? prev
                  : {
                      ...prev,
                      bookId: item.book.id,
                      bookName: item.book.name,
                      chapter: 1,
                      verse: 1,
                    },
              );
            } else {
              const activeCard = item.card;
              setReadingState((prev) =>
                prev.verse === activeCard.startVerse &&
                prev.bookId === activeCard.bookId &&
                prev.chapter === activeCard.chapter
                  ? prev
                  : {
                      ...prev,
                      bookId: activeCard.bookId,
                      bookName: activeCard.bookName,
                      chapter: activeCard.chapter,
                      verse: activeCard.startVerse,
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

      cardEls.forEach((el) => observer?.observe(el));
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [cards, chapterError, feedItems, isLoadingChapter]);

  // Passive 1.5s dwell-time read tracking & daily streak update (verse cards only, excludes overview cards)
  useEffect(() => {
    if (
      isLoadingChapter ||
      Boolean(chapterError) ||
      isMenuOpen ||
      isBooksOpen ||
      isSearchOpen ||
      isBookmarksOpen ||
      isNotesOpen ||
      isSettingsOpen ||
      isTranslationPickerOpen ||
      isStatsOpen ||
      Boolean(noteModalTarget) ||
      !isDocumentVisible
    ) {
      return;
    }

    const activeItem = feedItems[activeCardIndex];
    if (!activeItem || activeItem.kind !== 'verse') return;
    const activeCard = activeItem.card;

    const timer = window.setTimeout(() => {
      const cardVerseIds = activeCard.verses.map((v) =>
        makeReadVerseId(v.bookId, v.chapter, v.verse),
      );
      const existingReads = readVersesMapRef.current;
      const newlyReadIds = cardVerseIds.filter((id) => !existingReads[id]);

      if (newlyReadIds.length > 0) {
        const updatedReads: Record<string, boolean> = { ...existingReads };
        for (const id of newlyReadIds) {
          updatedReads[id] = true;
        }
        setReadVersesMap(updatedReads);
        saveGuestReadVerses(updatedReads);

        if (user) {
          void markBookVersesReadInCloud(
            user.uid,
            activeCard.bookId,
            newlyReadIds,
            readingStateRef.current,
          ).catch((err) => {
            setCloudError(err instanceof Error ? err : new Error(String(err)));
          });
        }
      }

      const { next: nextStreak, changed: streakChanged } = applyReadTodayToStreak(
        streakStatsRef.current,
      );
      if (streakChanged) {
        setStreakStats(nextStreak);
        saveGuestStreak(nextStreak);
        if (user) {
          void updateCloudStreak(user.uid, nextStreak, readingStateRef.current).catch((err) => {
            setCloudError(err instanceof Error ? err : new Error(String(err)));
          });
        }
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [
    activeCardIndex,
    chapterError,
    feedItems,
    isBookmarksOpen,
    isBooksOpen,
    isDocumentVisible,
    isLoadingChapter,
    isMenuOpen,
    isNotesOpen,
    isSearchOpen,
    isSettingsOpen,
    isStatsOpen,
    isTranslationPickerOpen,
    noteModalTarget,
    user,
  ]);

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
    (
      bookId: string,
      chapter: number,
      verse = 1,
      options?: { recordHistory?: boolean; skipOverview?: boolean },
    ) => {
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

      // Same-chapter jump: scroll directly without waiting for chapter fetch effect
      if (
        cur.bookId === book.id &&
        cur.chapter === safeChapter &&
        !isLoadingChapter &&
        !chapterError &&
        feedItems.length > 0
      ) {
        const container = feedRef.current;
        const hasOverview = feedItems[0]?.kind === 'overview';
        const overviewOffset = hasOverview ? 1 : 0;
        let targetIdx = 0;

        if (verse === -1) {
          targetIdx = feedItems.length - 1;
        } else if (hasOverview && !options?.skipOverview && verse <= 1) {
          targetIdx = 0;
        } else {
          const verseIdx = Math.max(
            0,
            cards.findIndex((c) => verse >= c.startVerse && verse <= c.endVerse),
          );
          targetIdx = overviewOffset + verseIdx;
        }

        const targetEl = container?.querySelector<HTMLElement>(
          `[data-card-index="${targetIdx}"]`,
        );
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setActiveCardIndex(targetIdx);
        return;
      }

      pendingTargetVerseRef.current = verse;
      pendingSkipOverviewRef.current = Boolean(options?.skipOverview);
      setReadingState((prev) => ({
        ...prev,
        bookId: book.id,
        bookName: book.name,
        chapter: safeChapter,
        verse: verse === -1 ? 1 : verse,
      }));
    },
    [cards, chapterError, feedItems, isLoadingChapter],
  );

  const handleGoBackToPreviousLocation = useCallback(() => {
    const target = jumpHistory[jumpHistory.length - 1];
    if (!target) return;
    setJumpHistory((prev) => prev.slice(0, -1));
    navigateToLocation(target.bookId, target.chapter, target.verse, {
      recordHistory: false,
      skipOverview: true,
    });
    showToast(`Returned to ${target.bookName} ${target.chapter}:${target.verse}`);
  }, [jumpHistory, navigateToLocation, showToast]);

  const handleReturnFromSearch = useCallback(() => {
    if (!searchReturnSpot) return;
    const spot = searchReturnSpot;
    if (searchReturnTimerRef.current !== null) {
      window.clearTimeout(searchReturnTimerRef.current);
      searchReturnTimerRef.current = null;
    }
    setSearchReturnSpot(null);
    navigateToLocation(spot.bookId, spot.chapter, spot.verse, {
      recordHistory: false,
      skipOverview: true,
    });
  }, [navigateToLocation, searchReturnSpot]);

  const handleSelectChapterFromDrawer = useCallback(
    (book: BibleBook, chapter: number) => {
      navigateToLocation(book.id, chapter, 1, { skipOverview: false });
      setIsBooksOpen(false);
    },
    [navigateToLocation],
  );

  const handleSelectBookFromScrubber = useCallback(
    (book: BibleBook) => {
      navigateToLocation(book.id, 1, 1, { skipOverview: false });
      showToast(`${book.name} 1`);
    },
    [navigateToLocation, showToast],
  );

  const handleJumpFromOverview = useCallback(
    (bookId: string, chapter: number, verse: number) => {
      navigateToLocation(bookId, chapter, verse, { skipOverview: true });
    },
    [navigateToLocation],
  );

  const handleSelectSearchResult = useCallback(
    (target: { bookId: string; chapter: number; verse: number }) => {
      const cur = readingStateRef.current;
      const isDifferentSpot =
        cur.bookId !== target.bookId ||
        cur.chapter !== target.chapter ||
        cur.verse !== target.verse;

      setIsSearchOpen(false);

      if (isDifferentSpot) {
        setSearchReturnSpot({
          bookId: cur.bookId,
          bookName: cur.bookName,
          chapter: cur.chapter,
          verse: cur.verse,
        });
        if (searchReturnTimerRef.current !== null) {
          window.clearTimeout(searchReturnTimerRef.current);
        }
        searchReturnTimerRef.current = window.setTimeout(() => {
          setSearchReturnSpot(null);
          searchReturnTimerRef.current = null;
        }, 10_000);
      }

      navigateToLocation(target.bookId, target.chapter, target.verse, {
        recordHistory: false,
        skipOverview: true,
      });
    },
    [navigateToLocation],
  );

  const previousChapter = useMemo(
    () => getPreviousChapterLocation(readingState.bookId, readingState.chapter),
    [readingState.bookId, readingState.chapter],
  );

  const nextChapter = useMemo(
    () => getNextChapterLocation(readingState.bookId, readingState.chapter),
    [readingState.bookId, readingState.chapter],
  );

  const goToPreviousChapterAtEnd = useCallback(() => {
    if (!previousChapter) return;
    const isBookBoundary = previousChapter.bookId !== readingStateRef.current.bookId;
    navigateToLocation(previousChapter.bookId, previousChapter.chapter, -1, {
      recordHistory: false,
    });
    if (isBookBoundary) {
      showToast(`${previousChapter.bookName} ${previousChapter.chapter}`);
    }
  }, [navigateToLocation, previousChapter, showToast]);

  const goToNextChapterAtStart = useCallback(() => {
    if (!nextChapter) return;
    const isBookBoundary = nextChapter.bookId !== readingStateRef.current.bookId;
    navigateToLocation(nextChapter.bookId, nextChapter.chapter, 1, {
      recordHistory: false,
    });
    if (isBookBoundary) {
      showToast(`${nextChapter.bookName} ${nextChapter.chapter}`);
    }
  }, [navigateToLocation, nextChapter, showToast]);

  const stepCard = useCallback(
    (delta: -1 | 1) => {
      const container = feedRef.current;
      if (!container || feedItems.length === 0) return;

      if (delta === -1 && activeCardIndex <= 0) {
        goToPreviousChapterAtEnd();
        return;
      }

      if (delta === 1 && activeCardIndex >= feedItems.length - 1) {
        goToNextChapterAtStart();
        return;
      }

      const nextIndex = Math.max(0, Math.min(feedItems.length - 1, activeCardIndex + delta));
      if (nextIndex === activeCardIndex) return;
      const targetEl = container.querySelector<HTMLElement>(`[data-card-index="${nextIndex}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [activeCardIndex, feedItems.length, goToNextChapterAtStart, goToPreviousChapterAtEnd],
  );

  const handleFeedTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (
        e.touches.length !== 1 ||
        isMenuOpen ||
        isBooksOpen ||
        isSearchOpen ||
        isBookmarksOpen ||
        isNotesOpen ||
        isSettingsOpen ||
        isTranslationPickerOpen ||
        isStatsOpen ||
        Boolean(noteModalTarget) ||
        isLoadingChapter ||
        Boolean(chapterError) ||
        feedItems.length === 0
      ) {
        touchGestureRef.current = null;
        return;
      }

      const container = feedRef.current;
      if (!container) return;

      const touch = e.touches[0];
      const targetEl = e.target as HTMLElement | null;
      const scrollableTarget = targetEl?.closest<HTMLElement>('[data-verse-scrollable="true"]') ?? null;
      const now = Date.now();
      const cardHeight = container.clientHeight || window.innerHeight || 1;
      const startIndex = Math.max(
        0,
        Math.min(feedItems.length - 1, Math.round(container.scrollTop / cardHeight)),
      );

      touchGestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        startTime: now,
        lastMoveTime: now,
        startScrollTop: container.scrollTop,
        startIndex,
        scrollableTarget,
        startInnerScrollTop: scrollableTarget?.scrollTop ?? 0,
      };
    },
    [
      chapterError,
      feedItems.length,
      isBookmarksOpen,
      isBooksOpen,
      isLoadingChapter,
      isMenuOpen,
      isNotesOpen,
      isSearchOpen,
      isSettingsOpen,
      isStatsOpen,
      isTranslationPickerOpen,
      noteModalTarget,
    ],
  );

  const handleFeedTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) {
      touchGestureRef.current = null;
      return;
    }
    const gesture = touchGestureRef.current;
    if (!gesture) return;
    const touch = e.touches[0];
    gesture.lastX = touch.clientX;
    gesture.lastY = touch.clientY;
    gesture.lastMoveTime = Date.now();
  }, []);

  const handleFeedTouchEnd = useCallback(() => {
    const gesture = touchGestureRef.current;
    touchGestureRef.current = null;
    const container = feedRef.current;
    if (!gesture || !container || feedItems.length === 0) return;

    const now = Date.now();
    const deltaY = gesture.lastY - gesture.startY;
    const deltaX = Math.abs(gesture.lastX - gesture.startX);
    const absY = Math.abs(deltaY);

    if (absY < 20 || absY <= deltaX * 1.15) return;
    if (now - gesture.lastMoveTime > 200) return;

    const inner = gesture.scrollableTarget;
    if (inner) {
      if (deltaY > 0 && gesture.startInnerScrollTop > 2) return;
      if (
        deltaY < 0 &&
        gesture.startInnerScrollTop + inner.clientHeight < inner.scrollHeight - 2
      ) {
        return;
      }
    }

    const totalMs = Math.max(1, now - gesture.startTime);
    const velocity = absY / totalMs;
    const isIntentionalSwipe = absY >= 32 || (absY >= 20 && velocity >= 0.18);
    if (!isIntentionalSwipe) return;

    const direction: -1 | 1 = deltaY > 0 ? -1 : 1;
    const isAtFirstCard =
      gesture.startIndex <= 0 || (activeCardIndex <= 0 && gesture.startScrollTop <= 2);
    const isAtLastCard =
      gesture.startIndex >= feedItems.length - 1 ||
      (activeCardIndex >= feedItems.length - 1 &&
        gesture.startScrollTop + container.clientHeight >= container.scrollHeight - 2);

    if (direction === -1 && isAtFirstCard) {
      if (previousChapter && now - boundaryTransitionAtRef.current >= 450) {
        boundaryTransitionAtRef.current = now;
        goToPreviousChapterAtEnd();
      }
      return;
    }

    if (direction === 1 && isAtLastCard) {
      if (nextChapter && now - boundaryTransitionAtRef.current >= 450) {
        boundaryTransitionAtRef.current = now;
        goToNextChapterAtStart();
      }
      return;
    }

    const targetIndex = gesture.startIndex + direction;
    if (targetIndex < 0 || targetIndex >= feedItems.length) return;

    requestAnimationFrame(() => {
      const currentContainer = feedRef.current;
      if (!currentContainer) return;
      const cardHeight = currentContainer.clientHeight || window.innerHeight || 1;
      if (Math.abs(currentContainer.scrollTop - gesture.startScrollTop) >= cardHeight * 0.85) {
        return;
      }
      const targetEl = currentContainer.querySelector<HTMLElement>(
        `[data-card-index="${targetIndex}"]`,
      );
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [
    activeCardIndex,
    feedItems.length,
    goToNextChapterAtStart,
    goToPreviousChapterAtEnd,
    nextChapter,
    previousChapter,
  ]);

  const handleFeedTouchCancel = useCallback(() => {
    touchGestureRef.current = null;
  }, []);

  const handleFeedWheel = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      if (
        isMenuOpen ||
        isBooksOpen ||
        isSearchOpen ||
        isBookmarksOpen ||
        isNotesOpen ||
        isSettingsOpen ||
        isTranslationPickerOpen ||
        isStatsOpen ||
        Boolean(noteModalTarget) ||
        isLoadingChapter ||
        Boolean(chapterError) ||
        feedItems.length === 0
      ) {
        return;
      }

      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || Math.abs(e.deltaY) < 8) {
        return;
      }

      const container = feedRef.current;
      if (!container) return;

      const now = Date.now();
      if (
        now - boundaryTransitionAtRef.current < 600 ||
        now - lastCardSettledAtRef.current < 320
      ) {
        wheelBoundaryAccumRef.current = { deltaY: 0, lastEventAt: now };
        return;
      }

      const targetEl = e.target as HTMLElement | null;
      const inner = targetEl?.closest<HTMLElement>('[data-verse-scrollable="true"]') ?? null;
      if (inner) {
        if (e.deltaY < 0 && inner.scrollTop > 2) return;
        if (
          e.deltaY > 0 &&
          inner.scrollTop + inner.clientHeight < inner.scrollHeight - 2
        ) {
          return;
        }
      }

      const atTopBoundary = activeCardIndex <= 0 && container.scrollTop <= 2;
      const atBottomBoundary =
        activeCardIndex >= feedItems.length - 1 &&
        container.scrollTop + container.clientHeight >= container.scrollHeight - 2;

      if (e.deltaY < 0 && atTopBoundary && previousChapter) {
        const prevAccum = wheelBoundaryAccumRef.current;
        const nextAccum =
          now - prevAccum.lastEventAt <= 220 && prevAccum.deltaY < 0
            ? prevAccum.deltaY + e.deltaY
            : e.deltaY;
        wheelBoundaryAccumRef.current = { deltaY: nextAccum, lastEventAt: now };

        if (nextAccum <= -48) {
          wheelBoundaryAccumRef.current = { deltaY: 0, lastEventAt: now };
          boundaryTransitionAtRef.current = now;
          goToPreviousChapterAtEnd();
        }
        return;
      }

      if (e.deltaY > 0 && atBottomBoundary && nextChapter) {
        const prevAccum = wheelBoundaryAccumRef.current;
        const nextAccum =
          now - prevAccum.lastEventAt <= 220 && prevAccum.deltaY > 0
            ? prevAccum.deltaY + e.deltaY
            : e.deltaY;
        wheelBoundaryAccumRef.current = { deltaY: nextAccum, lastEventAt: now };

        if (nextAccum >= 48) {
          wheelBoundaryAccumRef.current = { deltaY: 0, lastEventAt: now };
          boundaryTransitionAtRef.current = now;
          goToNextChapterAtStart();
        }
        return;
      }

      wheelBoundaryAccumRef.current = { deltaY: 0, lastEventAt: now };
    },
    [
      activeCardIndex,
      chapterError,
      feedItems.length,
      goToNextChapterAtStart,
      goToPreviousChapterAtEnd,
      isBookmarksOpen,
      isBooksOpen,
      isLoadingChapter,
      isMenuOpen,
      isNotesOpen,
      isSearchOpen,
      isSettingsOpen,
      isStatsOpen,
      isTranslationPickerOpen,
      nextChapter,
      noteModalTarget,
      previousChapter,
    ],
  );

  // Keyboard arrow, search shortcut (/ or Cmd/Ctrl+K) & Escape support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTranslationPickerOpen) {
        e.preventDefault();
        setIsTranslationPickerOpen(false);
        return;
      }
      if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault();
        setIsSearchOpen(false);
        return;
      }
      if (e.key === 'Escape' && isMenuOpen) {
        e.preventDefault();
        setIsMenuOpen(false);
        return;
      }
      if (e.key === 'Escape' && isNotesOpen && !noteModalTarget) {
        e.preventDefault();
        setIsNotesOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsMenuOpen(false);
        setIsTranslationPickerOpen(false);
        setIsSearchOpen(true);
        return;
      }
      if (
        isMenuOpen ||
        isBooksOpen ||
        isSearchOpen ||
        isBookmarksOpen ||
        isNotesOpen ||
        isSettingsOpen ||
        isTranslationPickerOpen ||
        isStatsOpen ||
        Boolean(noteModalTarget)
      ) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        stepCard(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        stepCard(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isMenuOpen,
    isBooksOpen,
    isSearchOpen,
    isBookmarksOpen,
    isNotesOpen,
    isSettingsOpen,
    isTranslationPickerOpen,
    isStatsOpen,
    noteModalTarget,
    stepCard,
  ]);

  const handleToggleLike = useCallback(
    (card: VerseCardItem) => {
      const matchingKeys = card.verses
        .map((v) => makeVerseKey(v.bookId, v.chapter, v.verse))
        .filter((k) => Boolean(likesMap[k]));
      const nextLiked = matchingKeys.length === 0;
      const newRecord = cardToSavedRecord(card);

      setLikesMap((prev) => {
        const next = { ...prev };
        if (nextLiked) {
          next[newRecord.verseKey] = newRecord;
        } else {
          for (const k of matchingKeys) {
            delete next[k];
          }
        }
        if (!user) {
          saveGuestLikes(next);
        }
        return next;
      });

      if (user) {
        if (nextLiked) {
          void toggleCloudSavedRecord(
            user.uid,
            'likes',
            newRecord,
            true,
            readingStateRef.current,
          ).catch((err) => {
            setCloudError(err instanceof Error ? err : new Error(String(err)));
          });
        } else {
          for (const k of matchingKeys) {
            const existingRec = likesMap[k];
            if (existingRec) {
              void toggleCloudSavedRecord(
                user.uid,
                'likes',
                existingRec,
                false,
                readingStateRef.current,
              ).catch((err) => {
                setCloudError(err instanceof Error ? err : new Error(String(err)));
              });
            }
          }
        }
      }
    },
    [likesMap, user],
  );

  const handleToggleBookmark = useCallback(
    (card: VerseCardItem) => {
      const matchingKeys = card.verses
        .map((v) => makeVerseKey(v.bookId, v.chapter, v.verse))
        .filter((k) => Boolean(bookmarksMap[k]));
      const nextBookmarked = matchingKeys.length === 0;
      const newRecord = cardToSavedRecord(card);

      setBookmarksMap((prev) => {
        const next = { ...prev };
        if (nextBookmarked) {
          next[newRecord.verseKey] = newRecord;
        } else {
          for (const k of matchingKeys) {
            delete next[k];
          }
        }
        if (!user) {
          saveGuestBookmarks(next);
        }
        return next;
      });

      showToast(nextBookmarked ? `Bookmarked ${card.reference}` : `Removed bookmark`);

      if (user) {
        if (nextBookmarked) {
          void toggleCloudSavedRecord(
            user.uid,
            'bookmarks',
            newRecord,
            true,
            readingStateRef.current,
          ).catch((err) => {
            setCloudError(err instanceof Error ? err : new Error(String(err)));
          });
        } else {
          for (const k of matchingKeys) {
            const existingRec = bookmarksMap[k];
            if (existingRec) {
              void toggleCloudSavedRecord(
                user.uid,
                'bookmarks',
                existingRec,
                false,
                readingStateRef.current,
              ).catch((err) => {
                setCloudError(err instanceof Error ? err : new Error(String(err)));
              });
            }
          }
        }
      }
    },
    [bookmarksMap, showToast, user],
  );

  const copyCardText = useCallback(
    async (card: VerseCardItem, customToast?: string) => {
      const formatted = `"${card.combinedText}" — ${card.reference} (${card.translation})`;

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
        setCopiedCardId(card.id);
        showToast(customToast ?? `Copied ${card.reference}`);
      } catch {
        showToast('Unable to copy to clipboard');
      }
    },
    [showToast],
  );

  const handleShare = useCallback(
    async (card: VerseCardItem) => {
      const formatted = `"${card.combinedText}" — ${card.reference} (${card.translation})`;
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `${card.reference} (${card.translation})`,
            text: formatted,
          });
          return;
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
        }
      }
      await copyCardText(card, `Copied ${card.reference} to share`);
    },
    [copyCardText],
  );

  const handleChangeTranslation = useCallback(
    (nextTranslation: TranslationCode) => {
      if (nextTranslation === readingState.translation) return;
      pendingTargetVerseRef.current = readingState.verse;
      pendingSkipOverviewRef.current = !isOnOverviewCard;
      setReadingState((prev) => ({
        ...prev,
        translation: nextTranslation,
      }));
      showToast(`Switched to ${TRANSLATION_NAMES[nextTranslation]}`);
    },
    [isOnOverviewCard, readingState.translation, readingState.verse, showToast],
  );

  const handleSaveApiBibleKey = useCallback(
    async (nextKey: string): Promise<SaveApiBibleKeyResult> => {
      const cleaned = sanitizeApiBibleKey(nextKey);

      if (!cleaned) {
        setApiBibleKey('');
        saveGuestApiBibleKey('');
        clearCachedApiBibleIds();
        setResolvedApiBibleIds(null);

        if (user) {
          void updateCloudApiBibleKey(user.uid, '', readingStateRef.current).catch((err) => {
            setCloudError(err instanceof Error ? err : new Error(String(err)));
          });
        }
        return { ok: true };
      }

      try {
        const ids = await resolveApiBibleIds(cleaned, { forceRefresh: true });
        setApiBibleKey(cleaned);
        saveGuestApiBibleKey(cleaned);
        setResolvedApiBibleIds(ids);

        if (user) {
          void updateCloudApiBibleKey(user.uid, cleaned, readingStateRef.current).catch((err) => {
            setCloudError(err instanceof Error ? err : new Error(String(err)));
          });
        }

        if (isApiBibleTranslation(readingStateRef.current.translation)) {
          setReloadNonce((n) => n + 1);
        }

        showToast('API.Bible key saved');
        return { ok: true, resolvedIds: ids };
      } catch (err) {
        if (err instanceof ApiBibleAuthError) {
          return { ok: false, error: err.message };
        }

        // Offline or transient network issue: save key locally & to cloud so user doesn't lose it
        setApiBibleKey(cleaned);
        saveGuestApiBibleKey(cleaned);
        setResolvedApiBibleIds(getCachedApiBibleIds(cleaned));

        if (user) {
          void updateCloudApiBibleKey(user.uid, cleaned, readingStateRef.current).catch((e) => {
            setCloudError(e instanceof Error ? e : new Error(String(e)));
          });
        }

        return {
          ok: true,
          warning: 'Key saved. Bible IDs will resolve automatically once connected.',
        };
      }
    },
    [showToast, user],
  );

  const handleToggleSmartGrouping = useCallback(() => {
    pendingTargetVerseRef.current = readingState.verse;
    pendingSkipOverviewRef.current = !isOnOverviewCard;
    const nextGrouping = !readingState.smartGrouping;
    setReadingState((prev) => ({
      ...prev,
      smartGrouping: nextGrouping,
    }));
    showToast(
      nextGrouping ? 'Smart Verse Grouping enabled' : 'Single-verse cards enabled',
    );
  }, [isOnOverviewCard, readingState.smartGrouping, readingState.verse, showToast]);

  const handleChangeTextSize = useCallback((nextSize: TextSizeOption) => {
    setReadingState((prev) =>
      prev.textSize === nextSize
        ? prev
        : {
            ...prev,
            textSize: nextSize,
          },
    );
  }, []);

  const handleChangeFontFamily = useCallback((nextFont: FontFamilyOption) => {
    setReadingState((prev) =>
      prev.fontFamily === nextFont
        ? prev
        : {
            ...prev,
            fontFamily: nextFont,
          },
    );
  }, []);

  const handleToggleRedLetter = useCallback(() => {
    setReadingState((prev) => ({
      ...prev,
      redLetter: !prev.redLetter,
    }));
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    const outcome = await signInWithGoogleSmart();
    setAuthLoading(false);

    if (outcome.status === 'signed_in') {
      showToast('Signed in — syncing reading stats & bookmarks');
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
    (record: { bookId: string; chapter: number; verse: number }) => {
      navigateToLocation(record.bookId, record.chapter, record.verse, { skipOverview: true });
      setIsBookmarksOpen(false);
      setIsNotesOpen(false);
    },
    [navigateToLocation],
  );

  const handleRemoveSaved = useCallback(
    (kind: 'bookmarks' | 'likes', record: SavedVerseRecord) => {
      if (kind === 'bookmarks') {
        setBookmarksMap((prev) => {
          const next = { ...prev };
          delete next[record.verseKey];
          if (!user) saveGuestBookmarks(next);
          return next;
        });
        showToast('Removed bookmark');
      } else {
        setLikesMap((prev) => {
          const next = { ...prev };
          delete next[record.verseKey];
          if (!user) saveGuestLikes(next);
          return next;
        });
      }

      if (user) {
        void toggleCloudSavedRecord(
          user.uid,
          kind,
          record,
          false,
          readingStateRef.current,
        ).catch((err) => {
          setCloudError(err instanceof Error ? err : new Error(String(err)));
        });
      }
    },
    [showToast, user],
  );

  const findNoteForCard = useCallback(
    (card: VerseCardItem): VerseNoteRecord | undefined => {
      for (const v of card.verses) {
        const key = makeVerseKey(v.bookId, v.chapter, v.verse);
        if (notesMap[key]) return notesMap[key];
      }
      return undefined;
    },
    [notesMap],
  );

  const handleOpenNoteForCard = useCallback(
    (card: VerseCardItem) => {
      setNoteModalTarget({
        card,
        existing: findNoteForCard(card),
      });
    },
    [findNoteForCard],
  );

  const handleSaveNote = useCallback(
    (noteKind: NoteKind, noteText: string) => {
      if (!noteModalTarget) return;
      const record = buildVerseNoteRecord({
        card: noteModalTarget.card,
        existing: noteModalTarget.existing,
        noteKind,
        noteText,
      });

      setNotesMap((prev) => {
        const next = { ...prev, [record.verseKey]: record };
        if (!user) saveGuestNotes(next);
        return next;
      });

      setNoteModalTarget(null);
      showToast(
        noteKind === 'prayer'
          ? `Saved prayer for ${record.reference}`
          : `Saved note for ${record.reference}`,
      );

      if (user) {
        void saveCloudVerseNote(user.uid, record, readingStateRef.current).catch((err) => {
          setCloudError(err instanceof Error ? err : new Error(String(err)));
        });
      }
    },
    [noteModalTarget, showToast, user],
  );

  const handleDeleteNote = useCallback(
    (verseKey: string) => {
      setNotesMap((prev) => {
        const next = { ...prev };
        delete next[verseKey];
        if (!user) saveGuestNotes(next);
        return next;
      });

      setNoteModalTarget((prev) => (prev?.existing?.verseKey === verseKey ? null : prev));
      showToast('Deleted note');

      if (user) {
        void deleteCloudVerseNote(user.uid, verseKey).catch((err) => {
          setCloudError(err instanceof Error ? err : new Error(String(err)));
        });
      }
    },
    [showToast, user],
  );

  const handleNextChapter = useCallback(() => {
    goToNextChapterAtStart();
  }, [goToNextChapterAtStart]);

  const sortedBookmarks = useMemo(
    () => Object.values(bookmarksMap).sort((a, b) => b.createdAtMs - a.createdAtMs),
    [bookmarksMap],
  );
  const sortedLikes = useMemo(
    () => Object.values(likesMap).sort((a, b) => b.createdAtMs - a.createdAtMs),
    [likesMap],
  );
  const sortedNotes = useMemo(
    () => Object.values(notesMap).sort((a, b) => b.updatedAtMs - a.updatedAtMs),
    [notesMap],
  );

  const readStats = useMemo(
    () => computeBibleReadStats(readVersesMap, readingState.translation),
    [readVersesMap, readingState.translation],
  );

  const totalCards = cards.length;
  const progressPercent =
    activeVerseCardIndex >= 0 && totalCards > 0
      ? Math.min(100, ((activeVerseCardIndex + 1) / totalCards) * 100)
      : 0;

  const bibleProgress = useMemo(
    () =>
      getBibleProgressStats(
        readingState.bookId,
        readingState.chapter,
        activeVerseCardIndex,
        totalCards,
      ),
    [readingState.bookId, readingState.chapter, activeVerseCardIndex, totalCards],
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
      {/* Top Bar: Books (left), BIBLE REEL (center), 3-line Menu (right) */}
      <header
        style={{
          backgroundColor: `${sectionTheme.topColor}D9`,
          transition: 'background-color 700ms ease',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          height: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        }}
        className={`fixed top-0 left-0 right-0 ${
          isMenuOpen ? 'z-40' : 'z-30'
        } px-3 sm:px-6 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between gap-4`}
      >
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen(false);
            setIsBooksOpen(true);
          }}
          aria-label="Open books and chapters menu"
          className="min-h-[44px] px-2.5 sm:px-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-medium text-[#F5F2EA] hover:bg-white/5 transition-colors whitespace-nowrap shrink-0"
        >
          <BookOpen className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
          <span>Books</span>
        </button>

        <h1 className="text-xs sm:text-sm font-semibold tracking-[0.22em] text-[#F5F2EA] whitespace-nowrap shrink-0">
          BIBLE REEL
        </h1>

        <div className="relative flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              aria-label="Main menu"
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-2xl bg-[#141917]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-1.5 flex flex-col gap-0.5"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSearchOpen(true);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-[#F5F2EA] hover:bg-white/[0.06] transition-colors whitespace-nowrap"
              >
                <Search className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
                <span>Search Scripture</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsStatsOpen(true);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-[#F5F2EA] hover:bg-white/[0.06] transition-colors whitespace-nowrap"
              >
                <BarChart3 className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
                <span>Stats</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsBookmarksOpen(true);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between gap-3 text-sm font-medium text-[#F5F2EA] hover:bg-white/[0.06] transition-colors whitespace-nowrap"
              >
                <span className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
                  <span>Bookmarks</span>
                </span>
                {sortedBookmarks.length > 0 && (
                  <span className="text-xs text-[#9CA8A2] tabular-nums">
                    {sortedBookmarks.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsNotesOpen(true);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-[#F5F2EA] hover:bg-white/[0.06] transition-colors whitespace-nowrap"
              >
                <NotebookPen className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
                <span>Notes</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSettingsOpen(true);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-[#F5F2EA] hover:bg-white/[0.06] transition-colors whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-[#D4AF37]" aria-hidden="true" />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {isMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-30"
        />
      )}

      {/* Left-Edge 66-Book Wave Scrubber */}
      <WaveBookScrubber
        currentBookId={readingState.bookId}
        onSelectBook={handleSelectBookFromScrubber}
      />

      {/* Right-Edge Floating Up/Down Chevrons */}
      {!isLoadingChapter && !chapterError && feedItems.length > 0 && (
        <div
          aria-label="Verse navigation controls"
          className="fixed right-2.5 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2"
        >
          <button
            type="button"
            onClick={() => stepCard(-1)}
            disabled={activeCardIndex <= 0 && !previousChapter}
            aria-label={
              activeCardIndex <= 0 && previousChapter
                ? `Go to previous chapter (${previousChapter.bookName} ${previousChapter.chapter})`
                : 'Previous card'
            }
            title={
              activeCardIndex <= 0 && previousChapter
                ? `Previous: ${previousChapter.bookName} ${previousChapter.chapter}`
                : 'Previous card'
            }
            className="min-h-[44px] min-w-[44px] rounded-full bg-[#161B19]/80 backdrop-blur-md border border-[#D4AF37]/25 text-[#F5F2EA] hover:border-[#D4AF37] flex items-center justify-center transition-colors disabled:opacity-25 disabled:pointer-events-none active:scale-[0.94]"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <span className="text-[11px] font-medium text-[#9CA8A2] tabular-nums py-0.5">
            {isOnOverviewCard ? 'Intro' : `${activeVerseCardIndex + 1}/${totalCards}`}
          </span>

          <button
            type="button"
            onClick={() => stepCard(1)}
            disabled={activeCardIndex >= feedItems.length - 1 && !nextChapter}
            aria-label={
              activeCardIndex >= feedItems.length - 1 && nextChapter
                ? `Go to next chapter (${nextChapter.bookName} ${nextChapter.chapter})`
                : 'Next card'
            }
            title={
              activeCardIndex >= feedItems.length - 1 && nextChapter
                ? `Next: ${nextChapter.bookName} ${nextChapter.chapter}`
                : 'Next card'
            }
            className="min-h-[44px] min-w-[44px] rounded-full bg-[#161B19]/80 backdrop-blur-md border border-[#D4AF37]/25 text-[#F5F2EA] hover:border-[#D4AF37] flex items-center justify-center transition-colors disabled:opacity-25 disabled:pointer-events-none active:scale-[0.94]"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 10-second Floating Return Pill after jumping from Search */}
      {searchReturnSpot ? (
        <button
          type="button"
          onClick={handleReturnFromSearch}
          aria-label={`Back to ${searchReturnSpot.bookName} ${searchReturnSpot.chapter}:${searchReturnSpot.verse}`}
          className="fixed bottom-14 left-1/2 -translate-x-1/2 z-30 min-h-[40px] px-4 py-2 rounded-full bg-[#161B19]/95 backdrop-blur-md border border-[#D4AF37]/45 text-xs font-medium text-[#F5F2EA] hover:border-[#D4AF37] shadow-xl flex items-center gap-2 transition-colors active:scale-[0.97]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden="true" />
          <span className="whitespace-nowrap tabular-nums">
            Back to {searchReturnSpot.bookName} {searchReturnSpot.chapter}:
            {searchReturnSpot.verse}
          </span>
        </button>
      ) : (
        jumpHistory.length > 0 && (
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
        )
      )}

      {/* Main Full-Screen Snap Feed */}
      <main
        ref={feedRef}
        onTouchStart={handleFeedTouchStart}
        onTouchMove={handleFeedTouchMove}
        onTouchEnd={handleFeedTouchEnd}
        onTouchCancel={handleFeedTouchCancel}
        onWheel={handleFeedWheel}
        className="relative h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain touch-pan-y no-scrollbar"
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
          feedItems.map((item, idx) => {
            if (item.kind === 'overview') {
              return (
                <BookOverviewCard
                  key={item.id}
                  book={item.book}
                  overview={item.overview}
                  cardIndex={idx}
                  onJumpToReference={handleJumpFromOverview}
                  onContinueToChapter={() => stepCard(1)}
                />
              );
            }

            const card = item.card;
            const isLiked = card.verses.some((v) =>
              Boolean(likesMap[makeVerseKey(v.bookId, v.chapter, v.verse)]),
            );
            const isBookmarked = card.verses.some((v) =>
              Boolean(bookmarksMap[makeVerseKey(v.bookId, v.chapter, v.verse)]),
            );
            const hasNote = Boolean(findNoteForCard(card));
            const isRead = card.verses.every((v) =>
              Boolean(readVersesMap[makeReadVerseId(v.bookId, v.chapter, v.verse)]),
            );

            const prevVerseCard =
              item.verseCardIndex > 0 ? cards[item.verseCardIndex - 1] : null;
            const prevCardLastVerse =
              prevVerseCard && prevVerseCard.verses.length > 0
                ? prevVerseCard.verses[prevVerseCard.verses.length - 1]
                : null;
            const prevCardLastVerseWasRedLetter =
              prevCardLastVerse !== null &&
              isRedLetterVerse(
                prevCardLastVerse.bookId,
                prevCardLastVerse.chapter,
                prevCardLastVerse.verse,
              );

            return (
              <VerseCard
                key={item.id}
                card={card}
                cardIndex={idx}
                textSize={readingState.textSize}
                fontFamily={readingState.fontFamily}
                redLetter={readingState.redLetter}
                prevCardLastVerseWasRedLetter={prevCardLastVerseWasRedLetter}
                isLiked={isLiked}
                isBookmarked={isBookmarked}
                hasNote={hasNote}
                isRead={isRead}
                isLastCardInChapter={item.verseCardIndex === cards.length - 1}
                nextChapterLabel={
                  nextChapter ? `${nextChapter.bookName} ${nextChapter.chapter}` : null
                }
                onToggleLike={handleToggleLike}
                onToggleBookmark={handleToggleBookmark}
                onOpenNote={handleOpenNoteForCard}
                onShare={handleShare}
                onCopy={copyCardText}
                onNextChapter={handleNextChapter}
                onOpenTranslationPicker={() => setIsTranslationPickerOpen(true)}
                isCopied={copiedCardId === card.id}
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
              {isOnOverviewCard
                ? ' · Overview'
                : totalCards > 0
                  ? ` · ${activeVerseCardIndex + 1}/${totalCards}`
                  : ''}
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
        translation={readingState.translation}
        readStats={readStats}
        onClose={() => setIsBooksOpen(false)}
        onSelectChapter={handleSelectChapterFromDrawer}
      />

      <SearchModal
        isOpen={isSearchOpen}
        translation={readingState.translation}
        apiBibleKey={apiBibleKey}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      <StatsModal
        isOpen={isStatsOpen}
        isSignedIn={Boolean(user)}
        streak={streakStats}
        readStats={readStats}
        onClose={() => setIsStatsOpen(false)}
        onSelectBook={(book) => navigateToLocation(book.id, 1, 1, { skipOverview: false })}
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

      <NotesModal
        isOpen={isNotesOpen}
        isSignedIn={Boolean(user)}
        notes={sortedNotes}
        onClose={() => setIsNotesOpen(false)}
        onJumpToVerse={handleJumpToSaved}
        onEditNote={(note) => {
          setNoteModalTarget({ existing: note });
        }}
        onDeleteNote={handleDeleteNote}
        onOpenSettings={() => {
          setIsNotesOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      <VerseNoteModal
        isOpen={Boolean(noteModalTarget)}
        isSignedIn={Boolean(user)}
        target={noteModalTarget}
        onClose={() => setNoteModalTarget(null)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />

      <TranslationPickerModal
        isOpen={isTranslationPickerOpen}
        translation={readingState.translation}
        apiBibleKey={apiBibleKey}
        resolvedApiBibleIds={resolvedApiBibleIds}
        onClose={() => setIsTranslationPickerOpen(false)}
        onSelectTranslation={handleChangeTranslation}
        onOpenApiKeySettings={(requestedTranslation) => {
          setIsTranslationPickerOpen(false);
          setSettingsFocusApiKey(true);
          setSettingsMissingKeyFor(requestedTranslation ?? null);
          setIsSettingsOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        translation={readingState.translation}
        smartGrouping={readingState.smartGrouping}
        textSize={readingState.textSize}
        fontFamily={readingState.fontFamily}
        redLetter={readingState.redLetter}
        apiBibleKey={apiBibleKey}
        resolvedApiBibleIds={resolvedApiBibleIds}
        focusApiKeyOnOpen={settingsFocusApiKey}
        initialMissingKeyFor={settingsMissingKeyFor}
        user={user}
        authLoading={authLoading}
        authError={authError}
        onClose={() => {
          setIsSettingsOpen(false);
          setSettingsFocusApiKey(false);
          setSettingsMissingKeyFor(null);
        }}
        onChangeTranslation={handleChangeTranslation}
        onToggleSmartGrouping={handleToggleSmartGrouping}
        onChangeTextSize={handleChangeTextSize}
        onChangeFontFamily={handleChangeFontFamily}
        onToggleRedLetter={handleToggleRedLetter}
        onSaveApiBibleKey={handleSaveApiBibleKey}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
