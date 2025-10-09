const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const thumbnail = require('node-thumbnail');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Frame cache to store recently extracted frames
const frameCache = new Map();
const CACHE_SIZE_LIMIT = 100; // Maximum number of frames to cache
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

// Preview sequence cache - stores pre-generated frame sequences for clips
const previewSequences = new Map();
const PREVIEW_FRAME_INTERVAL = 0.5; // Extract frame every 0.5 seconds

// Rate limiting for frame extraction to prevent CPU overload
let activeFrameExtractions = 0;
const MAX_CONCURRENT_EXTRACTIONS = 2; // Limit concurrent extractions

// Background processing queue for non-urgent tasks
const backgroundQueue = [];
let isProcessingBackground = false;

// Automatic cleanup timer (like Premiere's memory management)
setInterval(() => {
  cleanupCache();
  processBackgroundQueue();
}, 30000); // Clean up every 30 seconds

// Smart processing - prioritize urgent requests
const processBackgroundQueue = async () => {
  if (isProcessingBackground || backgroundQueue.length === 0) return;
  
  isProcessingBackground = true;
  console.log('🔄 Processing background queue:', backgroundQueue.length, 'tasks');
  
  while (backgroundQueue.length > 0 && activeFrameExtractions < MAX_CONCURRENT_EXTRACTIONS) {
    const task = backgroundQueue.shift();
    try {
      await task();
    } catch (error) {
      console.error('❌ Background task failed:', error);
    }
  }
  
  isProcessingBackground = false;
};

// Cache management functions
function getCacheKey(character, filename, frameNumber) {
  return `${character}/${filename}/${frameNumber}`;
}

function isCacheValid(entry) {
  return Date.now() - entry.timestamp < CACHE_EXPIRY_TIME;
}

function cleanupCache() {
  // Remove expired entries
  for (const [key, entry] of frameCache.entries()) {
    if (!isCacheValid(entry)) {
      frameCache.delete(key);
    }
  }
  
  // If still over limit, remove oldest entries
  if (frameCache.size > CACHE_SIZE_LIMIT) {
    const entries = Array.from(frameCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, frameCache.size - CACHE_SIZE_LIMIT);
    toRemove.forEach(([key]) => frameCache.delete(key));
  }
  
  // Advanced memory management - clean up preview sequences
  for (const [key, sequence] of previewSequences.entries()) {
    if (Date.now() - sequence.generated > CACHE_EXPIRY_TIME) {
      // Clear frame data to free memory but keep structure
      sequence.frames.forEach(frame => {
        if (frame.data && frame.data.length > 0) {
          frame.data = null; // Free memory
        }
      });
      console.log('🧹 Freed memory for expired sequence:', key);
    }
  }
}

// Generate preview sequence for a video (like Premiere does)
async function generatePreviewSequence(character, filename, videoPath) {
  const sequenceKey = `${character}/${filename}`;
  
  // Check if sequence already exists
  if (previewSequences.has(sequenceKey)) {
    console.log('⚡ Preview sequence already exists:', sequenceKey);
    return previewSequences.get(sequenceKey);
  }
  
  console.log('🎬 Generating preview sequence for:', sequenceKey);
  
  try {
    // Get video duration
    const videoInfo = await getVideoInfo(character, filename);
    const duration = videoInfo.duration;
    const frameRate = videoInfo.frameRate || 30;
    
    // Calculate frame positions for preview sequence
    const previewFrames = [];
    for (let time = 0; time < duration; time += PREVIEW_FRAME_INTERVAL) {
      const frameNumber = Math.floor(time * frameRate);
      previewFrames.push({
        time: time,
        frameNumber: frameNumber,
        data: null // Will be populated when frame is requested
      });
    }
    
    // Store the sequence structure
    const sequence = {
      frames: previewFrames,
      duration: duration,
      frameRate: frameRate,
      generated: Date.now()
    };
    
    previewSequences.set(sequenceKey, sequence);
    console.log('✅ Preview sequence generated:', sequenceKey, 'with', previewFrames.length, 'frames');
    
    return sequence;
  } catch (error) {
    console.error('❌ Error generating preview sequence:', error);
    return null;
  }
}

