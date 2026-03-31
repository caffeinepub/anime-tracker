import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { WatchlistEntry } from "../backend";
import { useGetGlobalGenres, useUpdateGenres } from "../hooks/useQueries";

interface GenreEditorProps {
  entry: WatchlistEntry;
  watchlistName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GenreEditor({
  entry,
  watchlistName,
  open,
  onOpenChange,
}: GenreEditorProps) {
  const [currentGenres, setCurrentGenres] = useState<string[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const { data: globalGenres, isLoading: globalGenresLoading } =
    useGetGlobalGenres();
  const updateGenresMutation = useUpdateGenres();

  useEffect(() => {
    if (entry) {
      setCurrentGenres([...entry.anime.genres]);
    }
  }, [entry]);

  const handleAddGenre = () => {
    const trimmedGenre = newGenre.trim();
    if (!trimmedGenre) {
      toast.error("Genre name cannot be empty");
      return;
    }
    if (currentGenres.includes(trimmedGenre)) {
      toast.error("Genre already exists");
      return;
    }
    setCurrentGenres([...currentGenres, trimmedGenre]);
    setNewGenre("");
  };

  const handleRemoveGenre = (genre: string) => {
    setCurrentGenres(currentGenres.filter((g) => g !== genre));
  };

  const handleToggleGlobalGenre = (genre: string) => {
    if (currentGenres.includes(genre)) {
      setCurrentGenres(currentGenres.filter((g) => g !== genre));
    } else {
      setCurrentGenres([...currentGenres, genre]);
    }
  };

  const handleSave = async () => {
    if (currentGenres.length === 0) {
      toast.error("At least one genre is required");
      return;
    }

    try {
      await updateGenresMutation.mutateAsync({
        watchlistName,
        anilistId: entry.anime.anilistId,
        newGenres: currentGenres,
      });
      toast.success("Genres updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update genres");
    }
  };

  const handleCancel = () => {
    setCurrentGenres([...entry.anime.genres]);
    setNewGenre("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-4 border-yellow-500 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-yellow-500 text-xl">
            Edit Genres - {entry.anime.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Genres */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-yellow-400">
              Current Genres
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentGenres.length === 0 ? (
                <p className="text-sm text-gray-400">No genres selected</p>
              ) : (
                currentGenres.map((genre) => (
                  <div
                    key={genre}
                    className="flex items-center gap-1 px-3 py-1 rounded text-sm"
                    style={{ backgroundColor: "#FFD700", color: "#000000" }}
                  >
                    <span>{genre}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGenre(genre)}
                      className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
                      title="Remove genre"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add New Genre */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-yellow-400">
              Add New Genre
            </h3>
            <div className="flex gap-2">
              <Input
                type="text"
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddGenre();
                  }
                }}
                placeholder="Type genre name..."
                className="flex-1 bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
              />
              <Button
                onClick={handleAddGenre}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Quick Add from Global Genres */}
          {!globalGenresLoading && globalGenres && globalGenres.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-yellow-400">
                Quick Add from Your Watchlists
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2 border-2 border-yellow-600 rounded p-3 bg-gray-900">
                {globalGenres.map((genre) => (
                  <div key={genre} className="flex items-center space-x-2">
                    <Checkbox
                      id={`global-${genre}`}
                      checked={currentGenres.includes(genre)}
                      onCheckedChange={() => handleToggleGlobalGenre(genre)}
                      className="border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                    />
                    <Label
                      htmlFor={`global-${genre}`}
                      className="text-sm font-normal cursor-pointer text-white flex-1"
                    >
                      {genre}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-2 border-gray-600 hover:bg-gray-800 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateGenresMutation.isPending}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            {updateGenresMutation.isPending ? "Saving..." : "Save Genres"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
