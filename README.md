# Xinema - Video Essay Clip Matching Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-14%2B-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.7%2B-blue.svg)](https://python.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-green.svg)](https://expressjs.com/)

> **⚠️ Early Development** - This project is currently in active development. Features may be incomplete or unstable.

## Overview

Xinema is an experimental tool for automatically matching video essay scripts with relevant video clips. The project includes both a Python-based MVP for core matching logic and a web application for interactive clip management.

### **Current Features (In Development)**
- **Python MVP:** Basic script-to-clip matching using sentence embeddings
- **Web Application:** React frontend with Express.js backend (work in progress)
- **Clip Management:** File navigation and preview system
- **Matching Algorithm:** Cosine similarity-based matching

## **Project Goals**

This project aims to explore:
- Automated script-to-clip matching using AI
- Web-based interface for clip management
- Scalable matching algorithms
- Integration with video editing workflows

**Note:** This is a research/experimental project. Results may vary and the system is not production-ready.

---

## 📁 Project Structure

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
| `ClipPreview` | Preview selected clip | `clip`, `isPlaying` |
| `FileNav` | Navigate file structure | `files`, `onNavigate` |
| `MatchResults` | Show matching results | `matches`, `script` |
| `Timeline` | Visual timeline display | `clips`, `duration` |

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

## Workflow (Current MVP)

1. Load data (`script.txt`, `clips.csv`, and `unique_characters.csv`)
2. Load pretrained embedding model (`all-MiniLM-L6-v2`)
3. Embed clip descriptions once
4. Embed script sentences one by one and calculate cosine similarity with clip embeddings
5. Select best match for each script sentence
6. Save results to CSV for later video assembly

---

## **Development Status & Future Plans**

### **Current Status (v0.x)**
- [x] Basic Python MVP with sentence embeddings
- [x] Initial web application structure
- [x] File navigation system
- [ ] Complete web interface functionality
- [ ] Stable matching algorithm
- [ ] Error handling and validation

### **Planned Features (Future)**
- [ ] **Improved Matching**
  - Better similarity algorithms
  - Context-aware matching
  - Performance optimizations
- [ ] **Enhanced UI**
  - Complete React components
  - Real-time preview
  - Better user experience
- [ ] **Advanced Features**
  - Multiple matching strategies
  - Export functionality
  - Integration capabilities

**Note:** Timeline is flexible as this is a research project.

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