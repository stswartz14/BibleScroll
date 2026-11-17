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
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getBookById, makeVerseKey } from '../data/bibleBooks';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { TranslationCode, VerseItem } from './scriptureApi';

export interface ReadingState {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  translation: TranslationCode;
}

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

export const DEFAULT_READING_STATE: ReadingState = {
  bookId: 'GEN',
  bookName: 'Genesis',
  chapter: 1,
  verse: 1,
  translation: 'BSB',
};

const STORAGE_KEYS = {
  readingState: 'biblescroll:readingState:v1',
  likes: 'biblescroll:likes:v1',
  bookmarks: 'biblescroll:bookmarks:v1',
};

function sanitizeTranslation(value: unknown): TranslationCode {
  return value === 'WEB' ? 'WEB' : 'BSB';
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

export function verseToSavedRecord(verse: VerseItem): SavedVerseRecord {
  const book = getBookById(verse.bookId);
  const safeChapter = Math.max(1, Math.min(verse.chapter, book.chapters));
  const safeVerse = Math.max(1, Math.min(verse.verse, 176));
  const verseKey = makeVerseKey(book.id, safeChapter, safeVerse);

  return {
    verseKey,
    bookId: book.id,
    bookName: book.name.slice(0, 40),
    chapter: safeChapter,
    verse: safeVerse,
    reference: `${book.name} ${safeChapter}:${safeVerse}`.slice(0, 60),
    text: verse.text.slice(0, 4000),
    translation: sanitizeTranslation(verse.translation),
    createdAtMs: Date.now(),
  };
}

function toFirestoreSavedPayload(uid: string, record: SavedVerseRecord) {
  const book = getBookById(record.bookId);
  const safeChapter = Math.max(1, Math.min(record.chapter, book.chapters));
  const safeVerse = Math.max(1, Math.min(record.verse, 176));
  const verseKey = makeVerseKey(book.id, safeChapter, safeVerse);

  return {
    verseKey,
    ownerId: uid,
    bookId: book.id,
    bookName: book.name.slice(0, 40),
    chapter: safeChapter,
    verse: safeVerse,
    reference: `${book.name} ${safeChapter}:${safeVerse}`.slice(0, 60),
    text: (record.text || '').slice(0, 4000) || `${book.name} ${safeChapter}:${safeVerse}`,
    translation: sanitizeTranslation(record.translation),
    createdAt: serverTimestamp(),
  };
}

export async function ensureCloudUserDoc(uid: string, fallbackState: ReadingState): Promise<ReadingState> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return clampReadingState({
        bookId: data.bookId as string,
        bookName: data.bookName as string,
        chapter: data.chapter as number,
        verse: data.verse as number,
        translation: data.translation as TranslationCode,
      });
    }

    const safe = clampReadingState(fallbackState);
    await setDoc(userRef, {
      uid,
      translation: safe.translation,
      bookId: safe.bookId,
      bookName: safe.bookName.slice(0, 40),
      chapter: safe.chapter,
      verse: safe.verse,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return safe;
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    await setDoc(
      userRef,
      {
        uid,
        translation: safe.translation,
        bookId: safe.bookId,
        bookName: safe.bookName.slice(0, 40),
        chapter: safe.chapter,
        verse: safe.verse,
        createdAt: snap.data().createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: false },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function mergeGuestDataIntoFirestore(
  uid: string,
  guestState: ReadingState,
  guestLikes: Record<string, SavedVerseRecord>,
  guestBookmarks: Record<string, SavedVerseRecord>,
): Promise<ReadingState> {
  const cloudState = await ensureCloudUserDoc(uid, guestState);

  const likesPath = `users/${uid}/likes`;
  const bookmarksPath = `users/${uid}/bookmarks`;

  let existingLikeIds = new Set<string>();
  let existingBookmarkIds = new Set<string>();

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

  const pendingWrites: Array<{ path: string; ref: ReturnType<typeof doc>; payload: ReturnType<typeof toFirestoreSavedPayload> }> = [];

  for (const record of Object.values(guestLikes)) {
    const payload = toFirestoreSavedPayload(uid, record);
    if (!existingLikeIds.has(payload.verseKey)) {
      pendingWrites.push({
        path: `${likesPath}/${payload.verseKey}`,
        ref: doc(db, 'users', uid, 'likes', payload.verseKey),
        payload,
      });
    }
  }

  for (const record of Object.values(guestBookmarks)) {
    const payload = toFirestoreSavedPayload(uid, record);
    if (!existingBookmarkIds.has(payload.verseKey)) {
      pendingWrites.push({
        path: `${bookmarksPath}/${payload.verseKey}`,
        ref: doc(db, 'users', uid, 'bookmarks', payload.verseKey),
        payload,
      });
    }
  }

  // Commit in batches of up to 400 operations
  const CHUNK_SIZE = 400;
  for (let i = 0; i < pendingWrites.length; i += CHUNK_SIZE) {
    const chunk = pendingWrites.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      batch.set(item.ref, item.payload);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }
  }

  return cloudState;
}

export async function toggleCloudSavedVerse(
  uid: string,
  kind: 'likes' | 'bookmarks',
  verse: VerseItem,
  shouldSave: boolean,
  fallbackState: ReadingState,
): Promise<void> {
  const record = verseToSavedRecord(verse);
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

export function subscribeUserCloudData(
  uid: string,
  callbacks: {
    onReadingState: (state: ReadingState) => void;
    onLikes: (likes: Record<string, SavedVerseRecord>) => void;
    onBookmarks: (bookmarks: Record<string, SavedVerseRecord>) => void;
    onError: (err: Error) => void;
  },
): Unsubscribe {
  const userPath = `users/${uid}`;
  const likesPath = `users/${uid}/likes`;
  const bookmarksPath = `users/${uid}/bookmarks`;

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        callbacks.onReadingState(
          clampReadingState({
            bookId: d.bookId as string,
            bookName: d.bookName as string,
            chapter: d.chapter as number,
            verse: d.verse as number,
            translation: d.translation as TranslationCode,
          }),
        );
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

  return () => {
    unsubUser();
    unsubLikes();
    unsubBookmarks();
  };
}
