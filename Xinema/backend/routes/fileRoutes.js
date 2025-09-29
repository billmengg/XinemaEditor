const express = require('express');
const router = express.Router();
const { getAllClips, getVideoFile } = require('../controllers/fileController');

// GET /api/files
router.get('/', getAllClips);

// GET /api/video/:character/:filename
router.get('/video/:character/:filename', getVideoFile);

module.exports = router;
