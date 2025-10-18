# Xinema - Video Essay Clip Matching Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.7%2B-blue.svg)](https://python.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-green.svg)](https://expressjs.com/)

> **⚠️ Early Development** - This project is currently in active development. Features may be incomplete or unstable.

## Overview

Xinema is an experimental tool for automatically matching video essay scripts with relevant video clips. The project includes both a Python-based MVP for core matching logic and a web application for interactive clip management.

**Current Features (MVP V0 Complete):**
- **Python MVP:** Complete script-to-clip matching using sentence embeddings
- **Web Application:** Full React frontend with Express.js backend API
- **Media Library:** Advanced clip management with search, filtering, and thumbnails
- **Professional Timeline Preview:** Adobe Premiere Pro-level preview system with multi-level caching
- **Timeline Component:** Complete drag-and-drop timeline with magnetic snapping and track priority
- **File Navigation:** Character-based file organization and browsing
- **Video Preview:** Real-time video playback with hardware-accelerated frame extraction
- **Resizable UI:** Professional 3-panel layout with drag-to-resize functionality
- **API Endpoints:** RESTful API for clip management and data operations
- **Development Tools:** ESLint, Prettier, Jest testing, GitHub Actions CI/CD
- **Matching Results:** Visual display of script-to-clip matches

---

## 📁 Project Structure

```
XinemaEditor/
├── .gitignore                  # Git ignore rules (excludes node_modules, __pycache__, etc.)
├── .eslintrc.js               # ESLint configuration for code quality
├── .prettierrc                # Prettier configuration for code formatting
├── jest.config.js             # Jest testing configuration
├── package.json               # Root workspace configuration with monorepo scripts
├── README.md                  # This file
├── LICENSE                    # MIT License
├── CONTRIBUTING.md            # Contribution guidelines
├── SECURITY.md                # Security policy and procedures
├── utils.py                   # Python helper functions for data processing
├── xinema_mvp.py             # Python MVP script for AI matching
├── src/
│   └── setupTests.js         # Jest testing setup for React components
├── docs/                      # Comprehensive documentation
│   ├── API.md                 # Complete API documentation with examples
│   ├── DEVELOPMENT.md         # Development workflow and architecture guide
│   ├── plan_1(MVP).txt       # Original MVP requirements and specifications
│   ├── plan_2.0(building_MVP).txt  # Web application development plan
│   ├── plan_2.1(File Nav)     # File navigation component specifications
│   └── plan_2.2(timeline).txt # Timeline editor planning document
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI/CD pipeline
└── Xinema/                    # Web Application (Monorepo workspace)
    ├── backend/               # Node.js/Express Backend API
    │   ├── controllers/
    │   │   └── fileController.js    # Business logic for file operations
    │   ├── data/               # Data storage (CSV files)
    │   │   ├── clips.csv           # Video clip metadata (id, filename, description, etc.)
    │   │   ├── script.txt          # Video essay script (one sentence per line)
    │   │   └── unique_characters.csv # Character name mappings
    │   ├── routes/
    │   │   └── fileRoutes.js        # API route definitions for file operations
    │   ├── package.json            # Backend dependencies (Express, CORS, etc.)
    │   ├── package-lock.json       # Locked dependency versions
    │   ├── server.js               # Express server entry point (port 5000)
    │   └── index.js                # Alternative backend entry point
    └── frontend/               # React Frontend Application
        ├── public/
        │   └── index.html          # HTML template for React app
        ├── src/
        │   ├── components/         # React UI components
        │   │   ├── ClipList.js     # Media library with search, filtering, thumbnails
        │   │   ├── Preview.js      # Video preview component with HTML5 video
        │   │   ├── TimelinePreview.js # Professional timeline preview system
        │   │   ├── FileNav.js      # File navigation by character/folder
        │   │   ├── MatchResults.js # Script-to-clip matching results display
        │   │   └── Timeline.js     # Timeline editor with magnetic snapping
        │   ├── App.js              # Main React application with tab navigation
        │   └── index.js            # React DOM entry point
        ├── package.json            # Frontend dependencies (React, React-Scripts)
        └── package-lock.json       # Locked dependency versions
```

