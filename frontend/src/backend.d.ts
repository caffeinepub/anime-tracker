import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface AnimeEntry {
    airedDate: string;
    title: string;
    description: string;
    airingStatus: string;
    anilistId: bigint;
    episodesAvailable: bigint;
    genres: Array<string>;
    publicRating: bigint;
    coverUrl: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface WatchlistEntry {
    personalRating: number;
    anime: AnimeEntry;
    notes: string;
    alternateTitles: Array<string>;
    isBookmarked: boolean;
    episodesWatched: bigint;
}
export interface Watchlist {
    entryCount: bigint;
    name: string;
    entries: Array<WatchlistEntry>;
    isPublic: boolean;
}
export interface UserWatchlists {
    watchlists: Array<Watchlist>;
}
export interface UserProfile {
    emailPublic: boolean;
    name: string;
    email: string;
    displaySettings: {
        boxSize: bigint;
        rowSize: bigint;
    };
}
export interface http_header {
    value: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addAnimeToWatchlist(watchlistName: string, anime: AnimeEntry, alternateTitles: Array<string>): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkLoginLockout(): Promise<boolean>;
    clearMyExpiredLockout(): Promise<void>;
    copyAnimeToWatchlist(fromWatchlist: string, toWatchlist: string, anilistId: bigint): Promise<void>;
    createWatchlist(name: string): Promise<void>;
    deleteWatchlist(watchlistName: string): Promise<void>;
    fetchAnimeFromAnilist(graphqlQuery: string): Promise<string>;
    filterAnimeByGenres(animeEntries: Array<AnimeEntry>, genres: Array<string>): Promise<Array<AnimeEntry>>;
    filterEntriesBySynopsis(watchlistName: string, searchText: string): Promise<Array<WatchlistEntry>>;
    getBookmarkedTitles(watchlistName: string): Promise<Array<WatchlistEntry> | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCallerWatchlists(): Promise<UserWatchlists | null>;
    getGlobalGenres(): Promise<Array<string>>;
    getRemainingLockoutTime(): Promise<bigint>;
    getSystemInfoContent(): Promise<string>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserWatchlists(user: Principal): Promise<UserWatchlists | null>;
    getWatchlistEntriesSortedByAiredDate(watchlistName: string, ascending: boolean): Promise<Array<WatchlistEntry>>;
    getWatchlistEntriesSortedByPersonalRating(watchlistName: string, ascending: boolean): Promise<Array<WatchlistEntry>>;
    getWatchlistEntriesSortedByTitle(watchlistName: string): Promise<Array<WatchlistEntry>>;
    getWatchlistNamesForAnime(anilistId: bigint): Promise<Array<string>>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    moveAnimeToWatchlist(fromWatchlist: string, toWatchlist: string, anilistId: bigint): Promise<void>;
    recordFailedLoginAttempt(): Promise<void>;
    removeAnimeFromWatchlist(watchlistName: string, anilistId: bigint): Promise<void>;
    resetLoginAttempts(): Promise<void>;
    retrievePersistentState(): Promise<Uint8Array | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setWatchlistPublic(watchlistName: string, isPublic: boolean): Promise<void>;
    sortAnimeEntries(animeEntries: Array<AnimeEntry>, sortBy: string, ascending: boolean): Promise<Array<AnimeEntry>>;
    storePersistentState(state: Uint8Array): Promise<void>;
    toggleBookmark(arg0: string, anilistId: bigint): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateGenres(arg0: string, anilistId: bigint, newGenres: Array<string>): Promise<void>;
    updateTotalEpisodes(anilistId: bigint, newTotalEpisodes: bigint): Promise<void>;
    updateWatchlistEntry(arg0: string, anilistId: bigint, personalRating: number, episodesWatched: bigint, notes: string): Promise<void>;
}
