import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AnimeEntry, WatchlistEntry } from "../backend";
import { useActor } from "../hooks/useActor";
import {
  useAddAnimeToWatchlist,
  useRemoveAnimeFromWatchlist,
  useToggleBookmark,
  useUpdateTotalEpisodes,
  useUpdateWatchlistEntry,
} from "../hooks/useQueries";

interface WatchlistEntryDialogProps {
  entry: WatchlistEntry;
  watchlistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AnilistSearchResult {
  id: number;
  title: { romaji: string; english: string | null; native: string };
  coverImage: { large: string; medium: string };
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  status: string;
  startDate: { year: number | null; month: number | null; day: number | null };
  description: string | null;
}

const genreColors: Record<string, string> = {
  Action: "bg-red-500/80 text-white",
  Adventure: "bg-orange-500/80 text-white",
  Comedy: "bg-yellow-500/80 text-black",
  Drama: "bg-purple-500/80 text-white",
  Fantasy: "bg-pink-500/80 text-white",
  Horror: "bg-gray-800/80 text-white",
  Mystery: "bg-indigo-500/80 text-white",
  Romance: "bg-rose-500/80 text-white",
  "Sci-Fi": "bg-cyan-500/80 text-white",
  "Slice of Life": "bg-green-500/80 text-white",
  Sports: "bg-blue-500/80 text-white",
  Supernatural: "bg-violet-500/80 text-white",
  Thriller: "bg-red-700/80 text-white",
};

const getGenreColor = (genre: string): string => {
  return genreColors[genre] || "bg-primary/80 text-primary-foreground";
};

export default function WatchlistEntryDialog({
  entry,
  watchlistName,
  open,
  onOpenChange,
}: WatchlistEntryDialogProps) {
  const [editingEpisodes, setEditingEpisodes] = useState(false);
  const [episodesValue, setEpisodesValue] = useState("");
  const [editingTotalEpisodes, setEditingTotalEpisodes] = useState(false);
  const [totalEpisodesValue, setTotalEpisodesValue] = useState("");

  // Sync with AniList state
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [syncSearchTerm, setSyncSearchTerm] = useState("");
  const [syncResults, setSyncResults] = useState<AnilistSearchResult[]>([]);
  const [syncSearching, setSyncSearching] = useState(false);
  const [confirmResult, setConfirmResult] =
    useState<AnilistSearchResult | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { actor } = useActor();
  const updateEntryMutation = useUpdateWatchlistEntry();
  const updateTotalEpisodesMutation = useUpdateTotalEpisodes();
  const removeAnimeMutation = useRemoveAnimeFromWatchlist();
  const addAnimeMutation = useAddAnimeToWatchlist();
  const toggleBookmarkMutation = useToggleBookmark();

  const isCustom = entry.anime.airingStatus === "CUSTOM";

  const handleEpisodesEdit = () => {
    setEditingEpisodes(true);
    setEpisodesValue(Number(entry.episodesWatched).toString());
  };

  const handleEpisodesSave = async () => {
    const episodes = Number.parseInt(episodesValue);

    if (Number.isNaN(episodes) || episodes < 0) {
      toast.error("Episodes watched must be a non-negative number");
      return;
    }

    if (episodes > Number(entry.anime.episodesAvailable)) {
      toast.error(
        `Episodes watched cannot exceed ${entry.anime.episodesAvailable}`,
      );
      return;
    }

    try {
      await updateEntryMutation.mutateAsync({
        watchlistName,
        anilistId: entry.anime.anilistId,
        personalRating: entry.personalRating,
        episodesWatched: BigInt(episodes),
        notes: entry.notes,
      });
      setEditingEpisodes(false);
      toast.success("Episodes watched updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update episodes watched");
    }
  };

  const handleTotalEpisodesEdit = () => {
    setEditingTotalEpisodes(true);
    setTotalEpisodesValue(Number(entry.anime.episodesAvailable).toString());
  };

  const handleTotalEpisodesSave = async () => {
    const totalEpisodes = Number.parseInt(totalEpisodesValue);

    if (Number.isNaN(totalEpisodes) || totalEpisodes < 0) {
      toast.error("Total episodes must be a non-negative number");
      return;
    }

    try {
      await updateTotalEpisodesMutation.mutateAsync({
        anilistId: entry.anime.anilistId,
        newTotalEpisodes: BigInt(totalEpisodes),
      });
      setEditingTotalEpisodes(false);
      toast.success("Total episodes updated across all watchlists");
    } catch (error: any) {
      toast.error(error.message || "Failed to update total episodes");
    }
  };

  const handleSyncSearch = async () => {
    if (!syncSearchTerm.trim()) return;
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    setSyncSearching(true);
    setSyncResults([]);
    try {
      const graphqlQuery = JSON.stringify({
        query: `query ($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(search: $search, sort: [SEARCH_MATCH]) {
              id
              title { romaji english native }
              coverImage { large medium }
              genres
              averageScore
              episodes
              status
              startDate { year month day }
              description
            }
          }
        }`,
        variables: { search: syncSearchTerm.trim(), page: 1, perPage: 10 },
      });
      const response = await actor.fetchAnimeFromAnilist(graphqlQuery);
      const parsed = JSON.parse(response);
      if (parsed.errors) {
        throw new Error(parsed.errors[0]?.message || "AniList error");
      }
      const media: AnilistSearchResult[] = (parsed.data?.Page?.media || []).map(
        (m: any) => ({
          id: m.id,
          title: {
            romaji: m.title.romaji || "",
            english: m.title.english || null,
            native: m.title.native || "",
          },
          coverImage: {
            large: m.coverImage?.large || "",
            medium: m.coverImage?.medium || "",
          },
          genres: m.genres || [],
          averageScore: m.averageScore ?? null,
          episodes: m.episodes ?? null,
          status: m.status || "UNKNOWN",
          startDate: {
            year: m.startDate?.year ?? null,
            month: m.startDate?.month ?? null,
            day: m.startDate?.day ?? null,
          },
          description: m.description || null,
        }),
      );
      setSyncResults(media);
      if (media.length === 0) toast.info("No results found");
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    } finally {
      setSyncSearching(false);
    }
  };

  const handleConfirmSync = async () => {
    if (!confirmResult) return;
    setSyncing(true);
    try {
      // Save personal data before replacing
      const savedRating = entry.personalRating;
      const savedEpisodes = entry.episodesWatched;
      const savedNotes = entry.notes;
      const savedBookmarked = entry.isBookmarked;
      const savedAlternateTitles: string[] = [];

      const r = confirmResult;
      const airedDate = r.startDate?.year
        ? `${r.startDate.year}-${String(r.startDate.month || 1).padStart(2, "0")}-${String(r.startDate.day || 1).padStart(2, "0")}`
        : "";

      const newAnime: AnimeEntry = {
        anilistId: BigInt(r.id),
        title: r.title.romaji || r.title.english || r.title.native || "",
        description: r.description || "",
        genres: r.genres,
        publicRating: BigInt(r.averageScore || 0),
        coverUrl: r.coverImage.large || r.coverImage.medium || "",
        episodesAvailable: BigInt(r.episodes || 0),
        airingStatus: r.status || "UNKNOWN",
        airedDate,
      };

      // Remove old custom entry
      await removeAnimeMutation.mutateAsync({
        watchlistName,
        anilistId: entry.anime.anilistId,
      });

      // Add new AniList entry
      await addAnimeMutation.mutateAsync({
        watchlistName,
        anime: newAnime,
        alternateTitles: savedAlternateTitles,
      });

      // Restore personal data
      await updateEntryMutation.mutateAsync({
        watchlistName,
        anilistId: BigInt(r.id),
        personalRating: savedRating,
        episodesWatched: savedEpisodes,
        notes: savedNotes,
      });

      // Restore bookmark if it was set
      if (savedBookmarked) {
        await toggleBookmarkMutation.mutateAsync({
          watchlistName,
          anilistId: BigInt(r.id),
        });
      }

      toast.success(
        `Synced with AniList: "${newAnime.title}" — your personal data was preserved.`,
      );
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Sync failed");
    } finally {
      setSyncing(false);
      setConfirmResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[3412px] w-[90vw] max-h-[90vh] overflow-y-auto bg-[#3a3a3a]">
        <DialogHeader>
          <DialogTitle className="sr-only">Watchlist Entry Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* Cover Image - centered at top, limited to original size */}
          <div className="flex justify-center">
            <img
              src={entry.anime.coverUrl}
              alt={entry.anime.title}
              className="rounded-lg shadow-lg"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center">
            {entry.anime.title}
          </h2>

          {/* Sync with AniList — only for CUSTOM entries */}
          {isCustom && (
            <div className="w-full">
              {!showSyncPanel ? (
                <Button
                  type="button"
                  onClick={() => setShowSyncPanel(true)}
                  className="flex items-center gap-2 bg-black border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black font-semibold transition-colors"
                  data-ocid="sync_anilist.button"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sync with AniList
                </Button>
              ) : (
                <div className="bg-black border-2 border-yellow-500 rounded-lg p-4 space-y-3 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-semibold text-sm">
                      Search AniList to replace metadata
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSyncPanel(false);
                        setSyncResults([]);
                        setSyncSearchTerm("");
                        setConfirmResult(null);
                      }}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Your notes, rating, episodes watched, and bookmark will be
                    preserved.
                  </p>

                  <div className="flex gap-2">
                    <Input
                      value={syncSearchTerm}
                      onChange={(e) => setSyncSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSyncSearch()}
                      placeholder="Search by title..."
                      className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
                      data-ocid="sync_anilist.search_input"
                    />
                    <Button
                      type="button"
                      onClick={handleSyncSearch}
                      disabled={syncSearching || !syncSearchTerm.trim()}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shrink-0"
                      data-ocid="sync_anilist.submit_button"
                    >
                      {syncSearching ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Confirmation prompt */}
                  {confirmResult && (
                    <div className="bg-gray-900 border border-yellow-600 rounded-lg p-3 space-y-2">
                      <p className="text-sm text-white">
                        Replace metadata with{" "}
                        <span className="text-yellow-400 font-semibold">
                          {confirmResult.title.romaji ||
                            confirmResult.title.english}
                        </span>
                        ? Your notes, rating, and episodes will be preserved.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleConfirmSync}
                          disabled={syncing}
                          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-sm h-8"
                          data-ocid="sync_anilist.confirm_button"
                        >
                          {syncing ? "Syncing..." : "Confirm Sync"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmResult(null)}
                          disabled={syncing}
                          className="border-gray-600 text-white hover:bg-gray-800 text-sm h-8"
                          data-ocid="sync_anilist.cancel_button"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Search results */}
                  {syncResults.length > 0 && !confirmResult && (
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {syncResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => setConfirmResult(result)}
                          className="w-full flex items-center gap-3 p-2 rounded bg-gray-900 border border-yellow-700 hover:border-yellow-400 hover:bg-gray-800 transition-colors text-left"
                        >
                          {(result.coverImage.medium ||
                            result.coverImage.large) && (
                            <img
                              src={
                                result.coverImage.medium ||
                                result.coverImage.large
                              }
                              alt={result.title.romaji}
                              className="w-10 h-14 object-cover rounded shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-yellow-300 text-sm font-semibold truncate">
                              {result.title.romaji ||
                                result.title.english ||
                                result.title.native}
                            </p>
                            {result.title.english &&
                              result.title.english !== result.title.romaji && (
                                <p className="text-gray-400 text-xs truncate">
                                  {result.title.english}
                                </p>
                              )}
                            <p className="text-gray-500 text-xs">
                              {result.status}
                              {result.startDate?.year
                                ? ` · ${result.startDate.year}`
                                : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Synopsis */}
          <div className="w-full">
            <ScrollArea className="h-[420px] w-full rounded-lg bg-[#1e3a5f] p-6">
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {entry.anime.description || "No description available."}
              </p>
            </ScrollArea>
          </div>

          {/* Genre Tags - Two rows */}
          <div className="grid grid-cols-4 gap-3 w-full max-w-4xl">
            {entry.anime.genres.map((genre) => (
              <Badge
                key={genre}
                className={`${getGenreColor(genre)} justify-center text-base py-2`}
              >
                {genre}
              </Badge>
            ))}
          </div>

          {/* Info */}
          <div className="pt-6 border-t border-border/50 w-full">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-base text-muted-foreground">
                  <span className="font-medium">Status:</span>{" "}
                  {entry.anime.airingStatus}
                </p>
                <p className="text-base text-muted-foreground">
                  <span className="font-medium">Public Rating:</span>{" "}
                  {Number(entry.anime.publicRating)}/100
                </p>
                <p className="text-base text-muted-foreground">
                  <span className="font-medium">Aired:</span>{" "}
                  {entry.anime.airedDate}
                </p>
              </div>
              <div>
                <p className="text-base text-muted-foreground">
                  <span className="font-medium">Your Rating:</span>{" "}
                  {entry.personalRating > 0
                    ? `${entry.personalRating}/10`
                    : "N/A"}
                </p>

                {/* Episodes Watched - Editable */}
                <div className="flex items-center gap-2 text-base text-muted-foreground">
                  <span className="font-medium">Episodes Watched:</span>
                  {editingEpisodes ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max={Number(entry.anime.episodesAvailable)}
                        value={episodesValue}
                        onChange={(e) => setEpisodesValue(e.target.value)}
                        className="w-20 h-7 bg-gray-900 border-2 border-yellow-600 text-white"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleEpisodesSave}
                        disabled={updateEntryMutation.isPending}
                        className="h-7 bg-yellow-500 hover:bg-yellow-600 text-black"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingEpisodes(false)}
                        className="h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleEpisodesEdit}
                        className="hover:text-yellow-400 transition-colors cursor-pointer"
                      >
                        {Number(entry.episodesWatched)}
                      </button>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={handleTotalEpisodesEdit}
                        className="hover:text-yellow-400 transition-colors cursor-pointer"
                      >
                        {Number(entry.anime.episodesAvailable)}
                      </button>
                    </>
                  )}
                </div>

                {/* Total Episodes Editor */}
                {editingTotalEpisodes && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-400">
                      Total Episodes:
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={totalEpisodesValue}
                      onChange={(e) => setTotalEpisodesValue(e.target.value)}
                      className="w-20 h-7 bg-gray-900 border-2 border-yellow-600 text-white"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleTotalEpisodesSave}
                      disabled={updateTotalEpisodesMutation.isPending}
                      className="h-7 bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTotalEpisodes(false)}
                      className="h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {entry.notes && (
                  <p className="text-base text-muted-foreground mt-2">
                    <span className="font-medium">Notes:</span> {entry.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
