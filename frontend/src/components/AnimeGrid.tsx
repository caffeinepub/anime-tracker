import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';
import AnimeDetailDialog from './AnimeDetailDialog';
import { indexedDBCache } from '../lib/indexedDBCache';
import AddToWatchlistDialog from './AddToWatchlistDialog';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetUserWatchlists, useGetWatchlistNamesForAnime } from '../hooks/useQueries';

interface AnilistAnime {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  coverImage: {
    large: string;
    medium: string;
  };
  genres: string[];
  averageScore: number | null;
  episodes: number | null;
  status: string;
  startDate: {
    year: number | null;
    month: number | null;
    day: number | null;
  };
  description: string | null;
}

interface AnimeGridProps {
  animeList: AnilistAnime[];
  boxSizeMultiplier: number;
  animeInWatchlists: Set<number>;
}

export default function AnimeGrid({ animeList, boxSizeMultiplier, animeInWatchlists }: AnimeGridProps) {
  const [selectedAnime, setSelectedAnime] = useState<AnilistAnime | null>(null);
  const [animeToAdd, setAnimeToAdd] = useState<AnilistAnime | null>(null);
  const [currentTitles, setCurrentTitles] = useState<Map<number, number>>(new Map());
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [hoveredAnimeId, setHoveredAnimeId] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; isRightmost: boolean } | null>(null);
  const [gridColumns, setGridColumns] = useState<number>(4);
  const gridRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const labelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const { identity } = useInternetIdentity();
  const { data: userWatchlistsData } = useGetUserWatchlists();

  const isAuthenticated = !!identity;
  const watchlists = userWatchlistsData?.watchlists || [];

  // Detect number of columns in the grid
  useEffect(() => {
    const updateGridColumns = () => {
      if (gridRef.current) {
        const gridComputedStyle = window.getComputedStyle(gridRef.current);
        const gridTemplateColumns = gridComputedStyle.gridTemplateColumns;
        const columnCount = gridTemplateColumns.split(' ').length;
        setGridColumns(columnCount);
      }
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, []);

  // Update tooltip position when hovering
  useEffect(() => {
    if (hoveredAnimeId !== null) {
      const labelElement = labelRefs.current.get(hoveredAnimeId);
      if (labelElement) {
        const rect = labelElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const isRightmost = rect.right > viewportWidth / 2;
        
        setTooltipPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          isRightmost,
        });
      }
    } else {
      setTooltipPosition(null);
    }
  }, [hoveredAnimeId]);

  // Initialize intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const largeSrc = img.dataset.src;
            const mediumSrc = img.dataset.srcMedium;
            if (largeSrc && mediumSrc) {
              loadImageProgressive(largeSrc, mediumSrc, img);
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const loadImageProgressive = async (largeSrc: string, mediumSrc: string, imgElement: HTMLImageElement) => {
    // Check if already loaded
    if (loadedImages.has(largeSrc)) {
      if (imageCache.has(largeSrc)) {
        imgElement.src = imageCache.get(largeSrc)!;
        imgElement.classList.remove('opacity-0');
        imgElement.classList.add('opacity-100');
      }
      return;
    }

    // Step 1: Load thumbnail (medium) first for quick display
    const cachedMedium = await indexedDBCache.getImage(mediumSrc);
    if (cachedMedium) {
      const mediumUrl = URL.createObjectURL(cachedMedium);
      imgElement.src = mediumUrl;
      imgElement.classList.remove('opacity-0');
      imgElement.classList.add('opacity-50');
    } else {
      // Fetch medium quality from network
      try {
        const mediumResponse = await fetch(mediumSrc);
        const mediumBlob = await mediumResponse.blob();
        await indexedDBCache.setImage(mediumSrc, mediumBlob);
        const mediumUrl = URL.createObjectURL(mediumBlob);
        imgElement.src = mediumUrl;
        imgElement.classList.remove('opacity-0');
        imgElement.classList.add('opacity-50');
      } catch (error) {
        console.error('Failed to load medium image:', error);
      }
    }

    // Step 2: Load high-quality image and replace
    const cachedLarge = await indexedDBCache.getImage(largeSrc);
    if (cachedLarge) {
      const largeUrl = URL.createObjectURL(cachedLarge);
      imgElement.src = largeUrl;
      imgElement.classList.remove('opacity-50');
      imgElement.classList.add('opacity-100');
      setImageCache((prev) => new Map(prev).set(largeSrc, largeUrl));
      setLoadedImages((prev) => new Set(prev).add(largeSrc));
      return;
    }

    // Fetch high-quality from network
    try {
      const largeResponse = await fetch(largeSrc);
      const largeBlob = await largeResponse.blob();
      await indexedDBCache.setImage(largeSrc, largeBlob);
      const largeUrl = URL.createObjectURL(largeBlob);
      imgElement.src = largeUrl;
      imgElement.classList.remove('opacity-50');
      imgElement.classList.add('opacity-100');
      setImageCache((prev) => new Map(prev).set(largeSrc, largeUrl));
      setLoadedImages((prev) => new Set(prev).add(largeSrc));
    } catch (error) {
      console.error('Failed to load large image:', error);
      imgElement.src = largeSrc;
      imgElement.classList.remove('opacity-50');
      imgElement.classList.add('opacity-100');
    }
  };

  const handleImageLoad = (img: HTMLImageElement | null) => {
    if (img && observerRef.current && img.dataset.src) {
      observerRef.current.observe(img);
    }
  };

  const getAlternateTitles = (anime: AnilistAnime): string[] => {
    const titles: string[] = [];
    if (anime.title.english) titles.push(anime.title.english);
    if (anime.title.romaji && anime.title.romaji !== anime.title.english) {
      titles.push(anime.title.romaji);
    }
    if (anime.title.native && anime.title.native !== anime.title.romaji) {
      titles.push(anime.title.native);
    }
    return titles;
  };

  const getCurrentTitle = (anime: AnilistAnime): string => {
    const titles = getAlternateTitles(anime);
    const currentIndex = currentTitles.get(anime.id) || 0;
    return titles[currentIndex] || anime.title.english || anime.title.romaji;
  };

  const cycleTitle = (anime: AnilistAnime, e: React.MouseEvent) => {
    e.stopPropagation();
    const titles = getAlternateTitles(anime);
    if (titles.length <= 1) return;
    
    const currentIndex = currentTitles.get(anime.id) || 0;
    const nextIndex = (currentIndex + 1) % titles.length;
    setCurrentTitles(new Map(currentTitles.set(anime.id, nextIndex)));
  };

  const baseWidth = 300;
  const baseHeight = 150;
  const width = baseWidth * boxSizeMultiplier;
  const height = baseHeight * boxSizeMultiplier;

  const genreColors = [
    'bg-red-500/80',
    'bg-blue-500/80',
    'bg-green-500/80',
    'bg-yellow-500/80',
    'bg-purple-500/80',
    'bg-pink-500/80',
    'bg-indigo-500/80',
    'bg-orange-500/80',
  ];

  // Convert AnilistAnime to format expected by AnimeDetailDialog
  const convertToDetailFormat = (anime: AnilistAnime) => ({
    id: anime.id,
    title: {
      english: anime.title.english || undefined,
      romaji: anime.title.romaji,
      native: anime.title.native || undefined,
    },
    coverImage: anime.coverImage,
    genres: anime.genres,
    averageScore: anime.averageScore || undefined,
    episodes: anime.episodes || undefined,
    status: anime.status || undefined,
    description: anime.description || undefined,
    startDate: anime.startDate ? {
      year: anime.startDate.year || undefined,
      month: anime.startDate.month || undefined,
      day: anime.startDate.day || undefined,
    } : undefined,
  });

  return (
    <>
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {animeList.map((anime, index) => {
          const alternateTitles = getAlternateTitles(anime);
          const hasAlternateTitles = alternateTitles.length > 1;
          const isInWatchlist = animeInWatchlists.has(anime.id);
          const isRightmostColumn = (index % gridColumns) === (gridColumns - 1);

          return (
            <div
              key={anime.id}
              className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-card anime-card-border animate-in fade-in zoom-in-95"
              style={{ 
                width: `${width}px`, 
                height: `${height}px`,
                animationDelay: `${index * 30}ms`,
                animationDuration: '400ms'
              }}
              onClick={() => setSelectedAnime(anime)}
            >
              {/* Watchlist indicator - centered with tooltip */}
              {isInWatchlist && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <div 
                    ref={(el) => {
                      if (el) {
                        labelRefs.current.set(anime.id, el);
                      } else {
                        labelRefs.current.delete(anime.id);
                      }
                    }}
                    className="relative flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium animate-in fade-in zoom-in-95 duration-300 shadow-lg pointer-events-auto"
                    onMouseEnter={() => setHoveredAnimeId(anime.id)}
                    onMouseLeave={() => setHoveredAnimeId(null)}
                  >
                    <Check className="w-4 h-4 rainbow-glow" />
                    <span>On List</span>
                  </div>
                </div>
              )}

              {/* Title with alternate title cycling */}
              <div className="absolute top-2 left-2 right-2 z-10 flex items-start gap-1">
                <h3 className="text-sm font-semibold text-white drop-shadow-lg flex-1 line-clamp-2 bg-black/60 px-2 py-1 rounded">
                  {getCurrentTitle(anime)}
                </h3>
                {hasAlternateTitles && (
                  <button
                    onClick={(e) => cycleTitle(anime, e)}
                    className="bg-green-500 hover:bg-green-600 text-white p-1 rounded transition-all duration-200 hover:scale-110 flex-shrink-0"
                    title="Cycle through alternate titles"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Cover Image with progressive loading */}
              <img
                ref={handleImageLoad}
                data-src={anime.coverImage.large}
                data-src-medium={anime.coverImage.medium}
                alt={getCurrentTitle(anime)}
                className="absolute top-12 left-2 h-[calc(100%-60px)] w-auto object-cover rounded opacity-0 transition-opacity duration-500"
                loading="lazy"
              />

              {/* Genre Tags */}
              <div
                className="absolute flex flex-col gap-1"
                style={{
                  top: `${57 * boxSizeMultiplier}px`,
                  right: `${10 * boxSizeMultiplier}px`,
                }}
              >
                {anime.genres.slice(0, 3).map((genre, index) => (
                  <span
                    key={genre}
                    className={`${genreColors[index % genreColors.length]} text-white text-xs px-2 py-0.5 rounded-full font-medium animate-in fade-in slide-in-from-right-2`}
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Portal-based tooltip */}
      {hoveredAnimeId !== null && tooltipPosition && isAuthenticated && (
        <WatchlistTooltipPortal 
          animeId={hoveredAnimeId} 
          position={tooltipPosition}
        />
      )}

      {selectedAnime && (
        <AnimeDetailDialog
          anime={convertToDetailFormat(selectedAnime)}
          open={!!selectedAnime}
          onOpenChange={(open) => !open && setSelectedAnime(null)}
          onAddToWatchlist={(anime) => {
            setSelectedAnime(null);
            setAnimeToAdd(selectedAnime);
          }}
          isInWatchlist={animeInWatchlists.has(selectedAnime.id)}
        />
      )}

      {animeToAdd && isAuthenticated && (
        <AddToWatchlistDialog
          anime={convertToDetailFormat(animeToAdd)}
          watchlists={watchlists}
          open={!!animeToAdd}
          onOpenChange={(open) => !open && setAnimeToAdd(null)}
        />
      )}
    </>
  );
}

// Portal-based tooltip component that renders outside the card container
function WatchlistTooltipPortal({ 
  animeId, 
  position 
}: { 
  animeId: number; 
  position: { x: number; y: number; isRightmost: boolean };
}) {
  const { data: watchlistNames, isLoading } = useGetWatchlistNamesForAnime(BigInt(animeId));

  const tooltipContent = (
    <div 
      className="fixed animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
      style={{ 
        left: position.isRightmost ? 'auto' : `${position.x}px`,
        right: position.isRightmost ? `${window.innerWidth - position.x}px` : 'auto',
        top: `${position.y}px`,
        transform: position.isRightmost 
          ? 'translate(calc(-100% - 8px), -50%)' 
          : 'translate(8px, -50%)',
        zIndex: 9999,
      }}
    >
      <div className="bg-black border-2 border-yellow-500 rounded-lg px-3 py-2 shadow-xl min-w-[150px] whitespace-nowrap">
        {isLoading ? (
          <p className="text-xs text-yellow-500">Loading...</p>
        ) : !watchlistNames || watchlistNames.length === 0 ? null : (
          <>
            <p className="text-xs text-yellow-500 font-semibold mb-1">In Watchlists:</p>
            <div className="space-y-1">
              {watchlistNames.map((name, index) => (
                <p key={index} className="text-xs text-yellow-400">
                  • {name}
                </p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(tooltipContent, document.body);
}
