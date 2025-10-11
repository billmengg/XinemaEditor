import React, { useEffect } from 'react';

export default function ClipPreview({ clip }) {
  // Debug logging
  useEffect(() => {
    console.log('🎬 ClipPreview component received clip:', clip);
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
      {/* Filename Header */}
      <div style={{ 
        marginBottom: "12px", 
        fontSize: "14px", 
        fontWeight: "600",
        color: "#333",
        textAlign: "center"
      }}>
        {clip.filename}
      </div>
      
      {/* Video Preview */}
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
          onLoadedMetadata={handleVideoLoad}
          onError={handleVideoError}
          onCanPlay={handleVideoCanPlay}
        />
      </div>
    </div>
  );
}
