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
import { useState } from "react";
import { toast } from "sonner";
import type { WatchlistEntry } from "../backend";
import {
  useUpdateTotalEpisodes,
  useUpdateWatchlistEntry,
} from "../hooks/useQueries";

interface WatchlistEntryDialogProps {
  entry: WatchlistEntry;
  watchlistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

  const updateEntryMutation = useUpdateWatchlistEntry();
  const updateTotalEpisodesMutation = useUpdateTotalEpisodes();

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
      </DialogContent>
    </Dialog>
  );
}
