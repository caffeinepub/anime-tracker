import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import CreateAnimeCardDialog from "../components/CreateAnimeCardDialog";
import CreateWatchlistDialog from "../components/CreateWatchlistDialog";
import SystemInfoPanel from "../components/SystemInfoPanel";
import WatchlistView from "../components/WatchlistView";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useDeleteWatchlist, useGetUserWatchlists } from "../hooks/useQueries";

type SortOption =
  | "none"
  | "alphabetical"
  | "rating"
  | "episodes"
  | "personalRating"
  | "airedDate";
type SortDirection = "asc" | "desc";

export default function MyWatchlistsPage() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const {
    data: userWatchlistsData,
    isLoading: watchlistsLoading,
    isError: watchlistsError,
    error: watchlistsErrorDetails,
    refetch,
  } = useGetUserWatchlists();
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(
    null,
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateAnimeCard, setShowCreateAnimeCard] = useState(false);
  const [watchlistToDelete, setWatchlistToDelete] = useState<string | null>(
    null,
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageJump, setPageJump] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  const [notesSearch, setNotesSearch] = useState("");
  const [synopsisSearch, setSynopsisSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isControlPanelCollapsed, setIsControlPanelCollapsed] = useState(false);

  const deleteWatchlistMutation = useDeleteWatchlist();

  const isAuthenticated = !!identity;
  const isConnecting = actorFetching || watchlistsLoading;
  const hasActorError = !actor && !actorFetching;

  const watchlists = userWatchlistsData?.watchlists || [];
  const currentWatchlist = watchlists.find((w) => w.name === selectedWatchlist);

  // Get all unique genres from current watchlist
  const availableGenres = useMemo(() => {
    if (!currentWatchlist) return [];
    const genreSet = new Set<string>();
    for (const entry of currentWatchlist.entries) {
      for (const genre of entry.anime.genres) genreSet.add(genre);
    }
    return Array.from(genreSet).sort();
  }, [currentWatchlist]);

  // Filter and sort entries
  const filteredAndSortedEntries = useMemo(() => {
    if (!currentWatchlist) return [];

    let entries = [...currentWatchlist.entries];

    // Apply bookmark filter
    if (showBookmarkedOnly) {
      entries = entries.filter((entry) => entry.isBookmarked);
    }

    // Apply genre filter
    if (selectedGenres.length > 0) {
      entries = entries.filter((entry) => {
        return selectedGenres.every((selectedGenre) =>
          entry.anime.genres.includes(selectedGenre),
        );
      });
    }

    // Apply title search filter
    if (titleSearch.trim()) {
      const searchLower = titleSearch.toLowerCase();
      entries = entries.filter((entry) => {
        const titleMatch = entry.anime.title
          .toLowerCase()
          .includes(searchLower);
        const alternateMatch = entry.alternateTitles.some((alt) =>
          alt.toLowerCase().includes(searchLower),
        );
        return titleMatch || alternateMatch;
      });
    }

    // Apply notes search filter
    if (notesSearch.trim()) {
      const searchLower = notesSearch.toLowerCase();
      entries = entries.filter((entry) =>
        entry.notes.toLowerCase().includes(searchLower),
      );
    }

    // Apply synopsis search filter
    if (synopsisSearch.trim()) {
      const searchLower = synopsisSearch.toLowerCase();
      entries = entries.filter((entry) =>
        entry.anime.description.toLowerCase().includes(searchLower),
      );
    }

    // Apply sorting
    if (sortBy !== "none") {
      entries = [...entries].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "alphabetical":
            comparison = a.anime.title.localeCompare(b.anime.title);
            break;
          case "rating":
            comparison =
              Number(a.anime.publicRating) - Number(b.anime.publicRating);
            break;
          case "episodes":
            comparison = Number(a.episodesWatched) - Number(b.episodesWatched);
            break;
          case "personalRating":
            comparison = a.personalRating - b.personalRating;
            break;
          case "airedDate": {
            // Sort by aired date, handling empty dates
            const aDate = a.anime.airedDate || "";
            const bDate = b.anime.airedDate || "";

            // Empty dates go to the end
            if (!aDate && !bDate) {
              comparison = 0;
            } else if (!aDate) {
              comparison = 1;
            } else if (!bDate) {
              comparison = -1;
            } else {
              comparison = aDate.localeCompare(bDate);
            }
            break;
          }
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return entries;
  }, [
    currentWatchlist,
    selectedGenres,
    showBookmarkedOnly,
    titleSearch,
    notesSearch,
    synopsisSearch,
    sortBy,
    sortDirection,
  ]);

  // Pagination
  const itemsPerPage = 30;
  const totalPages = Math.ceil(filteredAndSortedEntries.length / itemsPerPage);
  const paginatedEntries = filteredAndSortedEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      }
      return [...prev, genre];
    });
    setCurrentPage(1);
  };

  const handlePageJump = () => {
    const page = Number.parseInt(pageJump, 10);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageJump("");
    } else {
      toast.error(`Please enter a page number between 1 and ${totalPages}`);
    }
  };

  const handleDeleteWatchlist = async () => {
    if (!watchlistToDelete) return;

    try {
      await deleteWatchlistMutation.mutateAsync(watchlistToDelete);
      toast.success("Watchlist deleted successfully");

      if (selectedWatchlist === watchlistToDelete) {
        setSelectedWatchlist(null);
      }

      setWatchlistToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete watchlist");
    }
  };

  const handleRetry = () => {
    refetch();
  };

  // Helper to get sort label
  const getSortLabel = (sortOption: SortOption): string => {
    switch (sortOption) {
      case "alphabetical":
        return "Title";
      case "personalRating":
        return "Personal Rating";
      case "rating":
        return "Public Rating";
      case "episodes":
        return "Episodes Watched";
      case "airedDate":
        return "Aired Date";
      default:
        return "";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">
            Please log in to view your watchlists
          </h2>
          <p className="text-muted-foreground">
            Create an account to start tracking your anime journey!
          </p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (hasActorError || watchlistsError) {
    return (
      <div className="container mx-auto px-4">
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              {hasActorError
                ? "Failed to connect to backend. Please check your connection and try again."
                : `Failed to load watchlists: ${watchlistsErrorDetails?.message || "Unknown error"}`}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isConnecting) {
    return (
      <div className="container mx-auto px-4">
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">
                {actorFetching
                  ? "Connecting to backend..."
                  : "Loading watchlists..."}
              </p>
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            My Ani Body Count
          </h1>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Watchlist
          </Button>
        </div>

        {/* System Information Panel - Hidden by default */}
        <SystemInfoPanel />

        {watchlists.length === 0 ? (
          <div className="text-center py-16 bg-black rounded-lg border-4 border-yellow-500">
            <h2 className="text-2xl font-bold mb-4">No watchlists yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first watchlist to start tracking anime!
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Watchlist
            </Button>
          </div>
        ) : (
          <>
            {/* Freeze Control Panel - Fixed positioning detached from scroll container */}
            <div
              className="fixed top-0 left-0 right-0 z-40 bg-background pt-4 pb-4"
              style={{ marginTop: "64px" }}
            >
              <div className="container mx-auto px-4">
                <div className="bg-black rounded-lg border-4 border-yellow-500 overflow-hidden transition-all duration-300 ease-in-out shadow-lg">
                  {/* Collapsed State - Minimal Bar */}
                  {isControlPanelCollapsed ? (
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-sm font-medium text-yellow-500">
                          {selectedWatchlist
                            ? `${selectedWatchlist} (${filteredAndSortedEntries.length} titles)`
                            : "Select a watchlist"}
                        </span>
                        {selectedWatchlist && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {showBookmarkedOnly && <span>• Bookmarked</span>}
                            {selectedGenres.length > 0 && (
                              <span>
                                • {selectedGenres.length} genre
                                {selectedGenres.length > 1 ? "s" : ""}
                              </span>
                            )}
                            {sortBy !== "none" && (
                              <span>• Sorted by {getSortLabel(sortBy)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsControlPanelCollapsed(false)}
                        className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                      >
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Expand
                      </Button>
                    </div>
                  ) : (
                    /* Expanded State - Full Controls */
                    <div className="p-6 space-y-4">
                      {/* Header with Collapse Button */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-yellow-500">
                          Watchlist Controls
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsControlPanelCollapsed(true)}
                          className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                        >
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Collapse
                        </Button>
                      </div>

                      <div className="flex gap-4 flex-wrap items-end">
                        <div className="flex-1 min-w-[200px]">
                          <label
                            htmlFor="watchlist-select"
                            className="text-sm font-medium mb-2 block"
                          >
                            Select Watchlist
                          </label>
                          <div className="flex gap-2">
                            <Select
                              value={selectedWatchlist || ""}
                              onValueChange={(value) => {
                                setSelectedWatchlist(value);
                                setSelectedGenres([]);
                                setShowBookmarkedOnly(false);
                                setCurrentPage(1);
                                setTitleSearch("");
                                setNotesSearch("");
                                setSynopsisSearch("");
                                setSortBy("alphabetical");
                                setSortDirection("asc");
                              }}
                            >
                              <SelectTrigger
                                id="watchlist-select"
                                className="flex-1 bg-black border-2 border-yellow-600 text-white"
                              >
                                <SelectValue placeholder="Choose a watchlist" />
                              </SelectTrigger>
                              <SelectContent className="bg-black border-2 border-yellow-600 text-white watchlist-dropdown-content">
                                {watchlists.map((watchlist) => (
                                  <SelectItem
                                    key={watchlist.name}
                                    value={watchlist.name}
                                    className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                  >
                                    {watchlist.name} ({watchlist.entries.length}
                                    )
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {selectedWatchlist && (
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() =>
                                  setWatchlistToDelete(selectedWatchlist)
                                }
                                title="Delete watchlist"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Create Anime Card Button */}
                        {selectedWatchlist && (
                          <Button
                            onClick={() => setShowCreateAnimeCard(true)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shrink-0"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Anime Card
                          </Button>
                        )}
                        {/* Bookmark Filter Button */}
                        {selectedWatchlist && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowBookmarkedOnly(!showBookmarkedOnly);
                              setCurrentPage(1);
                            }}
                            className={`p-2 rounded transition-colors ${
                              showBookmarkedOnly
                                ? "bg-accent/20"
                                : "hover:bg-accent/10"
                            }`}
                            title={
                              showBookmarkedOnly
                                ? "Show all titles"
                                : "Show bookmarked only"
                            }
                          >
                            <img
                              src="/assets/generated/bookmark-icon-transparent.dim_24x24.png"
                              alt="Bookmark filter"
                              className={`w-6 h-6 ${showBookmarkedOnly ? "rainbow-glow" : ""}`}
                            />
                          </button>
                        )}

                        {/* Genre Filter */}
                        {selectedWatchlist && availableGenres.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline">
                                Filter by Genre{" "}
                                {selectedGenres.length > 0 &&
                                  `(${selectedGenres.length})`}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 max-h-96 overflow-y-auto bg-black border-4 border-yellow-500 text-white genre-filter-popup">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm text-white">
                                    Filter by Genre
                                  </h4>
                                  {selectedGenres.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedGenres([]);
                                        setCurrentPage(1);
                                      }}
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {availableGenres.map((genre) => (
                                    <div
                                      key={genre}
                                      className="flex items-center space-x-2"
                                    >
                                      <Checkbox
                                        id={genre}
                                        checked={selectedGenres.includes(genre)}
                                        onCheckedChange={() =>
                                          handleGenreToggle(genre)
                                        }
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
                        )}

                        {/* Sort Controls */}
                        {selectedWatchlist && (
                          <div className="flex gap-2">
                            <Select
                              value={sortBy}
                              onValueChange={(value: SortOption) => {
                                setSortBy(value);
                                setCurrentPage(1);
                              }}
                            >
                              <SelectTrigger className="w-[180px] bg-black border-2 border-yellow-600 text-white">
                                <SelectValue placeholder="Sort by..." />
                              </SelectTrigger>
                              <SelectContent className="bg-black border-2 border-yellow-600 text-white watchlist-dropdown-content">
                                <SelectItem
                                  value="none"
                                  className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                >
                                  No sorting
                                </SelectItem>
                                <SelectItem
                                  value="alphabetical"
                                  className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                >
                                  Alphabetical
                                </SelectItem>
                                <SelectItem
                                  value="personalRating"
                                  className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                >
                                  Personal Rating
                                </SelectItem>
                                <SelectItem
                                  value="rating"
                                  className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                >
                                  Public Rating
                                </SelectItem>
                                <SelectItem
                                  value="episodes"
                                  className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                >
                                  Episodes Watched
                                </SelectItem>
                                <SelectItem
                                  value="airedDate"
                                  className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                >
                                  Aired Date
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {sortBy !== "none" && (
                              <Select
                                value={sortDirection}
                                onValueChange={(value: SortDirection) => {
                                  setSortDirection(value);
                                  setCurrentPage(1);
                                }}
                              >
                                <SelectTrigger className="w-[140px] bg-black border-2 border-yellow-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-2 border-yellow-600 text-white watchlist-dropdown-content">
                                  <SelectItem
                                    value="asc"
                                    className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                  >
                                    Ascending
                                  </SelectItem>
                                  <SelectItem
                                    value="desc"
                                    className="text-white hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                                  >
                                    Descending
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Search Bars */}
                      {selectedWatchlist && (
                        <div className="flex gap-4 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <label
                              htmlFor="title-search"
                              className="text-sm font-medium mb-2 block"
                            >
                              Search by Title
                            </label>
                            <Input
                              id="title-search"
                              type="text"
                              placeholder="Search titles..."
                              value={titleSearch}
                              onChange={(e) => {
                                setTitleSearch(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="bg-black border-2 border-yellow-600 text-white"
                            />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label
                              htmlFor="notes-search"
                              className="text-sm font-medium mb-2 block"
                            >
                              Search by Notes
                            </label>
                            <Input
                              id="notes-search"
                              type="text"
                              placeholder="Search notes..."
                              value={notesSearch}
                              onChange={(e) => {
                                setNotesSearch(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="bg-black border-2 border-yellow-600 text-white"
                            />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label
                              htmlFor="synopsis-search"
                              className="text-sm font-medium mb-2 block"
                            >
                              Search by Synopsis
                            </label>
                            <div className="relative">
                              <Input
                                id="synopsis-search"
                                type="text"
                                placeholder="Search descriptions..."
                                value={synopsisSearch}
                                onChange={(e) => {
                                  setSynopsisSearch(e.target.value);
                                  setCurrentPage(1);
                                }}
                                className="bg-black border-2 border-yellow-600 text-white pr-8"
                              />
                              {synopsisSearch && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSynopsisSearch("");
                                    setCurrentPage(1);
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                  title="Clear synopsis search"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Results count */}
                      {selectedWatchlist && (
                        <div className="text-sm text-muted-foreground">
                          Showing {filteredAndSortedEntries.length} of{" "}
                          {currentWatchlist?.entries.length || 0} titles
                          {showBookmarkedOnly && " (bookmarked only)"}
                          {sortBy !== "none" &&
                            ` • Sorted by ${getSortLabel(sortBy)} (${sortDirection === "asc" ? "Ascending" : "Descending"})`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Spacer to prevent content from being hidden under fixed panel */}
            <div
              style={{ height: isControlPanelCollapsed ? "60px" : "380px" }}
            />
          </>
        )}
      </div>

      {/* Watchlist Content - Full Width */}
      {selectedWatchlist && currentWatchlist && watchlists.length > 0 && (
        <>
          <WatchlistView
            watchlist={currentWatchlist}
            entries={paginatedEntries}
            allWatchlists={watchlists}
          />

          {/* Sticky Pagination Controls */}
          {totalPages > 1 && (
            <div className="container mx-auto px-4">
              <div className="sticky bottom-0 z-10 bg-background pt-4">
                <div className="flex justify-between items-center bg-black rounded-lg p-4 border-4 border-yellow-500">
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>

                  {/* Page Jump */}
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">
                      Jump to page:
                    </span>
                    <Input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageJump}
                      onChange={(e) => setPageJump(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePageJump();
                        }
                      }}
                      className="w-20"
                      placeholder="Page"
                    />
                    <Button
                      onClick={handlePageJump}
                      variant="outline"
                      size="sm"
                    >
                      Go
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="container mx-auto px-4">
        <CreateWatchlistDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />

        {selectedWatchlist && (
          <CreateAnimeCardDialog
            open={showCreateAnimeCard}
            onOpenChange={setShowCreateAnimeCard}
            watchlistName={selectedWatchlist}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!watchlistToDelete}
          onOpenChange={(open) => !open && setWatchlistToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Watchlist</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the watchlist "
                {watchlistToDelete}"? This action cannot be undone and will
                permanently remove all {currentWatchlist?.entries.length || 0}{" "}
                anime entries from this watchlist.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteWatchlist}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
