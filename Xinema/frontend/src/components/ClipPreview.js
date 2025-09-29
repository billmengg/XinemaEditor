import React, { useState, useRef, useEffect, useMemo } from 'react';

export default function ClipPreview({ clip }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  // Reset state when clip changes
  useEffect(() => {
    if (clip) {
      console.log('🎥 ClipPreview received clip:', clip);
      console.log('🎥 Character:', clip.character);
      console.log('🎥 Filename:', clip.filename);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setError(null);
      setIsLoading(true);
    }
  }, [clip]);

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
      console.log('✅ Video metadata loaded successfully');
      console.log('✅ Video duration:', videoRef.current.duration);
      console.log('✅ Video src:', videoRef.current.src);
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVideoError = (e) => {
    console.error('❌ Video error:', e);
    console.error('❌ Video src:', videoRef.current?.src);
    setError("Video file not found or cannot be played");
    setIsLoading(false);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const videoPath = useMemo(() => {
    if (!clip) return null;
    // Construct the video file path based on the clip data
    const character = clip.character;
    const filename = clip.filename;
    const path = `/api/video/${character}/${encodeURIComponent(filename)}`;
    return path;
  }, [clip?.character, clip?.filename]);

  // Log video path only when it changes
  useEffect(() => {
    if (videoPath) {
      console.log('🎬 Video path constructed:', videoPath);
      console.log('📁 Character:', clip?.character);
      console.log('📄 Filename:', clip?.filename);
      console.log('🔗 Encoded:', encodeURIComponent(clip?.filename || ''));
      
      // Test if we can fetch the video
      fetch(videoPath, { method: 'HEAD' })
        .then(response => {
          console.log('🌐 Network request successful:', response.status, response.statusText);
          console.log('📊 Content-Length:', response.headers.get('Content-Length'));
          console.log('🎥 Content-Type:', response.headers.get('Content-Type'));
        })
        .catch(error => {
          console.error('❌ Network request failed:', error);
        });
    }
  }, [videoPath, clip?.character, clip?.filename]);

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
      </div>
      
      {/* Video Preview */}
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
          {/* Debug info */}
          <div style={{ 
            position: "absolute", 
            top: "10px", 
            left: "10px", 
            fontSize: "12px", 
            color: "#fff", 
            background: "rgba(0,0,0,0.7)", 
            padding: "4px 8px", 
            borderRadius: "4px",
            zIndex: 1000
          }}>
            Video URL: {videoPath}
          </div>
          {error ? (
            <div style={{ textAlign: "center", color: "#ff6b6b" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</div>
              <div>{error}</div>
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
              <div>Loading video...</div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoPath}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onError={handleVideoError}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadStart={() => console.log('🔄 Video load started')}
                onCanPlay={() => console.log('▶️ Video can play')}
                onLoad={() => console.log('✅ Video loaded')}
                onError={(e) => console.error('❌ Video error event:', e)}
                onAbort={() => console.log('⏹️ Video load aborted')}
                onStalled={() => console.log('⏸️ Video load stalled')}
                onSuspend={() => console.log('⏸️ Video load suspended')}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block"
                }}
                preload="metadata"
                controls
              />
              {!isPlaying && !isLoading && !error && (
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(0,0,0,0.7)",
                  borderRadius: "50%",
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "24px"
                }}
                onClick={handlePlayPause}
                >
                  ▶️
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Video Controls */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px", 
          marginTop: "12px",
          padding: "12px",
          background: "#f8f9fa",
          borderRadius: "6px"
        }}>
          <button
            onClick={handlePlayPause}
            disabled={isLoading || error}
            style={{
              padding: "8px 12px",
              border: "1px solid #ddd",
              background: isLoading || error ? "#f5f5f5" : "white",
              borderRadius: "4px",
              cursor: isLoading || error ? "not-allowed" : "pointer",
              fontSize: "14px",
              opacity: isLoading || error ? 0.6 : 1
            }}
          >
            {isPlaying ? "⏸️ Pause" : "▶️ Play"}
          </button>
          
          <div style={{ flex: 1, position: "relative" }}>
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "#ddd",
                borderRadius: "3px",
                cursor: duration > 0 ? "pointer" : "not-allowed"
              }}
              onClick={handleSeek}
            >
              <div
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  height: "100%",
                  background: "#007bff",
                  borderRadius: "3px",
                  transition: "width 0.1s"
                }}
              />
            </div>
          </div>
          
          <div style={{ 
            fontSize: "13px", 
            color: "#666", 
            minWidth: "80px", 
            textAlign: "center",
            fontFamily: "monospace"
          }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
}
