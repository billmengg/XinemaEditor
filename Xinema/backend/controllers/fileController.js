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
const streamFrameDirect = (req, res) => {
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
    
    console.log('🎬 Stream frame request:', { 
      character, 
      filename: decodedFilename, 
      frameNumber,
      originalFilename: filename,
      urlEncoded: filename !== decodedFilename
    });
    
    // Construct video path with decoded filename
    const videoPath = path.join(
      'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
      character, decodedFilename
    );
    
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
    frameNumber = Math.floor(parseFloat(frameNumber));
    if (isNaN(frameNumber) || frameNumber < 0) {
      console.error('❌ Invalid frame number:', frameNumber);
      return res.status(400).json({ error: 'Invalid frame number' });
    }
    
    // Log frame number for debugging
    console.log('🎯 FRAME REQUEST DEBUG:', {
      requestedFrame: frameNumber,
      video: decodedFilename,
      character: character,
      originalFilename: filename,
      decodedFilename: decodedFilename,
      frameType: typeof frameNumber,
      frameIsInteger: Number.isInteger(frameNumber)
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
              console.log('📹 Video has', totalFrames, 'frames, requesting frame', frameNumber);
              
              if (frameNumber >= totalFrames) {
                console.error('❌ Frame number out of range:', {
                  requested: frameNumber,
                  totalFrames: totalFrames,
                  video: decodedFilename
                });
                return res.status(400).json({ 
                  error: 'Frame number out of range',
                  requested: frameNumber,
                  totalFrames: totalFrames,
                  message: `Video only has ${totalFrames} frames, but frame ${frameNumber} was requested`
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
    
    // Track data being sent
    let dataSent = 0;
    ffmpeg.stdout.on('data', (chunk) => {
      dataSent += chunk.length;
      console.log('📤 FFmpeg data chunk:', chunk.length, 'bytes, total:', dataSent);
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

module.exports = {
  getAllClips,
  getVideoFile,
  generateThumbnail,
  getClipDuration,
  processPrerender,
  streamFrameDirect,
  getVideoInfo
};
