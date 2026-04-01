import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { AnimeEntry } from "../backend";
import {
  useAddAnimeToWatchlist,
  useUpdateWatchlistEntry,
} from "../hooks/useQueries";

interface CreateAnimeCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchlistName: string;
}

export default function CreateAnimeCardDialog({
  open,
  onOpenChange,
  watchlistName,
}: CreateAnimeCardDialogProps) {
  const [title, setTitle] = useState("");
  const [alternateTitle, setAlternateTitle] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addAnimeMutation = useAddAnimeToWatchlist();
  const updateEntryMutation = useUpdateWatchlistEntry();

  const handleReset = () => {
    setTitle("");
    setAlternateTitle("");
    setGenres([]);
    setGenreInput("");
    setSynopsis("");
    setRating("");
    setNotes("");
    setCoverUrl("");
    setCoverPreview(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleAddGenre = () => {
    const trimmed = genreInput.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres((prev) => [...prev, trimmed]);
    }
    setGenreInput("");
  };

  const handleGenreKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddGenre();
    }
  };

  const handleRemoveGenre = (genre: string) => {
    setGenres((prev) => prev.filter((g) => g !== genre));
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCoverPreview(dataUrl);
      setCoverUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCoverUrl(url);
    setCoverPreview(url || null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const parsedRating = rating.trim() ? Number.parseFloat(rating) : 0;
    if (
      rating.trim() &&
      (Number.isNaN(parsedRating) || parsedRating < 0 || parsedRating > 10)
    ) {
      toast.error("Rating must be between 0 and 10");
      return;
    }

    if (notes.length > 120) {
      toast.error("Notes must be 120 characters or less");
      return;
    }

    // Generate a unique positive ID to avoid backend nat rejection
    const customId = BigInt(Date.now());

    const anime: AnimeEntry = {
      anilistId: customId,
      title: title.trim(),
      description: synopsis.trim(),
      genres,
      publicRating: BigInt(0),
      coverUrl: coverUrl.trim() || "",
      episodesAvailable: BigInt(0),
      airingStatus: "CUSTOM",
      airedDate: "",
    };

    const alternateTitles = alternateTitle.trim()
      ? [alternateTitle.trim()]
      : [];

    try {
      await addAnimeMutation.mutateAsync({
        watchlistName,
        anime,
        alternateTitles,
      });

      // If rating or notes were provided, update the entry immediately after adding
      if (parsedRating > 0 || notes.trim()) {
        await updateEntryMutation.mutateAsync({
          watchlistName,
          anilistId: customId,
          personalRating: parsedRating,
          episodesWatched: BigInt(0),
          notes: notes.trim(),
        });
      }

      toast.success(`"${title.trim()}" added to ${watchlistName}`);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to add anime to watchlist");
    }
  };

  const isPending = addAnimeMutation.isPending || updateEntryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-black border-4 border-yellow-500 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-yellow-500 text-xl">
            Create Anime Card — {watchlistName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Cover Image */}
          <div className="space-y-2">
            <Label className="text-yellow-400 text-sm font-semibold">
              Cover Image
            </Label>
            <button
              type="button"
              className="w-full border-2 border-dashed border-yellow-600 rounded-lg p-4 flex flex-col items-center gap-3 cursor-pointer hover:border-yellow-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              {coverPreview ? (
                <div className="relative">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="h-40 object-contain rounded"
                    onError={() => setCoverPreview(null)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverPreview(null);
                      setCoverUrl("");
                    }}
                    className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5 hover:bg-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-yellow-600" />
                  <span className="text-sm text-gray-400 text-center">
                    Drag & drop an image or{" "}
                    <span className="text-yellow-400 underline">
                      click to upload
                    </span>
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">
                or paste URL:
              </span>
              <Input
                type="url"
                placeholder="https://example.com/cover.jpg"
                value={coverUrl.startsWith("data:") ? "" : coverUrl}
                onChange={handleUrlChange}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-gray-900 border border-yellow-700 text-white placeholder:text-gray-600 text-xs h-8"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-yellow-400 text-sm font-semibold">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter anime title..."
              className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
          </div>

          {/* Alternate Title */}
          <div className="space-y-1">
            <Label className="text-yellow-400 text-sm font-semibold">
              Alternate Title
            </Label>
            <Input
              value={alternateTitle}
              onChange={(e) => setAlternateTitle(e.target.value)}
              placeholder="e.g. Japanese or English alternate name..."
              className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <Label className="text-yellow-400 text-sm font-semibold">
              Genres
            </Label>
            <div className="flex gap-2">
              <Input
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={handleGenreKeyDown}
                placeholder="Type a genre and press Enter or Add..."
                className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
              />
              <Button
                type="button"
                onClick={handleAddGenre}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shrink-0"
              >
                Add
              </Button>
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: "#FFD700", color: "#000" }}
                  >
                    {genre}
                    <button
                      type="button"
                      onClick={() => handleRemoveGenre(genre)}
                      className="hover:opacity-70 ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Synopsis */}
          <div className="space-y-1">
            <Label className="text-yellow-400 text-sm font-semibold">
              Synopsis
            </Label>
            <Textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Enter a synopsis or description..."
              className="min-h-[100px] bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none"
            />
          </div>

          {/* Rating */}
          <div className="space-y-1">
            <Label className="text-yellow-400 text-sm font-semibold">
              Personal Rating (0–10)
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="e.g., 8.5"
              className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-yellow-400 text-sm font-semibold">
              Notes
            </Label>
            <span className="text-xs text-gray-500 block">
              {notes.length}/120 characters
            </span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={120}
              placeholder="Add personal notes... (max 120 characters)"
              className="min-h-[80px] bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-2 border-gray-600 hover:bg-gray-800 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            {isPending ? "Adding..." : "Add to Watchlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
