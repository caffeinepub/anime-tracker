import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, Watchlist, WatchlistEntry, AnimeEntry } from '../backend';
import { indexedDBCache } from '../lib/indexedDBCache';

// Type definitions for anime data matching AnimeGrid expectations
interface AnimeData {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  status: string;
  startDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  description: string | null;
}

interface AnimeResponse {
  pageInfo: {
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
    perPage: number;
  };
  media: AnimeData[];
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Watchlist Queries
export function useGetUserWatchlists() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{ watchlists: Watchlist[] } | null>({
    queryKey: ['userWatchlists'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerWatchlists();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
  });
}

export function useGetWatchlistNamesForAnime(anilistId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['watchlistNamesForAnime', anilistId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getWatchlistNamesForAnime(anilistId);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 1000 * 60,
  });
}

export function useCreateWatchlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createWatchlist(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
    },
  });
}

export function useDeleteWatchlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (watchlistName: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteWatchlist(watchlistName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
    },
  });
}

export function useAddAnimeToWatchlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      watchlistName, 
      anime, 
      alternateTitles 
    }: { 
      watchlistName: string; 
      anime: AnimeEntry; 
      alternateTitles: string[] 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addAnimeToWatchlist(watchlistName, anime, alternateTitles);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      queryClient.invalidateQueries({ queryKey: ['globalGenres'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistNamesForAnime'] });
    },
  });
}

export function useRemoveAnimeFromWatchlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ watchlistName, anilistId }: { watchlistName: string; anilistId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeAnimeFromWatchlist(watchlistName, anilistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistNamesForAnime'] });
    },
  });
}

export function useUpdateWatchlistEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      watchlistName, 
      anilistId, 
      personalRating, 
      episodesWatched, 
      notes 
    }: { 
      watchlistName: string; 
      anilistId: bigint; 
      personalRating: number; 
      episodesWatched: bigint; 
      notes: string 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateWatchlistEntry(watchlistName, anilistId, personalRating, episodesWatched, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
    },
  });
}

export function useUpdateGenres() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      watchlistName, 
      anilistId, 
      newGenres 
    }: { 
      watchlistName: string; 
      anilistId: bigint; 
      newGenres: string[] 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateGenres(watchlistName, anilistId, newGenres);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      queryClient.invalidateQueries({ queryKey: ['globalGenres'] });
    },
  });
}

export function useGetGlobalGenres() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['globalGenres'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getGlobalGenres();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 1000 * 60 * 5,
  });
}

export function useToggleBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ watchlistName, anilistId }: { watchlistName: string; anilistId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleBookmark(watchlistName, anilistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
    },
  });
}

export function useGetBookmarkedTitles(watchlistName: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<WatchlistEntry[] | null>({
    queryKey: ['bookmarkedTitles', watchlistName],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getBookmarkedTitles(watchlistName);
    },
    enabled: !!actor && !actorFetching && !!watchlistName,
  });
}

export function useSetWatchlistPublic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ watchlistName, isPublic }: { watchlistName: string; isPublic: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setWatchlistPublic(watchlistName, isPublic);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
    },
  });
}

export function useMoveAnimeToWatchlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fromWatchlist, 
      toWatchlist, 
      anilistId 
    }: { 
      fromWatchlist: string; 
      toWatchlist: string; 
      anilistId: bigint 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.moveAnimeToWatchlist(fromWatchlist, toWatchlist, anilistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistNamesForAnime'] });
    },
  });
}

export function useCopyAnimeToWatchlist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fromWatchlist, 
      toWatchlist, 
      anilistId 
    }: { 
      fromWatchlist: string; 
      toWatchlist: string; 
      anilistId: bigint 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.copyAnimeToWatchlist(fromWatchlist, toWatchlist, anilistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
      queryClient.invalidateQueries({ queryKey: ['watchlistNamesForAnime'] });
    },
  });
}

export function useUpdateTotalEpisodes() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ anilistId, newTotalEpisodes }: { anilistId: bigint; newTotalEpisodes: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateTotalEpisodes(anilistId, newTotalEpisodes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlists'] });
    },
  });
}

