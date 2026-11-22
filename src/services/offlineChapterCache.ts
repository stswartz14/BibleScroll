import type { ChapterData } from './scriptureApi';

const DB_NAME = 'biblescroll_offline_chapters_v1';
const DB_VERSION = 1;
const STORE_NAME = 'chapters';
const MAX_PERSISTED_CHAPTERS = 180;
const FALLBACK_STORAGE_PREFIX = 'biblescroll:offlineChapter:v1:';
const FALLBACK_INDEX_KEY = 'biblescroll:offlineChapterIndex:v1';
const MAX_LOCAL_STORAGE_CHAPTERS = 12;

interface PersistedChapterEntry {
  cacheKey: string;
  data: ChapterData;
  cachedAtMs: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
          store.createIndex('cachedAtMs', 'cachedAtMs', { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

function getLocalStorageFallback(cacheKey: string): ChapterData | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem(`${FALLBACK_STORAGE_PREFIX}${cacheKey}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedChapterEntry;
    if (parsed?.data && Array.isArray(parsed.data.verses) && parsed.data.verses.length > 0) {
      return parsed.data;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function setLocalStorageFallback(cacheKey: string, data: ChapterData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const rawIndex = localStorage.getItem(FALLBACK_INDEX_KEY);
    const indexList = rawIndex ? (JSON.parse(rawIndex) as string[]) : [];
    const nextIndex = [cacheKey, ...indexList.filter((k) => k !== cacheKey)];
    while (nextIndex.length > MAX_LOCAL_STORAGE_CHAPTERS) {
      const evicted = nextIndex.pop();
      if (evicted) {
        localStorage.removeItem(`${FALLBACK_STORAGE_PREFIX}${evicted}`);
      }
    }
    const entry: PersistedChapterEntry = {
      cacheKey,
      data,
      cachedAtMs: Date.now(),
    };
    localStorage.setItem(`${FALLBACK_STORAGE_PREFIX}${cacheKey}`, JSON.stringify(entry));
    localStorage.setItem(FALLBACK_INDEX_KEY, JSON.stringify(nextIndex));
  } catch {
    // Ignore localStorage quota or private mode failures
  }
}

async function pruneOldestIdbEntries(db: IDBDatabase): Promise<void> {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const countReq = store.count();

    countReq.onsuccess = () => {
      const total = countReq.result;
      if (total <= MAX_PERSISTED_CHAPTERS) return;
      let toDelete = total - MAX_PERSISTED_CHAPTERS;
      const index = store.index('cachedAtMs');
      const cursorReq = index.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor || toDelete <= 0) return;
        cursor.delete();
        toDelete -= 1;
        cursor.continue();
      };
    };
  } catch {
    // Non-fatal cache housekeeping error
  }
}

export async function getPersistedChapter(cacheKey: string): Promise<ChapterData | undefined> {
  const db = await openOfflineDb();
  if (!db) {
    return getLocalStorageFallback(cacheKey);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cacheKey);
      req.onsuccess = () => {
        const entry = req.result as PersistedChapterEntry | undefined;
        if (entry?.data && Array.isArray(entry.data.verses) && entry.data.verses.length > 0) {
          resolve(entry.data);
        } else {
          resolve(getLocalStorageFallback(cacheKey));
        }
      };
      req.onerror = () => {
        resolve(getLocalStorageFallback(cacheKey));
      };
    } catch {
      resolve(getLocalStorageFallback(cacheKey));
    }
  });
}

export async function persistChapter(cacheKey: string, data: ChapterData): Promise<void> {
  if (!data || !Array.isArray(data.verses) || data.verses.length === 0) return;

  const db = await openOfflineDb();
  if (!db) {
    setLocalStorageFallback(cacheKey, data);
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry: PersistedChapterEntry = {
        cacheKey,
        data,
        cachedAtMs: Date.now(),
      };
      store.put(entry);
      tx.oncomplete = () => {
        void pruneOldestIdbEntries(db);
        resolve();
      };
      tx.onerror = () => {
        setLocalStorageFallback(cacheKey, data);
        resolve();
      };
      tx.onabort = () => resolve();
    } catch {
      setLocalStorageFallback(cacheKey, data);
      resolve();
    }
  });
}

function getAllLocalStorageFallbacks(prefixFilter?: string): ChapterData[] {
  const results: ChapterData[] = [];
  try {
    if (typeof localStorage === 'undefined') return results;
    const rawIndex = localStorage.getItem(FALLBACK_INDEX_KEY);
    if (!rawIndex) return results;
    const indexList = JSON.parse(rawIndex) as string[];
    if (!Array.isArray(indexList)) return results;
    for (const cacheKey of indexList) {
      if (prefixFilter && !cacheKey.startsWith(prefixFilter)) continue;
      const chapter = getLocalStorageFallback(cacheKey);
      if (chapter) results.push(chapter);
    }
  } catch {
    // Ignore parse errors
  }
  return results;
}

export async function listAllPersistedChapters(translationPrefix?: string): Promise<ChapterData[]> {
  const db = await openOfflineDb();
  if (!db) {
    return getAllLocalStorageFallbacks(translationPrefix);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const entries = Array.isArray(req.result) ? (req.result as PersistedChapterEntry[]) : [];
        const chapters: ChapterData[] = [];
        for (const entry of entries) {
          if (translationPrefix && !entry.cacheKey?.startsWith(translationPrefix)) {
            continue;
          }
          if (entry?.data && Array.isArray(entry.data.verses) && entry.data.verses.length > 0) {
            chapters.push(entry.data);
          }
        }
        resolve(chapters.length > 0 ? chapters : getAllLocalStorageFallbacks(translationPrefix));
      };
      req.onerror = () => {
        resolve(getAllLocalStorageFallbacks(translationPrefix));
      };
    } catch {
      resolve(getAllLocalStorageFallbacks(translationPrefix));
    }
  });
}

