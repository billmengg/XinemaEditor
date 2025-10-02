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
      console.log(`File not found: ${videoPath}`);
      return "0:00";
    }
    
    // Use FFprobe to get duration (more reliable than PowerShell)
    const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`;
    
    const { stdout } = await execAsync(command);
    const durationInSeconds = parseFloat(stdout.trim());
    
    if (isNaN(durationInSeconds) || durationInSeconds <= 0) {
      console.log(`Invalid duration for ${videoPath}: ${stdout.trim()}`);
      return "0:00";
    }
    
    // Convert seconds to MM:SS format
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    console.log(`Duration for ${videoPath}: ${duration} (${durationInSeconds}s)`);
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
    
    // Process all rows with actual duration detection
    const clips = await Promise.all(rows.map(async (row) => {
      // Parse season, episode, order from the ID (format: XX.S1.E1.C01)
      let season = '', episode = '', order = '';
      const idMatch = row.id.match(/S(\d+)\.E(\d+)\.C(\d+)/i);
      if (idMatch) {
        season = `S${idMatch[1]}`;
        episode = `E${idMatch[2]}`;
        order = parseInt(idMatch[3], 10);
      }
      
      // Get actual duration from video file
      const videoPath = path.join(
        'C:', 'Users', 'William', 'Documents', 'YouTube', 'Video', 'Arcane Footage', 'Video Footage 2',
        row.character, row.filename
      );
      
      console.log(`Checking file: ${videoPath}`);
      console.log(`File exists: ${fs.existsSync(videoPath)}`);
      
      // For testing - return a hardcoded duration
      const duration = "2:30"; // 2 minutes 30 seconds
      console.log(`Duration for ${row.character}/${row.filename}: ${duration}`);
      
      return {
        ...row,
        season,
        episode,
        order,
        duration: duration,
        thumbnail: null, // Placeholder - would need thumbnail generation
      };
    }));
    
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

module.exports = { 
  getAllClips,
  getVideoFile,
  generateThumbnail,
  getClipDuration
};
