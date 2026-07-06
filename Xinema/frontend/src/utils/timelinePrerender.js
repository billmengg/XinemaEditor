// Timeline Prerender System
// Generates thumbnails in background for instant timeline preview

class TimelinePrerender {
  constructor() {
    this.prerenderCache = new Map(); // Cache for prerendered frames
    this.prerenderQueue = []; // Queue for background processing
    this.isProcessing = false;
    this.prerenderSettings = {
      thumbnailWidth: 320, // Low-res for speed
      thumbnailHeight: 180,
      frameInterval: 1, // Every frame for smooth scrubbing
      maxConcurrent: 3, // Limit concurrent prerenders
      cacheSize: 1000 // Max frames in cache
    };
  }

  // Start prerendering when clip is added to timeline
  async prerenderClip(clip, startFrame, endFrame) {
    const clipId = `${clip.character}/${clip.filename}`;
    
    console.log(`🎬 Starting prerender for clip: ${clipId}`, {
      startFrame,
      endFrame,
      duration: endFrame - startFrame
    });

    // Add to queue for background processing
    this.prerenderQueue.push({
      clip,
      clipId,
      startFrame,
      endFrame,
      priority: 'high'
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Process prerender queue in background
  async processQueue() {
    this.isProcessing = true;

    while (this.prerenderQueue.length > 0) {
      const batch = this.prerenderQueue.splice(0, this.prerenderSettings.maxConcurrent);
      
      // Process batch concurrently
      const promises = batch.map(item => this.prerenderClipFrames(item));
      await Promise.all(promises);
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  // Prerender frames for a specific clip - Premiere Pro style (selective frames only)
  async prerenderClipFrames({ clip, clipId, startFrame, endFrame }) {
    try {
      console.log(`🔄 Smart prerendering key frames for ${clipId}: ${startFrame}-${endFrame}`);
      
      const frames = [];
      const frameCount = endFrame - startFrame;
      
      // Premiere Pro approach: Only generate frames every 60 frames (1 second at 60fps)
      const frameInterval = 60; // Generate every second
      const keyFrames = [];
      
      for (let i = 0; i < frameCount; i += frameInterval) {
        const timelineFrame = startFrame + i;
        const videoFrame = Math.round((i * 24) / 60); // Convert to 24fps
        keyFrames.push({ timelineFrame, videoFrame, frameIndex: i });
      }
      
      console.log(`🎯 Generating ${keyFrames.length} key frames (every ${frameInterval} frames)`);
      
      // Generate key frames in small batches
      const batchSize = 5; // Smaller batches for responsiveness
      for (let i = 0; i < keyFrames.length; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, keyFrames.length);
        const batchPromises = [];
        
        for (let j = i; j < batchEnd; j++) {
          const { timelineFrame, videoFrame } = keyFrames[j];
          console.log(`🎬 Generating key frame ${j}: timeline=${timelineFrame}, video=${videoFrame}`);
          batchPromises.push(this.generateThumbnail(clip, videoFrame, timelineFrame));
        }
        
        const batchResults = await Promise.all(batchPromises);
        const validFrames = batchResults.filter(Boolean);
        frames.push(...validFrames);
        
        console.log(`📦 Key frame batch complete: ${validFrames.length} frames generated`);
        
        // Update cache as we go
        this.updateCache(clipId, frames);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(`✅ Prerender complete for ${clipId}: ${frames.length} frames`);
      console.log(`📊 Cache status:`, this.getCacheStats());
      
    } catch (error) {
      console.error(`❌ Prerender failed for ${clipId}:`, error);
    }
  }

  // Generate individual thumbnail
  async generateThumbnail(clip, videoFrame, timelineFrame) {
    try {
      const frameUrl = `http://localhost:5000/api/frame-direct/${clip.character}/${clip.filename}/${videoFrame}`;
      
      // Fetch frame data
      const response = await fetch(frameUrl);
      if (!response.ok) {
        throw new Error(`Frame fetch failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      return {
        timelineFrame,
        videoFrame,
        imageUrl,
        blob,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate thumbnail for frame ${videoFrame}:`, error);
      return null;
    }
  }

  // Update cache with new frames
  updateCache(clipId, frames) {
    if (!this.prerenderCache.has(clipId)) {
      this.prerenderCache.set(clipId, []);
    }
    
    const existingFrames = this.prerenderCache.get(clipId);
    existingFrames.push(...frames);
    
    // Limit cache size
    if (existingFrames.length > this.prerenderSettings.cacheSize) {
      const excess = existingFrames.length - this.prerenderSettings.cacheSize;
      const removedFrames = existingFrames.splice(0, excess);
      
      // Clean up blob URLs
      removedFrames.forEach(frame => {
        if (frame.imageUrl) {
          URL.revokeObjectURL(frame.imageUrl);
        }
      });
    }
  }

  // Get prerendered frame (instant access)
  getPrerenderedFrame(clipId, timelineFrame) {
    const frames = this.prerenderCache.get(clipId);
    if (!frames || frames.length === 0) {
      console.log(`🔍 No prerendered frames found for ${clipId}`);
      return null;
    }
    
    console.log(`🔍 Looking for frame ${timelineFrame} in ${frames.length} prerendered frames for ${clipId}`);
    
    // Find closest frame
    const closestFrame = frames.reduce((closest, frame) => {
      const currentDiff = Math.abs(frame.timelineFrame - timelineFrame);
      const closestDiff = Math.abs(closest.timelineFrame - timelineFrame);
      return currentDiff < closestDiff ? frame : closest;
    });
    
    console.log(`🎯 Found closest frame: ${closestFrame.timelineFrame} (diff: ${Math.abs(closestFrame.timelineFrame - timelineFrame)})`);
    
    return closestFrame;
  }

  // Check if clip is prerendered
  isClipPrerendered(clipId) {
    return this.prerenderCache.has(clipId) && this.prerenderCache.get(clipId).length > 0;
  }

  // Get prerender status
  getPrerenderStatus(clipId) {
    const frames = this.prerenderCache.get(clipId);
    if (!frames) return { status: 'not_started', frameCount: 0 };
    
    const totalFrames = frames.length;
    const isComplete = this.prerenderQueue.every(item => item.clipId !== clipId);
    
    return {
      status: isComplete ? 'complete' : 'in_progress',
      frameCount: totalFrames,
      isComplete
    };
  }

  // Clear prerender cache
  clearCache(clipId = null) {
    if (clipId) {
      const frames = this.prerenderCache.get(clipId);
      if (frames) {
        frames.forEach(frame => {
          if (frame.imageUrl) {
            URL.revokeObjectURL(frame.imageUrl);
          }
        });
      }
      this.prerenderCache.delete(clipId);
    } else {
      // Clear all
      this.prerenderCache.forEach(frames => {
        frames.forEach(frame => {
          if (frame.imageUrl) {
            URL.revokeObjectURL(frame.imageUrl);
          }
        });
      });
      this.prerenderCache.clear();
    }
  }

  // Get cache statistics
  getCacheStats() {
    let totalFrames = 0;
    let totalMemory = 0;
    
    this.prerenderCache.forEach(frames => {
      totalFrames += frames.length;
      frames.forEach(frame => {
        if (frame.blob) {
          totalMemory += frame.blob.size;
        }
      });
    });
    
    return {
      totalFrames,
      totalMemoryMB: Math.round(totalMemory / (1024 * 1024) * 100) / 100,
      cacheSize: this.prerenderCache.size,
      queueLength: this.prerenderQueue.length,
      isProcessing: this.isProcessing
    };
  }
  
  // Generate frame on-demand (Premiere Pro style)
  async generateFrameOnDemand(clip, timelineFrame) {
    const clipId = `${clip.character}/${clip.filename}`;
    
    // Check if frame already exists in cache
    const cachedFrame = this.getPrerenderedFrame(clipId, timelineFrame);
    if (cachedFrame) {
      return cachedFrame;
    }
    
    // Calculate video frame from raw clip frame
    const relativeFrame = timelineFrame - (clip.startFrames || 0);
    const videoFrame = Math.round((relativeFrame * 24) / 60); // Convert to 24fps
    
    console.log(`🎬 Generating frame on-demand: timeline=${timelineFrame}, video=${videoFrame}`);
    
    try {
      const frameData = await this.generateThumbnail(clip, videoFrame, timelineFrame);
      if (frameData) {
        // Add to cache immediately
        const frames = [{ timelineFrame, videoFrame, imageUrl: frameData.imageUrl }];
        this.updateCache(clipId, frames);
        return frameData;
      }
    } catch (error) {
      console.error(`❌ On-demand frame generation failed:`, error);
    }
    
    return null;
  }
}

// Export singleton instance
const timelinePrerender = new TimelinePrerender();
export default timelinePrerender;
