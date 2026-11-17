import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getBookById, makeVerseKey } from '../data/bibleBooks';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { TranslationCode, VerseCardItem, VerseItem } from './scriptureApi';

export interface ReadingState {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  translation: TranslationCode;
  smartGrouping: boolean;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string; // YYYY-MM-DD in local time or ''
}

export type NoteKind = 'note' | 'prayer';

export interface SavedVerseRecord {
  verseKey: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  translation: TranslationCode;
  createdAtMs: number;
}

export interface VerseNoteRecord {
  verseKey: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  reference: string;
  verseText: string;
  translation: TranslationCode;
  noteKind: NoteKind;
  noteText: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export const DEFAULT_READING_STATE: ReadingState = {
  bookId: 'GEN',
  bookName: 'Genesis',
  chapter: 1,
  verse: 1,
  translation: 'BSB',
  smartGrouping: true,
};

export const DEFAULT_STREAK_STATS: StreakStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastReadDate: '',
};

const STORAGE_KEYS = {
  readingState: 'biblescroll:readingState:v1',
  likes: 'biblescroll:likes:v1',
  bookmarks: 'biblescroll:bookmarks:v1',
  notes: 'biblescroll:notes:v1',
  readVerses: 'biblescroll:readVerses:v1',
  streak: 'biblescroll:streak:v1',
};

function sanitizeTranslation(value: unknown): TranslationCode {
  return value === 'WEB' ? 'WEB' : 'BSB';
}

function sanitizeDateKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().slice(0, 10);
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(trimmed) ? trimmed : '';
}

function clampStreakInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(50000, Math.floor(value)));
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateKey(todayKey: string): string {
  const parts = todayKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return '';
  const utc = Date.UTC(parts[0], parts[1] - 1, parts[2]) - 86400000;
  const prev = new Date(utc);
  const year = prev.getUTCFullYear();
  const month = String(prev.getUTCMonth() + 1).padStart(2, '0');
  const day = String(prev.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function clampStreakStats(input: Partial<StreakStats> | null | undefined): StreakStats {
  const currentStreak = clampStreakInt(input?.currentStreak);
  const longestStreak = Math.max(currentStreak, clampStreakInt(input?.longestStreak));
  const lastReadDate = sanitizeDateKey(input?.lastReadDate);
  return {
    currentStreak,
    longestStreak,
    lastReadDate,
  };
}

export function getEffectiveCurrentStreak(stats: StreakStats, now = new Date()): number {
  if (!stats.lastReadDate || stats.currentStreak <= 0) return 0;
  const today = getLocalDateKey(now);
  const yesterday = getYesterdayDateKey(today);
  if (stats.lastReadDate === today || stats.lastReadDate === yesterday) {
    return stats.currentStreak;
  }
  return 0;
}

export function applyReadTodayToStreak(
  stats: StreakStats,
  now = new Date(),
): { next: StreakStats; changed: boolean } {
  const today = getLocalDateKey(now);
  if (stats.lastReadDate === today) {
    return { next: stats, changed: false };
  }
  const yesterday = getYesterdayDateKey(today);
  const nextCurrent = stats.lastReadDate === yesterday ? Math.max(1, stats.currentStreak + 1) : 1;
  const nextLongest = Math.max(stats.longestStreak, nextCurrent);

  return {
    next: clampStreakStats({
      currentStreak: nextCurrent,
      longestStreak: nextLongest,
      lastReadDate: today,
    }),
    changed: true,
  };
}

function clampReadingState(input: Partial<ReadingState> | null | undefined): ReadingState {
  const book = getBookById(typeof input?.bookId === 'string' ? input.bookId : 'GEN');
  const chapter =
    typeof input?.chapter === 'number' && Number.isInteger(input.chapter)
      ? Math.max(1, Math.min(input.chapter, book.chapters))
      : 1;
  const verse =
    typeof input?.verse === 'number' && Number.isInteger(input.verse)
      ? Math.max(1, Math.min(input.verse, 176))
      : 1;
  return {
    bookId: book.id,
    bookName: book.name,
    chapter,
    verse,
    translation: sanitizeTranslation(input?.translation),
    smartGrouping: typeof input?.smartGrouping === 'boolean' ? input.smartGrouping : true,
  };
}

export function loadGuestReadingState(): ReadingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.readingState);
    if (!raw) return DEFAULT_READING_STATE;
    return clampReadingState(JSON.parse(raw) as Partial<ReadingState>);
  } catch {
    return DEFAULT_READING_STATE;
  }
}

