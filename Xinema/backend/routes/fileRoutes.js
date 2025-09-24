// backend/routes/fileRoutes.js

const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Get all clips for a given character
router.get('/clips/:character', fileController.getClipsByCharacter);

// Get all clips
router.get('/clips', fileController.getAllClips);

// Get clip by ID
router.get('/clip/:id', fileController.getClipById);

// Optional: search clips by ID pattern
router.get('/search/:query', fileController.searchClips);

// Optional: endpoint to standardize or update IDs (for testing / admin)
router.post('/standardize', fileController.standardizeIds);

module.exports = router;
