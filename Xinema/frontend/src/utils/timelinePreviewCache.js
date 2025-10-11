// Professional Timeline Preview Cache System
// Based on Premiere Pro and DaVinci Resolve implementations

// Cache configuration
const CACHE_CONFIG = {
  frameCache: {
    maxSize: 1000,
    expiryTime: 300000, // 5 minutes
    cleanupInterval: 15000 // 15 seconds
  },
  thumbnailCache: {
    maxSize: 500,
    expiryTime: 600000, // 10 minutes
    cleanupInterval: 30000 // 30 seconds
  },
  previewSequences: {
    maxSize: 100,
    expiryTime: 900000, // 15 minutes
    cleanupInterval: 60000 // 60 seconds
  }
};

// Multi-level cache system
class TimelinePreviewCache {
  constructor() {
    // Level 1: Frame Cache - High-performance frame storage
    this.frameCache = new Map();
    
    // Level 2: Thumbnail Cache - Timeline-specific thumbnail sequences
    this.thumbnailCache = new Map();
    
    // Level 3: Preview Sequence Cache - Pre-generated frame sequences
    this.previewSequences = new Map();
    
    // Performance metrics
    this.metrics = {
      frameCacheHits: 0,
      frameCacheMisses: 0,
      thumbnailCacheHits: 0,
      thumbnailCacheMisses: 0,
      previewSequenceHits: 0,
      previewSequenceMisses: 0,
      memoryUsage: 0,
      cleanupCount: 0
    };
    
    // Start automatic cleanup
    this.startCleanup();
    
    console.log('🎬 Timeline Preview Cache initialized');
  }
  
  // Generate cache key for frames
  getFrameCacheKey(character, filename, frameNumber) {
    return `${character}/${filename}/${frameNumber}`;
  }
  
  // Generate cache key for thumbnails
  getThumbnailCacheKey(clipId) {
    return `thumbnail_${clipId}`;
  }
  
  // Generate cache key for preview sequences
  getPreviewSequenceCacheKey(character, filename) {
    return `sequence_${character}/${filename}`;
  }
  
  // Check if cache entry is valid (not expired)
  isCacheEntryValid(entry) {
    return Date.now() - entry.timestamp < entry.expiryTime;
  }
  
  // Frame Cache Operations
  getFrame(character, filename, frameNumber) {
    const key = this.getFrameCacheKey(character, filename, frameNumber);
    const entry = this.frameCache.get(key);
    
    if (entry && this.isCacheEntryValid(entry)) {
      this.metrics.frameCacheHits++;
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry.data;
    }
    
    this.metrics.frameCacheMisses++;
    return null;
  }
  
  setFrame(character, filename, frameNumber, frameData, quality = 'high') {
    const key = this.getFrameCacheKey(character, filename, frameNumber);
    const entry = {
      data: frameData,
      timestamp: Date.now(),
      expiryTime: CACHE_CONFIG.frameCache.expiryTime,
      accessCount: 1,
      lastAccessed: Date.now(),
      size: frameData.length,
      quality: quality
    };
    
    this.frameCache.set(key, entry);
    this.updateMemoryUsage();
    
    // Cleanup if cache is too large
    if (this.frameCache.size > CACHE_CONFIG.frameCache.maxSize) {
      this.cleanupFrameCache();
    }
  }
  
  // Thumbnail Cache Operations
  getThumbnail(clipId) {
    const key = this.getThumbnailCacheKey(clipId);
    const entry = this.thumbnailCache.get(key);
    
    if (entry && this.isCacheEntryValid(entry)) {
      this.metrics.thumbnailCacheHits++;
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry;
    }
    
    this.metrics.thumbnailCacheMisses++;
    return null;
  }
  
  setThumbnail(clipId, thumbnailData) {
    const key = this.getThumbnailCacheKey(clipId);
    const entry = {
      ...thumbnailData,
      timestamp: Date.now(),
      expiryTime: CACHE_CONFIG.thumbnailCache.expiryTime,
      accessCount: 1,
      lastAccessed: Date.now()
    };
    
    this.thumbnailCache.set(key, entry);
    this.updateMemoryUsage();
    
    // Cleanup if cache is too large
    if (this.thumbnailCache.size > CACHE_CONFIG.thumbnailCache.maxSize) {
      this.cleanupThumbnailCache();
    }
  }
  
  // Preview Sequence Cache Operations
  getPreviewSequence(character, filename) {
    const key = this.getPreviewSequenceCacheKey(character, filename);
    const entry = this.previewSequences.get(key);
    
    if (entry && this.isCacheEntryValid(entry)) {
      this.metrics.previewSequenceHits++;
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry;
    }
    
    this.metrics.previewSequenceMisses++;
    return null;
  }
  
  setPreviewSequence(character, filename, sequenceData) {
    const key = this.getPreviewSequenceCacheKey(character, filename);
    const entry = {
      ...sequenceData,
      timestamp: Date.now(),
      expiryTime: CACHE_CONFIG.previewSequences.expiryTime,
      accessCount: 1,
      lastAccessed: Date.now()
    };
    
    this.previewSequences.set(key, entry);
    this.updateMemoryUsage();
    
    // Cleanup if cache is too large
    if (this.previewSequences.size > CACHE_CONFIG.previewSequences.maxSize) {
      this.cleanupPreviewSequenceCache();
    }
  }
  
