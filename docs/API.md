# API Documentation

## Backend API Endpoints

### Clips Management

#### GET /api/clips
Retrieve all available video clips.

**Parameters:**
- `limit` (optional): Number of clips to return (default: 50)
- `offset` (optional): Number of clips to skip (default: 0)

**Response:**
```json
{
  "clips": [
    {
      "id": "clip_001",
      "filename": "scene_01.mp4",
      "description": "Character walking through forest",
      "character": "Jinx",
      "duration": 15.5,
      "timestamp": "00:01:30"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### GET /api/clips/:id
Get specific clip details.

**Parameters:**
- `id`: Clip identifier

**Response:**
```json
{
  "id": "clip_001",
  "filename": "scene_01.mp4",
  "description": "Character walking through forest",
  "character": "Jinx",
  "duration": 15.5,
  "timestamp": "00:01:30",
  "metadata": {
    "episode": 1,
    "scene": "forest",
    "mood": "tense"
  }
}
```

### Script Matching

#### POST /api/match
Match script sentences to video clips.

**Request Body:**
```json
{
  "script": [
    "The character walks through the dark forest",
    "She looks around nervously"
  ],
  "options": {
    "maxResults": 5,
    "threshold": 0.7
  }
}
```

**Response:**
```json
{
  "matches": [
    {
      "sentence": "The character walks through the dark forest",
      "bestMatch": {
        "clipId": "clip_001",
        "similarity": 0.89,
        "description": "Character walking through forest"
      },
      "alternatives": [
        {
          "clipId": "clip_002",
          "similarity": 0.76,
          "description": "Person walking in woods"
        }
      ]
    }
  ],
  "processingTime": 0.234
}
```

### Script Management

#### GET /api/script
Load current script content.

**Response:**
```json
{
  "script": [
    "The character walks through the dark forest",
    "She looks around nervously",
    "A sound echoes in the distance"
  ],
  "metadata": {
    "totalSentences": 3,
    "lastModified": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/script
Update script content.

**Request Body:**
```json
{
  "script": [
    "New sentence one",
    "New sentence two"
  ]
}
```

## Frontend Components

### ClipList Component

```jsx
<ClipList 
  clips={clips}
  onSelect={handleClipSelect}
  onFilter={handleFilter}
  loading={false}
/>
```

**Props:**
- `clips`: Array of clip objects
- `onSelect`: Function called when clip is selected
- `onFilter`: Function called when filter changes
- `loading`: Boolean indicating loading state

### ClipPreview Component

```jsx
<ClipPreview 
  clip={selectedClip}
  isPlaying={false}
  onPlay={handlePlay}
  onPause={handlePause}
/>
```

**Props:**
- `clip`: Selected clip object
- `isPlaying`: Boolean for play state
- `onPlay`: Function called when play is triggered
- `onPause`: Function called when pause is triggered

### MatchResults Component

```jsx
<MatchResults 
  matches={matchResults}
  script={script}
  onClipSelect={handleClipSelect}
/>
```

**Props:**
- `matches`: Array of match results
- `script`: Original script array
- `onClipSelect`: Function called when clip is selected from results

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid script format",
    "details": "Script must be an array of strings"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `PROCESSING_ERROR`: Error during matching
- `SERVER_ERROR`: Internal server error

## Rate Limiting

API endpoints are rate limited:
- **General endpoints**: 100 requests per minute
- **Matching endpoints**: 10 requests per minute
- **Upload endpoints**: 5 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642252800
```
