import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

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

interface AnimeDetailDialogProps {
  anime: AnilistAnime;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToWatchlist: (anime: AnilistAnime) => void;
  isInWatchlist: boolean;
}

const genreColors: Record<string, string> = {
  'Action': 'bg-red-500/80 text-white',
  'Adventure': 'bg-orange-500/80 text-white',
  'Comedy': 'bg-yellow-500/80 text-black',
  'Drama': 'bg-purple-500/80 text-white',
  'Fantasy': 'bg-pink-500/80 text-white',
  'Horror': 'bg-gray-800/80 text-white',
  'Mystery': 'bg-indigo-500/80 text-white',
  'Romance': 'bg-rose-500/80 text-white',
  'Sci-Fi': 'bg-cyan-500/80 text-white',
  'Slice of Life': 'bg-green-500/80 text-white',
  'Sports': 'bg-blue-500/80 text-white',
  'Supernatural': 'bg-violet-500/80 text-white',
  'Thriller': 'bg-red-700/80 text-white',
};

const getGenreColor = (genre: string): string => {
  return genreColors[genre] || 'bg-primary/80 text-primary-foreground';
};

const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    RELEASING: 'Airing',
    FINISHED: 'Finished',
    NOT_YET_RELEASED: 'Not Yet Released',
    CANCELLED: 'Cancelled',
    HIATUS: 'Hiatus',
  };
  return statusMap[status] || status;
};

const formatDate = (startDate?: { year?: number; month?: number; day?: number }): string => {
  if (!startDate || !startDate.year) return 'Unknown';
  const { year, month, day } = startDate;
  if (month && day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
  return `${year}`;
};

export default function AnimeDetailDialog({ 
  anime, 
  open, 
  onOpenChange, 
  onAddToWatchlist,
  isInWatchlist 
}: AnimeDetailDialogProps) {
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const getAlternateTitles = (): string[] => {
    const titles: string[] = [];
    const mainTitle = anime.title.english || anime.title.romaji;
    
    if (anime.title.romaji && anime.title.romaji !== mainTitle) {
      titles.push(anime.title.romaji);
    }
    if (anime.title.english && anime.title.english !== mainTitle) {
      titles.push(anime.title.english);
    }
    if (anime.title.native) {
      titles.push(anime.title.native);
    }
    
    return titles;
  };

  const allTitles = [
    anime.title.english || anime.title.romaji,
    ...getAlternateTitles()
  ];

  const currentTitle = allTitles[currentTitleIndex] || anime.title.english || anime.title.romaji;
  const hasAlternateTitle = getAlternateTitles().length > 0;

  const handleCycleTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (currentTitleIndex + 1) % allTitles.length;
    setCurrentTitleIndex(nextIndex);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[3412px] w-[90vw] max-h-[90vh] overflow-y-auto bg-[#3a3a3a] animate-in fade-in zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="sr-only">Anime Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* Cover Image - centered at top, limited to original size */}
          <div className="flex justify-center animate-in fade-in slide-in-from-top-4 duration-500">
            <img
              src={anime.coverImage.large || anime.coverImage.medium}
              alt={currentTitle}
              className="rounded-lg shadow-lg"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Title with alternate title cycling */}
          <div className="flex items-center justify-center gap-2 w-full animate-in fade-in slide-in-from-top-4 duration-500" style={{ animationDelay: '100ms' }}>
            <h2 className="text-3xl font-bold text-center">{currentTitle}</h2>
            {hasAlternateTitle && (
              <button
                onClick={handleCycleTitle}
                className="flex-shrink-0 p-1 hover:bg-green-500/20 rounded transition-all duration-200 hover:scale-110"
                title="Click to cycle through alternate titles"
              >
                <ArrowRight className="w-6 h-6 text-green-500" />
              </button>
            )}
          </div>

          {/* Synopsis */}
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
            <ScrollArea className="h-[420px] w-full rounded-lg bg-[#1e3a5f] p-6">
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {anime.description ? stripHtml(anime.description) : 'No description available.'}
              </p>
            </ScrollArea>
          </div>

          {/* Metadata - Status, Aired Date, Episodes */}
          <div className="w-full max-w-4xl space-y-2 text-center animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
            <p className="text-base text-muted-foreground">
              <span className="font-medium">Status:</span> {anime.status ? getStatusLabel(anime.status) : 'Unknown'}
            </p>
            <p className="text-base text-muted-foreground">
              <span className="font-medium">Aired:</span> {formatDate(anime.startDate)}
            </p>
            <p className="text-base text-muted-foreground">
              <span className="font-medium">Episodes:</span> {anime.episodes || 'N/A'}
            </p>
          </div>

          {/* Genre Tags - Two rows */}
          <div className="grid grid-cols-4 gap-3 w-full max-w-4xl">
            {anime.genres.map((genre, idx) => (
              <Badge 
                key={idx} 
                className={`${getGenreColor(genre)} justify-center text-base py-2 animate-in fade-in zoom-in-95`}
                style={{ animationDelay: `${400 + idx * 50}ms` }}
              >
                {genre}
              </Badge>
            ))}
          </div>

          {/* Rating and Add Button */}
          <div className="flex items-center justify-between pt-6 border-t border-border/50 flex-wrap gap-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '600ms' }}>
            <div className="space-y-2">
              <p className="text-base text-muted-foreground">
                <span className="font-medium">Rating:</span> {anime.averageScore ? `${anime.averageScore}/100` : 'N/A'}
              </p>
            </div>

            {isAuthenticated && (
              <Button 
                onClick={() => onAddToWatchlist(anime)} 
                className="text-lg py-6 px-8 transition-all duration-200 hover:scale-105"
              >
                Add to Watchlist
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
