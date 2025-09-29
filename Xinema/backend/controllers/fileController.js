const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

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
  
  console.log('Video request:', { character, filename, videoPath });
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    console.log('Video file not found at:', videoPath);
    return res.status(404).json({ error: 'Video file not found', path: videoPath });
  }
  
  console.log('Video file found, serving:', videoPath);
  
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

module.exports = { 
  getAllClips,
  getVideoFile 
};
