// Audio Frame Extractor
// Extracts 1-frame audio chunks on-demand (like video frames)
// Frame-accurate audio scrubbing

const FRAME_DURATION = 1 / 60; // 60fps = ~16.67ms per frame
const audioFrameCache = new Map(); // Cache: "clipId/frameNumber" -> AudioBuffer
const audioBufferCache = new Map(); // Cache: "clipId" -> decoded AudioBuffer (full file)
const MAX_FRAME_CACHE_SIZE = 100; // Max cached frames per clip

/**
 * Get or extract a single audio frame
 * @param {Object} clip - The audio clip
 * @param {number} timelineFrame - The timeline frame number
 * @param {number} clipStartFrames - The clip's start frame in timeline
 * @returns {Promise<AudioBuffer>} - The audio frame buffer
 */
export async function extractAudioFrame(clip, timelineFrame, clipStartFrames = 0) {
  const clipId = clip.id;
  const relativeFrame = timelineFrame - clipStartFrames;
  
  // Cache key for this specific frame
  const frameCacheKey = `${clipId}/${relativeFrame}`;
  
  // Check if frame is already cached
  const cachedFrame = audioFrameCache.get(frameCacheKey);
  if (cachedFrame) {
    return cachedFrame;
  }
  
  // Get or decode the full audio buffer
  let fullBuffer = audioBufferCache.get(clipId);
  
  if (!fullBuffer) {
    // Need to decode the full audio file first
    const audioFile = clip.importedMedia?.file;
    if (!audioFile) {
      throw new Error('Audio file not available');
    }
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    fullBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioContext.close();
    
    // Cache the full buffer
    audioBufferCache.set(clipId, fullBuffer);
  }
  
  // Extract the 1-frame chunk
  const sampleRate = fullBuffer.sampleRate;
  const frameStartSample = Math.floor(relativeFrame * FRAME_DURATION * sampleRate);
  const frameEndSample = Math.floor((relativeFrame + 1) * FRAME_DURATION * sampleRate);
  
  // Ensure we don't go beyond the buffer
  const actualEndSample = Math.min(frameEndSample, fullBuffer.length);
  const frameLength = actualEndSample - frameStartSample;
  
  if (frameLength <= 0 || frameStartSample < 0) {
    // Frame is out of bounds - return empty buffer
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const emptyBuffer = audioContext.createBuffer(
      fullBuffer.numberOfChannels,
      Math.floor(FRAME_DURATION * sampleRate),
      sampleRate
    );
    audioContext.close();
    return emptyBuffer;
  }
  
  // Create a new AudioBuffer for this frame
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const frameBuffer = audioContext.createBuffer(
    fullBuffer.numberOfChannels,
    frameLength,
    sampleRate
  );
  
  // Copy the frame data from the full buffer
  for (let channel = 0; channel < fullBuffer.numberOfChannels; channel++) {
    const channelData = fullBuffer.getChannelData(channel);
    const frameChannelData = frameBuffer.getChannelData(channel);
    for (let i = 0; i < frameLength; i++) {
      frameChannelData[i] = channelData[frameStartSample + i] || 0;
    }
  }
  
  audioContext.close();
  
  // Cache the frame (with size limit)
  const cacheEntries = Array.from(audioFrameCache.entries())
    .filter(([key]) => key.startsWith(`${clipId}/`));
  
  if (cacheEntries.length >= MAX_FRAME_CACHE_SIZE) {
    // Remove oldest frame for this clip
    const oldestKey = cacheEntries[0][0];
    audioFrameCache.delete(oldestKey);
  }
  
  audioFrameCache.set(frameCacheKey, frameBuffer);
  
  return frameBuffer;
}

/**
 * Convert AudioBuffer to playable blob URL
 * @param {AudioBuffer} audioBuffer - The audio buffer
 * @returns {Promise<string>} - Blob URL for the audio
 */
export async function audioBufferToBlobUrl(audioBuffer) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  
  // Convert AudioBuffer to WAV
  const wav = audioBufferToWav(audioBuffer);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  
  audioContext.close();
  return url;
}

/**
 * Convert AudioBuffer to WAV format
 * @param {AudioBuffer} audioBuffer - The audio buffer
 * @returns {ArrayBuffer} - WAV file data
 */
function audioBufferToWav(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  
  // Create WAV header
  const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
  view.setUint16(32, numberOfChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);
  
  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return buffer;
}

/**
 * Clear cache for a specific clip
 * @param {string} clipId - The clip ID
 */
export function clearAudioFrameCache(clipId) {
  const keysToDelete = [];
  for (const key of audioFrameCache.keys()) {
    if (key.startsWith(`${clipId}/`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => audioFrameCache.delete(key));
  audioBufferCache.delete(clipId);
}

/**
 * Clear all audio frame caches
 */
export function clearAllAudioFrameCache() {
  audioFrameCache.clear();
  audioBufferCache.clear();
}

