// Comprehensive IndexedDB-based caching system for AniList API data and images
// Supports up to 20 GB of storage with automatic cleanup

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheMetadata {
  totalSize: number;
  entries: number;
  lastCleanup: number;
}

const DB_NAME = "anilist_cache_db";
const DB_VERSION = 1;
const STORE_NAME = "cache_store";
const METADATA_STORE = "metadata_store";
const IMAGE_STORE = "image_store";
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 20 * 1024 * 1024 * 1024; // 20 GB
const CLEANUP_THRESHOLD = 0.9; // Cleanup when 90% full
const CLEANUP_TARGET = 0.7; // Clean down to 70%
const CLEANUP_BATCH_SIZE = 50; // Process entries in batches

class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private cleanupInProgress = false;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create cache store for JSON data
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("expiresAt", "expiresAt", { unique: false });
          store.createIndex("lastAccessed", "lastAccessed", { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: "id" });
        }

        // Create image store for binary data
        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          const imageStore = db.createObjectStore(IMAGE_STORE, {
            keyPath: "key",
          });
          imageStore.createIndex("timestamp", "timestamp", { unique: false });
          imageStore.createIndex("lastAccessed", "lastAccessed", {
            unique: false,
          });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error("Database not initialized");
    }
  }

  private estimateSize(data: any): number {
    try {
      if (data instanceof Blob || data instanceof ArrayBuffer) {
        return data instanceof Blob ? data.size : data.byteLength;
      }
      return JSON.stringify(data).length * 2; // Approximate UTF-16 size
    } catch {
      return 0;
    }
  }

  private async getMetadata(): Promise<CacheMetadata> {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], "readonly");
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get("metadata");

      request.onsuccess = () => {
        resolve(
          request.result || {
            totalSize: 0,
            entries: 0,
            lastCleanup: Date.now(),
          },
        );
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async setMetadata(metadata: CacheMetadata): Promise<void> {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], "readwrite");
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.put({ id: "metadata", ...metadata });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureInitialized();
      return new Promise((resolve, _reject) => {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry: CacheEntry<T> | undefined = request.result;

          if (!entry) {
            resolve(null);
            return;
          }

          // Check if expired
          if (Date.now() > entry.expiresAt) {
            this.delete(key);
            resolve(null);
            return;
          }

          // Update access statistics
          entry.accessCount++;
          entry.lastAccessed = Date.now();
          store.put(entry);

          resolve(entry.data);
        };

        request.onerror = () => {
          console.error("Error reading from cache:", request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error("Error in get:", error);
      return null;
    }
  }

  async set<T>(
    key: string,
    data: T,
    ttl: number = DEFAULT_TTL,
  ): Promise<boolean> {
    try {
      await this.ensureInitialized();

      const size = this.estimateSize(data);
      const metadata = await this.getMetadata();

      // Check if cleanup is needed
      if (metadata.totalSize + size > MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
        await this.cleanup(true);
        const newMetadata = await this.getMetadata();

        if (newMetadata.totalSize + size > MAX_CACHE_SIZE) {
          console.warn("Cache size limit reached");
          return false;
        }
      }

      return new Promise((resolve, _reject) => {
        const transaction = this.db!.transaction(
          [STORE_NAME, METADATA_STORE],
          "readwrite",
        );
        const store = transaction.objectStore(STORE_NAME);

        const entry: CacheEntry<T> = {
          key,
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
          size,
          accessCount: 0,
          lastAccessed: Date.now(),
        };

        const request = store.put(entry);

        request.onsuccess = async () => {
          metadata.totalSize += size;
          metadata.entries++;
          await this.setMetadata(metadata);
          resolve(true);
        };

        request.onerror = () => {
          console.error("Error writing to cache:", request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error("Error in set:", error);
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.ensureInitialized();
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(
          [STORE_NAME, METADATA_STORE],
          "readwrite",
        );
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(key);

        getRequest.onsuccess = async () => {
          const entry: CacheEntry<any> | undefined = getRequest.result;

          if (entry) {
            const deleteRequest = store.delete(key);

            deleteRequest.onsuccess = async () => {
              const metadata = await this.getMetadata();
              metadata.totalSize = Math.max(0, metadata.totalSize - entry.size);
              metadata.entries = Math.max(0, metadata.entries - 1);
              await this.setMetadata(metadata);
              resolve();
            };

            deleteRequest.onerror = () => reject(deleteRequest.error);
          } else {
            resolve();
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      });
    } catch (error) {
      console.error("Error in delete:", error);
    }
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  // Modularized cleanup with batched async operations
  private async cleanupExpiredEntries(): Promise<string[]> {
    await this.ensureInitialized();
    const now = Date.now();
    const expiredKeys: string[] = [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const entry: CacheEntry<any> = cursor.value;
          if (now > entry.expiresAt) {
            expiredKeys.push(entry.key);
          }
          cursor.continue();
        } else {
          resolve(expiredKeys);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async deleteEntriesBatch(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    await this.ensureInitialized();

    // Process in batches to avoid blocking UI
    for (let i = 0; i < keys.length; i += CLEANUP_BATCH_SIZE) {
      const batch = keys.slice(i, i + CLEANUP_BATCH_SIZE);

      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        for (const key of batch) {
          store.delete(key);
        }

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      // Yield to browser to prevent UI lag
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  private async collectLeastUsedEntries(): Promise<
    Array<{
      key: string;
      lastAccessed: number;
      size: number;
      accessCount: number;
    }>
  > {
    await this.ensureInitialized();
    const entries: Array<{
      key: string;
      lastAccessed: number;
      size: number;
      accessCount: number;
    }> = [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          const entry: CacheEntry<any> = cursor.value;
          entries.push({
            key: entry.key,
            lastAccessed: entry.lastAccessed,
            size: entry.size,
            accessCount: entry.accessCount,
          });
          cursor.continue();
        } else {
          // Sort by access count (ascending) and last accessed (ascending)
          entries.sort((a, b) => {
            if (a.accessCount !== b.accessCount) {
              return a.accessCount - b.accessCount;
            }
            return a.lastAccessed - b.lastAccessed;
          });
          resolve(entries);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async cleanup(aggressive = false): Promise<void> {
    if (this.cleanupInProgress) {
      console.log("Cleanup already in progress, skipping...");
      return;
    }

    try {
      this.cleanupInProgress = true;
      await this.ensureInitialized();
      const metadata = await this.getMetadata();

      // Step 1: Remove expired entries
      const expiredKeys = await this.cleanupExpiredEntries();
      if (expiredKeys.length > 0) {
        await this.deleteEntriesBatch(expiredKeys);
      }

      // Step 2: Aggressive cleanup if needed
      if (aggressive) {
        const allEntries = await this.collectLeastUsedEntries();
        const targetSize = MAX_CACHE_SIZE * CLEANUP_TARGET;
        let currentSize = metadata.totalSize;
        const keysToRemove: string[] = [];

        for (const entry of allEntries) {
          if (currentSize <= targetSize) break;
          keysToRemove.push(entry.key);
          currentSize -= entry.size;
        }

        if (keysToRemove.length > 0) {
          await this.deleteEntriesBatch(keysToRemove);
        }
      }

      // Step 3: Recalculate metadata
      await this.recalculateMetadata();
    } catch (error) {
      console.error("Error in cleanup:", error);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  private async recalculateMetadata(): Promise<void> {
    await this.ensureInitialized();
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORE_NAME, METADATA_STORE],
        "readwrite",
      );
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const newMetadata: CacheMetadata = {
          totalSize: 0,
          entries: countRequest.result,
          lastCleanup: now,
        };

        // Calculate total size in batches
        const sizeRequest = store.openCursor();
        sizeRequest.onsuccess = async (e) => {
          const sizeCursor = (e.target as IDBRequest).result;
          if (sizeCursor) {
            newMetadata.totalSize += sizeCursor.value.size;
            sizeCursor.continue();
          } else {
            await this.setMetadata(newMetadata);
            resolve();
          }
        };

        sizeRequest.onerror = () => reject(sizeRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  async clear(): Promise<void> {
    try {
      await this.ensureInitialized();
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(
          [STORE_NAME, IMAGE_STORE, METADATA_STORE],
          "readwrite",
        );

        transaction.objectStore(STORE_NAME).clear();
        transaction.objectStore(IMAGE_STORE).clear();
        transaction.objectStore(METADATA_STORE).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Error in clear:", error);
    }
  }

  async getStats(): Promise<{
    size: number;
    entries: number;
    sizeFormatted: string;
  }> {
    try {
      const metadata = await this.getMetadata();
      const sizeInGB = (metadata.totalSize / (1024 * 1024 * 1024)).toFixed(2);
      const sizeInMB = (metadata.totalSize / (1024 * 1024)).toFixed(2);

      return {
        size: metadata.totalSize,
        entries: metadata.entries,
        sizeFormatted:
          metadata.totalSize > 1024 * 1024 * 1024
            ? `${sizeInGB} GB`
            : `${sizeInMB} MB`,
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      return { size: 0, entries: 0, sizeFormatted: "0 MB" };
    }
  }

  // Image caching methods with progressive loading support
  async getImage(url: string): Promise<Blob | null> {
    try {
      await this.ensureInitialized();
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([IMAGE_STORE], "readwrite");
        const store = transaction.objectStore(IMAGE_STORE);
        const request = store.get(url);

        request.onsuccess = () => {
          const entry = request.result;

          if (!entry) {
            resolve(null);
            return;
          }

          // Update access time
          entry.lastAccessed = Date.now();
          entry.accessCount++;
          store.put(entry);

          resolve(entry.data);
        };

        request.onerror = () => {
          console.error("Error reading image from cache:", request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error("Error in getImage:", error);
      return null;
    }
  }

  async setImage(url: string, blob: Blob): Promise<boolean> {
    try {
      await this.ensureInitialized();

      const size = blob.size;
      const metadata = await this.getMetadata();

      if (metadata.totalSize + size > MAX_CACHE_SIZE * CLEANUP_THRESHOLD) {
        await this.cleanup(true);
      }

      return new Promise((resolve) => {
        const transaction = this.db!.transaction(
          [IMAGE_STORE, METADATA_STORE],
          "readwrite",
        );
        const store = transaction.objectStore(IMAGE_STORE);

        const entry = {
          key: url,
          data: blob,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          size,
          accessCount: 0,
        };

        const request = store.put(entry);

        request.onsuccess = async () => {
          metadata.totalSize += size;
          await this.setMetadata(metadata);
          resolve(true);
        };

        request.onerror = () => {
          console.error("Error writing image to cache:", request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error("Error in setImage:", error);
      return false;
    }
  }
}

// Export singleton instance
export const indexedDBCache = new IndexedDBCache();

// Helper functions for generating cache keys
export function generateAnimeListCacheKey(
  page: number,
  limit: number,
  sortOrder: string,
  genres: string[],
  status: string,
): string {
  const genresKey = genres.sort().join(",");
  return `anime_list_${page}_${limit}_${sortOrder}_${genresKey}_${status}`;
}

export function generateSearchCacheKey(
  searchTerm: string,
  page: number,
  limit: number,
): string {
  return `anime_search_${searchTerm}_${page}_${limit}`;
}

export function generateAnimeDetailCacheKey(animeId: number): string {
  return `anime_detail_${animeId}`;
}
