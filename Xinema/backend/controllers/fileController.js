const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const thumbnail = require('node-thumbnail');

// CSV path
const csvPath = path.join(__dirname, '../data/clips.csv');


const getAllClips = (req, res) => {
  const clips = [];
  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      // Parse season, episode, order from the ID (format: XX.S1.E1.C01)
      let season = '', episode = '', order = '';
      const idMatch = row.id.match(/S(\d+)\.E(\d+)\.C(\d+)/i);
      if (idMatch) {
        season = `S${idMatch[1]}`;
        episode = `E${idMatch[2]}`;
        order = parseInt(idMatch[3], 10);
      }
      clips.push({
        ...row,
        season,
        episode,
        order,
        duration: "0:00", // Placeholder - would need video file analysis
        thumbnail: null, // Placeholder - would need thumbnail generation
      });
    })
    .on('end', () => res.json(clips))
    .on('error', (err) => res.status(500).json({ error: err.message }));
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

module.exports = { 
  getAllClips,
  getVideoFile,
  generateThumbnail
};
