import { useState } from 'react';
import { Trash2, ArrowRight, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useRemoveAnimeFromWatchlist, useToggleBookmark, useUpdateWatchlistEntry, useUpdateTotalEpisodes } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { Watchlist, WatchlistEntry } from '../backend';
import WatchlistEntryDialog from './WatchlistEntryDialog';
import MoveOrCopyDialog from './MoveOrCopyDialog';
import GenreEditor from './GenreEditor';

interface WatchlistViewProps {
  watchlist: Watchlist;
  entries: WatchlistEntry[];
  allWatchlists: Watchlist[];
}

export default function WatchlistView({ 
  watchlist, 
  entries,
  allWatchlists,
}: WatchlistViewProps) {
  const [currentTitleIndex, setCurrentTitleIndex] = useState<Record<string, number>>({});
  const [selectedEntry, setSelectedEntry] = useState<WatchlistEntry | null>(null);
  const [moveOrCopyEntry, setMoveOrCopyEntry] = useState<WatchlistEntry | null>(null);
  const [editingGenresEntry, setEditingGenresEntry] = useState<WatchlistEntry | null>(null);
  const [editingNotesEntry, setEditingNotesEntry] = useState<WatchlistEntry | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [hoveredNotes, setHoveredNotes] = useState<{ notes: string; x: number; y: number } | null>(null);
  const [editingRatingEntry, setEditingRatingEntry] = useState<WatchlistEntry | null>(null);
  const [ratingValue, setRatingValue] = useState('');
  const [editingEpisodesEntry, setEditingEpisodesEntry] = useState<WatchlistEntry | null>(null);
  const [episodesValue, setEpisodesValue] = useState('');
  const [editingTotalEpisodesEntry, setEditingTotalEpisodesEntry] = useState<WatchlistEntry | null>(null);
  const [totalEpisodesValue, setTotalEpisodesValue] = useState('');
  
  const removeFromWatchlistMutation = useRemoveAnimeFromWatchlist();
  const toggleBookmarkMutation = useToggleBookmark();
  const updateEntryMutation = useUpdateWatchlistEntry();
  const updateTotalEpisodesMutation = useUpdateTotalEpisodes();

  const handleDelete = async (anilistId: bigint) => {
    try {
      await removeFromWatchlistMutation.mutateAsync({
        watchlistName: watchlist.name,
        anilistId,
      });
      toast.success('Anime removed from watchlist');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove anime');
    }
  };

  const handleToggleBookmark = async (anilistId: bigint, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleBookmarkMutation.mutateAsync({
        watchlistName: watchlist.name,
        anilistId,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle bookmark');
    }
  };

  const handleCycleTitle = (entry: WatchlistEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = entry.anime.anilistId.toString();
    const allTitles = [entry.anime.title, ...entry.alternateTitles];
    const currentIndex = currentTitleIndex[key] || 0;
    const nextIndex = (currentIndex + 1) % allTitles.length;
    setCurrentTitleIndex(prev => ({ ...prev, [key]: nextIndex }));
  };

  const getCurrentTitle = (entry: WatchlistEntry): string => {
    const key = entry.anime.anilistId.toString();
    const allTitles = [entry.anime.title, ...entry.alternateTitles];
    const index = currentTitleIndex[key] || 0;
    return allTitles[index] || entry.anime.title;
  };

  const hasAlternateTitles = (entry: WatchlistEntry): boolean => {
    return entry.alternateTitles && entry.alternateTitles.length > 0;
  };

  const handleGenresClick = (entry: WatchlistEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGenresEntry(entry);
  };

  const handleNotesClick = (entry: WatchlistEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNotesEntry(entry);
    setNotesValue(entry.notes);
  };

  const handleNotesSave = async () => {
    if (!editingNotesEntry) return;
    
    const trimmedNotes = notesValue.trim();
    
    if (trimmedNotes.length > 120) {
      toast.error('Notes must be 120 characters or less');
      return;
    }

    try {
      await updateEntryMutation.mutateAsync({
        watchlistName: watchlist.name,
        anilistId: editingNotesEntry.anime.anilistId,
        personalRating: editingNotesEntry.personalRating,
        episodesWatched: editingNotesEntry.episodesWatched,
        notes: trimmedNotes,
      });
      setEditingNotesEntry(null);
      setNotesValue('');
      toast.success('Notes saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save notes');
    }
  };

  const handleNotesCancel = () => {
    setEditingNotesEntry(null);
    setNotesValue('');
  };

  const handleNotesHover = (entry: WatchlistEntry, e: React.MouseEvent) => {
    if (entry.notes && !editingNotesEntry) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredNotes({
        notes: entry.notes,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
  };

  const handleNotesLeave = () => {
    setHoveredNotes(null);
  };

  const handleRatingClick = (entry: WatchlistEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRatingEntry(entry);
    setRatingValue(entry.personalRating > 0 ? entry.personalRating.toString() : '');
  };

  const handleRatingSave = async () => {
    if (!editingRatingEntry) return;
    
    const rating = parseFloat(ratingValue);
    
    if (isNaN(rating) || rating < 0 || rating > 10) {
      toast.error('Rating must be between 0 and 10');
      return;
    }

    try {
      await updateEntryMutation.mutateAsync({
        watchlistName: watchlist.name,
        anilistId: editingRatingEntry.anime.anilistId,
        personalRating: rating,
        episodesWatched: editingRatingEntry.episodesWatched,
        notes: editingRatingEntry.notes,
      });
      setEditingRatingEntry(null);
      setRatingValue('');
      toast.success('Rating saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rating');
    }
  };

  const handleRatingCancel = () => {
    setEditingRatingEntry(null);
    setRatingValue('');
  };

  const handleEpisodesClick = (entry: WatchlistEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEpisodesEntry(entry);
    setEpisodesValue(entry.episodesWatched > 0 ? Number(entry.episodesWatched).toString() : '0');
  };

  const handleEpisodesSave = async () => {
    if (!editingEpisodesEntry) return;
    
    const episodes = parseInt(episodesValue);
    
    if (isNaN(episodes) || episodes < 0) {
      toast.error('Episodes watched must be a non-negative number');
      return;
    }

    if (episodes > Number(editingEpisodesEntry.anime.episodesAvailable)) {
      toast.error(`Episodes watched cannot exceed ${editingEpisodesEntry.anime.episodesAvailable}`);
      return;
    }

    try {
      await updateEntryMutation.mutateAsync({
        watchlistName: watchlist.name,
        anilistId: editingEpisodesEntry.anime.anilistId,
        personalRating: editingEpisodesEntry.personalRating,
        episodesWatched: BigInt(episodes),
        notes: editingEpisodesEntry.notes,
      });
      setEditingEpisodesEntry(null);
      setEpisodesValue('');
      toast.success('Episodes watched updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update episodes watched');
    }
  };

  const handleEpisodesCancel = () => {
    setEditingEpisodesEntry(null);
    setEpisodesValue('');
  };

  const handleTotalEpisodesClick = (entry: WatchlistEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTotalEpisodesEntry(entry);
    setTotalEpisodesValue(Number(entry.anime.episodesAvailable).toString());
  };

  const handleTotalEpisodesSave = async () => {
    if (!editingTotalEpisodesEntry) return;
    
    const totalEpisodes = parseInt(totalEpisodesValue);
    
    if (isNaN(totalEpisodes) || totalEpisodes < 0) {
      toast.error('Total episodes must be a non-negative number');
      return;
    }

    try {
      await updateTotalEpisodesMutation.mutateAsync({
        anilistId: editingTotalEpisodesEntry.anime.anilistId,
        newTotalEpisodes: BigInt(totalEpisodes),
      });
      setEditingTotalEpisodesEntry(null);
      setTotalEpisodesValue('');
      toast.success('Total episodes updated across all watchlists');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update total episodes');
    }
  };

  const handleTotalEpisodesCancel = () => {
    setEditingTotalEpisodesEntry(null);
    setTotalEpisodesValue('');
  };

  const handleRowClick = (entry: WatchlistEntry) => {
    setSelectedEntry(entry);
  };

  return (
    <>
      {/* Full-width horizontal scrolling container spanning 100vw with edge-to-edge support */}
      <div className="w-screen overflow-x-auto overflow-y-hidden" style={{ scrollBehavior: 'smooth', marginLeft: 'calc(-50vw + 50%)' }}>
        <div className="inline-flex justify-center min-w-full" style={{ paddingLeft: '50vw', paddingRight: '50vw' }}>
          <div style={{ width: '1400px', minWidth: '1400px' }}>
            {entries.length === 0 ? (
              <div className="text-center py-16 bg-black rounded-lg border-4 border-yellow-500">
                <p className="text-muted-foreground">No anime match your filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const currentTitle = getCurrentTitle(entry);
                  const hasAlternates = hasAlternateTitles(entry);

                  return (
                    <div
                      key={Number(entry.anime.anilistId)}
                      className="relative bg-black rounded-lg border-4 border-yellow-500 hover:border-yellow-400 transition-all overflow-hidden group cursor-pointer"
                      style={{ minHeight: '110px' }}
                      onClick={() => handleRowClick(entry)}
                    >
                      <div className="flex min-h-[110px] items-center gap-2 py-2">
                        {/* Cover Image - Far Left */}
                        <div
                          className="flex-shrink-0 overflow-hidden self-stretch"
                          style={{ width: '76px' }}
                        >
                          <img
                            src={entry.anime.coverUrl}
                            alt={entry.anime.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Title - Next to Cover */}
                        <div className="flex items-center gap-1 flex-shrink min-w-0" style={{ width: '200px' }}>
                          <h3 className="font-semibold text-sm break-words leading-tight">
                            {currentTitle}
                          </h3>
                          {hasAlternates && (
                            <button
                              onClick={(e) => handleCycleTitle(entry, e)}
                              className="flex-shrink-0 p-1 hover:bg-green-500/20 rounded transition-colors self-start mt-0.5"
                              title="Click to cycle through alternate titles"
                            >
                              <ArrowRight className="w-4 h-4 text-green-500" />
                            </button>
                          )}
                        </div>

                        {/* Genre Tags - Two columns, max 4 per column, clickable */}
                        <button
                          onClick={(e) => handleGenresClick(entry, e)}
                          className="flex-shrink-0 px-2 self-center hover:opacity-80 transition-opacity"
                          style={{ width: '280px' }}
                          title="Click to edit genres"
                        >
                          <div className="grid grid-cols-2 gap-1">
                            {entry.anime.genres.slice(0, 8).map((genre, idx) => (
                              <div
                                key={idx}
                                className="text-xs px-2 py-0.5 rounded truncate text-center"
                                style={{ backgroundColor: '#FFD700', color: '#000000' }}
                              >
                                {genre}
                              </div>
                            ))}
                          </div>
                        </button>

                        {/* Rating Section */}
                        <div className="flex-shrink-0 flex items-center gap-1 px-2 self-center">
                          <img
                            src="/assets/generated/gold-star-icon-transparent.dim_24x24.png"
                            alt="Rating"
                            className="w-5 h-5"
                          />
                          <button
                            onClick={(e) => handleRatingClick(entry, e)}
                            className="text-sm font-medium hover:text-yellow-400 transition-colors"
                          >
                            {entry.personalRating > 0 ? entry.personalRating.toFixed(1) : 'N/A'}
                          </button>
                        </div>

                        {/* Episodes Watched - Bottom of entry */}
                        <div className="absolute bottom-1 left-20 flex-shrink-0 flex items-center gap-1">
                          <span className="text-xs text-gray-400">Episodes watched:</span>
                          <button
                            onClick={(e) => handleEpisodesClick(entry, e)}
                            className="text-xs text-gray-400 hover:text-yellow-400 transition-colors"
                            title="Click to edit episodes watched"
                          >
                            {Number(entry.episodesWatched)}
                          </button>
                          <span className="text-xs text-gray-400">/</span>
                          <button
                            onClick={(e) => handleTotalEpisodesClick(entry, e)}
                            className="text-xs text-gray-400 hover:text-yellow-400 transition-colors"
                            title="Click to edit total episodes"
                          >
                            {Number(entry.anime.episodesAvailable)}
                          </button>
                        </div>

                        {/* Action Buttons - Right Side */}
                        <div className="flex-shrink-0 flex items-center gap-1 pr-2 ml-auto self-center">
                          {/* Bookmark Icon - Tripled size */}
                          <button
                            onClick={(e) => handleToggleBookmark(entry.anime.anilistId, e)}
                            className="p-1 hover:bg-accent/20 rounded transition-colors"
                            title={entry.isBookmarked ? "Remove bookmark" : "Add bookmark"}
                          >
                            <img
                              src="/assets/generated/bookmark-icon-large-transparent.dim_72x72.png"
                              alt="Bookmark"
                              className={`w-16 h-16 ${entry.isBookmarked ? 'rainbow-glow' : ''}`}
                            />
                          </button>

                          {/* Notepad Icon - Doubled size */}
                          <div className="relative">
                            <button
                              onClick={(e) => handleNotesClick(entry, e)}
                              onMouseEnter={(e) => handleNotesHover(entry, e)}
                              onMouseLeave={handleNotesLeave}
                              className="p-1 hover:bg-accent/20 rounded transition-colors relative"
                              title={entry.notes ? "Edit notes" : "Add notes"}
                            >
                              <img
                                src="/assets/generated/notepad-icon-large-transparent.dim_48x48.png"
                                alt="Notes"
                                className="w-10 h-10"
                              />
                              {entry.notes && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                                  !
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Move/Copy Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMoveOrCopyEntry(entry);
                            }}
                            title="Move or copy to another watchlist"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                          </Button>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(entry.anime.anilistId);
                            }}
                            title="Delete from watchlist"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Hover Tooltip */}
      {hoveredNotes && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${hoveredNotes.x}px`,
            top: `${hoveredNotes.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-black border-2 border-purple-500 rounded-lg p-4 max-w-md shadow-2xl">
            <p className="text-purple-400 font-medium whitespace-pre-wrap break-words">
              {hoveredNotes.notes}
            </p>
          </div>
        </div>
      )}

      {/* Genre Editor Modal */}
      {editingGenresEntry && (
        <GenreEditor
          entry={editingGenresEntry}
          watchlistName={watchlist.name}
          open={!!editingGenresEntry}
          onOpenChange={(open) => !open && setEditingGenresEntry(null)}
        />
      )}

      {/* Notes Editor Modal */}
      <Dialog open={!!editingNotesEntry} onOpenChange={(open) => !open && handleNotesCancel()}>
        <DialogContent className="bg-black border-4 border-yellow-500 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-yellow-500 text-xl">
              {editingNotesEntry ? `Edit Notes - ${getCurrentTitle(editingNotesEntry)}` : 'Edit Notes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  Character count: {notesValue.length}/120
                </span>
              </div>
              <Textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="Add your notes here (max 120 characters)..."
                maxLength={120}
                className="min-h-[150px] bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400 resize-none"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleNotesCancel}
              className="border-2 border-gray-600 hover:bg-gray-800 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleNotesSave}
              disabled={updateEntryMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {updateEntryMutation.isPending ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Editor Modal */}
      <Dialog open={!!editingRatingEntry} onOpenChange={(open) => !open && handleRatingCancel()}>
        <DialogContent className="bg-black border-4 border-yellow-500 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-500 text-xl">
              {editingRatingEntry ? `Rate - ${getCurrentTitle(editingRatingEntry)}` : 'Rate Anime'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Enter rating (0-10, decimals allowed):
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={ratingValue}
                onChange={(e) => setRatingValue(e.target.value)}
                placeholder="e.g., 8.5"
                className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleRatingCancel}
              className="border-2 border-gray-600 hover:bg-gray-800 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRatingSave}
              disabled={updateEntryMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {updateEntryMutation.isPending ? 'Saving...' : 'Save Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Episodes Watched Editor Modal */}
      <Dialog open={!!editingEpisodesEntry} onOpenChange={(open) => !open && handleEpisodesCancel()}>
        <DialogContent className="bg-black border-4 border-yellow-500 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-500 text-xl">
              {editingEpisodesEntry ? `Episodes Watched - ${getCurrentTitle(editingEpisodesEntry)}` : 'Episodes Watched'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Enter episodes watched (0-{editingEpisodesEntry ? Number(editingEpisodesEntry.anime.episodesAvailable) : 0}):
              </label>
              <Input
                type="number"
                min="0"
                max={editingEpisodesEntry ? Number(editingEpisodesEntry.anime.episodesAvailable) : 0}
                value={episodesValue}
                onChange={(e) => setEpisodesValue(e.target.value)}
                placeholder="0"
                className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleEpisodesCancel}
              className="border-2 border-gray-600 hover:bg-gray-800 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEpisodesSave}
              disabled={updateEntryMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {updateEntryMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Total Episodes Editor Modal */}
      <Dialog open={!!editingTotalEpisodesEntry} onOpenChange={(open) => !open && handleTotalEpisodesCancel()}>
        <DialogContent className="bg-black border-4 border-yellow-500 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-500 text-xl">
              {editingTotalEpisodesEntry ? `Total Episodes - ${getCurrentTitle(editingTotalEpisodesEntry)}` : 'Total Episodes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">
                Enter total episodes available:
              </label>
              <Input
                type="number"
                min="0"
                value={totalEpisodesValue}
                onChange={(e) => setTotalEpisodesValue(e.target.value)}
                placeholder="0"
                className="bg-gray-900 border-2 border-yellow-600 text-white placeholder:text-gray-500 focus:border-yellow-400"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                This will update total episodes across all watchlists containing this anime.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleTotalEpisodesCancel}
              className="border-2 border-gray-600 hover:bg-gray-800 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTotalEpisodesSave}
              disabled={updateTotalEpisodesMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
            >
              {updateTotalEpisodesMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Detail Dialog */}
      {selectedEntry && (
        <WatchlistEntryDialog
          entry={selectedEntry}
          watchlistName={watchlist.name}
          open={!!selectedEntry}
          onOpenChange={(open) => !open && setSelectedEntry(null)}
        />
      )}

      {/* Move or Copy Dialog */}
      {moveOrCopyEntry && (
        <MoveOrCopyDialog
          entry={moveOrCopyEntry}
          currentWatchlist={watchlist}
          allWatchlists={allWatchlists}
          open={!!moveOrCopyEntry}
          onOpenChange={(open) => !open && setMoveOrCopyEntry(null)}
        />
      )}
    </>
  );
}