---

## 🔧 **Component Functions & Architecture**

### **Python MVP Components**
- **`xinema_mvp.py`**: Main script that orchestrates the AI matching process
  - Loads clips from CSV and script from text file
  - Initializes sentence transformer model (all-MiniLM-L6-v2)
  - Generates embeddings for clip descriptions
  - Matches script sentences to clips using cosine similarity
  - Outputs results to CSV for video assembly

- **`utils.py`**: Helper functions for data processing and matching
  - `load_clips_csv()`: Loads and parses clip metadata from CSV
  - `load_script()`: Reads script file and splits into sentences
  - `embed_texts()`: Generates embeddings using sentence transformers
  - `match_script_to_clips()`: Performs similarity matching algorithm

### **Backend API Components**
- **`server.js`**: Express server entry point
  - Configures CORS for cross-origin requests
  - Sets up JSON parsing middleware
  - Registers API routes and starts server on port 5000

- **`routes/fileRoutes.js`**: API route definitions
  - `/api/clips`: GET endpoint to retrieve all video clips
  - `/api/clips/:id`: GET endpoint for specific clip details
  - `/api/script`: GET/POST endpoints for script management
  - `/api/match`: POST endpoint for script-to-clip matching

- **`controllers/fileController.js`**: Business logic layer
  - Handles file operations and data processing
  - Manages CSV data parsing and serving
  - Implements clip filtering and search functionality

### **Frontend React Components**
- **`App.js`**: Main application with tab-based navigation
  - Implements resizable 3-panel layout (Premiere Pro style)
  - Manages tab switching between Editor, Script Input, and Export
  - Handles panel resizing with mouse drag functionality

- **`ClipList.js`**: Media library component
  - Displays video clips in grid/list view with thumbnails
  - Implements search and filtering functionality
  - Shows clip metadata (filename, character, description, duration)
  - Handles clip selection and preview triggering

- **`Preview.js`**: Video preview component
  - Renders HTML5 video element for clip playback
  - Implements autoplay and error handling
  - Displays video thumbnails using first-frame capture
  - Manages video controls and playback state

- **`FileNav.js`**: File navigation component
  - Organizes clips by character and folder structure
  - Implements collapsible navigation tree
  - Provides quick access to clip categories
  - Handles file system navigation

- **`MatchResults.js`**: Script matching results display
  - Shows script-to-clip matching results
  - Displays similarity scores and alternative matches
  - Implements result filtering and sorting
  - Handles match selection and preview

- **`Timeline.js`**: Timeline editor component (IMPLEMENTED)
  - Drag-and-drop clip arrangement interface with magnetic snapping
  - Multi-track timeline with video/audio tracks
  - Track priority logic for overlapping clips
  - Frame-accurate positioning (60fps precision)
  - Professional timeline controls and navigation

- **`TimelinePreview.js`**: Professional preview system (IMPLEMENTED)
  - Adobe Premiere Pro-level preview performance
  - Multi-level caching system with hardware acceleration
  - INSTANT preview hack with direct MP4 streaming
  - Anti-jittering optimizations for smooth playback
  - Event-driven architecture with timeline synchronization

### **Development Tools & Configuration**
- **`.eslintrc.js`**: ESLint configuration for code quality
  - React and React Hooks rules
  - Custom linting rules for consistency
  - Warning for unused variables and console logs

- **`.prettierrc`**: Code formatting configuration
  - Consistent code style enforcement
  - Single quotes, 2-space indentation
  - 80-character line width

- **`jest.config.js`**: Testing framework configuration
  - React testing environment setup
  - Coverage thresholds (70%)
  - Module mapping for CSS and assets

