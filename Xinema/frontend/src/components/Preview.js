import React, { useEffect } from 'react';

export default function Preview({ clip }) {
  // Debug logging
  useEffect(() => {
    console.log('🎬 Preview component received clip:', clip);
    if (clip) {
      console.log('📁 Character:', clip.character);
      console.log('📄 Filename:', clip.filename);
    }
  }, [clip]);

  if (!clip) {
    return (
      <div style={{ 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "#666", 
        fontSize: "16px",
        textAlign: "center",
        padding: "20px"
      }}>
        Select a clip to preview
      </div>
    );
  }

  // Use the backend API endpoint to serve the video - point to correct backend port
  const videoPath = `http://localhost:5000/api/video/${clip.character}/${clip.filename}`;

  const handleVideoLoad = () => {
    console.log('✅ Video loaded successfully');
  };

  const handleVideoError = (e) => {
    console.error('❌ Video error:', e);
    console.error('❌ Video src:', e.target.src);
  };

  const handleVideoCanPlay = () => {
    console.log('▶️ Video can play');
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Clip Info */}
      <div style={{ marginBottom: "16px", fontSize: "14px" }}>
        <div style={{ marginBottom: "8px", fontWeight: "600" }}>
          {clip.filename}
        </div>
        <div style={{ marginBottom: "4px", color: "#666" }}>
          <strong>Character:</strong> {clip.character}
        </div>
        <div style={{ marginBottom: "4px", color: "#666" }}>
          <strong>Season:</strong> {clip.season} | <strong>Episode:</strong> {clip.episode}
        </div>
        <div style={{ marginBottom: "4px", color: "#666" }}>
          <strong>Order:</strong> {clip.order} | <strong>Duration:</strong> {clip.duration}
        </div>
        <div style={{ color: "#666", fontSize: "12px" }}>
          {clip.description}
        </div>
        <div style={{ color: "#999", fontSize: "10px", marginTop: "8px" }}>
          Video URL: {videoPath}
        </div>
      </div>
      
      {/* Simple Video Preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ 
          flex: 1,
          background: "#000", 
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "16px",
          position: "relative",
          overflow: "hidden",
          minHeight: "200px"
        }}>
          <video
            src={videoPath}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain"
            }}
            controls
            autoPlay
            preload="metadata"
            onLoad={handleVideoLoad}
            onError={handleVideoError}
            onCanPlay={handleVideoCanPlay}
          />
        </div>
      </div>
    </div>
  );
}
