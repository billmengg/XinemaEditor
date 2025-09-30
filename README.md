# Xinema - Video Essay Clip Matching Tool

## Overview

Xinema is a comprehensive tool designed to automatically match video essay scripts with relevant video clips. The project includes both a Python-based MVP for core matching logic and a full-stack web application for interactive clip management and visualization.

**Current Features:**
- **Python MVP:** Script-to-clip matching using pretrained sentence embeddings
- **Web Application:** Interactive React frontend with Node.js backend
- **Clip Management:** File navigation, preview, and timeline visualization
- **Video Thumbnails:** Video first-frame thumbnails using HTML5 video elements (Windows file paths)
- **Matching Results:** Visual display of script-to-clip matches

---

## Project Structure

```
XinemaEditor/
├── .gitignore                  # Git ignore rules (excludes node_modules, __pycache__, etc.)
├── README.md                   # This file
├── LICENSE                     # MIT License
├── utils.py                    # Python helper functions
├── xinema_mvp.py              # Python MVP script
├── docs/                       # Documentation and planning files
│   ├── plan_1(MVP).txt
│   ├── plan_2.0(building_MVP).txt
│   └── plan_2.1(File Nav)
└── Xinema/                     # Web Application
    ├── backend/                # Node.js/Express Backend
    │   ├── controllers/
    │   │   └── fileController.js
    │   ├── data/               # Data files
    │   │   ├── clips.csv
    │   │   ├── script.txt
    │   │   └── unique_characters.csv
    │   ├── routes/
    │   │   └── fileRoutes.js
    │   ├── package.json        # Backend dependencies
    │   ├── package-lock.json   # Locked dependency versions
    │   ├── server.js           # Express server
    │   └── index.js            # Main backend entry point
    └── frontend/               # React Frontend
        ├── public/
        │   └── index.html
        ├── src/
        │   ├── components/     # React components
        │   │   ├── ClipList.js
        │   │   ├── ClipPreview.js
        │   │   ├── FileNav.js
        │   │   ├── MatchResults.js
        │   │   └── Timeline.js
        │   ├── App.js          # Main React app
        │   └── index.js        # React entry point
        ├── package.json        # Frontend dependencies
        └── package-lock.json   # Locked dependency versions
```

---

## Getting Started

### Prerequisites

- **Node.js** (v14 or higher) and npm
- **Python** (v3.7 or higher) and pip
- **Windows file system** (for video file paths and thumbnails)

**Note:** The thumbnail generation feature uses HTML5 video elements to display the first frame of video files. This approach works with Windows file paths and requires the video files to be accessible via the backend API. The current implementation is optimized for Windows file systems with the specific path structure used in this project.

#### Windows-Specific Implementation

The current thumbnail system is designed for Windows environments with the following characteristics:

- **File Path Structure:** `C:\Users\William\Documents\YouTube\Video\Arcane Footage\Video Footage 2\[character]\[filename]`
- **Backend API:** Serves video files via `http://localhost:5000/api/video/[character]/[filename]`
- **HTML5 Video Thumbnails:** Uses `<video>` elements with `preload="metadata"` to show first frame
- **Lazy Loading:** Only loads thumbnails when they're about to be visible in the viewport

**For other operating systems:** The file paths in the backend controller would need to be updated to match the local file system structure.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd XinemaEditor
```

### 2. Python MVP Setup

```bash
# Install Python dependencies
pip install sentence-transformers pandas python-docx

# Prepare data (ensure these files exist in Xinema/backend/data/)
# - script.txt: Each line is a single script sentence
# - clips.csv: CSV file containing clip metadata
# - unique_characters.csv: CSV file mapping character to abbreviation

# Run the MVP
python xinema_mvp.py
```

### 3. Web Application Setup

#### Backend Setup
```bash
cd Xinema/backend
npm install
npm start
# Server runs on http://localhost:3001
```

#### Frontend Setup
```bash
cd Xinema/frontend
npm install
npm start
# React app runs on http://localhost:3000
```

### 4. Development Workflow

1. **Start Backend**: `cd Xinema/backend && npm start`
2. **Start Frontend**: `cd Xinema/frontend && npm start` (in a new terminal)
3. **Access Application**: Open http://localhost:3000 in your browser

### 5. Data Management

The application uses data files located in `Xinema/backend/data/`:
- `clips.csv`: Video clip metadata with descriptions
- `script.txt`: Video essay script (one sentence per line)
- `unique_characters.csv`: Character name mappings

**Note**: `node_modules` directories are excluded from version control. They will be automatically created when you run `npm install`.

---

## Development & Git Best Practices

### Dependency Management

This project follows Node.js and Python best practices:

- **`node_modules/` excluded**: These directories are not committed to version control
- **`package.json` & `package-lock.json`**: Contains all dependency information
- **`__pycache__/` excluded**: Python cache files are ignored
- **Automatic restoration**: Dependencies are restored with `npm install` and `pip install`

### Git Workflow

```bash
# Initial setup (after cloning)
cd XinemaEditor
cd Xinema/backend && npm install
cd ../frontend && npm install

# Development
git add .
git commit -m "Your changes"
git push

# Pulling updates
git pull
# If package.json changed, run:
cd Xinema/backend && npm install
cd ../frontend && npm install
```

### File Structure Notes

- **`.gitignore`**: Comprehensive ignore rules for Node.js, Python, and IDE files
- **No `node_modules`**: These are regenerated from `package.json` files
- **Clean repository**: Only source code and configuration files are tracked

---

## Workflow (Current MVP)

1. Load data (`script.txt`, `clips.csv`, and `unique_characters.csv`)
2. Load pretrained embedding model (`all-MiniLM-L6-v2`)
3. Embed clip descriptions once
4. Embed script sentences one by one and calculate cosine similarity with clip embeddings
5. Select best match for each script sentence
6. Save results to CSV for later video assembly

---

## Future Plans (Scaling & Optimization)

### Constraints & Rules
- No clip reuse
- Clip duration trimming to fit script line
- Episode/character order for narrative consistency

### Contextual Matching
- Match sequences of script lines → sequences of clips
- Consider surrounding lines for richer context

### Global Optimization
- Implement GRASP-style metaheuristic:
  - Multiple candidate solutions with randomized greedy construction
  - Local search (swap/reassign clips) to improve overall mapping
  - Scoring function accounts for similarity, reuse, timing, order

### AI Enhancements
- Use LLM reranking for ambiguous matches
- Enrich clip descriptions using vision models (BLIP, GPT-4V)
- Integrate dialogue transcripts for more precise matching

### Production-Ready
- Move embeddings into a vector database (FAISS, Pinecone) for fast search
- Modular pipeline ready for large-scale scripts & clips
- Connect to video editing tools (MoviePy / FFmpeg) for automated assembly

---

## Notes

- MVP uses pretrained embeddings, no training required
- Designed to be modular so future constraints and optimization algorithms can be added without rewriting the core matching logic
- Initial MVP focuses on simplicity to validate the concept before adding more complex features