// Get the nearest preview frame for a given time (with smart interpolation)
function getNearestPreviewFrame(sequence, targetTime) {
  if (!sequence || !sequence.frames) return null;
  
  // Find the closest frame by time
  let closestFrame = sequence.frames[0];
  let minDiff = Math.abs(targetTime - closestFrame.time);
  
  for (const frame of sequence.frames) {
    const diff = Math.abs(targetTime - frame.time);
    if (diff < minDiff) {
      minDiff = diff;
      closestFrame = frame;
    }
  }
  
  // Smart interpolation - if frame is missing data, try to restore it
  if (closestFrame && !closestFrame.data && closestFrame.isDuplicate) {
    // Find the original frame this was duplicated from
    const originalFrame = sequence.frames.find(f => 
      f.frameNumber === closestFrame.frameNumber - 1 && f.data
    );
    if (originalFrame) {
      closestFrame.data = originalFrame.data;
    }
  }
  
  return closestFrame;
}

// Extract and cache a preview frame (optimized for CPU usage with rate limiting)
async function extractPreviewFrame(videoPath, frameNumber, frameRate) {
  // Rate limiting to prevent CPU overload
  if (activeFrameExtractions >= MAX_CONCURRENT_EXTRACTIONS) {
    console.log('⏳ Rate limiting frame extraction to prevent CPU overload');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
  }
  
  activeFrameExtractions++;
  
  return new Promise((resolve, reject) => {
    const timePosition = frameNumber / frameRate;
    
    // Optimized FFmpeg args with hardware acceleration
    const ffmpegArgs = [
      '-hwaccel', 'auto', // Enable hardware acceleration
      '-ss', timePosition.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-compression_level', '1', // Fast compression
      '-pred', 'mixed', // Fast prediction
      '-threads', '1', // Single thread to reduce CPU load
      '-preset', 'ultrafast', // Fastest encoding preset
      '-tune', 'fastdecode', // Optimize for fast decoding
      '-'
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let frameData = Buffer.alloc(0);
    
    ffmpeg.stdout.on('data', (chunk) => {
      frameData = Buffer.concat([frameData, chunk]);
    });
    
    ffmpeg.stdout.on('end', () => {
      activeFrameExtractions--;
      resolve(frameData);
    });
    
    ffmpeg.on('error', (error) => {
      activeFrameExtractions--;
      reject(error);
    });
    
    // Reduced timeout for faster failure
    setTimeout(() => {
      ffmpeg.kill('SIGTERM');
      activeFrameExtractions--;
      reject(new Error('Preview frame extraction timeout'));
    }, 3000);
  });
}

// Pre-extract frames for timeline preview (optimized like Premiere Pro)
async function preExtractTimelineFrames(character, filename, videoPath, frameRate, duration) {
  const sequenceKey = `${character}/${filename}`;
  
  // Check if frames are already pre-extracted
  if (previewSequences.has(sequenceKey)) {
    const sequence = previewSequences.get(sequenceKey);
    if (sequence.frames && sequence.frames.length > 0 && sequence.frames[0].data) {
      console.log('⚡ Timeline frames already pre-extracted:', sequenceKey);
      return sequence;
    }
  }
  
  console.log('🎬 Pre-extracting timeline frames for:', sequenceKey);
  
  try {
    // Optimized frame extraction - extract fewer frames for lower CPU usage
    const frameInterval = 1.0; // Extract frame every 1 second (less CPU intensive)
    const totalFrames = Math.floor(duration * frameRate);
    const previewFrames = [];
    const frameHashes = new Map(); // For deduplication
    
    for (let time = 0; time < duration; time += frameInterval) {
      const frameNumber = Math.floor(time * frameRate);
      if (frameNumber < totalFrames) {
        try {
          console.log(`📸 Extracting frame ${frameNumber}/${totalFrames} for ${sequenceKey}`);
          const frameData = await extractPreviewFrame(videoPath, frameNumber, frameRate);
          
          // Simple deduplication - check if frame is similar to previous
          const frameHash = frameData.length; // Simple hash based on size
          const isDuplicate = frameHashes.has(frameHash) && 
            Math.abs(frameHashes.get(frameHash) - frameNumber) < 5; // Within 5 frames
          
          if (!isDuplicate) {
            previewFrames.push({
              time: time,
              frameNumber: frameNumber,
              data: frameData
            });
            frameHashes.set(frameHash, frameNumber);
          } else {
            // Reference previous frame instead of storing duplicate
            const prevFrame = previewFrames[previewFrames.length - 1];
            previewFrames.push({
              time: time,
              frameNumber: frameNumber,
              data: prevFrame.data, // Reference previous frame
              isDuplicate: true
            });
            console.log(`🔄 Reusing frame ${frameNumber} (duplicate of ${prevFrame.frameNumber})`);
          }
        } catch (error) {
          console.error(`❌ Error extracting frame ${frameNumber}:`, error);
          // Continue with other frames even if one fails
        }
      }
    }
    
    // Store the pre-extracted sequence
    const sequence = {
      frames: previewFrames,
      duration: duration,
      frameRate: frameRate,
      generated: Date.now(),
      preExtracted: true
    };
    
    previewSequences.set(sequenceKey, sequence);
    console.log('✅ Pre-extracted timeline frames:', sequenceKey, 'with', previewFrames.length, 'frames');
    
    return sequence;
  } catch (error) {
    console.error('❌ Error pre-extracting timeline frames:', error);
    return null;
  }
}

// CSV path
const csvPath = path.join(__dirname, '../data/clips.csv');

// Function to get video duration using FFprobe (more reliable)
const getVideoDuration = async (videoPath) => {
  try {
    if (!fs.existsSync(videoPath)) {
      return "0:00";
    }
    
    // Use FFprobe to get duration (more reliable than PowerShell)
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`;
    
    const { stdout } = await execAsync(command);
    const durationInSeconds = parseFloat(stdout.trim());
    
    if (isNaN(durationInSeconds) || durationInSeconds <= 0) {
      return "0:00";
    }
    
    // Convert seconds to MM:SS format
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    return duration;
  } catch (error) {
    console.error('Error getting video duration for', videoPath, ':', error.message);
    return "0:00";
  }
};


const getAllClips = async (req, res) => {
  try {
    const rows = [];
    
    // First, read all CSV data
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Process all rows without async operations for faster loading
    const clips = rows.map((row) => {
      // Parse season, episode, order from the ID (format: XX.S1.E1.C01)
      let season = '', episode = '', order = '';
      const idMatch = row.id.match(/S(\d+)\.E(\d+)\.C(\d+)/i);
      if (idMatch) {
        season = `S${idMatch[1]}`;
        episode = `E${idMatch[2]}`;
        order = parseInt(idMatch[3], 10);
      }
      
      // Return clip data without any file system operations
      return {
        ...row,
        season,
        episode,
        order,
        duration: "0:00", // Placeholder - will be loaded when needed
        thumbnail: null, // Placeholder - would need thumbnail generation
      };
    });
    
    res.json(clips);
  } catch (error) {
    console.error('Error in getAllClips:', error);
    res.status(500).json({ error: error.message });
  }
};

const getVideoFile = (req, res) => {
  const { character, filename } = req.params;
  
  // Decode URL-encoded filename
  const decodedFilename = decodeURIComponent(filename);
  
  // Construct the path to the video file
  const videoPath = path.join(
    'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
    character, decodedFilename
  );
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video file not found', path: videoPath });
  }
  
  // Set appropriate headers for video streaming
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
};

const generateThumbnail = (req, res) => {
  const { character, filename } = req.params;
  
  // Decode URL-encoded filename
  const decodedFilename = decodeURIComponent(filename);
  
  // Construct the path to the video file
  const videoPath = path.join(
    'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
    character, decodedFilename
  );
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video file not found', path: videoPath });
  }
  
  // Note: No folder creation - using placeholder thumbnails only
  
  // Create a simple placeholder image response
  const placeholderSvg = `<svg width="200" height="150" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="150" fill="#e0e0e0"/>
    <text x="100" y="75" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">🎬</text>
    <text x="100" y="95" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">${filename}</text>
  </svg>`;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(placeholderSvg);
};

const getClipDuration = async (req, res) => {
  try {
    const { character, filename } = req.params;
    
    // Decode URL-encoded filename
    const decodedFilename = decodeURIComponent(filename);
    
    // Construct video path
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, decodedFilename
    );
    
    // Get actual duration using Windows PowerShell
    const duration = await getVideoDuration(videoPath);
    
    res.json({ duration });
  } catch (error) {
    console.error('Error getting clip duration:', error);
    res.status(500).json({ error: error.message });
  }
};

const processPrerender = async (req, res) => {
  try {
    const { startFrame, endFrame, durationFrames, clips } = req.body;
    
    console.log('Processing prerender (streaming mode):', { startFrame, endFrame, durationFrames, clips });
    
    // Instead of creating files, just return the prerender data for streaming
    // The frontend will use the streamFrameDirect endpoint for individual frames
    res.json({
      success: true,
      prerenderId: `stream_${Date.now()}`,
      outputPath: null, // No file output in streaming mode
      frameCount: durationFrames,
      message: 'Prerender ready for streaming - frames will be extracted on demand',
      streamingMode: true
    });
    
  } catch (error) {
    console.error('Error processing prerender:', error);
    res.status(500).json({ error: error.message });
  }
};

// Note: Frame processing functions removed - now using direct streaming from MP4 files

// Note: Cached frame extraction removed - now using direct streaming from MP4 files

// Stream frame directly from video (no disk storage)
const streamFrameDirect = async (req, res) => {
  console.log('🎬 FRAME REQUEST RECEIVED:', req.params);
  
  // Simple test - just return a basic response first
  if (req.params.frameNumber === 'test') {
    res.setHeader('Content-Type', 'text/plain');
    res.send('Frame endpoint is working');
    return;
  }
  
  try {
    const { character, filename, frameNumber } = req.params;
    
    // Decode URL-encoded filename
    const decodedFilename = decodeURIComponent(filename);
    
    // Construct video path with decoded filename
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, decodedFilename
    );
    
    // Check cache first
    const cacheKey = getCacheKey(character, decodedFilename, frameNumber);
    const cachedEntry = frameCache.get(cacheKey);
    
    if (cachedEntry && isCacheValid(cachedEntry)) {
      console.log('⚡ Serving frame from cache:', cacheKey);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
      res.send(cachedEntry.data);
      return;
    }
    
    // Try preview sequence approach (like Premiere)
    const sequenceKey = `${character}/${decodedFilename}`;
    let sequence = previewSequences.get(sequenceKey);
    
    if (!sequence) {
      // Generate preview sequence if it doesn't exist
      sequence = await generatePreviewSequence(character, decodedFilename, videoPath);
    }
    
    if (sequence) {
      // Calculate target time from frame number
      const videoFrameRate = sequence.frameRate;
      const targetTime = validatedFrameNumber / videoFrameRate;
      
      // Get nearest preview frame
      const nearestFrame = getNearestPreviewFrame(sequence, targetTime);
      
      if (nearestFrame) {
        // If frame data doesn't exist, extract it
        if (!nearestFrame.data) {
          try {
            console.log('🎬 Extracting preview frame:', nearestFrame.frameNumber);
            nearestFrame.data = await extractPreviewFrame(videoPath, nearestFrame.frameNumber, sequence.frameRate);
            console.log('✅ Preview frame extracted:', nearestFrame.frameNumber, 'Size:', nearestFrame.data.length);
          } catch (error) {
            console.error('❌ Error extracting preview frame:', error);
            // Fall through to regular extraction
          }
        }
        
        if (nearestFrame.data) {
          console.log('⚡ Serving frame from preview sequence:', sequenceKey, 'frame:', nearestFrame.frameNumber);
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
          res.send(nearestFrame.data);
          return;
        }
      }
    }
    
    console.log('🎬 Stream frame request:', { 
      character, 
      filename: decodedFilename, 
      frameNumber,
      originalFilename: filename,
      urlEncoded: filename !== decodedFilename
    });
    
    console.log('📁 Video path:', videoPath);
    console.log('📁 Path exists check:', fs.existsSync(videoPath));
    console.log('📁 Directory exists:', fs.existsSync(path.dirname(videoPath)));
    console.log('📁 Directory contents:', fs.readdirSync(path.dirname(videoPath)));
    
    if (!fs.existsSync(videoPath)) {
      console.error('❌ Video file not found:', {
        path: videoPath,
        character,
        originalFilename: filename,
        decodedFilename,
        directoryExists: fs.existsSync(path.dirname(videoPath))
      });
      return res.status(404).json({ 
        error: 'Video file not found',
        path: videoPath,
        character,
        filename: decodedFilename
      });
    }
    
    console.log('✅ Video file exists, starting FFmpeg...');
    
    // Validate frame number and ensure it's an integer
    const validatedFrameNumber = Math.floor(parseFloat(frameNumber));
    if (isNaN(validatedFrameNumber) || validatedFrameNumber < 0) {
      console.error('❌ Invalid frame number:', validatedFrameNumber);
      return res.status(400).json({ error: 'Invalid frame number' });
    }
    
    // Log frame number for debugging
    console.log('🎯 FRAME REQUEST DEBUG:', {
      requestedFrame: frameNumber,
      validatedFrame: validatedFrameNumber,
      video: decodedFilename,
      character: character,
      originalFilename: filename,
      decodedFilename: decodedFilename,
      frameType: typeof frameNumber,
      frameIsInteger: Number.isInteger(validatedFrameNumber)
    });
    
    // Get video frame count to validate frame number
    try {
      const { spawn } = require('child_process');
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-select_streams', 'v:0',
        '-count_frames',
        '-show_entries', 'stream=nb_frames',
        videoPath
      ]);
      
      let probeOutput = '';
      ffprobe.stdout.on('data', (data) => {
        probeOutput += data.toString();
      });
      
      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const match = probeOutput.match(/nb_frames=(\d+)/);
            if (match) {
              const totalFrames = parseInt(match[1]);
              console.log('📹 Video has', totalFrames, 'frames, requesting frame', validatedFrameNumber);
              
              if (validatedFrameNumber >= totalFrames) {
                console.error('❌ Frame number out of range:', {
                  requested: validatedFrameNumber,
                  totalFrames: totalFrames,
                  video: decodedFilename
                });
                return res.status(400).json({ 
                  error: 'Frame number out of range',
                  requested: validatedFrameNumber,
                  totalFrames: totalFrames,
                  message: `Video only has ${totalFrames} frames, but frame ${validatedFrameNumber} was requested`
                });
              }
            }
          } catch (parseError) {
            console.error('❌ Error parsing video frame count:', parseError);
          }
        }
      });
    } catch (probeError) {
      console.error('❌ Error getting video frame count:', probeError);
    }
    
    // Set headers for image response
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Use FFmpeg to stream frame directly to response
    // Try using frame-based seeking with more reliable approach
    // Get video frame rate for accurate time calculation
    let videoFrameRate = 30; // Default fallback
    try {
      const videoInfo = await getVideoInfo(character, decodedFilename);
      if (videoInfo && videoInfo.frameRate) {
        videoFrameRate = videoInfo.frameRate;
        console.log('📹 Using video frame rate:', videoFrameRate, 'fps');
      }
    } catch (error) {
      console.log('⚠️ Could not get video frame rate, using default 30fps');
    }
    
    // Calculate time position for direct seeking (much faster than select filter)
    const timePosition = validatedFrameNumber / videoFrameRate;
    
    const ffmpegArgs = [
      '-hwaccel', 'auto', // Enable hardware acceleration
      '-ss', timePosition.toString(),  // Seek directly to time position
      '-i', videoPath,
      '-vframes', '1',  // Extract just 1 frame
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-compression_level', '1', // Fast compression
      '-pred', 'mixed', // Fast prediction
      '-threads', '1', // Single thread to reduce CPU load
      '-preset', 'ultrafast', // Fastest encoding preset
      '-tune', 'fastdecode', // Optimize for fast decoding
      '-'
    ];
    
    console.log('🔧 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.error('⏰ FFmpeg timeout - killing process');
      ffmpeg.kill('SIGTERM');
      if (!res.headersSent) {
        res.status(500).json({ error: 'Frame extraction timeout' });
      }
    }, 10000); // 10 second timeout
    
    // Capture stderr for debugging
    let stderrOutput = '';
    ffmpeg.stderr.on('data', (data) => {
      stderrOutput += data.toString();
      console.log('🔧 FFmpeg stderr:', data.toString());
    });
    
    // Collect frame data for caching
    let frameData = Buffer.alloc(0);
    let dataSent = 0;
    
    ffmpeg.stdout.on('data', (chunk) => {
      frameData = Buffer.concat([frameData, chunk]);
      dataSent += chunk.length;
      console.log('📤 FFmpeg data chunk:', chunk.length, 'bytes, total:', dataSent);
    });
    
    ffmpeg.stdout.on('end', () => {
      // Cache the frame data
      if (frameData.length > 0) {
        cleanupCache(); // Clean up old cache entries
        frameCache.set(cacheKey, {
          data: frameData,
          timestamp: Date.now()
        });
        console.log('💾 Cached frame:', cacheKey, 'Size:', frameData.length, 'bytes');
      }
    });
    
    ffmpeg.stdout.pipe(res);
    
    // Add response end handler to debug
    res.on('finish', () => {
      console.log('📤 Response finished, data sent:', dataSent, 'bytes');
    });
    
    res.on('close', () => {
      console.log('📤 Response closed, data sent:', dataSent, 'bytes');
    });
    
    ffmpeg.on('error', (error) => {
      console.error('❌ FFmpeg spawn error:', {
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path,
        spawnargs: error.spawnargs
      });
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Frame extraction failed',
          details: error.message,
          stderr: stderrOutput
        });
      }
    });
    
    ffmpeg.on('close', (code) => {
      clearTimeout(timeout); // Clear the timeout
      console.log('🏁 FFmpeg process finished:', {
        code,
        stderr: stderrOutput,
        success: code === 0,
        dataSent: dataSent
      });
      if (code !== 0) {
        console.error('❌ FFmpeg process failed:', {
          exitCode: code,
          stderr: stderrOutput,
          command: 'ffmpeg ' + ffmpegArgs.join(' '),
          dataSent: dataSent
        });
        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Frame extraction failed',
            exitCode: code,
            stderr: stderrOutput
          });
        }
      } else {
        console.log('✅ Frame extraction completed successfully, data sent:', dataSent, 'bytes');
      }
    });
    
  } catch (error) {
    console.error('❌ Error streaming frame:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get video metadata including frame rate
const getVideoInfo = async (req, res) => {
  try {
    const { character, filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    
    console.log('🎬 Getting video info:', { character, filename: decodedFilename });
    
    // Construct video path
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, decodedFilename
    );
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    // Use ffprobe to get video metadata
    const { spawn } = require('child_process');
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoPath
    ]);
    
    let probeOutput = '';
    ffprobe.stdout.on('data', (data) => {
      probeOutput += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const videoInfo = JSON.parse(probeOutput);
          const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
          
          if (videoStream) {
            // Parse frame rate (could be in format "30/1" or "30")
            let frameRate = 30; // Default
            if (videoStream.r_frame_rate) {
              const [num, den] = videoStream.r_frame_rate.split('/');
              frameRate = den ? parseFloat(num) / parseFloat(den) : parseFloat(num);
            }
            
            res.json({
              frameRate: Math.round(frameRate), // Ensure integer frame rate
              duration: parseFloat(videoStream.duration),
              width: videoStream.width,
              height: videoStream.height,
              codec: videoStream.codec_name
            });
          } else {
            res.status(500).json({ error: 'No video stream found' });
          }
        } catch (parseError) {
          console.error('Error parsing video info:', parseError);
          res.status(500).json({ error: 'Failed to parse video metadata' });
        }
      } else {
        res.status(500).json({ error: 'Failed to get video metadata' });
      }
    });
    
  } catch (error) {
    console.error('Error getting video info:', error);
    res.status(500).json({ error: error.message });
  }
};

// Pre-extract frames for timeline preview
const preExtractFrames = async (req, res) => {
  try {
    const { character, filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);
    
    console.log('🎬 Pre-extraction request:', { character, filename: decodedFilename });
    
    // Construct video path
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, decodedFilename
    );
    
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    // Get video info
    const videoInfo = await getVideoInfo(character, decodedFilename);
    if (!videoInfo) {
      return res.status(500).json({ error: 'Could not get video info' });
    }
    
    // Pre-extract frames
    const sequence = await preExtractTimelineFrames(
      character, 
      decodedFilename, 
      videoPath, 
      videoInfo.frameRate, 
      videoInfo.duration
    );
    
    if (sequence) {
      res.json({ 
        success: true, 
        framesExtracted: sequence.frames.length,
        duration: sequence.duration,
        frameRate: sequence.frameRate
      });
    } else {
      res.status(500).json({ error: 'Failed to pre-extract frames' });
    }
  } catch (error) {
    console.error('❌ Error in preExtractFrames:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllClips,
  getVideoFile,
  generateThumbnail,
  getClipDuration,
  processPrerender,
  streamFrameDirect,
  getVideoInfo,
  preExtractFrames
};
