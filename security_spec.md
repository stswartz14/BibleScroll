# BibleScroll Firestore Security Specification

## 1. Data Invariants
1. **Strict Ownership**: Only an authenticated, email-verified user (`request.auth.uid == userId && request.auth.token.email_verified == true`) may read, list, create, update, or delete `/users/{userId}` or its `likes` and `bookmarks` subcollections.
2. **Master Gate**: Every `likes/{verseKey}` and `bookmarks/{verseKey}` write verifies that the parent `/users/{userId}` document exists (or exists after an atomic batch write).
3. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, and `createdAt` cannot be modified after creation; `createdAt` and `updatedAt` must equal `request.time`.
4. **Strict Key & Size Bounds**: Every document enforces exact `keys().hasAll(...)` + `keys().hasOnly(...)` and `.size()` caps (`text <= 4000`, `reference <= 60`, `bookName <= 40`) to prevent shadow fields and resource exhaustion.
5. **Path-to-Data Consistency**: `userId` path variable must match `data.uid` / `data.ownerId`, and `verseKey` path variable must match `data.verseKey` and conform to `^[A-Z0-9]{3}_[0-9]{1,3}_[0-9]{1,3}$`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated Read**: Read `/users/userA` with `auth == null`.
2. **Cross-User Profile Read**: Authenticated `userB` attempts `get` on `/users/userA`.
3. **Cross-User Subcollection List**: Authenticated `userB` attempts `list` on `/users/userA/bookmarks`.
4. **Unverified Email Write**: Authenticated `userA` with `email_verified: false` attempts to create `/users/userA`.
5. **Shadow Field Injection**: `userA` creates `/users/userA` with extra field `isAdmin: true` or `role: "superadmin"`.
6. **Identity Spoofing**: `userA` writes `/users/userA/likes/GEN_1_1` with `ownerId: "userB"`.
7. **Forged Timestamp**: `userA` creates `/users/userA/bookmarks/GEN_1_1` with a backdated `createdAt` not equal to `request.time`.
8. **Immutable Field Tampering**: `userA` updates `/users/userA` attempting to change `createdAt` or `uid`.
9. **Resource Exhaustion (1MB Text Poisoning)**: `userA` creates `/users/userA/bookmarks/GEN_1_1` with `text` > 4000 characters.
10. **Path ID Poisoning**: `userA` writes `/users/userA/likes/bad..key!!` violating `^[A-Z0-9]{3}_[0-9]{1,3}_[0-9]{1,3}$`.
11. **Invalid Enum Value**: `userA` updates `/users/userA` with `translation: "NLT"` or arbitrary string outside `['BSB', 'WEB']`.
12. **Orphaned Subcollection Write**: `userA` creates `/users/userA/bookmarks/GEN_1_1` without `/users/userA` existing (outside a batch).
