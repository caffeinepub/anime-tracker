import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMutating } from '@tanstack/react-query';

export default function SyncIndicator() {
  const mutatingCount = useIsMutating();
  const isSyncing = mutatingCount > 0;

  const getStatusIcon = () => {
    if (isSyncing) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
    return <Cloud className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (isSyncing) {
      return `Syncing changes... (${mutatingCount} operation${mutatingCount > 1 ? 's' : ''})`;
    }
    return 'All changes synced';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 transition-all duration-300 hover:border-border">
            {getStatusIcon()}
            {isSyncing && (
              <span className="text-xs font-medium text-muted-foreground animate-pulse">
                Syncing...
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getStatusText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