// Anime Fetching with IndexedDB Caching
export function useFetchAnime(
  page: number, 
  perPage: number, 
  sortOrder: 'asc' | 'desc', 
  genres: string[], 
  status: string,
  sortBy: 'title' | 'airedDate' = 'title'
) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AnimeResponse>({
    queryKey: ['anime', page, perPage, sortOrder, genres, status, sortBy],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');

      const cacheKey = `anime_${page}_${perPage}_${sortOrder}_${genres.join(',')}_${status}_${sortBy}`;
      const cached = await indexedDBCache.get<AnimeResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const query = `
        query ($page: Int, $perPage: Int, ${status ? '$status: MediaStatus,' : ''} ${genres.length > 0 ? '$genres: [String],' : ''}) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              total
              currentPage
              lastPage
              hasNextPage
              perPage
            }
            media(type: ANIME, ${status ? 'status: $status,' : ''} ${genres.length > 0 ? 'genre_in: $genres,' : ''} sort: TITLE_ROMAJI) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                medium
              }
              genres
              averageScore
              episodes
              status
              startDate {
                year
                month
                day
              }
              description
            }
          }
        }
      `;

      const variables: any = {
        page,
        perPage,
      };

      if (status) {
        variables.status = status;
      }

      if (genres.length > 0) {
        variables.genres = genres;
      }

      const graphqlQuery = JSON.stringify({
        query,
        variables,
      });

      const response = await actor.fetchAnimeFromAnilist(graphqlQuery);
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (e) {
        throw new Error(`PARSE_ERROR: Invalid JSON response from Anilist API`);
      }

      if (parsedResponse.errors) {
        const errorMessage = parsedResponse.errors[0]?.message || 'Unknown error';
        if (errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')) {
          throw new Error(`RATE_LIMIT: 60000`);
        }
        throw new Error(`ANILIST_ERROR: ${errorMessage}`);
      }

      if (!parsedResponse.data?.Page?.media) {
        throw new Error('MISSING_DATA: No anime data in response');
      }

      const animeData: AnimeData[] = parsedResponse.data.Page.media.map((anime: any) => ({
        id: anime.id,
        title: {
          romaji: anime.title.romaji || 'Unknown',
          english: anime.title.english || null,
          native: anime.title.native || 'Unknown',
        },
        coverImage: {
          large: anime.coverImage.large || '',
          medium: anime.coverImage.medium || '',
        },
        genres: anime.genres || [],
        averageScore: anime.averageScore || null,
        episodes: anime.episodes || null,
        status: anime.status || 'UNKNOWN',
        startDate: {
          year: anime.startDate?.year || null,
          month: anime.startDate?.month || null,
          day: anime.startDate?.day || null,
        },
        description: anime.description || null,
      }));

      // Convert to AnimeEntry format for backend sorting
      const animeEntries: AnimeEntry[] = animeData.map((anime) => ({
        anilistId: BigInt(anime.id),
        title: anime.title.english || anime.title.romaji,
        coverUrl: anime.coverImage.large,
        genres: anime.genres,
        publicRating: BigInt(anime.averageScore || 0),
        episodesAvailable: BigInt(anime.episodes || 0),
        airingStatus: anime.status,
        airedDate: anime.startDate.year 
          ? `${anime.startDate.year}${anime.startDate.month ? '-' + String(anime.startDate.month).padStart(2, '0') : ''}${anime.startDate.day ? '-' + String(anime.startDate.day).padStart(2, '0') : ''}`
          : '',
        description: anime.description || '',
      }));

      // Sort using backend
      const sortedEntries = await actor.sortAnimeEntries(animeEntries, sortBy, sortOrder === 'asc');

      // Convert back to frontend format, maintaining the original structure
      const sortedAnimeData = sortedEntries.map((entry: AnimeEntry) => {
        const originalAnime = animeData.find((a) => a.id === Number(entry.anilistId));
        return originalAnime!;
      });

      const result: AnimeResponse = {
        pageInfo: parsedResponse.data.Page.pageInfo,
        media: sortedAnimeData,
      };

      await indexedDBCache.set(cacheKey, result);

      return result;
    },
    enabled: !!actor && !actorFetching,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useSearchAnime(searchTerm: string, page: number, perPage: number) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AnimeResponse>({
    queryKey: ['searchAnime', searchTerm, page, perPage],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      if (!searchTerm) return { pageInfo: { total: 0, currentPage: 1, lastPage: 1, hasNextPage: false, perPage }, media: [] };

      const cacheKey = `search_${searchTerm}_${page}_${perPage}`;
      const cached = await indexedDBCache.get<AnimeResponse>(cacheKey);
      
      if (cached) {
        return cached;
      }

      const query = `
        query ($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo {
              total
              currentPage
              lastPage
              hasNextPage
              perPage
            }
            media(search: $search, type: ANIME) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                medium
              }
              genres
              averageScore
              episodes
              status
              startDate {
                year
                month
                day
              }
              description
            }
          }
        }
      `;

      const variables = {
        search: searchTerm,
        page,
        perPage,
      };

      const graphqlQuery = JSON.stringify({
        query,
        variables,
      });

      const response = await actor.fetchAnimeFromAnilist(graphqlQuery);
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (e) {
        throw new Error(`PARSE_ERROR: Invalid JSON response from Anilist API`);
      }

      if (parsedResponse.errors) {
        const errorMessage = parsedResponse.errors[0]?.message || 'Unknown error';
        if (errorMessage.includes('Too Many Requests') || errorMessage.includes('rate limit')) {
          throw new Error(`RATE_LIMIT: 60000`);
        }
        throw new Error(`ANILIST_ERROR: ${errorMessage}`);
      }

      if (!parsedResponse.data?.Page?.media) {
        throw new Error('MISSING_DATA: No anime data in response');
      }

      const animeData: AnimeData[] = parsedResponse.data.Page.media.map((anime: any) => ({
        id: anime.id,
        title: {
          romaji: anime.title.romaji || 'Unknown',
          english: anime.title.english || null,
          native: anime.title.native || 'Unknown',
        },
        coverImage: {
          large: anime.coverImage.large || '',
          medium: anime.coverImage.medium || '',
        },
        genres: anime.genres || [],
        averageScore: anime.averageScore || null,
        episodes: anime.episodes || null,
        status: anime.status || 'UNKNOWN',
        startDate: {
          year: anime.startDate?.year || null,
          month: anime.startDate?.month || null,
          day: anime.startDate?.day || null,
        },
        description: anime.description || null,
      }));

      const result: AnimeResponse = {
        pageInfo: parsedResponse.data.Page.pageInfo,
        media: animeData,
      };

      await indexedDBCache.set(cacheKey, result);

      return result;
    },
    enabled: !!actor && !actorFetching && !!searchTerm,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Cache Management
export function useClearAnimeCache() {
  return () => {
    indexedDBCache.clear();
  };
}

export function useGetCacheStats() {
  return useQuery({
    queryKey: ['cacheStats'],
    queryFn: async () => {
      return indexedDBCache.getStats();
    },
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}

// Login Rate Limiting
export function useCheckLoginLockout() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['loginLockout'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.checkLoginLockout();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 1000,
  });
}

export function useGetRemainingLockoutTime() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['remainingLockoutTime'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getRemainingLockoutTime();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 1000,
  });
}

export function useRecordFailedLoginAttempt() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordFailedLoginAttempt();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loginLockout'] });
      queryClient.invalidateQueries({ queryKey: ['remainingLockoutTime'] });
    },
  });
}

export function useResetLoginAttempts() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.resetLoginAttempts();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loginLockout'] });
      queryClient.invalidateQueries({ queryKey: ['remainingLockoutTime'] });
    },
  });
}

export function useClearExpiredLockout() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.clearMyExpiredLockout();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loginLockout'] });
      queryClient.invalidateQueries({ queryKey: ['remainingLockoutTime'] });
    },
  });
}
