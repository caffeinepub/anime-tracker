# Anime Tracker

## Current State
- `CreateAnimeCardDialog.tsx` generates custom IDs using `BigInt(-Date.now())` (negative), which fails the backend's `nat` type requirement.
- `WatchlistEntryDialog.tsx` shows entry details but has no way to sync/replace a custom card with real AniList data.
- AniList search is available via `actor.fetchAnimeFromAnilist(graphqlQuery)` in `useQueries.ts`.

## Requested Changes (Diff)

### Add
- "Sync with AniList" button in `WatchlistEntryDialog` for custom cards (identified by `airingStatus === "CUSTOM"`).
- AniList search modal/inline section that lets user search by title, pick a result, and confirm merging.
- Merge logic: remove old custom entry, re-add with real AniList metadata, restore personal data (notes, personalRating, episodesWatched, bookmarks).

### Modify
- `CreateAnimeCardDialog.tsx`: change `BigInt(-Date.now())` to `BigInt(Date.now())` to produce a valid positive `nat` ID.

### Remove
- Nothing.

## Implementation Plan
1. Fix `CreateAnimeCardDialog.tsx`: replace negative ID with positive `BigInt(Date.now())`.
2. In `WatchlistEntryDialog.tsx`, add a "Sync with AniList" button visible only when `entry.anime.airingStatus === 'CUSTOM'`.
3. When clicked, show an inline search field; on submit, call `actor.fetchAnimeFromAnilist` with a title search query.
4. Display search results as a list of small cards (cover + title + year).
5. When user selects a result, show a confirmation step showing what will change.
6. On confirm: call `removeAnimeFromWatchlist` for old ID, then `addAnimeToWatchlist` with AniList data, then `updateWatchlistEntry` to restore personal data, then `toggleBookmark` if was bookmarked.
7. All mutations are frontend-only — no backend schema changes needed.