export function saveGuestReadingState(state: ReadingState): void {
  try {
    const safe = clampReadingState(state);
    localStorage.setItem(STORAGE_KEYS.readingState, JSON.stringify(safe));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadGuestStreak(): StreakStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.streak);
    if (!raw) return DEFAULT_STREAK_STATS;
    return clampStreakStats(JSON.parse(raw) as Partial<StreakStats>);
  } catch {
    return DEFAULT_STREAK_STATS;
  }
}

export function saveGuestStreak(streak: StreakStats): void {
  try {
    localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(clampStreakStats(streak)));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadGuestReadVerses(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.readVerses);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const cleaned: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === true && /^[A-Z0-9]{3}-[0-9]{1,3}-[0-9]{1,3}$/.test(k)) {
        cleaned[k] = true;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveGuestReadVerses(map: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.readVerses, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function loadGuestSavedMap(storageKey: string): Record<string, SavedVerseRecord> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SavedVerseRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveGuestSavedMap(storageKey: string, map: Record<string, SavedVerseRecord>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadGuestLikes(): Record<string, SavedVerseRecord> {
  return loadGuestSavedMap(STORAGE_KEYS.likes);
}

export function saveGuestLikes(map: Record<string, SavedVerseRecord>): void {
  saveGuestSavedMap(STORAGE_KEYS.likes, map);
}

export function loadGuestBookmarks(): Record<string, SavedVerseRecord> {
  return loadGuestSavedMap(STORAGE_KEYS.bookmarks);
}

export function saveGuestBookmarks(map: Record<string, SavedVerseRecord>): void {
  saveGuestSavedMap(STORAGE_KEYS.bookmarks, map);
}

function sanitizeNoteKind(value: unknown): NoteKind {
  return value === 'prayer' ? 'prayer' : 'note';
}

export function loadGuestNotes(): Record<string, VerseNoteRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.notes);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<VerseNoteRecord>>;
    if (!parsed || typeof parsed !== 'object') return {};
    const cleaned: Record<string, VerseNoteRecord> = {};
    for (const [k, item] of Object.entries(parsed)) {
      if (!item || typeof item !== 'object') continue;
      const noteText = typeof item.noteText === 'string' ? item.noteText.trim().slice(0, 2000) : '';
      if (!noteText || !/^[A-Z0-9]{3}_[0-9]{1,3}_[0-9]{1,3}$/.test(k)) continue;
      const book = getBookById(typeof item.bookId === 'string' ? item.bookId : 'GEN');
      const chapter =
        typeof item.chapter === 'number' && Number.isInteger(item.chapter)
          ? Math.max(1, Math.min(item.chapter, book.chapters))
          : 1;
      const verse =
        typeof item.verse === 'number' && Number.isInteger(item.verse)
          ? Math.max(1, Math.min(item.verse, 176))
          : 1;
      const fallbackRef = `${book.name} ${chapter}:${verse}`;
      const reference = (typeof item.reference === 'string' ? item.reference : fallbackRef)
        .trim()
        .slice(0, 60);
      cleaned[k] = {
        verseKey: k,
        bookId: book.id,
        bookName: book.name.slice(0, 40),
        chapter,
        verse,
        reference: reference.length >= 3 ? reference : fallbackRef,
        verseText:
          (typeof item.verseText === 'string' ? item.verseText.slice(0, 4000) : '') ||
          fallbackRef,
        translation: sanitizeTranslation(item.translation),
        noteKind: sanitizeNoteKind(item.noteKind),
        noteText,
        createdAtMs: typeof item.createdAtMs === 'number' ? item.createdAtMs : Date.now(),
        updatedAtMs: typeof item.updatedAtMs === 'number' ? item.updatedAtMs : Date.now(),
      };
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveGuestNotes(map: Record<string, VerseNoteRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function verseToSavedRecord(verse: VerseItem): SavedVerseRecord {
  const book = getBookById(verse.bookId);
  const safeChapter = Math.max(1, Math.min(verse.chapter, book.chapters));
  const safeVerse = Math.max(1, Math.min(verse.verse, 176));
  const verseKey = makeVerseKey(book.id, safeChapter, safeVerse);
  const fallbackRef = `${book.name} ${safeChapter}:${safeVerse}`;
  const safeRef = (verse.reference || fallbackRef).trim().slice(0, 60) || fallbackRef;

  return {
    verseKey,
    bookId: book.id,
    bookName: book.name.slice(0, 40),
    chapter: safeChapter,
    verse: safeVerse,
    reference: safeRef,
    text: verse.text.slice(0, 4000),
    translation: sanitizeTranslation(verse.translation),
    createdAtMs: Date.now(),
  };
}

export function cardToSavedRecord(card: VerseCardItem): SavedVerseRecord {
  const book = getBookById(card.bookId);
  const safeChapter = Math.max(1, Math.min(card.chapter, book.chapters));
  const safeVerse = Math.max(1, Math.min(card.startVerse, 176));
  const verseKey = makeVerseKey(book.id, safeChapter, safeVerse);
  const fallbackRef = `${book.name} ${safeChapter}:${safeVerse}`;
  const safeRef = (card.reference || fallbackRef).trim().slice(0, 60) || fallbackRef;

  return {
    verseKey,
    bookId: book.id,
    bookName: book.name.slice(0, 40),
    chapter: safeChapter,
    verse: safeVerse,
    reference: safeRef,
    text: card.combinedText.slice(0, 4000),
    translation: sanitizeTranslation(card.translation),
    createdAtMs: Date.now(),
  };
}

function toFirestoreSavedPayload(uid: string, record: SavedVerseRecord) {
  const book = getBookById(record.bookId);
  const safeChapter = Math.max(1, Math.min(record.chapter, book.chapters));
  const safeVerse = Math.max(1, Math.min(record.verse, 176));
  const verseKey = makeVerseKey(book.id, safeChapter, safeVerse);
  const fallbackRef = `${book.name} ${safeChapter}:${safeVerse}`;
  const safeRef = (record.reference || fallbackRef).trim().slice(0, 60);
  const validRef = safeRef.length >= 3 ? safeRef : fallbackRef.slice(0, 60);

  return {
    verseKey,
    ownerId: uid,
    bookId: book.id,
    bookName: book.name.slice(0, 40),
    chapter: safeChapter,
    verse: safeVerse,
    reference: validRef,
    text: (record.text || '').slice(0, 4000) || validRef,
    translation: sanitizeTranslation(record.translation),
    createdAt: serverTimestamp(),
  };
}

export function buildVerseNoteRecord(params: {
  card?: VerseCardItem;
  existing?: VerseNoteRecord;
  noteKind: NoteKind;
  noteText: string;
}): VerseNoteRecord {
  const { card, existing, noteKind, noteText } = params;
  const now = Date.now();
  const baseBookId = existing?.bookId ?? card?.bookId ?? 'GEN';
  const book = getBookById(baseBookId);
  const safeChapter = Math.max(1, Math.min(existing?.chapter ?? card?.chapter ?? 1, book.chapters));
  const safeVerse = Math.max(1, Math.min(existing?.verse ?? card?.startVerse ?? 1, 176));
  const verseKey = makeVerseKey(book.id, safeChapter, safeVerse);
  const fallbackRef = `${book.name} ${safeChapter}:${safeVerse}`;
  const rawRef = (card?.reference ?? existing?.reference ?? fallbackRef).trim().slice(0, 60);
  const validRef = rawRef.length >= 3 ? rawRef : fallbackRef.slice(0, 60);
  const rawVerseText = (card?.combinedText ?? existing?.verseText ?? validRef).slice(0, 4000);
  const validVerseText = rawVerseText.trim().length > 0 ? rawVerseText : validRef;
  const validNoteText = noteText.trim().slice(0, 2000);

  return {
    verseKey,
    bookId: book.id,
    bookName: book.name.slice(0, 40),
    chapter: safeChapter,
    verse: safeVerse,
    reference: validRef,
    verseText: validVerseText,
    translation: sanitizeTranslation(card?.translation ?? existing?.translation),
    noteKind: sanitizeNoteKind(noteKind),
    noteText: validNoteText,
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
  };
}

function toFirestoreNoteCreatePayload(uid: string, record: VerseNoteRecord) {
  const book = getBookById(record.bookId);
  const safeChapter = Math.max(1, Math.min(record.chapter, book.chapters));
  const safeVerse = Math.max(1, Math.min(record.verse, 176));
  const verseKey = makeVerseKey(book.id, safeChapter, safeVerse);
  const fallbackRef = `${book.name} ${safeChapter}:${safeVerse}`;
  const safeRef = (record.reference || fallbackRef).trim().slice(0, 60);
  const validRef = safeRef.length >= 3 ? safeRef : fallbackRef.slice(0, 60);
  const validVerseText = (record.verseText || '').slice(0, 4000).trim() || validRef;
  const validNoteText = (record.noteText || '').trim().slice(0, 2000) || validRef;

  return {
    verseKey,
    ownerId: uid,
    bookId: book.id,
    bookName: book.name.slice(0, 40),
    chapter: safeChapter,
    verse: safeVerse,
    reference: validRef,
    verseText: validVerseText,
    translation: sanitizeTranslation(record.translation),
    noteKind: sanitizeNoteKind(record.noteKind),
    noteText: validNoteText,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function extractCloudProfile(
  data: Record<string, unknown>,
  fallbackSmartGrouping = true,
): { state: ReadingState; streak: StreakStats; hasExplicitSmartGrouping: boolean } {
  const hasExplicitSmartGrouping = typeof data.smartGrouping === 'boolean';
  const state = clampReadingState({
    bookId: data.bookId as string,
    bookName: data.bookName as string,
    chapter: data.chapter as number,
    verse: data.verse as number,
    translation: data.translation as TranslationCode,
    smartGrouping: hasExplicitSmartGrouping ? (data.smartGrouping as boolean) : fallbackSmartGrouping,
  });
  const streak = clampStreakStats({
    currentStreak: data.currentStreak as number | undefined,
    longestStreak: data.longestStreak as number | undefined,
    lastReadDate: data.lastReadDate as string | undefined,
  });
  return { state, streak, hasExplicitSmartGrouping };
}

function mergeStreakStats(cloud: StreakStats, guest: StreakStats): { merged: StreakStats; changed: boolean } {
  const longestStreak = Math.max(cloud.longestStreak, guest.longestStreak);
  const today = getLocalDateKey();
  const yesterday = getYesterdayDateKey(today);

  let lastReadDate = cloud.lastReadDate;
  if (guest.lastReadDate && (!lastReadDate || guest.lastReadDate > lastReadDate)) {
    lastReadDate = guest.lastReadDate;
  }

  let currentStreak = cloud.currentStreak;
  const cloudActive = cloud.lastReadDate === today || cloud.lastReadDate === yesterday;
  const guestActive = guest.lastReadDate === today || guest.lastReadDate === yesterday;

  if (guestActive && !cloudActive) {
    currentStreak = guest.currentStreak;
  } else if (guestActive && cloudActive) {
    currentStreak = Math.max(cloud.currentStreak, guest.currentStreak);
  } else if (!cloudActive && !guestActive) {
    currentStreak = 0;
  }

  const merged = clampStreakStats({
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastReadDate,
  });

  const changed =
    merged.currentStreak !== cloud.currentStreak ||
    merged.longestStreak !== cloud.longestStreak ||
    merged.lastReadDate !== cloud.lastReadDate;

  return { merged, changed };
}

export async function ensureCloudUserDoc(
  uid: string,
  fallbackState: ReadingState,
  fallbackStreak: StreakStats = DEFAULT_STREAK_STATS,
): Promise<{ state: ReadingState; streak: StreakStats }> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const extracted = extractCloudProfile(snap.data(), fallbackState.smartGrouping);
      return { state: extracted.state, streak: extracted.streak };
    }

    const safe = clampReadingState(fallbackState);
    const safeStreak = clampStreakStats(fallbackStreak);
    await setDoc(userRef, {
      uid,
      translation: safe.translation,
      bookId: safe.bookId,
      bookName: safe.bookName.slice(0, 40),
      chapter: safe.chapter,
      verse: safe.verse,
      smartGrouping: safe.smartGrouping,
      currentStreak: safeStreak.currentStreak,
      longestStreak: safeStreak.longestStreak,
      lastReadDate: safeStreak.lastReadDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { state: safe, streak: safeStreak };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function updateCloudReadingState(uid: string, state: ReadingState): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const safe = clampReadingState(state);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid,
        translation: safe.translation,
        bookId: safe.bookId,
        bookName: safe.bookName.slice(0, 40),
        chapter: safe.chapter,
        verse: safe.verse,
        smartGrouping: safe.smartGrouping,
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await updateDoc(userRef, {
      translation: safe.translation,
      bookId: safe.bookId,
      bookName: safe.bookName.slice(0, 40),
      chapter: safe.chapter,
      verse: safe.verse,
      smartGrouping: safe.smartGrouping,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function updateCloudStreak(
  uid: string,
  streak: StreakStats,
  fallbackState: ReadingState,
): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  const safeStreak = clampStreakStats(streak);

  try {
    await ensureCloudUserDoc(uid, fallbackState, safeStreak);
    await updateDoc(userRef, {
      currentStreak: safeStreak.currentStreak,
      longestStreak: safeStreak.longestStreak,
      lastReadDate: safeStreak.lastReadDate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function markBookVersesReadInCloud(
  uid: string,
  bookId: string,
  verseIds: string[],
  fallbackState: ReadingState,
): Promise<void> {
  const safeBook = getBookById(bookId);
  const validIds = verseIds.filter((id) =>
    new RegExp(`^${safeBook.id}-[0-9]{1,3}-[0-9]{1,3}$`).test(id),
  );
  if (validIds.length === 0) return;

  const docPath = `users/${uid}/readBooks/${safeBook.id}`;
  const bookRef = doc(db, 'users', uid, 'readBooks', safeBook.id);

  try {
    await ensureCloudUserDoc(uid, fallbackState);
    const snap = await getDoc(bookRef);

    if (!snap.exists()) {
      const versesMap: Record<string, boolean> = {};
      for (const id of validIds.slice(0, 2600)) {
        versesMap[id] = true;
      }
      await setDoc(bookRef, {
        bookId: safeBook.id,
        ownerId: uid,
        versesMap,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const patch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    for (const id of validIds) {
      patch[`versesMap.${id}`] = true;
    }
    await updateDoc(bookRef, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function mergeGuestDataIntoFirestore(
  uid: string,
  guestState: ReadingState,
  guestLikes: Record<string, SavedVerseRecord>,
  guestBookmarks: Record<string, SavedVerseRecord>,
  guestNotes: Record<string, VerseNoteRecord> = {},
  guestReadVerses: Record<string, boolean> = {},
  guestStreak: StreakStats = DEFAULT_STREAK_STATS,
): Promise<{ state: ReadingState; streak: StreakStats }> {
  const { state: cloudState, streak: cloudStreak } = await ensureCloudUserDoc(
    uid,
    guestState,
    guestStreak,
  );

  // Merge streak if guest has newer or longer streak
  const { merged: resolvedStreak, changed: streakChanged } = mergeStreakStats(
    cloudStreak,
    guestStreak,
  );
  if (streakChanged) {
    await updateCloudStreak(uid, resolvedStreak, cloudState);
  }

  const likesPath = `users/${uid}/likes`;
  const bookmarksPath = `users/${uid}/bookmarks`;
  const notesPath = `users/${uid}/notes`;
  const readBooksPath = `users/${uid}/readBooks`;

  let existingLikeIds = new Set<string>();
  let existingBookmarkIds = new Set<string>();
  let existingNoteIds = new Set<string>();
  const existingReadBooks = new Map<string, Record<string, boolean>>();

  try {
    const likesSnap = await getDocs(
      query(collection(db, 'users', uid, 'likes'), where('ownerId', '==', uid)),
    );
    existingLikeIds = new Set(likesSnap.docs.map((d) => d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, likesPath);
  }

  try {
    const bookmarksSnap = await getDocs(
      query(collection(db, 'users', uid, 'bookmarks'), where('ownerId', '==', uid)),
    );
    existingBookmarkIds = new Set(bookmarksSnap.docs.map((d) => d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, bookmarksPath);
  }

  try {
    const notesSnap = await getDocs(
      query(collection(db, 'users', uid, 'notes'), where('ownerId', '==', uid)),
    );
    existingNoteIds = new Set(notesSnap.docs.map((d) => d.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, notesPath);
  }

  try {
    const readBooksSnap = await getDocs(
      query(collection(db, 'users', uid, 'readBooks'), where('ownerId', '==', uid)),
    );
    readBooksSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const rawMap = data?.versesMap;
      const cleaned: Record<string, boolean> = {};
      if (rawMap && typeof rawMap === 'object') {
        for (const [k, v] of Object.entries(rawMap as Record<string, unknown>)) {
          if (v === true) cleaned[k] = true;
        }
      }
      existingReadBooks.set(docSnap.id, cleaned);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, readBooksPath);
  }

  const pendingWrites: Array<{
    ref: ReturnType<typeof doc>;
    payload: Record<string, unknown>;
    isUpdate?: boolean;
  }> = [];

  for (const record of Object.values(guestLikes)) {
    const payload = toFirestoreSavedPayload(uid, record);
    if (!existingLikeIds.has(payload.verseKey)) {
      pendingWrites.push({
        ref: doc(db, 'users', uid, 'likes', payload.verseKey),
        payload,
      });
    }
  }

  for (const record of Object.values(guestBookmarks)) {
    const payload = toFirestoreSavedPayload(uid, record);
    if (!existingBookmarkIds.has(payload.verseKey)) {
      pendingWrites.push({
        ref: doc(db, 'users', uid, 'bookmarks', payload.verseKey),
        payload,
      });
    }
  }

  for (const record of Object.values(guestNotes)) {
    if (!record.noteText.trim()) continue;
    const payload = toFirestoreNoteCreatePayload(uid, record);
    if (!existingNoteIds.has(payload.verseKey)) {
      pendingWrites.push({
        ref: doc(db, 'users', uid, 'notes', payload.verseKey),
        payload,
      });
    }
  }

  // Group guest read verses by bookId (e.g. GEN-1-1 -> GEN)
  const guestByBook = new Map<string, string[]>();
  for (const [verseId, isRead] of Object.entries(guestReadVerses)) {
    if (!isRead) continue;
    const match = /^([A-Z0-9]{3})-[0-9]{1,3}-[0-9]{1,3}$/.exec(verseId);
    if (!match) continue;
    const bookId = match[1];
    const list = guestByBook.get(bookId) ?? [];
    list.push(verseId);
    guestByBook.set(bookId, list);
  }

  for (const [bookId, verseIds] of guestByBook.entries()) {
    const safeBook = getBookById(bookId);
    if (safeBook.id !== bookId) continue;
    const existingMap = existingReadBooks.get(bookId);

    if (!existingMap) {
      const versesMap: Record<string, boolean> = {};
      for (const id of verseIds.slice(0, 2600)) {
        versesMap[id] = true;
      }
      pendingWrites.push({
        ref: doc(db, 'users', uid, 'readBooks', bookId),
        payload: {
          bookId,
          ownerId: uid,
          versesMap,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      });
    } else {
      const missingIds = verseIds.filter((id) => !existingMap[id]);
      if (missingIds.length > 0) {
        const mergedMap: Record<string, boolean> = { ...existingMap };
        for (const id of missingIds) {
          if (Object.keys(mergedMap).length < 2600) {
            mergedMap[id] = true;
          }
        }
        pendingWrites.push({
          ref: doc(db, 'users', uid, 'readBooks', bookId),
          payload: {
            versesMap: mergedMap,
            updatedAt: serverTimestamp(),
          },
          isUpdate: true,
        });
      }
    }
  }

  // Commit in batches of up to 400 operations
  const CHUNK_SIZE = 400;
  for (let i = 0; i < pendingWrites.length; i += CHUNK_SIZE) {
    const chunk = pendingWrites.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      if (item.isUpdate) {
        batch.update(item.ref, item.payload);
      } else {
        batch.set(item.ref, item.payload);
      }
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  }

  return { state: cloudState, streak: resolvedStreak };
}

export async function toggleCloudSavedRecord(
  uid: string,
  kind: 'likes' | 'bookmarks',
  record: SavedVerseRecord,
  shouldSave: boolean,
  fallbackState: ReadingState,
): Promise<void> {
  const docPath = `users/${uid}/${kind}/${record.verseKey}`;
  const docRef = doc(db, 'users', uid, kind, record.verseKey);

  try {
    if (shouldSave) {
      await ensureCloudUserDoc(uid, fallbackState);
      await setDoc(docRef, toFirestoreSavedPayload(uid, record));
    } else {
      await deleteDoc(docRef);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      shouldSave ? OperationType.CREATE : OperationType.DELETE,
      docPath,
    );
  }
}

export async function saveCloudVerseNote(
  uid: string,
  record: VerseNoteRecord,
  fallbackState: ReadingState,
): Promise<void> {
  const payload = toFirestoreNoteCreatePayload(uid, record);
  const docPath = `users/${uid}/notes/${payload.verseKey}`;
  const docRef = doc(db, 'users', uid, 'notes', payload.verseKey);

  try {
    await ensureCloudUserDoc(uid, fallbackState);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, payload);
      return;
    }

    await updateDoc(docRef, {
      noteKind: payload.noteKind,
      noteText: payload.noteText,
      reference: payload.reference,
      verseText: payload.verseText,
      translation: payload.translation,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteCloudVerseNote(uid: string, verseKey: string): Promise<void> {
  if (!/^[A-Z0-9]{3}_[0-9]{1,3}_[0-9]{1,3}$/.test(verseKey)) return;
  const docPath = `users/${uid}/notes/${verseKey}`;
  const docRef = doc(db, 'users', uid, 'notes', verseKey);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeUserCloudData(
  uid: string,
  callbacks: {
    onReadingState: (state: ReadingState) => void;
    onStreak: (streak: StreakStats) => void;
    onLikes: (likes: Record<string, SavedVerseRecord>) => void;
    onBookmarks: (bookmarks: Record<string, SavedVerseRecord>) => void;
    onNotes: (notes: Record<string, VerseNoteRecord>) => void;
    onReadVerses: (readVerses: Record<string, boolean>) => void;
    onError: (err: Error) => void;
  },
): Unsubscribe {
  const userPath = `users/${uid}`;
  const likesPath = `users/${uid}/likes`;
  const bookmarksPath = `users/${uid}/bookmarks`;
  const notesPath = `users/${uid}/notes`;
  const readBooksPath = `users/${uid}/readBooks`;

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        const extracted = extractCloudProfile(snap.data());
        callbacks.onReadingState(extracted.state);
        callbacks.onStreak(extracted.streak);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, userPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );

  const unsubLikes = onSnapshot(
    query(collection(db, 'users', uid, 'likes'), where('ownerId', '==', uid)),
    (snapshot) => {
      const map: Record<string, SavedVerseRecord> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAtMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? (d.createdAt.toMillis() as number)
            : Date.now();
        map[docSnap.id] = {
          verseKey: String(d.verseKey ?? docSnap.id),
          bookId: String(d.bookId ?? 'GEN'),
          bookName: String(d.bookName ?? 'Genesis'),
          chapter: Number(d.chapter ?? 1),
          verse: Number(d.verse ?? 1),
          reference: String(d.reference ?? ''),
          text: String(d.text ?? ''),
          translation: sanitizeTranslation(d.translation),
          createdAtMs,
        };
      });
      callbacks.onLikes(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, likesPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );

  const unsubBookmarks = onSnapshot(
    query(collection(db, 'users', uid, 'bookmarks'), where('ownerId', '==', uid)),
    (snapshot) => {
      const map: Record<string, SavedVerseRecord> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAtMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? (d.createdAt.toMillis() as number)
            : Date.now();
        map[docSnap.id] = {
          verseKey: String(d.verseKey ?? docSnap.id),
          bookId: String(d.bookId ?? 'GEN'),
          bookName: String(d.bookName ?? 'Genesis'),
          chapter: Number(d.chapter ?? 1),
          verse: Number(d.verse ?? 1),
          reference: String(d.reference ?? ''),
          text: String(d.text ?? ''),
          translation: sanitizeTranslation(d.translation),
          createdAtMs,
        };
      });
      callbacks.onBookmarks(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, bookmarksPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );

  const unsubNotes = onSnapshot(
    query(collection(db, 'users', uid, 'notes'), where('ownerId', '==', uid)),
    (snapshot) => {
      const map: Record<string, VerseNoteRecord> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const createdAtMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? (d.createdAt.toMillis() as number)
            : Date.now();
        const updatedAtMs =
          d.updatedAt && typeof d.updatedAt.toMillis === 'function'
            ? (d.updatedAt.toMillis() as number)
            : createdAtMs;
        map[docSnap.id] = {
          verseKey: String(d.verseKey ?? docSnap.id),
          bookId: String(d.bookId ?? 'GEN'),
          bookName: String(d.bookName ?? 'Genesis'),
          chapter: Number(d.chapter ?? 1),
          verse: Number(d.verse ?? 1),
          reference: String(d.reference ?? ''),
          verseText: String(d.verseText ?? ''),
          translation: sanitizeTranslation(d.translation),
          noteKind: sanitizeNoteKind(d.noteKind),
          noteText: String(d.noteText ?? ''),
          createdAtMs,
          updatedAtMs,
        };
      });
      callbacks.onNotes(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, notesPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );

  const unsubReadBooks = onSnapshot(
    query(collection(db, 'users', uid, 'readBooks'), where('ownerId', '==', uid)),
    (snapshot) => {
      const merged: Record<string, boolean> = {};
      snapshot.forEach((docSnap) => {
        const rawMap = docSnap.data()?.versesMap;
        if (rawMap && typeof rawMap === 'object') {
          for (const [k, v] of Object.entries(rawMap as Record<string, unknown>)) {
            if (v === true && /^[A-Z0-9]{3}-[0-9]{1,3}-[0-9]{1,3}$/.test(k)) {
              merged[k] = true;
            }
          }
        }
      });
      callbacks.onReadVerses(merged);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, readBooksPath);
      } catch (wrapped) {
        callbacks.onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );

  return () => {
    unsubUser();
    unsubLikes();
    unsubBookmarks();
    unsubNotes();
    unsubReadBooks();
  };
}
