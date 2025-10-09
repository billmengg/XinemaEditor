const express = require('express');
const router = express.Router();
const { getAllClips, getVideoFile, generateThumbnail, getClipDuration, processPrerender, streamFrameDirect, getVideoInfo, preExtractFrames } = require('../controllers/fileController');

// GET /api/files
router.get('/files', getAllClips);

// GET /api/video/:character/:filename
router.get('/video/:character/:filename', getVideoFile);

// GET /api/thumbnail/:character/:filename
router.get('/thumbnail/:character/:filename', generateThumbnail);

// GET /api/duration/:character/:filename
router.get('/duration/:character/:filename', getClipDuration);

// POST /api/prerender - Process prerender areas and generate composite frames
router.post('/prerender', processPrerender);

// Note: Cached frame extraction routes removed - now using direct streaming

// GET /api/frame-direct/:character/:filename/:frameNumber - Stream frame directly from video
router.get('/frame-direct/:character/:filename/:frameNumber', streamFrameDirect);

// GET /api/video-info/:character/:filename - Get video metadata including frame rate
router.get('/video-info/:character/:filename', getVideoInfo);

// POST /api/pre-extract/:character/:filename - Pre-extract frames for timeline preview
router.post('/pre-extract/:character/:filename', preExtractFrames);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Backend is working', timestamp: new Date().toISOString() });
});

// Test prerender endpoint
router.get('/prerender-test', (req, res) => {
  res.json({ message: 'Prerender endpoint is accessible', timestamp: new Date().toISOString() });
});

module.exports = router;
