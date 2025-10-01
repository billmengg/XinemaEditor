const express = require('express');
const router = express.Router();
const { getAllClips, getVideoFile, generateThumbnail, getClipDuration } = require('../controllers/fileController');

// GET /api/files
router.get('/files', getAllClips);

// GET /api/video/:character/:filename
router.get('/video/:character/:filename', getVideoFile);

// GET /api/thumbnail/:character/:filename
router.get('/thumbnail/:character/:filename', generateThumbnail);

// GET /api/duration/:character/:filename
router.get('/duration/:character/:filename', getClipDuration);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Backend is working', timestamp: new Date().toISOString() });
});

module.exports = router;