- **`package.json`**: Root workspace configuration
  - Monorepo management with workspaces
  - Unified development scripts
  - Concurrent development server setup

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
# Server runs on http://localhost:5000
```

#### Frontend Setup
```bash
cd Xinema/frontend
npm install
npm start
# React app runs on http://localhost:3000
```

### 4. Development Workflow

1. **Start Backend**: `cd Xinema/backend && npm start` (runs on port 5000)
2. **Start Frontend**: `cd Xinema/frontend && npm start` (runs on port 3000)
3. **Access Application**: Open http://localhost:3000 in your browser

### 5. Current Application Features

#### **Media Library (ClipList.js)**
- **Search & Filter**: Search by filename, character, or description
- **Character Filtering**: Filter clips by character (Vi, Jinx, etc.)
- **Season Filtering**: Filter clips by season (S1, S2, etc.)
- **Collapsible Metadata**: Click "..." to expand/collapse additional columns
- **Video Thumbnails**: Lazy-loaded first-frame thumbnails
- **Numerical Sorting**: Proper sorting of clip IDs (VI.S1.E1.C01, etc.)

#### **Professional Timeline (Timeline.js)**
- **Drag-and-Drop**: Seamless clip transfer from Media Library to timeline
- **Magnetic Snapping**: Professional-grade clip alignment with multiple snap points
- **Multi-Track Support**: 3 video tracks with track priority logic
- **Track Priority**: Highest track clips display when overlapping
- **Frame-Accurate Positioning**: 60fps precision for professional editing
- **Timeline Boundaries**: Proper clip positioning constraints
- **Visual Feedback**: Clear selection, hover effects, and interaction feedback

#### **Timeline Preview System (TimelinePreview.js)**
- **Adobe Premiere Pro Performance**: Sub-10ms frame loading times
- **INSTANT Preview**: Direct MP4 streaming instead of frame-by-frame loading
- **Multi-Level Caching**: Frame cache, preview sequence cache, and thumbnail cache
- **Hardware Acceleration**: FFmpeg with GPU acceleration for frame extraction
- **Smooth Playback**: Anti-jittering optimizations for 60fps playback
- **Event-Driven Architecture**: Clean communication between timeline and preview
- **Rate-Limited Seeking**: Dynamic seek intervals (16ms during playback)

#### **File Navigation (FileNav.js)**
- **Folder Structure**: Navigate through character folders
- **File Browser**: Browse video files by character
- **Integration**: Seamlessly connected with Media Library and Timeline

### 6. Data Management

The application uses data files located in `Xinema/backend/data/`:
- `clips.csv`: Video clip metadata with descriptions
- `script.txt`: Video essay script (one sentence per line)
- `unique_characters.csv`: Character name mappings

**Note**: `node_modules` directories are excluded from version control. They will be automatically created when you run `npm install`.

---

## 🔌 **API Documentation**

### **Backend Endpoints**

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/clips` | Retrieve all video clips | `limit`, `offset` |
| `GET` | `/api/clips/:id` | Get specific clip details | `id` |
| `POST` | `/api/match` | Match script to clips | `script`, `clips` |
| `GET` | `/api/script` | Load script content | - |
| `POST` | `/api/upload` | Upload new clips | `file`, `metadata` |

### **Frontend Components**

| Component | Purpose | Props |
|-----------|---------|-------|
| `ClipList` | Display available clips | `clips`, `onSelect` |
| `Preview` | Preview selected clip | `clip`, `isPlaying` |
| `TimelinePreview` | Professional timeline preview | `timelineClips`, `playheadPosition` |
| `Timeline` | Timeline editor with magnetic snapping | `clips`, `onPlayheadChange` |
| `FileNav` | Navigate file structure | `files`, `onNavigate` |
| `MatchResults` | Show matching results | `matches`, `script` |

---

## 🛠️ **Technical Specifications**

### **Technical Stack**
- **Embedding Model:** `all-MiniLM-L6-v2` (experimental)
- **Similarity Algorithm:** Cosine similarity
- **Processing:** Basic batch processing
- **Status:** Under development - performance metrics not yet established

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

## Current Application Workflow

