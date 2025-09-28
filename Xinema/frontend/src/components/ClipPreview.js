import React, { useState, useRef } from 'react';

export default function ClipPreview({ clip }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!clip) {
    return (
      <div style={{ color: "#666", textAlign: "center", padding: "20px" }}>
        Select a clip to preview
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "12px" }}>
        <strong>Filename:</strong> {clip.filename}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <strong>ID:</strong> {clip.id}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <strong>Character:</strong> {clip.character}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <strong>Season:</strong> {clip.season}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <strong>Episode:</strong> {clip.episode}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <strong>Order:</strong> {clip.order}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <strong>Description:</strong> {clip.description}
      </div>
      
      {/* Video Preview */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ 
          width: "100%", 
          height: "120px", 
          background: "#e0e0e0", 
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: "14px",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Placeholder for now - in real implementation, this would be the actual video */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>🎬</div>
            <div>Video Preview</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
        
        {/* Video Controls */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "8px", 
          marginTop: "8px",
          padding: "8px",
          background: "#f8f9fa",
          borderRadius: "4px"
        }}>
          <button
            onClick={handlePlayPause}
            style={{
              padding: "4px 8px",
              border: "1px solid #ddd",
              background: "white",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>
          
          <div style={{ flex: 1, position: "relative" }}>
            <div
              style={{
                width: "100%",
                height: "4px",
                background: "#ddd",
                borderRadius: "2px",
                cursor: "pointer"
              }}
              onClick={handleSeek}
            >
              <div
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  height: "100%",
                  background: "#007bff",
                  borderRadius: "2px"
                }}
              />
            </div>
          </div>
          
          <div style={{ fontSize: "11px", color: "#666", minWidth: "60px", textAlign: "center" }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
}
