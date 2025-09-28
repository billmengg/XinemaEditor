const express = require('express');
const router = express.Router();
const { getAllClips } = require('../controllers/fileController');

// GET /api/files
router.get('/', getAllClips);

module.exports = router;
