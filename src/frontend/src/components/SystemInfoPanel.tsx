import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { indexedDBCache } from "../lib/indexedDBCache";

export default function SystemInfoPanel() {
  const [metadataSize, setMetadataSize] = useState<string>("0 MB");
  const [imageSize, setImageSize] = useState<string>("0 MB");
  const [ramLimit, setRamLimit] = useState<number>(8);
  const [ramUsageLimit, setRamUsageLimit] = useState<string>("8192");
  const [ramUsageLimitUnit, setRamUsageLimitUnit] = useState<"MB" | "GB">("MB");
  const [currentRamUsage, setCurrentRamUsage] = useState<string>("0 MB");
  const [availableRam, setAvailableRam] = useState<string>("N/A");
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [showPanel, setShowPanel] = useState<boolean>(false);
  const [currentCanisterId, setCurrentCanisterId] =
    useState<string>("Loading...");
  const { actor } = useActor();

  // Get current canister ID from the actor
  useEffect(() => {
    const getCanisterId = async () => {
      try {
        // Try to get canister ID from environment variables first
        const envCanisterId = import.meta.env.VITE_BACKEND_CANISTER_ID;

        if (envCanisterId) {
          setCurrentCanisterId(envCanisterId);
          return;
        }

        // If not in env, try to extract from actor
        if (actor) {
          // The actor has a _canisterId property that we can access
          const actorWithId = actor as any;
          if (actorWithId._canisterId) {
            const canisterId = actorWithId._canisterId.toString();
            setCurrentCanisterId(canisterId);
            return;
          }
        }

        // Fallback: try to read from localStorage or env.json
        const savedCanisterId = localStorage.getItem("backendCanisterId");
        if (savedCanisterId) {
          setCurrentCanisterId(savedCanisterId);
          return;
        }

        // Last resort: try to fetch env.json
        try {
          const response = await fetch("/env.json");
          if (response.ok) {
            const envData = await response.json();
            const canisterId =
              envData.BACKEND_CANISTER_ID || envData.backend_canister_id;
            if (canisterId) {
              setCurrentCanisterId(canisterId);
              return;
            }
          }
        } catch (error) {
          console.error("Failed to fetch env.json:", error);
        }

        setCurrentCanisterId("Not configured");
      } catch (error) {
        console.error("Error getting canister ID:", error);
        setCurrentCanisterId("Error retrieving ID");
      }
    };

    getCanisterId();
  }, [actor]);

  // Load RAM limit from localStorage
  useEffect(() => {
    const savedRamLimit = localStorage.getItem("ramLimit");
    if (savedRamLimit) {
      setRamLimit(Number(savedRamLimit));
    }

    const savedRamUsageLimit = localStorage.getItem("ramUsageLimit");
    const savedRamUsageLimitUnit = localStorage.getItem("ramUsageLimitUnit");
    if (savedRamUsageLimit) {
      setRamUsageLimit(savedRamUsageLimit);
    }
    if (savedRamUsageLimitUnit) {
      setRamUsageLimitUnit(savedRamUsageLimitUnit as "MB" | "GB");
    }
  }, []);

  // Calculate storage sizes and RAM usage
  useEffect(() => {
    const calculateSizes = async () => {
      try {
        const stats = await indexedDBCache.getStats();

        // Get image storage size separately
        const db = await openIndexedDB();
        const imageStorageSize = await getImageStorageSize(db);

        // Metadata size is total size minus image size
        const metadataBytes = Math.max(0, stats.size - imageStorageSize);

        setMetadataSize(formatBytes(metadataBytes));
        setImageSize(formatBytes(imageStorageSize));

        // Estimate current RAM usage (approximate based on cache size)
        const estimatedRamUsage = stats.size;
        setCurrentRamUsage(formatBytes(estimatedRamUsage));

        // Calculate available RAM based on limit
        const limitInBytes =
          ramUsageLimitUnit === "GB"
            ? Number(ramUsageLimit) * 1024 * 1024 * 1024
            : Number(ramUsageLimit) * 1024 * 1024;
        const availableBytes = Math.max(0, limitInBytes - estimatedRamUsage);
        setAvailableRam(formatBytes(availableBytes));
      } catch (error) {
        console.error("Error calculating storage sizes:", error);
      }
    };

    calculateSizes();
    const interval = setInterval(calculateSizes, 5000);
    return () => clearInterval(interval);
  }, [ramUsageLimit, ramUsageLimitUnit]);

  const openIndexedDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("anilist_cache_db", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const getImageStorageSize = (db: IDBDatabase): Promise<number> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["image_store"], "readonly");
      const store = transaction.objectStore("image_store");
      const request = store.openCursor();
      let totalSize = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value;
          totalSize += entry.size || 0;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };

      request.onerror = () => reject(request.error);
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 MB";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleRamLimitChange = (value: number) => {
    setRamLimit(value);
    localStorage.setItem("ramLimit", value.toString());
    toast.success(`RAM limit set to ${value} GB`, {
      description: "Memory allocation updated in real time",
    });
  };

  const handleRamUsageLimitChange = (value: string) => {
    // Validate input
    const numValue = Number(value);
    if (Number.isNaN(numValue) || numValue < 0) {
      toast.error("Invalid RAM usage limit", {
        description: "Please enter a valid positive number",
      });
      return;
    }

    setRamUsageLimit(value);
    localStorage.setItem("ramUsageLimit", value);
    toast.success(`RAM usage limit set to ${value} ${ramUsageLimitUnit}`, {
      description: "Memory usage limit updated in real time",
    });
  };

  const handleRamUsageLimitUnitChange = (unit: "MB" | "GB") => {
    setRamUsageLimitUnit(unit);
    localStorage.setItem("ramUsageLimitUnit", unit);
    toast.success(`RAM usage limit unit changed to ${unit}`, {
      description: "Memory usage limit updated in real time",
    });
  };

  return (
    <div className="bg-black rounded-lg border-4 border-yellow-500 mb-6 overflow-hidden">
      {/* Toggle Header */}
      <button
        type="button"
        onClick={() => setShowPanel(!showPanel)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-900 transition-colors"
      >
        <h2 className="text-lg font-bold text-yellow-500">
          System Information
        </h2>
        {showPanel ? (
          <ChevronUp className="w-5 h-5 text-yellow-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-yellow-500" />
        )}
      </button>

      {/* Panel Content */}
      {showPanel && (
        <div className="p-4 space-y-4 border-t-2 border-yellow-500">
          {/* Metadata Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-metadata"
              checked={showMetadata}
              onCheckedChange={(checked) => setShowMetadata(checked as boolean)}
              className="border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
            />
            <Label
              htmlFor="show-metadata"
              className="text-white text-xs font-medium cursor-pointer"
            >
              Metadata
            </Label>
          </div>

          {/* Storage Information - Hidden by default */}
          {showMetadata && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-300">
              <div className="space-y-1">
                <Label className="text-white text-xs font-medium">
                  Total Metadata Storage
                </Label>
                <div className="bg-gray-900 rounded-lg p-2 border-2 border-yellow-600">
                  <p className="text-base font-bold text-yellow-400">
                    {metadataSize}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    IndexedDB data excluding images
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white text-xs font-medium">
                  Total Image Storage
                </Label>
                <div className="bg-gray-900 rounded-lg p-2 border-2 border-yellow-600">
                  <p className="text-base font-bold text-yellow-400">
                    {imageSize}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    All cached image blobs
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* RAM Limit Control with Checkboxes */}
          <div className="space-y-2">
            <Label className="text-white text-xs font-medium">
              RAM Limit (GB)
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((gb) => (
                <div key={gb} className="flex items-center space-x-1.5">
                  <Checkbox
                    id={`ram-${gb}`}
                    checked={ramLimit === gb}
                    onCheckedChange={() => handleRamLimitChange(gb)}
                    className="border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                  />
                  <Label
                    htmlFor={`ram-${gb}`}
                    className="text-white text-xs font-normal cursor-pointer"
                  >
                    {gb} GB
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400">
              Adjust allocated memory limit for background processes and caching
            </p>
          </div>

          {/* RAM Usage Limit Input Field */}
          <div className="space-y-2">
            <Label className="text-white text-xs font-medium">
              RAM Usage Limit
            </Label>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={ramUsageLimit}
                  onChange={(e) => setRamUsageLimit(e.target.value)}
                  onBlur={(e) => handleRamUsageLimitChange(e.target.value)}
                  className="bg-gray-900 border-2 border-yellow-600 text-white"
                  placeholder="Enter limit"
                />
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={ramUsageLimitUnit === "MB" ? "default" : "outline"}
                  onClick={() => handleRamUsageLimitUnitChange("MB")}
                  className={
                    ramUsageLimitUnit === "MB"
                      ? "bg-yellow-500 text-black hover:bg-yellow-600"
                      : "border-yellow-500 text-yellow-500"
                  }
                >
                  MB
                </Button>
                <Button
                  size="sm"
                  variant={ramUsageLimitUnit === "GB" ? "default" : "outline"}
                  onClick={() => handleRamUsageLimitUnitChange("GB")}
                  className={
                    ramUsageLimitUnit === "GB"
                      ? "bg-yellow-500 text-black hover:bg-yellow-600"
                      : "border-yellow-500 text-yellow-500"
                  }
                >
                  GB
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-gray-900 rounded-lg p-2 border-2 border-yellow-600">
                <p className="text-[10px] text-gray-400">Current Usage</p>
                <p className="text-sm font-bold text-yellow-400">
                  {currentRamUsage}
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-2 border-2 border-yellow-600">
                <p className="text-[10px] text-gray-400">Available</p>
                <p className="text-sm font-bold text-yellow-400">
                  {availableRam}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Set maximum memory usage threshold for the app with real-time
              monitoring
            </p>
          </div>

          {/* Backend Canister Configuration */}
          <div className="space-y-2">
            <Label className="text-white text-xs font-medium">
              Backend Canister ID
            </Label>
            <div className="bg-gray-900 rounded-lg p-2 border-2 border-yellow-600">
              <p className="text-xs font-mono text-yellow-400 break-all">
                {currentCanisterId}
              </p>
            </div>
            <p className="text-[10px] text-gray-400">
              Current backend canister identifier retrieved from application
              configuration
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
