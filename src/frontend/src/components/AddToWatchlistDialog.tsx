import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import type { Watchlist } from "../backend";
import { useAddAnimeToWatchlist } from "../hooks/useQueries";

interface AnilistAnime {
  id: number;
  title: {
    english?: string;
    romaji: string;
    native?: string;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  genres: string[];
  averageScore?: number;
  episodes?: number;
  status?: string;
  description?: string;
  startDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
}

interface AddToWatchlistDialogProps {
  anime: AnilistAnime;
  watchlists: Watchlist[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddToWatchlistDialog({
  anime,
  watchlists,
  open,
  onOpenChange,
  onSuccess,
}: AddToWatchlistDialogProps) {
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>("");
  const addToWatchlistMutation = useAddAnimeToWatchlist();

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleAdd = async () => {
    if (!selectedWatchlist) {
      toast.error("Please select a watchlist");
      return;
    }

    const alternateTitles: string[] = [];
    const mainTitle = anime.title.english || anime.title.romaji;

    if (anime.title.romaji && anime.title.romaji !== mainTitle) {
      alternateTitles.push(anime.title.romaji);
    }
    if (anime.title.english && anime.title.english !== mainTitle) {
      alternateTitles.push(anime.title.english);
    }
    if (anime.title.native) {
      alternateTitles.push(anime.title.native);
    }

    const animeEntry = {
      anilistId: BigInt(anime.id),
      title: mainTitle,
      coverUrl: anime.coverImage.large || anime.coverImage.medium,
      genres: anime.genres,
      publicRating: BigInt(anime.averageScore || 0),
      episodesAvailable: BigInt(anime.episodes || 0),
      airingStatus: anime.status || "UNKNOWN",
      airedDate: anime.startDate
        ? `${anime.startDate.year || ""}/${anime.startDate.month || ""}/${anime.startDate.day || ""}`
        : "Unknown",
      description: anime.description ? stripHtml(anime.description) : "",
    };

    try {
      await addToWatchlistMutation.mutateAsync({
        watchlistName: selectedWatchlist,
        anime: animeEntry,
        alternateTitles,
      });
      toast.success("Anime added to watchlist");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add anime to watchlist");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-4 border-yellow-500 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-yellow-500 text-xl">
            Add to Watchlist
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-300">
            Select a watchlist to add "
            {anime.title.english || anime.title.romaji}":
          </p>
          <Select
            value={selectedWatchlist}
            onValueChange={setSelectedWatchlist}
          >
            <SelectTrigger className="bg-black border-2 border-yellow-600 text-white focus:border-yellow-400">
              <SelectValue placeholder="Select watchlist" />
            </SelectTrigger>
            <SelectContent className="bg-black border-2 border-yellow-600 text-white watchlist-dropdown-content">
              {watchlists.map((watchlist) => (
                <SelectItem
                  key={watchlist.name}
                  value={watchlist.name}
                  className="text-white bg-black hover:bg-gray-800 focus:bg-gray-800 focus:text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white cursor-pointer"
                >
                  {watchlist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 border-gray-600 hover:bg-gray-800 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={addToWatchlistMutation.isPending || !selectedWatchlist}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            {addToWatchlistMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
