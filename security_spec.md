# BibleScroll Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership**: Only an authenticated, email-verified user (`request.auth.uid == userId && request.auth.token.email_verified == true`) may read, list, create, update, or delete `/users/{userId}` or its `likes`, `bookmarks`, `notes`, and `readBooks` subcollections.
2. **Master Gate**: Every `likes/{verseKey}`, `bookmarks/{verseKey}`, `notes/{verseKey}`, and `readBooks/{bookId}` write verifies that the parent `/users/{userId}` document exists (or exists after an atomic batch write).
3. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, `verseKey` (on `notes`), `bookId` (on `notes` & `readBooks`), and `createdAt` cannot be modified after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. **Strict Key & Size Bounds**: Every document enforces exact `keys().hasAll(...)` + `keys().hasOnly(...)` and `.size()` caps (`text`/`verseText <= 4000`, `noteText <= 2000`, `reference <= 60`, `bookName <= 40`, `versesMap.size() <= 2600`, `currentStreak`/`longestStreak <= 50000`, `lastReadDate <= 10`) to prevent shadow fields and resource exhaustion.
5. **Path-to-Data Consistency**: `userId` path variable must match `data.uid` / `data.ownerId`, `verseKey` path variable must match `data.verseKey` and conform to `^[A-Z0-9]{3}_[0-9]{1,3}_[0-9]{1,3}$`, and `bookId` path variable in `readBooks/{bookId}` must match `data.bookId` and conform to `^[A-Z0-9]{3}$`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated Read**: Read `/users/userA` or `/users/userA/notes/GEN_1_1` with `auth == null`.
2. **Cross-User Profile Read**: Authenticated `userB` attempts `get` on `/users/userA` or `/users/userA/notes/GEN_1_1`.
3. **Cross-User Subcollection List**: Authenticated `userB` attempts `list` on `/users/userA/bookmarks`, `/users/userA/notes`, or `/users/userA/readBooks`.
4. **Unverified Email Write**: Authenticated `userA` with `email_verified: false` attempts to create `/users/userA` or `/users/userA/notes/GEN_1_1`.
5. **Shadow Field Injection**: `userA` creates `/users/userA` or `/users/userA/notes/GEN_1_1` with extra field `isAdmin: true` or `role: "superadmin"`.
6. **Identity Spoofing**: `userA` writes `/users/userA/likes/GEN_1_1`, `/users/userA/notes/GEN_1_1`, or `/users/userA/readBooks/GEN` with `ownerId: "userB"`.
7. **Forged Timestamp**: `userA` creates or updates `/users/userA/notes/GEN_1_1` with a backdated `createdAt`/`updatedAt` not equal to `request.time`.
8. **Immutable Field Tampering**: `userA` updates `/users/userA` attempting to change `createdAt` or `uid`, or updates `notes/GEN_1_1` attempting to change `verseKey`, `bookId`, or `ownerId`.
9. **Resource Exhaustion (1MB Text / Map Poisoning)**: `userA` creates `/users/userA/notes/GEN_1_1` with `noteText` > 2000 characters or `verseText` > 4000 characters, or `readBooks/GEN` with `versesMap.size() > 2600`.
10. **Path ID Poisoning**: `userA` writes `/users/userA/notes/bad..key!!` or `/users/userA/readBooks/badbook` violating strict USFM patterns.
11. **Invalid Type / Enum Value**: `userA` writes `/users/userA/notes/GEN_1_1` with `noteKind: "diary"` or `translation: "NLT"`, or updates `/users/userA` with `smartGrouping: "yes"`.
12. **Orphaned Subcollection Write**: `userA` creates `/users/userA/notes/GEN_1_1` or `/users/userA/readBooks/GEN` without `/users/userA` existing (outside a batch).
