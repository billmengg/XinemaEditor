const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const BASE_FOLDER = 'C:/Users/William/Documents/YouTube/Video/Arcane Footage/Video Footage 2';

router.get('/', (req, res) => {
    // Scan character folders and return list of files + metadata
    const data = [];
    fs.readdirSync(BASE_FOLDER).forEach(char => {
        const charPath = path.join(BASE_FOLDER, char);
        if (fs.statSync(charPath).isDirectory()) {
            fs.readdirSync(charPath).forEach(file => {
                if (file.endsWith('.mp4')) {
                    data.push({
                        filename: file,
                        character: char
                    });
                }
            });
        }
    });
    res.json(data);
});

module.exports = router;
