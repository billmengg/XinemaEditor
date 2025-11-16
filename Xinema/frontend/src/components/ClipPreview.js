import React, { useEffect } from 'react';
import { TARGET_WIDTH, TARGET_HEIGHT, TARGET_ASPECT_RATIO_CSS } from '../utils/constants';

export default function ClipPreview({ clip }) {
  // Debug logging
  useEffect(() => {
    // ClipPreview component received clip
    if (clip) {
      // Character and filename received
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

  // Use object URL for imported media, or backend API endpoint for Arcane clips
  // If imported media has no URL, show a message that file needs to be accessed
  const videoPath = clip.type === 'imported' && clip.url 
    ? clip.url 
    : clip.type === 'imported'
    ? null // No URL available - will show message
    : `http://localhost:5000/api/video/${clip.character}/${clip.filename}`;

  const handleVideoLoad = () => {
    // Video loaded successfully
  };

  const handleVideoError = (e) => {
    // Video error occurred
    console.error('❌ Video error:', e);
    console.error('❌ Video src:', e.target.src);
  };

  const handleVideoCanPlay = () => {
    // Video can play
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
        minHeight: "200px",
        aspectRatio: TARGET_ASPECT_RATIO_CSS // 1080x720
      }}>
        {videoPath ? (
        <video
          src={videoPath}
          style={{
            width: "100%",
            height: "100%",
              objectFit: "contain" // Fit within 1080x720 container
          }}
          controls
          autoPlay
          preload="metadata"
          onLoadedMetadata={handleVideoLoad}
          onError={handleVideoError}
          onCanPlay={handleVideoCanPlay}
        />
        ) : clip.type === 'imported' ? (
          <div style={{ 
            textAlign: "center", 
            padding: "20px",
            color: "#999"
          }}>
            <div style={{ fontSize: "14px", marginBottom: "8px" }}>
              File not currently accessible
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>
              Click on the file in the media library to restore access
            </div>
            {clip.path && (
              <div style={{ fontSize: "11px", color: "#555", marginTop: "8px", fontFamily: "monospace" }}>
                Path: {clip.path}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
