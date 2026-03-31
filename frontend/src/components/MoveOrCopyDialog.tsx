import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMoveAnimeToWatchlist, useCopyAnimeToWatchlist } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { Watchlist, WatchlistEntry } from '../backend';

interface MoveOrCopyDialogProps {
  entry: WatchlistEntry;
  currentWatchlist: Watchlist;
  allWatchlists: Watchlist[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MoveOrCopyDialog({
  entry,
  currentWatchlist,
  allWatchlists,
  open,
  onOpenChange,
}: MoveOrCopyDialogProps) {
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const moveAnimeToWatchlistMutation = useMoveAnimeToWatchlist();
  const copyAnimeToWatchlistMutation = useCopyAnimeToWatchlist();

  // Filter out current watchlist and watchlists that already contain this anime
  const availableWatchlists = allWatchlists.filter(
    (w) =>
      w.name !== currentWatchlist.name &&
      !w.entries.some((e) => e.anime.anilistId === entry.anime.anilistId)
  );

  const handleCopy = async () => {
    if (!selectedWatchlist) {
      toast.error('Please select a watchlist');
      return;
    }

    setIsProcessing(true);
    try {
      await copyAnimeToWatchlistMutation.mutateAsync({
        fromWatchlist: currentWatchlist.name,
        toWatchlist: selectedWatchlist,
        anilistId: entry.anime.anilistId,
      });
      toast.success(`Copied to ${selectedWatchlist} with all personal data preserved`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to copy anime');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = async () => {
    if (!selectedWatchlist) {
      toast.error('Please select a watchlist');
      return;
    }

    setIsProcessing(true);
    try {
      await moveAnimeToWatchlistMutation.mutateAsync({
        fromWatchlist: currentWatchlist.name,
        toWatchlist: selectedWatchlist,
        anilistId: entry.anime.anilistId,
      });
      toast.success(`Moved to ${selectedWatchlist} with all personal data preserved`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to move anime');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#3a3a3a]">
        <DialogHeader>
          <DialogTitle>Move or Copy Anime</DialogTitle>
          <DialogDescription>
            Choose a watchlist to move or copy "{entry.anime.title}" to. All personal data (rating, episodes watched, notes, and bookmark status) will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableWatchlists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No other watchlists available. This anime may already exist in all other watchlists.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Watchlist</label>
                <Select value={selectedWatchlist} onValueChange={setSelectedWatchlist}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue placeholder="Choose a watchlist" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-600 text-white move-copy-dropdown-content">
                    {availableWatchlists.map((watchlist) => (
                      <SelectItem 
                        key={watchlist.name} 
                        value={watchlist.name}
                        className="text-white bg-[#2a2a2a] hover:bg-gray-700 focus:bg-gray-700 focus:text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white cursor-pointer"
                      >
                        {watchlist.name} ({watchlist.entries.length} titles)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!selectedWatchlist || isProcessing}
                >
                  Copy
                </Button>
                <Button
                  onClick={handleMove}
                  disabled={!selectedWatchlist || isProcessing}
                >
                  Move
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
