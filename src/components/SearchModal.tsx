import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import { getBookSectionTheme } from '../data/bookThemes';
import {
  fetchChapter,
  getAllOfflineCachedChapters,
  getCachedChapter,
  isApiBibleTranslation,
  type ChapterData,
  type TranslationCode,
} from '../services/scriptureApi';
import { searchApiBibleVerses } from '../services/apiBible';
import {
  ensureFullBibleSearchIndex,
  getCachedFullBibleIndex,
  parseBibleReference,
  searchFullBibleIndex,
  searchOfflineChapters,
  type VerseSearchResult,
} from '../services/scriptureSearch';

interface SearchModalProps {
  isOpen: boolean;
  translation: TranslationCode;
  apiBibleKey: string;
  onClose: () => void;
  onSelectResult: (target: { bookId: string; chapter: number; verse: number }) => void;
}

const QUICK_SUGGESTIONS = [
  'John 3:16',
  'Ps 23',
  'Rom 8:28',
  '1 Cor 13:4',
  'shepherd',
  'grace',
  'peace',
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedSnippet(text: string, query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return text;

  const phraseLower = trimmed.toLowerCase();
  const tokens = Array.from(
    new Set(
      trimmed
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2),
    ),
  );

  const patterns = phraseLower.includes(' ')
    ? [escapeRegExp(trimmed), ...tokens.map(escapeRegExp)]
    : [escapeRegExp(trimmed)];

  const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;
    const isMatch =
      part.toLowerCase() === phraseLower ||
      tokens.some((tok) => tok.toLowerCase() === part.toLowerCase());
    if (isMatch) {
      return (
        <mark
          key={idx}
          className="bg-[#D4AF37]/25 text-[#F5F2EA] rounded px-0.5 font-medium"
        >
          {part}
        </mark>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

export function SearchModal({
  isOpen,
  translation,
  apiBibleKey,
  onClose,
  onSelectResult,
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [cachedChapters, setCachedChapters] = useState<ChapterData[]>([]);
  const [isLoadingFullIndex, setIsLoadingFullIndex] = useState(false);
  const [fullIndexError, setFullIndexError] = useState(false);
  const [fullIndexVersion, setFullIndexVersion] = useState(0);
  const [apiBibleSearchState, setApiBibleSearchState] = useState<{
    query: string;
    translation: TranslationCode;
    results: VerseSearchResult[];
    totalMatches: number;
  } | null>(null);
  const [refPreviewText, setRefPreviewText] = useState<string | null>(null);
  const [isLoadingRefPreview, setIsLoadingRefPreview] = useState(false);

  const isApiBible = isApiBibleTranslation(translation);

  // Focus input & load offline cached chapters when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    void getAllOfflineCachedChapters(translation).then((chapters) => {
      if (!cancelled) {
        setCachedChapters(chapters);
      }
    });

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 40);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, translation]);

  // Reset search state when translation changes
  useEffect(() => {
    setFullIndexError(false);
    setApiBibleSearchState(null);
  }, [translation]);

  const parsedReference = useMemo(() => parseBibleReference(query), [query]);

  // Load preview verse text when direct reference is detected
  useEffect(() => {
    if (!isOpen || !parsedReference) {
      setRefPreviewText(null);
      setIsLoadingRefPreview(false);
      return;
    }

    const { book, chapter, verse } = parsedReference;
    const memCached = getCachedChapter(translation, book.id, chapter);
    if (memCached) {
      const found = memCached.verses.find((v) => v.verse === verse) ?? memCached.verses[0];
      setRefPreviewText(found ? found.text : null);
      setIsLoadingRefPreview(false);
      return;
    }

    if (isApiBible && !apiBibleKey.trim()) {
      setRefPreviewText(null);
      setIsLoadingRefPreview(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingRefPreview(true);
    setRefPreviewText(null);

    const timer = window.setTimeout(() => {
      fetchChapter({
        translation,
        bookId: book.id,
        chapter,
        apiKey: apiBibleKey,
        signal: controller.signal,
      })
        .then((data) => {
          if (controller.signal.aborted) return;
          const found = data.verses.find((v) => v.verse === verse) ?? data.verses[0];
          setRefPreviewText(found ? found.text : null);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setRefPreviewText(null);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingRefPreview(false);
          }
        });
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, parsedReference, translation, isApiBible, apiBibleKey]);

  const trimmedQuery = query.trim();
  const shouldSearchKeywords = trimmedQuery.length >= 2 && !parsedReference;

  // Ensure full-Bible search index (BSB/WEB) OR run live API.Bible keyword search (NLT/NASB/CEV)
  useEffect(() => {
    if (!isOpen || !shouldSearchKeywords) {
      setIsLoadingFullIndex(false);
      return;
    }

    if (isApiBible) {
      const trimmedKey = apiBibleKey.trim();
      if (!trimmedKey) {
        setIsLoadingFullIndex(false);
        setApiBibleSearchState(null);
        return;
      }

      const controller = new AbortController();
      setIsLoadingFullIndex(true);
      setFullIndexError(false);

      const timer = window.setTimeout(() => {
        searchApiBibleVerses({
          translation,
          query: trimmedQuery,
          apiKey: trimmedKey,
          limit: 40,
          signal: controller.signal,
        })
          .then((outcome) => {
            if (controller.signal.aborted) return;
            setApiBibleSearchState({
              query: trimmedQuery,
              translation,
              totalMatches: outcome.totalMatches,
              results: outcome.verses.map((v) => ({
                ...v,
                source: 'full-bible' as const,
              })),
            });
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setFullIndexError(true);
            }
          })
          .finally(() => {
            if (!controller.signal.aborted) {
              setIsLoadingFullIndex(false);
            }
          });
      }, 280);

      return () => {
        window.clearTimeout(timer);
        controller.abort();
      };
    }

    if (getCachedFullBibleIndex(translation)) return;

    let cancelled = false;
    setIsLoadingFullIndex(true);
    setFullIndexError(false);

    void ensureFullBibleSearchIndex(translation)
      .then(() => {
        if (!cancelled) {
          setFullIndexVersion((v) => v + 1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFullIndexError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingFullIndex(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, shouldSearchKeywords, translation, isApiBible, apiBibleKey, trimmedQuery]);

  const keywordSearchOutcome = useMemo(() => {
    if (!shouldSearchKeywords) {
      return { results: [] as VerseSearchResult[], totalMatches: 0, scope: 'none' as const };
    }

    const offlineOutcome = searchOfflineChapters(trimmedQuery, cachedChapters, 60);

    if (isApiBible) {
      if (
        apiBibleSearchState &&
        apiBibleSearchState.query === trimmedQuery &&
        apiBibleSearchState.translation === translation
      ) {
        const seen = new Set<string>();
        const merged: VerseSearchResult[] = [];
        for (const r of apiBibleSearchState.results) {
          const key = `${r.bookId}-${r.chapter}-${r.verse}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(r);
          }
        }
        for (const r of offlineOutcome.results) {
          const key = `${r.bookId}-${r.chapter}-${r.verse}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(r);
          }
        }
        return {
          results: merged.slice(0, 60),
          totalMatches: Math.max(apiBibleSearchState.totalMatches, merged.length),
          scope: 'full' as const,
        };
      }

      return { ...offlineOutcome, scope: 'offline' as const };
    }

    const fullIndex = getCachedFullBibleIndex(translation);
    if (fullIndex) {
      const outcome = searchFullBibleIndex(trimmedQuery, fullIndex, 60);
      return { ...outcome, scope: 'full' as const };
    }

    return { ...offlineOutcome, scope: 'offline' as const };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shouldSearchKeywords,
    trimmedQuery,
    translation,
    isApiBible,
    cachedChapters,
    fullIndexVersion,
    apiBibleSearchState,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedReference) {
      onSelectResult({
        bookId: parsedReference.book.id,
        chapter: parsedReference.chapter,
        verse: parsedReference.verse,
      });
      return;
    }
    if (keywordSearchOutcome.results.length > 0) {
      const top = keywordSearchOutcome.results[0];
      onSelectResult({
        bookId: top.bookId,
        chapter: top.chapter,
        verse: top.verse,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search Scripture"
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full sm:max-w-xl h-[88dvh] sm:h-auto sm:max-h-[86dvh] rounded-t-3xl sm:rounded-2xl bg-[#161B19] border border-[#D4AF37]/20 flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#F5F2EA]">Search Scripture</h2>
            <p className="text-xs text-[#9CA8A2] mt-0.5">
              <span>{translation}</span>
              <span aria-hidden="true" className="mx-1.5 text-white/25">
                ·
              </span>
              <span>Jump to a reference or search words &amp; phrases</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="px-5 py-3 border-b border-white/10 bg-[#121614]/60">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “John 3:16”, “Ps 23”, or “living water”..."
              aria-label="Search scripture by reference or keyword"
              className="w-full min-h-[44px] pl-10 pr-10 rounded-xl bg-[#0F1312] border border-white/10 focus:border-[#D4AF37]/60 focus:outline-none text-sm text-[#F5F2EA] placeholder:text-[#9CA8A2]/60"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search query"
                className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center text-[#9CA8A2] hover:text-[#F5F2EA] absolute right-1 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Search Results Body */}
        <div className="flex-1 overflow-y-auto">
          {trimmedQuery.length === 0 ? (
            <div className="p-6 sm:p-8 space-y-5">
              <div className="space-y-1.5">
                <p className="font-scripture text-2xl text-[#F5F2EA]">
                  Find any passage or phrase
                </p>
                <p className="text-xs text-[#9CA8A2] leading-relaxed">
                  Type a book and chapter/verse reference for an instant one-tap jump, or enter
                  keywords to search offline cached chapters and the full {translation} text.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-medium text-[#9CA8A2] tracking-wide">
                  Try searching
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0F1312] border border-white/10 hover:border-[#D4AF37]/45 text-xs font-medium text-[#F5F2EA] transition-colors whitespace-nowrap"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {/* Mode 1: Direct Reference Jump Card */}
              {parsedReference && (
                <div className="p-4 sm:p-5 bg-[#D4AF37]/[0.05]">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectResult({
                        bookId: parsedReference.book.id,
                        chapter: parsedReference.chapter,
                        verse: parsedReference.verse,
                      })
                    }
                    className="w-full text-left rounded-xl bg-[#0F1312] border border-[#D4AF37]/40 hover:border-[#D4AF37] p-4 flex items-center justify-between gap-4 transition-colors active:scale-[0.99]"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium">
                        <span className="text-[#D4AF37]">Jump to Reference</span>
                        <span aria-hidden="true" className="text-white/25">
                          ·
                        </span>
                        <span className="text-[#9CA8A2]">
                          {getBookSectionTheme(parsedReference.book.id).label}
                        </span>
                      </div>

                      <div className="font-scripture text-2xl text-[#F5F2EA] font-medium tabular-nums">
                        {parsedReference.displayReference}
                      </div>

                      {isLoadingRefPreview ? (
                        <div className="flex items-center gap-2 text-xs text-[#9CA8A2]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                          <span>Loading verse preview...</span>
                        </div>
                      ) : refPreviewText ? (
                        <p className="font-scripture text-base text-[#F5F2EA]/85 leading-snug line-clamp-2">
                          “{refPreviewText}”
                        </p>
                      ) : (
                        <p className="text-xs text-[#9CA8A2]">
                          Open {parsedReference.book.name} chapter {parsedReference.chapter}
                          {parsedReference.hasExplicitVerse
                            ? ` at verse ${parsedReference.verse}`
                            : ''}
                        </p>
                      )}
                    </div>

                    <div className="min-h-[44px] min-w-[44px] rounded-xl bg-[#D4AF37] text-[#121514] flex items-center justify-center shrink-0">
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </button>
                </div>
              )}

              {/* Mode 2: Keyword / Phrase Search Results */}
              {!parsedReference && trimmedQuery.length < 2 && (
                <div className="p-8 text-center text-xs text-[#9CA8A2]">
                  Keep typing at least 2 characters or a book &amp; chapter reference.
                </div>
              )}

              {shouldSearchKeywords && (
                <>
                  {/* Status / Scope Summary Bar */}
                  <div className="px-5 py-2.5 bg-[#121614]/50 flex items-center justify-between gap-3 text-xs text-[#9CA8A2] tabular-nums">
                    <span>
                      {keywordSearchOutcome.scope === 'full'
                        ? keywordSearchOutcome.totalMatches > keywordSearchOutcome.results.length
                          ? `Showing top ${keywordSearchOutcome.results.length} of ${keywordSearchOutcome.totalMatches} matches`
                          : `${keywordSearchOutcome.totalMatches} ${
                              keywordSearchOutcome.totalMatches === 1 ? 'match' : 'matches'
                            } across ${translation}`
                        : `${keywordSearchOutcome.totalMatches} offline ${
                            keywordSearchOutcome.totalMatches === 1 ? 'match' : 'matches'
                          } (${cachedChapters.length} cached ${
                            cachedChapters.length === 1 ? 'chapter' : 'chapters'
                          })`}
                    </span>

                    {isLoadingFullIndex && (
                      <span className="inline-flex items-center gap-1.5 text-[#D4AF37]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        <span>
                          {isApiBible
                            ? `Searching ${translation}...`
                            : 'Searching all 66 books...'}
                        </span>
                      </span>
                    )}

                    {!isLoadingFullIndex && fullIndexError && (
                      <span className="text-[#9CA8A2]">Offline mode</span>
                    )}
                  </div>

                  {keywordSearchOutcome.results.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      {isLoadingFullIndex ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37] mx-auto" />
                          <p className="font-scripture text-xl text-[#F5F2EA]">
                            Searching Scripture...
                          </p>
                          <p className="text-xs text-[#9CA8A2]">
                            Checking cached chapters and searching {translation}.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-scripture text-xl text-[#F5F2EA]">
                            No matching verses found
                          </p>
                          <p className="text-xs text-[#9CA8A2] max-w-xs mx-auto leading-relaxed">
                            {isApiBible && !apiBibleKey.trim()
                              ? `Add your API.Bible key in Settings to search across all 66 books in ${translation}.`
                              : fullIndexError
                                ? 'You appear to be offline and this phrase is not in your locally cached chapters yet.'
                                : 'Try a different keyword or a direct reference like “John 3:16”.'}
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    keywordSearchOutcome.results.map((result) => (
                      <button
                        key={`${result.translation}-${result.bookId}-${result.chapter}-${result.verse}`}
                        type="button"
                        onClick={() =>
                          onSelectResult({
                            bookId: result.bookId,
                            chapter: result.chapter,
                            verse: result.verse,
                          })
                        }
                        className="w-full px-5 py-4 text-left hover:bg-white/[0.03] transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-[#F5F2EA] tabular-nums">
                              {result.reference}
                            </span>
                            <span aria-hidden="true" className="text-[#D4AF37]/60">
                              ·
                            </span>
                            <span className="text-[#D4AF37]">{result.translation}</span>
                          </div>
                          {result.source === 'offline-cache' && (
                            <span className="text-[11px] font-normal text-[#9CA8A2]">
                              Cached offline
                            </span>
                          )}
                        </div>
                        <p className="font-scripture text-lg text-[#F5F2EA]/90 leading-snug">
                          {renderHighlightedSnippet(result.text, trimmedQuery)}
                        </p>
                      </button>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
