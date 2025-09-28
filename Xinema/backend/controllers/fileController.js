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

module.exports = { getAllClips };