  // Cache Cleanup Operations
  cleanupFrameCache() {
    const entries = Array.from(this.frameCache.entries());
    
    // Sort by last accessed time (LRU)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest entries
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2)); // Remove 20%
    toRemove.forEach(([key]) => {
      this.frameCache.delete(key);
    });
    
    this.metrics.cleanupCount++;
    console.log(`🧹 Frame cache cleaned: removed ${toRemove.length} entries`);
  }
  
  cleanupThumbnailCache() {
    const entries = Array.from(this.thumbnailCache.entries());
    
    // Sort by last accessed time (LRU)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest entries
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2)); // Remove 20%
    toRemove.forEach(([key]) => {
      this.thumbnailCache.delete(key);
    });
    
    this.metrics.cleanupCount++;
    console.log(`🧹 Thumbnail cache cleaned: removed ${toRemove.length} entries`);
  }
  
  cleanupPreviewSequenceCache() {
    const entries = Array.from(this.previewSequences.entries());
    
    // Sort by last accessed time (LRU)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest entries
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2)); // Remove 20%
    toRemove.forEach(([key]) => {
      this.previewSequences.delete(key);
    });
    
    this.metrics.cleanupCount++;
    console.log(`🧹 Preview sequence cache cleaned: removed ${toRemove.length} entries`);
  }
  
  // Remove expired entries from all caches
  cleanupExpired() {
    const now = Date.now();
    
    // Cleanup frame cache
    for (const [key, entry] of this.frameCache.entries()) {
      if (now - entry.timestamp > entry.expiryTime) {
        this.frameCache.delete(key);
      }
    }
    
    // Cleanup thumbnail cache
    for (const [key, entry] of this.thumbnailCache.entries()) {
      if (now - entry.timestamp > entry.expiryTime) {
        this.thumbnailCache.delete(key);
      }
    }
    
    // Cleanup preview sequence cache
    for (const [key, entry] of this.previewSequences.entries()) {
      if (now - entry.timestamp > entry.expiryTime) {
        this.previewSequences.delete(key);
      }
    }
    
    this.updateMemoryUsage();
  }
  
  // Update memory usage calculation
  updateMemoryUsage() {
    let totalSize = 0;
    
    // Calculate frame cache memory usage
    for (const [key, entry] of this.frameCache.entries()) {
      totalSize += entry.size || 0;
    }
    
    // Calculate thumbnail cache memory usage
    for (const [key, entry] of this.thumbnailCache.entries()) {
      if (entry.frames) {
        entry.frames.forEach(frame => {
          totalSize += frame.data ? frame.data.length : 0;
        });
      }
    }
    
    // Calculate preview sequence memory usage
    for (const [key, entry] of this.previewSequences.entries()) {
      if (entry.frames) {
        entry.frames.forEach(frame => {
          totalSize += frame.data ? frame.data.length : 0;
        });
      }
    }
    
    this.metrics.memoryUsage = totalSize;
  }
  
  // Start automatic cleanup
  startCleanup() {
    // Frame cache cleanup
    setInterval(() => {
      this.cleanupExpired();
    }, CACHE_CONFIG.frameCache.cleanupInterval);
    
    // Thumbnail cache cleanup
    setInterval(() => {
      this.cleanupExpired();
    }, CACHE_CONFIG.thumbnailCache.cleanupInterval);
    
    // Preview sequence cache cleanup
    setInterval(() => {
      this.cleanupExpired();
    }, CACHE_CONFIG.previewSequences.cleanupInterval);
  }
  
  // Get cache statistics
  getStats() {
    const frameCacheHitRate = this.metrics.frameCacheHits / 
      (this.metrics.frameCacheHits + this.metrics.frameCacheMisses) || 0;
    
    const thumbnailCacheHitRate = this.metrics.thumbnailCacheHits / 
      (this.metrics.thumbnailCacheHits + this.metrics.thumbnailCacheMisses) || 0;
    
    const previewSequenceHitRate = this.metrics.previewSequenceHits / 
      (this.metrics.previewSequenceHits + this.metrics.previewSequenceMisses) || 0;
    
    return {
      frameCache: {
        size: this.frameCache.size,
        maxSize: CACHE_CONFIG.frameCache.maxSize,
        hitRate: frameCacheHitRate,
        hits: this.metrics.frameCacheHits,
        misses: this.metrics.frameCacheMisses
      },
      thumbnailCache: {
        size: this.thumbnailCache.size,
        maxSize: CACHE_CONFIG.thumbnailCache.maxSize,
        hitRate: thumbnailCacheHitRate,
        hits: this.metrics.thumbnailCacheHits,
        misses: this.metrics.thumbnailCacheMisses
      },
      previewSequences: {
        size: this.previewSequences.size,
        maxSize: CACHE_CONFIG.previewSequences.maxSize,
        hitRate: previewSequenceHitRate,
        hits: this.metrics.previewSequenceHits,
        misses: this.metrics.previewSequenceMisses
      },
      memory: {
        usage: this.metrics.memoryUsage,
        usageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024 * 100) / 100
      },
      cleanup: {
        count: this.metrics.cleanupCount
      }
    };
  }
  
  // Clear all caches
  clear() {
    this.frameCache.clear();
    this.thumbnailCache.clear();
    this.previewSequences.clear();
    this.metrics = {
      frameCacheHits: 0,
      frameCacheMisses: 0,
      thumbnailCacheHits: 0,
      thumbnailCacheMisses: 0,
      previewSequenceHits: 0,
      previewSequenceMisses: 0,
      memoryUsage: 0,
      cleanupCount: 0
    };
    console.log('🧹 All caches cleared');
  }
}

// Create singleton instance
const timelinePreviewCache = new TimelinePreviewCache();

export default timelinePreviewCache;
