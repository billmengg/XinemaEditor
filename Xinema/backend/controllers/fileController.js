const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const thumbnail = require('node-thumbnail');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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
  
  // Construct the path to the video file
  const videoPath = path.join(
    'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
    character, filename
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
  
  // Construct the path to the video file
  const videoPath = path.join(
    'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
    character, filename
  );
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video file not found', path: videoPath });
  }
  
  // Create thumbnails directory if it doesn't exist
  const thumbnailsDir = path.join(__dirname, '../thumbnails');
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }
  
  // Generate thumbnail filename
  const thumbnailFilename = `${character}_${filename.replace('.mp4', '.jpg')}`;
  const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
  
  // Check if thumbnail already exists
  if (fs.existsSync(thumbnailPath)) {
    return res.sendFile(thumbnailPath);
  }
  
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
    
    // Construct video path
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, filename
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
    
    console.log('Processing prerender:', { startFrame, endFrame, durationFrames, clips });
    
    // Create prerender output directory
    const prerenderDir = path.join(__dirname, '../prerender');
    if (!fs.existsSync(prerenderDir)) {
      fs.mkdirSync(prerenderDir, { recursive: true });
    }
    
    // Generate unique prerender ID
    const prerenderId = `prerender_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const outputDir = path.join(prerenderDir, prerenderId);
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Process each frame in the prerender area
    const framePromises = [];
    for (let frame = 0; frame < durationFrames; frame++) {
      const globalFrame = startFrame + frame;
      framePromises.push(processFrame(globalFrame, frame, clips, outputDir));
    }
    
    // Wait for all frames to be processed
    await Promise.all(framePromises);
    
    // Create composite video from frames
    const outputVideoPath = path.join(outputDir, 'composite.mp4');
    await createCompositeVideo(outputDir, outputVideoPath, durationFrames);
    
    res.json({
      success: true,
      prerenderId,
      outputPath: outputVideoPath,
      frameCount: durationFrames,
      message: 'Prerender completed successfully'
    });
    
  } catch (error) {
    console.error('Error processing prerender:', error);
    res.status(500).json({ error: error.message });
  }
};

// Process individual frame with track compositing
const processFrame = async (globalFrame, localFrame, clips, outputDir) => {
  const frameFilename = `frame_${localFrame.toString().padStart(6, '0')}.png`;
  const framePath = path.join(outputDir, frameFilename);
  
  // Find clips that are active at this frame
  const activeClips = clips.filter(clip => {
    return globalFrame >= clip.startFrame && globalFrame < clip.endFrame;
  });
  
  if (activeClips.length === 0) {
    // No clips active - create black frame
    await createBlackFrame(framePath);
    return;
  }
  
  // Sort by track (highest track number first for compositing)
  const sortedClips = activeClips.sort((a, b) => b.track - a.track);
  
  // Start with the lowest track (bottom layer)
  let compositeImage = null;
  
  for (const clip of sortedClips) {
    const clipFrame = globalFrame - clip.startFrame;
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      clip.character, clip.filename
    );
    
    if (fs.existsSync(videoPath)) {
      // Extract frame from video
      const extractedFramePath = path.join(outputDir, `temp_${clip.character}_${clip.filename}_${clipFrame}.png`);
      await extractFrameFromVideo(videoPath, clipFrame, extractedFramePath);
      
      if (compositeImage === null) {
        // First clip - use as base
        compositeImage = extractedFramePath;
      } else {
        // Composite with existing image (higher track over lower track)
        await compositeFrames(compositeImage, extractedFramePath, compositeImage);
      }
    }
  }
  
  if (compositeImage) {
    // Move final composite to frame path
    fs.renameSync(compositeImage, framePath);
  } else {
    // No valid clips - create black frame
    await createBlackFrame(framePath);
  }
};

// Extract frame from video using FFmpeg
const extractFrameFromVideo = async (videoPath, frameNumber, outputPath) => {
  const command = `ffmpeg -i "${videoPath}" -vf "select=eq(n\\,${frameNumber})" -vframes 1 -y "${outputPath}"`;
  await execAsync(command);
};

// Create black frame
const createBlackFrame = async (outputPath) => {
  const command = `ffmpeg -f lavfi -i color=black:size=1920x1080:duration=1/60 -vframes 1 -y "${outputPath}"`;
  await execAsync(command);
};

// Composite two frames (higher track over lower track)
const compositeFrames = async (baseFrame, overlayFrame, outputPath) => {
  const command = `ffmpeg -i "${baseFrame}" -i "${overlayFrame}" -filter_complex "[0:v][1:v]overlay=0:0" -y "${outputPath}"`;
  await execAsync(command);
};

// Create composite video from frames
const createCompositeVideo = async (framesDir, outputPath, frameCount) => {
  // Create video at 60fps to match timeline frame rate
  const command = `ffmpeg -framerate 60 -i "${framesDir}/frame_%06d.png" -c:v libx264 -pix_fmt yuv420p -r 60 -y "${outputPath}"`;
  await execAsync(command);
};

// Extract single frame from video (cached approach)
const extractSingleFrame = async (req, res) => {
  try {
    const { character, filename, frameNumber } = req.body;
    
    console.log('Extracting single frame:', { character, filename, frameNumber });
    
    // Construct video path
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, filename
    );
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    // Create frames directory if it doesn't exist
    const framesDir = path.join(__dirname, '../frames');
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }
    
    // Generate frame filename
    const frameFilename = `${character}_${filename}_frame_${frameNumber}.png`;
    const framePath = path.join(framesDir, frameFilename);
    
    // Check if frame already exists (caching)
    if (fs.existsSync(framePath)) {
      console.log('Frame already exists, using cached version');
      return res.json({
        success: true,
        framePath: framePath,
        frameNumber: frameNumber,
        message: 'Frame loaded from cache'
      });
    }
    
    // Extract frame using FFmpeg
    const command = `ffmpeg -i "${videoPath}" -vf "select=eq(n\\,${frameNumber})" -vframes 1 -y "${framePath}"`;
    await execAsync(command);
    
    res.json({
      success: true,
      framePath: framePath,
      frameNumber: frameNumber,
      message: 'Frame extracted successfully'
    });
    
  } catch (error) {
    console.error('Error extracting single frame:', error);
    res.status(500).json({ error: error.message });
  }
};

// Serve extracted frame
const serveFrame = (req, res) => {
  try {
    const { character, filename, frameNumber } = req.params;
    
    // Construct frame path
    const frameFilename = `${character}_${filename}_frame_${frameNumber}.png`;
    const framePath = path.join(__dirname, '../frames', frameFilename);
    
    // Check if frame exists
    if (!fs.existsSync(framePath)) {
      return res.status(404).json({ error: 'Frame not found' });
    }
    
    // Serve the frame image
    res.sendFile(framePath);
    
  } catch (error) {
    console.error('Error serving frame:', error);
    res.status(500).json({ error: error.message });
  }
};

// Stream frame directly from video (no disk storage)
const streamFrameDirect = (req, res) => {
  try {
    const { character, filename, frameNumber } = req.params;
    
    console.log('🎬 Stream frame request:', { character, filename, frameNumber });
    
    // Construct video path
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, filename
    );
    
    console.log('📁 Video path:', videoPath);
    
    if (!fs.existsSync(videoPath)) {
      console.error('❌ Video file not found:', videoPath);
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    console.log('✅ Video file exists, starting FFmpeg...');
    
    // Set headers for image response
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Use FFmpeg to stream frame directly to response
    const ffmpegArgs = [
      '-i', videoPath,
      '-vf', `select=eq(n\\,${frameNumber})`,
      '-vframes', '1',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-'
    ];
    
    console.log('🔧 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    
    const { spawn } = require('child_process');
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.stdout.pipe(res);
    
    ffmpeg.on('error', (error) => {
      console.error('❌ FFmpeg error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Frame extraction failed' });
      }
    });
    
    ffmpeg.on('close', (code) => {
      console.log('🏁 FFmpeg process finished with code:', code);
      if (code !== 0) {
        console.error('❌ FFmpeg process exited with error code:', code);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Frame extraction failed' });
        }
      } else {
        console.log('✅ Frame extraction completed successfully');
      }
    });
    
    ffmpeg.stderr.on('data', (data) => {
      console.log('🔍 FFmpeg stderr:', data.toString());
    });
    
  } catch (error) {
    console.error('❌ Error streaming frame:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  getAllClips,
  getVideoFile,
  generateThumbnail,
  getClipDuration,
  processPrerender,
  extractSingleFrame,
  serveFrame,
  streamFrameDirect
};