### **Web Application (React + Node.js)**
1. **Browse Clips**: Use Media Library to search and filter video clips
2. **Preview Videos**: Click clips to preview in real-time with professional performance
3. **Navigate Files**: Use File Navigation to browse by character
4. **Timeline Editing**: Drag clips to timeline for sequential arrangement with magnetic snapping
5. **Professional Preview**: Real-time timeline preview with Adobe Premiere Pro-level performance
6. **Export Project**: Save timeline as video sequence (planned for V1)

### **Python MVP (Script Matching)**
1. Load data (`script.txt`, `clips.csv`, and `unique_characters.csv`)
2. Load pretrained embedding model (`all-MiniLM-L6-v2`)
3. Embed clip descriptions once
4. Embed script sentences one by one and calculate cosine similarity with clip embeddings
5. Select best match for each script sentence
6. Save results to CSV for later video assembly

---

## 🎬 **Professional Video Editing Features**

### **Timeline System**
- **Multi-Track Timeline**: 3 video tracks with professional layering
- **Magnetic Snapping**: Industry-standard clip alignment with multiple snap points
- **Track Priority Logic**: Highest track clips automatically display when overlapping
- **Frame-Accurate Positioning**: 60fps precision for professional editing workflows
- **Drag-and-Drop Interface**: Seamless clip transfer from Media Library to timeline

### **Preview System**
- **Adobe Premiere Pro Performance**: Sub-10ms frame loading times
- **INSTANT Preview Technology**: Direct MP4 streaming for instant frame display
- **Multi-Level Caching**: Frame cache, preview sequence cache, and thumbnail cache
- **Hardware Acceleration**: FFmpeg with GPU acceleration for optimal performance
- **Anti-Jittering Optimizations**: Smooth 60fps playback without frame skipping
- **Event-Driven Architecture**: Clean communication between timeline and preview components

### **Professional UI/UX**
- **Resizable 3-Panel Layout**: Premiere Pro-style interface with drag-to-resize
- **Visual Feedback**: Clear selection, hover effects, and interaction indicators
- **Timeline Boundaries**: Proper clip positioning constraints
- **Professional Styling**: Industry-standard video editing interface design

---

## **Development Status & Future Plans**

### **Current Status (MVP V0 Complete)**
- [x] **Python MVP**: Complete script-to-clip matching using sentence embeddings
- [x] **Web Application**: Full React frontend with Express.js backend API
- [x] **Media Library**: Advanced clip management with search, filtering, and thumbnails
- [x] **Timeline Component**: Complete drag-and-drop timeline with magnetic snapping
- [x] **Timeline Preview**: Adobe Premiere Pro-level preview system with multi-level caching
- [x] **File Navigation**: Character-based file organization and browsing
- [x] **Professional UI**: Resizable 3-panel layout with industry-standard interface
- [x] **Track Priority Logic**: Highest track clips display when overlapping
- [x] **Frame-Accurate Editing**: 60fps precision for professional video editing

### **Planned Features (V1)**
- [ ] **Video Editing Tools**
  - Clip trimming and cutting
  - Speed adjustment
  - Undo/redo system
  - Timeline zoom and navigation
- [ ] **Enhanced Preview**
  - Clip loading optimization
  - Performance dashboard
  - Quality scaling
- [ ] **Advanced Timeline**
  - Timeline markers
  - Grid lines
  - Advanced snapping
  - Multi-track editing
- [ ] **Export Functionality**
  - Video sequence export
  - Multiple format support
  - Batch processing


---

## **Additional Resources**

- 🛠️ **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute
- 📝 **[Changelog](./CHANGELOG.md)** - Version history
- 🐛 **[Issues](https://github.com/billmengg/XinemaEditor/issues)** - Report bugs or suggest features

## **Acknowledgments**

- **Sentence Transformers** - For the embedding models
- **React & Express.js** - For the web framework
- **Open Source Community** - For the tools and libraries

## **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note:** This is an experimental project in active development. Use at your own discretion.