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
import { useState } from "react";
import { toast } from "sonner";
import { useCreateWatchlist } from "../hooks/useQueries";

interface CreateWatchlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateWatchlistDialog({
  open,
  onOpenChange,
}: CreateWatchlistDialogProps) {
  const [name, setName] = useState("");
  const createMutation = useCreateWatchlist();

  const handleCreate = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Please enter a watchlist name");
      return;
    }

    try {
      await createMutation.mutateAsync(trimmedName);
      toast.success("Watchlist created!");
      setName("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Watchlist creation error:", error);

      // Extract meaningful error message from backend
      let errorMessage = "Failed to create watchlist";

      if (error?.message) {
        const msg = error.message;

        // Check for specific backend error messages
        if (msg.includes("already exists")) {
          errorMessage = "A watchlist with this name already exists";
        } else if (msg.includes("cannot be empty")) {
          errorMessage = "Watchlist name cannot be empty";
        } else if (msg.includes("more than 20")) {
          errorMessage = "Cannot create more than 20 watchlists";
        } else if (msg.includes("Unauthorized")) {
          errorMessage = "You must be logged in to create watchlists";
        } else {
          // Use the backend error message if it's informative
          errorMessage = msg;
        }
      }

      toast.error(errorMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !createMutation.isPending) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-4 border-yellow-500 text-white">
        <DialogHeader>
          <DialogTitle className="text-yellow-500 text-xl">
            Create New Watchlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name" className="text-gray-300">
              Watchlist Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Currently Watching"
              className="mt-2 bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
            className="border-2 border-gray-600 hover:bg-gray-800 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending || !name.trim()}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
