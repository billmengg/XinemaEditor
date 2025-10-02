import React, { useState, useEffect } from 'react';

export default function Timeline() {
  const [activeTool, setActiveTool] = useState('cursor');
  const [videoTracks, setVideoTracks] = useState([1, 2, 3]);
  const [audioTracks, setAudioTracks] = useState([1]);
  const [contextMenu, setContextMenu] = useState(null);
  const [playheadPosition, setPlayheadPosition] = useState(0); // Simple pixel position
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [timelineClips, setTimelineClips] = useState([]); // Clips placed on timeline
  const [dragPreview, setDragPreview] = useState(null); // Preview clip during drag

  const tools = [
    { id: 'cursor', icon: '↖', label: 'Cursor', active: true },
    { id: 'cut', icon: '✂', label: 'Cut', active: false },
    { id: 'zoom', icon: '🔍', label: 'Zoom', active: false }
  ];

  const addVideoTrack = () => {
    const newTrackNumber = Math.max(...videoTracks) + 1;
    setVideoTracks([...videoTracks, newTrackNumber]);
  };

  const addAudioTrack = () => {
    const newTrackNumber = Math.max(...audioTracks) + 1;
    setAudioTracks([...audioTracks, newTrackNumber]);
  };

  const deleteVideoTrack = (trackNumber) => {
    if (videoTracks.length > 1) {
      setVideoTracks(videoTracks.filter(track => track !== trackNumber));
    }
  };

  const deleteAudioTrack = (trackNumber) => {
    if (audioTracks.length > 1) {
      setAudioTracks(audioTracks.filter(track => track !== trackNumber));
    }
  };

  const handleContextMenu = (e, trackType, trackNumber) => {
    e.preventDefault();
    if ((trackType === 'video' && videoTracks.length > 1) || 
        (trackType === 'audio' && audioTracks.length > 1)) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        trackType,
        trackNumber
      });
    }
  };

  const handleDeleteTrack = () => {
    if (contextMenu) {
      if (contextMenu.trackType === 'video') {
        deleteVideoTrack(contextMenu.trackNumber);
      } else if (contextMenu.trackType === 'audio') {
        deleteAudioTrack(contextMenu.trackNumber);
      }
      setContextMenu(null);
    }
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handlePlayheadMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  const handleTimelineMouseDown = (e) => {
    if (e.target.closest('.playhead')) return; // Don't move if clicking on playhead
    
    e.preventDefault(); // Prevent default selection behavior
    
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - timelineRect.left;
    
    // Calculate position relative to track content area
    const trackContentStart = 76; // Track title width
    const bufferZone = 40; // Buffer zone width
    const maxPosition = timelineRect.width - trackContentStart - bufferZone;
    const relativeX = clickX - trackContentStart;
    
    // Calculate maximum time constraint (10 minutes = 600 seconds)
    const maxTimeInMinutes = 10;
    const maxTimeInPixels = timeToPixel(maxTimeInMinutes);
    const actualMaxPosition = Math.min(maxPosition, maxTimeInPixels);
    
    if (relativeX >= 0 && relativeX <= actualMaxPosition) {
      setPlayheadPosition(relativeX);
      // Start dragging mode so the playhead follows the mouse
      setIsDraggingPlayhead(true);
    }
  };

  const handleTimelineClick = (e) => {
    // Just prevent default behavior, don't start dragging on click
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDraggingPlayhead) {
      e.preventDefault(); // Prevent default selection behavior during dragging
      
      // Use the same element as the click handler to avoid jumping
      const timelineContent = document.querySelector('.timeline-content');
      if (!timelineContent) return;
      
      const timelineRect = timelineContent.getBoundingClientRect();
      const mouseX = e.clientX - timelineRect.left;
      
      // Calculate boundaries
      const trackContentStart = 76; // Track title width
      const bufferZone = 40; // Buffer zone width
      const maxPosition = timelineRect.width - trackContentStart - bufferZone;
      const relativeX = mouseX - trackContentStart;
      
      // Calculate maximum time constraint (10 minutes = 600 seconds)
      const maxTimeInMinutes = 10;
      const maxTimeInPixels = timeToPixel(maxTimeInMinutes);
      const actualMaxPosition = Math.min(maxPosition, maxTimeInPixels);
      
      // Handle boundary cases
      if (relativeX < 0) {
        // Mouse is to the left of the timeline - set playhead to left edge
        setPlayheadPosition(0);
      } else if (relativeX > actualMaxPosition) {
        // Mouse is to the right of the timeline - set playhead to maximum time (10:00)
        setPlayheadPosition(actualMaxPosition);
      } else {
        // Mouse is within bounds - follow the mouse
        setPlayheadPosition(relativeX);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPlayhead(false);
  };

  // Handle drag over timeline
  const handleTimelineDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle drop on timeline
  const handleTimelineDrop = (e) => {
    e.preventDefault();
    
    try {
      const clipData = JSON.parse(e.dataTransfer.getData('application/json'));
      const timelineRect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - timelineRect.left;
      
      // Calculate position relative to track content area
      const trackContentStart = 76; // Track title width
      const relativeX = dropX - trackContentStart;
      
      if (relativeX >= 0) {
        // Convert pixel position to time
        const startTime = pixelToTime(relativeX);
        
        // Create new clip with duration
        const newClip = {
          id: `clip_${Date.now()}`,
          ...clipData,
          startTime: startTime,
          duration: clipData.duration || 5, // Default 5 seconds if no duration
          track: 1, // Default to first video track
          startPixel: relativeX,
          widthPixel: timeToPixel(clipData.duration || 5) // Convert duration to pixels
        };
        
        setTimelineClips(prev => [...prev, newClip]);
      }
    } catch (error) {
      console.error('Error handling clip drop:', error);
    }
  };


  // Convert pixel position to time (0-1888px to 0-10 minutes)
  const pixelToTime = (pixels) => {
    const totalPixels = 1888; // Total available width
    const totalMinutes = 10; // Total timeline duration
    const minutes = (pixels / totalPixels) * totalMinutes;
    return minutes;
  };

  // Convert time to pixel position (0-10 minutes to 0-1888px)
  const timeToPixel = (minutes) => {
    const totalPixels = 1888; // Total available width
    const totalMinutes = 10; // Total timeline duration
    const pixels = (minutes / totalMinutes) * totalPixels;
    return pixels;
  };

  // Format time with frames (60fps)
  const formatTime = (pixels) => {
    const minutes = pixelToTime(pixels);
    const totalSeconds = Math.floor(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const frames = Math.floor((minutes * 60 - totalSeconds) * 60); // 60fps
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    }
  };

  // Handle document-level mouse events for dragging
  useEffect(() => {
    if (isDraggingPlayhead) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead]);

  // Handle custom timeline drop events from ClipList
  useEffect(() => {
    const timelineElement = document.querySelector('.timeline-content');
    if (timelineElement) {
      const handleTimelineDropEvent = (e) => {
        const { clip, clientX, clientY, track } = e.detail;
        const timelineRect = timelineElement.getBoundingClientRect();
        const dropX = clientX - timelineRect.left;
        
        // Calculate position relative to track content area
        const trackContentStart = 76; // Track title width
        const relativeX = dropX - trackContentStart;
        
        if (relativeX >= 0) {
          // Convert pixel position to time
          const startTime = pixelToTime(relativeX);
          
          // Use track from drop event, fallback to drag preview, then default to track 1
          const targetTrack = track || (dragPreview ? dragPreview.track : 1);
          
          
          // Create new clip with duration
          const baseId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const clipDuration = clip.duration || 5; // Use actual duration from clip
          const newClip = {
            id: baseId,
            ...clip,
            startTime: startTime,
            duration: clipDuration,
            track: targetTrack,
            startPixel: relativeX,
            widthPixel: timeToPixel(clipDuration) // Convert actual duration to pixels
          };
          
          setTimelineClips(prev => [...prev, newClip]);
          
          // If this is a multi-track clip, create additional clips for other tracks
          if (dragPreview && dragPreview.multiTrack) {
            const additionalTracks = [1, 2, 3].filter(t => t !== targetTrack);
            const additionalClips = additionalTracks.map(trackNum => ({
              ...newClip,
              id: `${baseId}_track_${trackNum}`,
              track: trackNum
            }));
            setTimelineClips(prev => [...prev, ...additionalClips]);
          }
        }
        
        // Clear drag preview
        setDragPreview(null);
      };
      
      const handleTimelineDragOver = (e) => {
        e.preventDefault();
        
        // Check if there's a clip being dragged from ClipList
        const draggedClip = document.querySelector('.clip-drag-preview');
        if (draggedClip) {
          const timelineRect = timelineElement.getBoundingClientRect();
          const mouseX = e.clientX - timelineRect.left;
          const mouseY = e.clientY - timelineRect.top;
          const trackContentStart = 76;
          const relativeX = mouseX - trackContentStart;
          
          // Check if mouse is over timeline area
          if (relativeX >= 0 && mouseY >= 60) { // 60px to account for top bar and time ruler
            // Get clip data from the drag preview element
            const clipData = JSON.parse(draggedClip.dataset.clip || '{}');
            const duration = clipData.duration || 5;
            
            // Calculate which track the mouse is over
            // Tracks start at 60px and are 50px high each
            const trackHeight = 50;
            const trackStartY = 60;
            const relativeY = mouseY - trackStartY;
            
            // Calculate track index (0-based from top)
            const trackIndex = Math.floor(relativeY / trackHeight);
            
            // Convert to track number (1-based, counting from bottom)
            // Track 1 is at the bottom (highest Y values), Track 3 is at the top (lowest Y values)
            const targetTrack = Math.max(1, Math.min(3 - trackIndex, 3));
            
            setDragPreview({
              startPixel: relativeX,
              widthPixel: timeToPixel(duration),
              character: clipData.character || 'Clip',
              duration: duration,
              track: targetTrack
            });
          } else {
            // Clear preview if not over timeline
            setDragPreview(null);
          }
        } else {
          // Also check for custom drag events from ClipList
          const customDragEvent = e.detail;
          if (customDragEvent && customDragEvent.clip) {
            const timelineRect = timelineElement.getBoundingClientRect();
            const mouseX = e.clientX - timelineRect.left;
            const mouseY = e.clientY - timelineRect.top;
            const trackContentStart = 76;
            const relativeX = mouseX - trackContentStart;
            
            if (relativeX >= 0 && mouseY >= 60) {
              const duration = customDragEvent.clip.duration || 5;
              
              // Calculate which track the mouse is over
              const trackHeight = 50;
              const trackStartY = 60;
              const trackIndex = Math.floor((mouseY - trackStartY) / trackHeight);
              const targetTrack = Math.max(1, Math.min(trackIndex + 1, 3));
              
              setDragPreview({
                startPixel: relativeX,
                widthPixel: timeToPixel(duration),
                character: customDragEvent.clip.character || 'Clip',
                duration: duration,
                track: targetTrack
              });
            }
          }
        }
      };
      
      const handleTimelineDragLeave = (e) => {
        // Only clear if leaving the timeline completely
        const timelineRect = timelineElement.getBoundingClientRect();
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        if (mouseX < timelineRect.left || mouseX > timelineRect.right || 
            mouseY < timelineRect.top || mouseY > timelineRect.bottom) {
          setDragPreview(null);
        }
      };
      
      const handleTimelineDragOverEvent = (e) => {
        const { clip, clientX, clientY, ctrlKey, metaKey } = e.detail;
        const timelineRect = timelineElement.getBoundingClientRect();
        const mouseX = clientX - timelineRect.left;
        const mouseY = clientY - timelineRect.top;
        const trackContentStart = 76;
        const relativeX = mouseX - trackContentStart;
        
        
        if (relativeX >= 0 && mouseY >= 60) {
          const duration = clip.duration || 5;
          
          
          // Simple track calculation - just find the closest track to mouse
          const trackHeight = 50;
          const trackStartY = 60;
          const relativeY = mouseY - trackStartY;
          
          // Find which track the mouse is closest to
          let targetTrack = 3; // Default to track 3 (highest)
          
          if (mouseY >= 100 && mouseY < 150) {
            targetTrack = 3; // Top track (100-150px from timeline top)
          } else if (mouseY >= 150 && mouseY < 200) {
            targetTrack = 2; // Middle track (150-200px from timeline top)
          } else if (mouseY >= 200 && mouseY < 250) {
            targetTrack = 1; // Bottom track (200-250px from timeline top)
          }
          
          
          // Check if Ctrl key is pressed for multi-track placement
          const isMultiTrack = ctrlKey || metaKey;
          
          setDragPreview({
            startPixel: relativeX,
            widthPixel: timeToPixel(duration),
            character: clip.character || 'Clip',
            duration: duration,
            track: targetTrack,
            multiTrack: isMultiTrack,
            mouseY: mouseY // Add mouse Y for debugging
          });
        } else {
          setDragPreview(null);
        }
      };
      
      const handleTimelineDragLeaveEvent = (e) => {
        setDragPreview(null);
      };
      
      const handleTimelineDragClear = (e) => {
        setDragPreview(null);
      };
      
      timelineElement.addEventListener('timelineDrop', handleTimelineDropEvent);
      timelineElement.addEventListener('dragover', handleTimelineDragOver);
      timelineElement.addEventListener('dragleave', handleTimelineDragLeave);
      timelineElement.addEventListener('timelineDragOver', handleTimelineDragOverEvent);
      timelineElement.addEventListener('timelineDragLeave', handleTimelineDragLeaveEvent);
      timelineElement.addEventListener('timelineDragClear', handleTimelineDragClear);
      
      return () => {
        timelineElement.removeEventListener('timelineDrop', handleTimelineDropEvent);
        timelineElement.removeEventListener('dragover', handleTimelineDragOver);
        timelineElement.removeEventListener('dragleave', handleTimelineDragLeave);
        timelineElement.removeEventListener('timelineDragOver', handleTimelineDragOverEvent);
        timelineElement.removeEventListener('timelineDragLeave', handleTimelineDragLeaveEvent);
        timelineElement.removeEventListener('timelineDragClear', handleTimelineDragClear);
      };
    }
  }, []);

  return (
    <div 
      className="timeline-container"
      style={{ 
        height: "100%", 
        display: "flex",
        background: "#f8f9fa",
        border: "1px solid #ddd",
        borderRadius: "4px"
      }}
      onClick={closeContextMenu}
    >
      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 1000,
            minWidth: "150px"
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#333",
              borderBottom: "1px solid #eee"
            }}
            onMouseEnter={(e) => e.target.style.background = "#f8f9fa"}
            onMouseLeave={(e) => e.target.style.background = "white"}
            onClick={handleDeleteTrack}
          >
            Delete Track
          </div>
        </div>
      )}
      {/* Timeline Toolbar Column */}
      <div style={{
        width: "60px",
        background: "#fff",
        borderRight: "1px solid #ddd",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "12px 8px",
        borderRadius: "4px 0 0 4px"
      }}>
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => tool.active && setActiveTool(tool.id)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              marginBottom: "8px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              background: tool.id === activeTool ? "#007bff" : "#fff",
              color: tool.id === activeTool ? "#fff" : "#666",
              cursor: tool.active ? "pointer" : "not-allowed",
              opacity: tool.active ? 1 : 0.5,
              fontSize: "18px",
              transition: "all 0.2s"
            }}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Timeline Content */}
      <div 
        className="timeline-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#f8f9fa",
          overflow: "auto",
          position: "relative",
          userSelect: "none" // Prevent text selection during dragging
        }}
        onMouseDown={handleTimelineMouseDown}
        onMouseUp={handleMouseUp}
        onDragOver={handleTimelineDragOver}
        onDrop={handleTimelineDrop}
       >
         {/* Timeline Top Bar - Time indicator and controls */}
         <div style={{
           height: "30px",
           background: "#f8f9fa",
           borderBottom: "1px solid #ddd",
           display: "flex",
           alignItems: "center",
           padding: "0 8px",
           marginLeft: "76px", // Offset to align with track content area
           position: "relative"
         }}>
           {/* Position Indicator */}
           <div style={{
             fontSize: "18px",
             fontWeight: "700",
             color: "#007bff",
             textAlign: "left",
             position: "absolute",
             left: "8px",
             top: "50%",
             transform: "translateY(-50%)"
           }}>
             {formatTime(playheadPosition)}
           </div>
           
           {/* Start and End Time Displays */}
           <div style={{
             position: "absolute",
             right: "8px",
             top: "50%",
             transform: "translateY(-50%)",
             display: "flex",
             gap: "16px",
             fontSize: "14px",
             fontWeight: "600",
             color: "#666"
           }}>
             <span>start: 0:00</span>
             <span>end: 10:00</span>
           </div>
           
         </div>
         
         {/* Timeline Ruler with Time Markers */}
         <div style={{
           height: "30px",
           background: "#f8f9fa",
           borderBottom: "1px solid #ddd",
           borderLeft: "2px solid rgba(0,0,0,0.3)", // Darker separator like video/audio divider
           display: "flex",
           alignItems: "center",
           padding: "0 8px",
           marginLeft: "76px", // Offset to align with track content area
           position: "relative",
           overflow: "hidden"
         }}>
          {/* Time Markers */}
          {Array.from({ length: 11 }, (_, i) => {
            const time = i; // 0, 1, 2, ..., 10 minutes
            // Calculate position in pixels within available area (excluding buffer zone)
            const bufferZone = 40; // Buffer zone width in pixels
            const availableWidth = 1888; // Available width in pixels (1892 - 4px adjustment)
            const position = (time / 10) * availableWidth; // Position in pixels
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${position}px`,
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: "#999",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  paddingTop: "4px"
                }}
              >
                <div style={{
                  fontSize: "10px",
                  color: "#666",
                  background: "#f8f9fa",
                  padding: "0 2px",
                  whiteSpace: "nowrap"
                }}>
                  {time}:00
                </div>
              </div>
            );
          })}
        </div>
         {/* Playhead */}
         <div
           className="playhead"
           style={{
             position: "absolute",
             left: `${76 + playheadPosition}px`, // Simple pixel positioning
             top: "60px", // Start below top bar (30px) and time ruler (30px)
             bottom: 0,
             width: "2px",
             background: "#007bff",
             zIndex: 15,
             display: "flex",
             flexDirection: "column"
           }}
         >
           {/* Playhead Handle */}
           <div 
             style={{
               width: 0,
               height: 0,
               borderLeft: "6px solid transparent",
               borderRight: "6px solid transparent",
               borderTop: "12px solid #007bff",
               marginLeft: "-5px",
               marginTop: "0px",
               filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
               cursor: "ew-resize",
               zIndex: 20
             }}
             onMouseDown={handlePlayheadMouseDown}
           />
         </div>

         {/* Add Video Track Button */}
         <div style={{
           height: "40px",
           borderBottom: "1px solid rgba(0,0,0,0.1)",
           background: "rgba(255,255,255,0.7)",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           cursor: "pointer",
           transition: "background 0.2s",
           width: "76px",
           borderRight: "1px solid rgba(0,0,0,0.2)"
         }}
        onMouseEnter={(e) => e.target.style.background = "rgba(0,123,255,0.1)"}
        onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.7)"}
        onClick={addVideoTrack}
        >
          <div style={{
            fontSize: "12px",
            color: "#007bff",
            fontWeight: "600"
          }}>
            + Video
          </div>
        </div>

        {/* Video Tracks (counting from bottom up) */}
        {videoTracks.slice().reverse().map(trackNum => (
          <div key={trackNum} style={{
            height: "50px",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            background: "#fff",
            display: "flex"
          }}>
            {/* Track Title */}
            <div 
              style={{
                width: "76px",
                borderRight: "1px solid rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: "600",
                color: "#333",
                cursor: videoTracks.length > 1 ? "context-menu" : "default"
              }}
              onContextMenu={(e) => handleContextMenu(e, 'video', trackNum)}
              title={videoTracks.length > 1 ? "Right-click for options" : "Cannot delete last video track"}
            >
              Video {trackNum}
            </div>
             {/* Track Area */}
             <div style={{
               flex: 1,
               background: "#f8f9fa",
               position: "relative"
             }}>
               {/* Render clips on this track */}
               {timelineClips
                 .filter(clip => clip.track === trackNum)
                 .map(clip => (
                   <div
                     key={clip.id}
                     style={{
                       position: "absolute",
                       left: `${clip.startPixel}px`,
                       top: "5px",
                       bottom: "5px",
                       width: `${clip.widthPixel}px`,
                       background: "#007bff",
                       border: "1px solid #0056b3",
                       borderRadius: "3px",
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "center",
                       color: "white",
                       fontSize: "10px",
                       fontWeight: "600",
                       cursor: "pointer",
                       userSelect: "none"
                     }}
                     title={`${clip.character} - ${clip.filename} (${clip.duration}s)`}
                   >
                     {clip.character}
                   </div>
                 ))}
               
               {/* Drag Preview - show only on target track */}
               {dragPreview && dragPreview.track === trackNum && (
                 <div
                   style={{
                     position: "absolute",
                     left: `${dragPreview.startPixel}px`,
                     top: "5px",
                     bottom: "5px",
                     width: `${dragPreview.widthPixel}px`,
                     background: "rgba(0, 123, 255, 0.4)",
                     border: "2px dashed #007bff",
                     borderRadius: "3px",
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     color: "#007bff",
                     fontSize: "10px",
                     fontWeight: "600",
                     pointerEvents: "none",
                     userSelect: "none",
                     zIndex: 10
                   }}
                 >
                   {dragPreview.character}
                 </div>
               )}
             </div>
           </div>
         ))}

         {/* Audio Tracks */}
         {audioTracks.map(trackNum => (
           <div key={trackNum} style={{
             height: "50px",
             borderTop: trackNum === 1 ? "2px solid rgba(0,0,0,0.3)" : "1px solid rgba(0,0,0,0.1)",
             background: "#fff",
             display: "flex"
           }}>
             {/* Track Title */}
             <div 
               style={{
                 width: "76px",
                 borderRight: "1px solid rgba(0,0,0,0.2)",
                 display: "flex",
                 alignItems: "center",
                 justifyContent: "center",
                 fontSize: "11px",
                 fontWeight: "600",
                 color: "#333",
                 cursor: audioTracks.length > 1 ? "context-menu" : "default"
               }}
               onContextMenu={(e) => handleContextMenu(e, 'audio', trackNum)}
               title={audioTracks.length > 1 ? "Right-click for options" : "Cannot delete last audio track"}
             >
               Audio {trackNum}
             </div>
             {/* Track Area */}
             <div style={{
               flex: 1,
               background: "#f8f9fa",
             }}>
             </div>
          </div>
        ))}

         {/* Add Audio Track Button */}
         <div style={{
           height: "40px",
           borderTop: "1px solid rgba(0,0,0,0.1)",
           background: "rgba(255,255,255,0.7)",
           display: "flex",
           alignItems: "center",
           justifyContent: "center",
           cursor: "pointer",
           transition: "background 0.2s",
           width: "76px",
           borderRight: "1px solid rgba(0,0,0,0.2)"
         }}
        onMouseEnter={(e) => e.target.style.background = "rgba(0,123,255,0.1)"}
        onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.7)"}
        onClick={addAudioTrack}
        >
          <div style={{
            fontSize: "12px",
            color: "#007bff",
            fontWeight: "600"
          }}>
            + Audio
          </div>
         </div>
         
         {/* Timeline Content Border Overlay */}
         <div style={{
           position: "absolute",
           left: "76px",
           top: 0,
           bottom: 0,
           width: "2px",
           background: "rgba(0,0,0,0.3)",
           zIndex: 5,
           pointerEvents: "none"
         }} />
         
         {/* Right Edge Buffer Zone */}
         <div style={{
           position: "absolute",
           right: "0px",
           top: "60px", // Start below the top bar (30px) and time ruler (30px)
           bottom: 0,
           width: "40px", // Buffer zone width
           background: "rgba(0,0,0,0.2)",
           zIndex: 5,
           pointerEvents: "none"
         }} />
       </div>
     </div>
   );
 }
