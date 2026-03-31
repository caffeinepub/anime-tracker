import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, AlertCircle, RefreshCw, Clock, ArrowUpDown, Filter, Database, Trash2, Plus, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import AnimeGrid from '../components/AnimeGrid';
import CreateWatchlistDialog from '../components/CreateWatchlistDialog';
import { useFetchAnime, useSearchAnime, useGetUserWatchlists, useClearAnimeCache, useGetCacheStats } from '../hooks/useQueries';
import { Skeleton } from '@/components/ui/skeleton';
import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';

export default function MainPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(40);
  const [currentPage, setCurrentPage] = useState(1);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'title' | 'airedDate'>('title');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();
  const clearCache = useClearAnimeCache();
  const { data: cacheStats } = useGetCacheStats();

  const isAuthenticated = !!identity;

  // Fetch default anime list or search results
  const { 
    data: defaultAnime, 
    isLoading: defaultLoading, 
    error: defaultError,
    refetch: refetchDefault,
    isRefetching: isRefetchingDefault,
    failureCount: defaultFailureCount
  } = useFetchAnime(currentPage, itemsPerPage, sortOrder, selectedGenres, selectedStatus, sortBy);
  
  const { 
    data: searchResults, 
    isLoading: searchLoading, 
    error: searchError,
    refetch: refetchSearch,
    isRefetching: isRefetchingSearch,
    failureCount: searchFailureCount
  } = useSearchAnime(searchQuery, currentPage, itemsPerPage);
  
  const { data: userWatchlistsData } = useGetUserWatchlists();

  // Use search results if searching, otherwise use default anime list
  const animeData = searchQuery ? searchResults : defaultAnime;
  const isLoading = searchQuery ? searchLoading : defaultLoading;
  const error = searchQuery ? searchError : defaultError;
  const refetch = searchQuery ? refetchSearch : refetchDefault;
  const isRefetching = searchQuery ? isRefetchingSearch : isRefetchingDefault;
  const failureCount = searchQuery ? searchFailureCount : defaultFailureCount;

  const processedAnimeList = animeData?.media || [];

  // Get all unique genres from current anime list
  const availableGenres = useMemo(() => {
    if (!animeData?.media) return [];
    const genreSet = new Set<string>();
    animeData.media.forEach((anime: any) => {
      anime.genres?.forEach((genre: string) => genreSet.add(genre));
    });
    return Array.from(genreSet).sort();
  }, [animeData]);

  // Status options with user-friendly labels
  const statusOptions = [
    { value: 'RELEASING', label: 'Currently Airing' },
    { value: 'FINISHED', label: 'Finished' },
    { value: 'NOT_YET_RELEASED', label: 'Not Yet Released' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'HIATUS', label: 'Hiatus' },
  ];

  // Handle retry countdown for rate limiting
  useEffect(() => {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as any).message || '';
      if (message.includes('RATE_LIMIT:')) {
        const waitTime = parseInt(message.split('RATE_LIMIT: ')[1], 10);
        setRetryCountdown(Math.ceil(waitTime / 1000));
        
        const interval = setInterval(() => {
          setRetryCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
    setRetryCountdown(null);
  }, [error]);

  const handleSearch = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else if (prev.length < 5) {
        return [...prev, genre];
      }
      return prev;
    });
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status === 'all' ? '' : status);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedGenres([]);
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const handleClearCache = () => {
    clearCache();
    toast.success('Cache cleared successfully', {
      description: 'All cached anime data has been removed. Fresh data will be fetched from the API.',
    });
  };

  const animeInWatchlists = useMemo(() => {
    if (!userWatchlistsData?.watchlists) return new Set<number>();
    const ids = new Set<number>();
    userWatchlistsData.watchlists.forEach(watchlist => {
      watchlist.entries.forEach(entry => {
        ids.add(Number(entry.anime.anilistId));
      });
    });
    return ids;
  }, [userWatchlistsData]);

  // Get pagination info from API response
  const pageInfo = animeData?.pageInfo;
  const totalPages = pageInfo?.lastPage || 1;
  const hasNextPage = pageInfo?.hasNextPage || false;

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Determine error type for better messaging
  const getErrorMessage = (err: any): { title: string; description: string; canRetry: boolean; isRateLimit: boolean } => {
    const message = err?.message || String(err);
    
    if (message.includes('RATE_LIMIT:')) {
      const waitTime = parseInt(message.split('RATE_LIMIT: ')[1], 10);
      return {
        title: 'Rate Limit Reached',
        description: `The Anilist API enforces a limit of 90 requests per minute. Please wait ${Math.ceil(waitTime / 1000)} seconds before the request is automatically retried.`,
        canRetry: true,
        isRateLimit: true
      };
    }
    
    if (message.includes('Rate limit exceeded')) {
      return {
        title: 'Rate Limit Exceeded',
        description: 'You have exceeded the rate limit of 90 requests per minute. The request will be automatically retried shortly.',
        canRetry: true,
        isRateLimit: true
      };
    }
    
    if (message.includes('ANILIST_ERROR:')) {
      return {
        title: 'Anilist API Error',
        description: message.replace('ANILIST_ERROR: ', ''),
        canRetry: true,
        isRateLimit: false
      };
    }
    
    if (message.includes('PARSE_ERROR:') || message.includes('Invalid response')) {
      return {
        title: 'API Response Error',
        description: 'The Anilist API returned unexpected data. This is usually temporary and may be due to high traffic or rate limiting. The request will be automatically retried.',
        canRetry: true,
        isRateLimit: false
      };
    }
    
    if (message.includes('MISSING_DATA:')) {
      return {
        title: 'No Data Available',
        description: 'The API response did not contain anime data. This may be temporary - please try again.',
        canRetry: true,
        isRateLimit: false
      };
    }
    
    if (message.includes('API_ERROR:')) {
      return {
        title: 'API Connection Error',
        description: message.replace('API_ERROR: ', ''),
        canRetry: true,
        isRateLimit: false
      };
    }
    
    return {
      title: 'Error Loading Anime',
      description: `Failed to fetch anime from Anilist API. ${message}`,
      canRetry: true,
      isRateLimit: false
    };
  };

  // Show loading state while actor is initializing
  if (actorFetching || !actor) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
            Keep track of your anime body count.
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover, track, and manage your anime journey
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Connecting to backend...</p>
          </div>
        </div>
      </div>
    );
  }

  const errorInfo = error ? getErrorMessage(error) : null;

  // Get the display label for the selected status
  const selectedStatusLabel = statusOptions.find(opt => opt.value === selectedStatus)?.label || selectedStatus;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
          Keep track of your anime body count.
        </h1>
        <p className="text-muted-foreground text-lg">
          Discover, track, and manage your anime journey
        </p>
      </div>

      {/* Search and Display Controls */}
      <div className="bg-card/50 backdrop-blur-sm rounded-lg p-6 space-y-4 border border-border/50 shadow-lg">
        <div className="flex gap-4 flex-wrap items-end">
          <div className="flex-1 min-w-[300px]">
            <label className="text-sm font-medium mb-2 block">Search Anime</label>
            <div className="flex gap-2">
              <Input
                placeholder="Search for anime..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
                disabled={isLoading || isRefetching}
              />
              <Button onClick={handleSearch} disabled={isLoading || isRefetching}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              {searchQuery && (
                <Button onClick={handleClearSearch} variant="outline" disabled={isLoading || isRefetching}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange} disabled={isLoading || isRefetching}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent className="main-page-dropdown-content">
              <SelectItem value="40">40 per page</SelectItem>
              <SelectItem value="80">80 per page</SelectItem>
              <SelectItem value="120">120 per page</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By Selector */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select 
              value={sortBy} 
              onValueChange={(v) => { 
                setSortBy(v as 'title' | 'airedDate'); 
                setCurrentPage(1); 
              }} 
              disabled={isLoading || isRefetching}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="main-page-dropdown-content">
                <SelectItem value="title">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    <span>Title</span>
                  </div>
                </SelectItem>
                <SelectItem value="airedDate">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Aired Date</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order Controls */}
          <div className="flex gap-2 items-center">
            <Select 
              value={sortOrder} 
              onValueChange={(v) => { 
                setSortOrder(v as 'asc' | 'desc'); 
                setCurrentPage(1); 
              }} 
              disabled={isLoading || isRefetching}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent className="main-page-dropdown-content">
                <SelectItem value="asc">
                  {sortBy === 'title' ? 'A-Z' : 'Oldest First'}
                </SelectItem>
                <SelectItem value="desc">
                  {sortBy === 'title' ? 'Z-A' : 'Newest First'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <Select value={selectedStatus || 'all'} onValueChange={handleStatusChange} disabled={isLoading || isRefetching}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="main-page-dropdown-content">
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Genre Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={isLoading || isRefetching}>
                <Filter className="w-4 h-4 mr-2" />
                Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96 overflow-y-auto bg-black border-4 border-yellow-500 text-white genre-filter-popup">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filter by Genre (max 5)</h4>
                  {selectedGenres.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                      Clear
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {availableGenres.map((genre) => (
                    <div key={genre} className="flex items-center space-x-2">
                      <Checkbox
                        id={genre}
                        checked={selectedGenres.includes(genre)}
                        onCheckedChange={() => handleGenreToggle(genre)}
                        disabled={!selectedGenres.includes(genre) && selectedGenres.length >= 5}
                      />
                      <Label
                        htmlFor={genre}
                        className="text-sm font-normal cursor-pointer text-white"
                      >
                        {genre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear All Filters */}
          {(selectedGenres.length > 0 || selectedStatus) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear All Filters
            </Button>
          )}

          {/* Cache Management */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Database className="w-4 h-4 mr-2" />
                Cache
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 cache-dropdown-content">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Local Cache Statistics</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Entries: {cacheStats?.entries || 0}</p>
                    <p>Size: {cacheStats?.sizeFormatted || '0 MB'}</p>
                    <p>Limit: 20 GB</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Data is cached locally on your device using IndexedDB for improved performance and offline access.
                  </p>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleClearCache}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cache
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Create Watchlist Button */}
          {isAuthenticated && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              variant="default"
              className="ml-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Watchlist
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {(selectedGenres.length > 0 || selectedStatus) && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {selectedStatus && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => handleStatusChange('all')}>
                Status: {selectedStatusLabel} ×
              </Badge>
            )}
            {selectedGenres.map((genre) => (
              <Badge key={genre} variant="secondary" className="cursor-pointer" onClick={() => handleGenreToggle(genre)}>
                {genre} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Rate Limit Warning with Countdown */}
      {errorInfo?.isRateLimit && retryCountdown !== null && (
        <Alert className="border-yellow-500 bg-yellow-500/10">
          <Clock className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Respecting API Rate Limits</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Please wait, respecting the 90 requests per minute limit...</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Automatically retrying in {retryCountdown} second{retryCountdown !== 1 ? 's' : ''}...</span>
              </div>
            </div>
            {failureCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Retry attempt {failureCount} of 3
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert (non-rate-limit errors) */}
      {errorInfo && !errorInfo.isRateLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errorInfo.title}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{errorInfo.description}</p>
            {errorInfo.canRetry && (
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="bg-background"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                  {isRefetching ? 'Retrying...' : 'Retry Now'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Tip: Wait a few seconds before retrying to avoid rate limits
                </span>
              </div>
            )}
            {failureCount > 0 && (
              <p className="text-xs mt-2">
                Retry attempt {failureCount} of 3
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Refetching Indicator */}
      {isRefetching && !isLoading && !errorInfo?.isRateLimit && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Refreshing anime data...</span>
        </div>
      )}

      {/* Results */}
      {isLoading && !isRefetching ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: itemsPerPage > 40 ? 40 : itemsPerPage }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-lg" />
          ))}
        </div>
      ) : error && !isRefetching ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            {errorInfo?.isRateLimit 
              ? 'Waiting for rate limit to clear...' 
              : 'Unable to load anime. Please check the error message above and try again.'}
          </p>
        </div>
      ) : processedAnimeList.length > 0 ? (
        <>
          <AnimeGrid 
            animeList={processedAnimeList} 
            boxSizeMultiplier={1}
            animeInWatchlists={animeInWatchlists}
          />
          
          {/* Pagination */}
          <div className="flex justify-center gap-2 items-center flex-wrap">
            <Button
              variant="outline"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || isLoading || isRefetching}
            >
              First
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading || isRefetching}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNextPage || currentPage >= totalPages || isLoading || isRefetching}
            >
              Next
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || isLoading || isRefetching}
            >
              Last
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">
            {searchQuery ? 'No anime found. Try a different search term.' : (selectedGenres.length > 0 || selectedStatus) ? 'No anime match the selected filters.' : 'No anime available.'}
          </p>
        </div>
      )}

      <CreateWatchlistDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
