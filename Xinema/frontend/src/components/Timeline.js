import React, { useState, useEffect, useRef } from 'react';

export default function Timeline() {
  const [activeTool, setActiveTool] = useState('cursor');
  const [videoTracks, setVideoTracks] = useState([1, 2, 3]);
  const [audioTracks, setAudioTracks] = useState([1]);
  const [contextMenu, setContextMenu] = useState(null);
  const [playheadPosition, setPlayheadPosition] = useState(0); // Frame position
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragStartPlayheadPosition, setDragStartPlayheadPosition] = useState(null); // Playhead position when drag starts
  const [timelineClips, setTimelineClips] = useState([]); // Clips placed on timeline
  const [dragPreview, setDragPreview] = useState(null); // Preview clip during drag
  const [magneticPoints, setMagneticPoints] = useState(new Map()); // Universal magnetic points storage
  const [showMagneticDebug, setShowMagneticDebug] = useState(false); // Show magnetic debug
  const [isDraggingClip, setIsDraggingClip] = useState(false); // Track if we're dragging a clip
  const [draggedClipActualPosition, setDraggedClipActualPosition] = useState(null); // Actual mouse position of dragged clip
  const [snapshotMagneticPoints, setSnapshotMagneticPoints] = useState(new Map()); // Snapshot of magnetic points when dragging starts
  const currentSnapshotRef = useRef(new Map()); // Current snapshot for immediate use
  
  // MAGNETIC POINT TYPES AND COLORS
  const MAGNETIC_TYPES = {
    BORDER: 'border',           // Orange - Timeline boundaries
    CLIP_START: 'clip_start',   // Red - Clip start points
    CLIP_END: 'clip_end',       // Red - Clip end points
    PLAYHEAD: 'playhead',       // Purple - Playhead position
    DRAGGED_CLIP: 'dragged_clip', // Yellow/Green - Dragged clip magnetic borders
    DRAGGED_LOCATION: 'dragged_location' // Blue - Dragged clip actual location
  };
  
  const MAGNETIC_COLORS = {
    [MAGNETIC_TYPES.BORDER]: '#ff8800',    // Orange
    [MAGNETIC_TYPES.CLIP_START]: '#ff0000', // Red
    [MAGNETIC_TYPES.CLIP_END]: '#ff0000',   // Red
    [MAGNETIC_TYPES.PLAYHEAD]: '#8800ff',  // Purple
    [MAGNETIC_TYPES.DRAGGED_CLIP]: '#ffff00', // Yellow (turns green when snapped)
    [MAGNETIC_TYPES.DRAGGED_LOCATION]: '#0088ff' // Blue
  };
  
  // MAGNETIC OFFSET - Adjust this value to fix magnetic point positioning (in pixels)
  const MAGNETIC_OFFSET_PIXELS = 95; // Change this value to adjust where magnetic points appear
  
  // MAGNETIC STRENGTH - Distance from magnetic points to snap (in frames)
  const MAGNETIC_SNAP_THRESHOLD_FRAMES = 360; // Change this value to adjust magnetism strength
  
  // BAKED-IN OFFSET - This is baked into orange lines to show correct magnetic boundaries
  const BAKED_MAGNETIC_OFFSET = 95; // This offset is permanently applied to orange lines
  
  // PLAYHEAD DRAG OFFSET - Adjusts where red lines appear relative to playhead while dragging
  const PLAYHEAD_DRAG_OFFSET = 95; // Increase this to move red lines closer to playhead
  
  // Function to get the actual timeline start position (device-independent)
  const getActualTimelineStart = () => {
    const timelineElement = document.querySelector('.timeline-content');
    if (timelineElement) {
      const timelineRect = timelineElement.getBoundingClientRect();
      const parentRect = timelineElement.parentElement?.getBoundingClientRect();
      if (parentRect) {
        return timelineRect.left - parentRect.left; // Actual offset from parent
      }
    }
    return 76; // Fallback to hardcoded value
  };

  const tools = [
    { id: 'cursor', icon: '↖', label: 'Cursor', active: true },
    { id: 'cut', icon: '✂', label: 'Cut', active: false },
    { id: 'zoom', icon: '🔍', label: 'Zoom', active: false },
    { id: 'magnetic', icon: '🧲', label: 'Magnetic Debug', active: showMagneticDebug, onClick: () => setShowMagneticDebug(!showMagneticDebug) }
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
    // ONLY update playhead if clicking directly on timeline (not during other drag operations)
    if (e.target.closest('.playhead')) {
      // This is handled by handlePlayheadMouseDown - don't interfere
      return;
    }
    
    // Don't update playhead if we're in any drag scenario other than playhead dragging
    if (e.target.closest('.clip-drag-preview') || 
        e.dataTransfer || 
        e.target.closest('.clip') ||
        isDraggingPlayhead ||
        isDraggingClip) {
      return;
    }
    
    e.preventDefault(); // Prevent default selection behavior
    
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - timelineRect.left;
    
    // Calculate position relative to track content area
    const trackContentStart = 76; // Track title width
    const bufferZone = 38; // Buffer zone width
    const maxPosition = timelineRect.width - trackContentStart - bufferZone;
    const relativeX = clickX - trackContentStart;
    
    // Calculate maximum time constraint (10 minutes = 600 seconds)
    const maxTimeInMinutes = 10.2;
    const maxTimeInPixels = timeToPixel(maxTimeInMinutes);
    const actualMaxPosition = Math.min(maxPosition, maxTimeInPixels);
    
    if (relativeX >= 0 && relativeX <= actualMaxPosition) {
      // Convert pixel position to frame position
      const framePosition = pixelsToFrames(relativeX);
      setPlayheadPosition(framePosition);
      // Start dragging mode so the playhead follows the mouse
      setIsDraggingPlayhead(true);
    }
  };

  const handleTimelineClick = (e) => {
    // Just prevent default behavior, don't start dragging on click
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    // ONLY update playhead if we're actually dragging the playhead AND not dragging clips
    if (isDraggingPlayhead && !isDraggingClip) {
      e.preventDefault(); // Prevent default selection behavior during dragging
      
      // Use the same element as the click handler to avoid jumping
      const timelineContent = document.querySelector('.timeline-content');
      if (!timelineContent) return;
      
      const timelineRect = timelineContent.getBoundingClientRect();
      const mouseX = e.clientX - timelineRect.left;
      
      // Calculate boundaries
      const trackContentStart = 76; // Track title width
      const bufferZone = 37; // Buffer zone width
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
        const maxFramePosition = pixelsToFrames(actualMaxPosition);
        setPlayheadPosition(maxFramePosition);
      } else {
        // Mouse is within bounds - follow the mouse (convert to frames)
        const framePosition = pixelsToFrames(relativeX);
        setPlayheadPosition(framePosition);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPlayhead(false);
    setIsDraggingClip(false);
  };

  // Handle drag over timeline
  const handleTimelineDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle drop on timeline
  const handleTimelineDrop = async (e) => {
    e.preventDefault();
    
    try {
      const clipData = JSON.parse(e.dataTransfer.getData('application/json'));
      const timelineRect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - timelineRect.left;
      
      // Calculate position relative to track content area
      const trackContentStart = 76; // Track title width
      const relativeX = dropX - trackContentStart;
      
      if (relativeX >= 0) {
        // Create new clip with duration (convert to frames)
        // Use the duration that was already loaded in ClipList (via lazy loading)
        let durationInSeconds = 5; // Default fallback
        
        if (clipData.duration && clipData.duration !== "0:00") {
          const durationStr = clipData.duration.toString();
          const parts = durationStr.split(':');
          if (parts.length === 2) {
            const minutes = parseInt(parts[0]);
            const seconds = parseInt(parts[1]);
            durationInSeconds = minutes * 60 + seconds;
          }
        }
        
        const durationInFrames = timeToFrames(durationInSeconds); // Convert seconds to frames
        
        // Calculate start and end positions in frames
        const startFrames = pixelsToFrames(relativeX);
        const endFrames = startFrames + durationInFrames;
        
        // Apply magnetism to snap to nearby elements (all in frames)
        const snappedStartFrames = applyMagnetism(startFrames, 10, 1, framesToPixels(durationInFrames));
        const snappedEndFrames = snappedStartFrames + durationInFrames;
        
        // Apply timeline boundary constraints
        const constrainedPosition = applyTimelineBoundaries(snappedStartFrames, snappedEndFrames);
        
        if (constrainedPosition) {
          // Convert to pixels for display
          const startPixel = framesToPixels(constrainedPosition.startFrames);
          const endPixel = framesToPixels(constrainedPosition.endFrames);
          const widthPixel = endPixel - startPixel;
          
          // Convert pixel position to time
          const startTime = pixelToTime(startPixel);
          
          const newClip = {
            id: `clip_${Date.now()}`,
            // Don't spread clipData to avoid overriding calculated properties
            character: clipData.character,
            filename: clipData.filename,
            startTime: startTime,
            duration: durationInSeconds,
            track: 1, // Default to first video track
            startPixel: startPixel,
            endPixel: endPixel,
            widthPixel: widthPixel,
            startFrames: constrainedPosition.startFrames,
            endFrames: constrainedPosition.endFrames,
            durationFrames: durationInFrames
          };
          
          setTimelineClips(prev => {
            const updatedClips = [...prev, newClip];
            // Update magnetic points whenever clips change
            updateMagneticPointsFromClips(updatedClips);
            return updatedClips;
          });
        }
      }
    } catch (error) {
      console.error('Error handling clip drop:', error);
    }
  };


  // Frame-based coordinate system (60 fps)
  const FRAMES_PER_SECOND = 60;
  const TIMELINE_DURATION_SECONDS = 600; // 10 minutes
  const TIMELINE_TOTAL_FRAMES = TIMELINE_DURATION_SECONDS * FRAMES_PER_SECOND; // 36,000 frames
  const TIMELINE_WIDTH_PIXELS = 1890; // Total timeline width in pixels
  
  // Timeline boundaries (flexible for future changes)
  const TIMELINE_START_FRAMES = 0; // Start at 0:00 (flexible)
  const TIMELINE_END_FRAMES = TIMELINE_TOTAL_FRAMES; // End at 10:00 (flexible)
  
  // DISPLAY CONVERSION: Frames to pixels (ONLY for visual display)
  const framesToPixels = (frames) => {
    return (frames / TIMELINE_TOTAL_FRAMES) * TIMELINE_WIDTH_PIXELS;
  };
  
  // INPUT CONVERSION: Pixels to frames (ONLY for mouse input)
  const pixelsToFrames = (pixels) => {
    return Math.round((pixels / TIMELINE_WIDTH_PIXELS) * TIMELINE_TOTAL_FRAMES);
  };
  
  // Convert frames to time (seconds)
  const framesToTime = (frames) => {
    return frames / FRAMES_PER_SECOND;
  };
  
  // Convert time (seconds) to frames
  const timeToFrames = (seconds) => {
    return Math.round(seconds * FRAMES_PER_SECOND);
  };
  
  // Convert pixel position to time (0-1892px to 0-10 minutes) - legacy function
  const pixelToTime = (pixels) => {
    const frames = pixelsToFrames(pixels);
    return framesToTime(frames);
  };

  // Convert time to pixel position (0-10 minutes to 0-1892px) - legacy function
  const timeToPixel = (minutes) => {
    const seconds = minutes * 60;
    const frames = timeToFrames(seconds);
    return framesToPixels(frames);
  };

  // Apply timeline boundary constraints to clip positions
  const applyTimelineBoundaries = (startFrames, endFrames) => {
    // First check if the clip would end after the timeline end
    if (endFrames > TIMELINE_END_FRAMES) {
      // Move the clip back so it ends exactly at the timeline end
      const clipDuration = endFrames - startFrames;
      const constrainedStartFrames = TIMELINE_END_FRAMES - clipDuration;
      
      // If moving it back would put the start before timeline start, don't show it
      if (constrainedStartFrames < TIMELINE_START_FRAMES) {
        return null;
      }
      
      return {
        startFrames: constrainedStartFrames,
        endFrames: TIMELINE_END_FRAMES
      };
    }
    
    // If clip would start before timeline start, move it to timeline start (leftmost position)
    if (startFrames < TIMELINE_START_FRAMES) {
      const clipDuration = endFrames - startFrames;
      const constrainedEndFrames = TIMELINE_START_FRAMES + clipDuration;
      
      // If moving it forward would put the end after timeline end, don't show it
      if (constrainedEndFrames > TIMELINE_END_FRAMES) {
        return null;
      }
      
      return {
        startFrames: TIMELINE_START_FRAMES,
        endFrames: constrainedEndFrames
      };
    }
    
    // Clip is within boundaries, no changes needed
    return {
      startFrames: startFrames,
      endFrames: endFrames
    };
  };

  // Universal magnetic points management with type organization
  const addMagneticPoint = (frame, track, type = MAGNETIC_TYPES.CLIP_START) => {
    const key = `${frame}_${track}_${type}`;
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      newMap.set(key, { frame, track, type, color: MAGNETIC_COLORS[type] });
      return newMap;
    });
  };

  const removeMagneticPoint = (frame, track, type) => {
    const key = `${frame}_${track}_${type}`;
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  const removeMagneticPointsByType = (type) => {
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      for (const [key, value] of newMap.entries()) {
        if (value.type === type) {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  };

  const updateDraggedClipMagneticPoints = (dragPreview, actualPosition = null) => {
    if (!dragPreview) {
      // Remove dragged clip magnetic points when no drag preview
      removeMagneticPointsByType(MAGNETIC_TYPES.DRAGGED_CLIP);
      removeMagneticPointsByType(MAGNETIC_TYPES.DRAGGED_LOCATION);
      setDraggedClipActualPosition(null);
      return;
    }

    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      
      // Remove old dragged clip points
      for (const [key, value] of newMap.entries()) {
        if (value.type === MAGNETIC_TYPES.DRAGGED_CLIP || value.type === MAGNETIC_TYPES.DRAGGED_LOCATION) {
          newMap.delete(key);
        }
      }
      
      // Add magnetic snap points (YELLOW/GREEN) - these show where the clip would be if snapped
      const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
      const startFrames = pixelsToFrames(dragPreview.startPixel);
      const endFrames = pixelsToFrames(dragPreview.endPixel);
      
      // Apply magnetic offset to dragged clip points
      const adjustedStartFrames = startFrames + magneticOffsetFrames;
      const adjustedEndFrames = endFrames + magneticOffsetFrames;
      
      // Check if we're snapped by comparing the magnetic position with actual mouse position
      const isSnapped = actualPosition && (
        Math.abs(startFrames - pixelsToFrames(actualPosition.startPixel)) > 1 ||
        Math.abs(endFrames - pixelsToFrames(actualPosition.endPixel)) > 1
      );
      
      // Debug logging
      if (actualPosition) {
        console.log('Snap Detection:', {
          magneticStart: startFrames,
          actualStart: pixelsToFrames(actualPosition.startPixel),
          startDiff: Math.abs(startFrames - pixelsToFrames(actualPosition.startPixel)),
          magneticEnd: endFrames,
          actualEnd: pixelsToFrames(actualPosition.endPixel),
          endDiff: Math.abs(endFrames - pixelsToFrames(actualPosition.endPixel)),
          isSnapped: isSnapped
        });
      }
      
      const magneticColor = isSnapped ? '#00ff00' : MAGNETIC_COLORS[MAGNETIC_TYPES.DRAGGED_CLIP]; // Green if snapped, yellow if not
      
      const startKey = `${adjustedStartFrames}_dragged_start_${MAGNETIC_TYPES.DRAGGED_CLIP}`;
      newMap.set(startKey, { 
        frame: adjustedStartFrames, 
        track: dragPreview.track, 
        type: MAGNETIC_TYPES.DRAGGED_CLIP,
        color: magneticColor
      });
      
      const endKey = `${adjustedEndFrames}_dragged_end_${MAGNETIC_TYPES.DRAGGED_CLIP}`;
      newMap.set(endKey, { 
        frame: adjustedEndFrames, 
        track: dragPreview.track, 
        type: MAGNETIC_TYPES.DRAGGED_CLIP,
        color: magneticColor
      });
      
      // Add actual location points (BLUE) - these show where the mouse actually is
      if (actualPosition) {
        const actualStartFrames = pixelsToFrames(actualPosition.startPixel);
        const actualEndFrames = pixelsToFrames(actualPosition.endPixel);
        
        // Apply magnetic offset to blue bars too for consistent positioning
        const adjustedActualStartFrames = actualStartFrames + magneticOffsetFrames;
        const adjustedActualEndFrames = actualEndFrames + magneticOffsetFrames;
        
        const actualStartKey = `${adjustedActualStartFrames}_dragged_start_${MAGNETIC_TYPES.DRAGGED_LOCATION}`;
        newMap.set(actualStartKey, { 
          frame: adjustedActualStartFrames, 
          track: dragPreview.track, 
          type: MAGNETIC_TYPES.DRAGGED_LOCATION,
          color: MAGNETIC_COLORS[MAGNETIC_TYPES.DRAGGED_LOCATION]
        });
        
        const actualEndKey = `${adjustedActualEndFrames}_dragged_end_${MAGNETIC_TYPES.DRAGGED_LOCATION}`;
        newMap.set(actualEndKey, { 
          frame: adjustedActualEndFrames, 
          track: dragPreview.track, 
          type: MAGNETIC_TYPES.DRAGGED_LOCATION,
          color: MAGNETIC_COLORS[MAGNETIC_TYPES.DRAGGED_LOCATION]
        });
      }
      
      return newMap;
    });
  };

  const updateMagneticPointsFromClips = (clips) => {
    setMagneticPoints(prev => {
      const newMap = new Map(prev); // PRESERVE EXISTING POINTS
      
      // Convert pixel offset to frames
      const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
      
      // Purple points are handled by updatePlayheadMagneticPoint - don't create them here
      
      // Add timeline boundaries (ORANGE) - start and end with magnetic offset
      const timelineStartKey = `${magneticOffsetFrames}_timeline_${MAGNETIC_TYPES.BORDER}`;
      newMap.set(timelineStartKey, { 
        frame: magneticOffsetFrames, 
        track: 'timeline', 
        type: MAGNETIC_TYPES.BORDER,
        color: MAGNETIC_COLORS[MAGNETIC_TYPES.BORDER]
      });
      
      const timelineEndKey = `${TIMELINE_TOTAL_FRAMES + magneticOffsetFrames}_timeline_${MAGNETIC_TYPES.BORDER}`;
      newMap.set(timelineEndKey, { 
        frame: TIMELINE_TOTAL_FRAMES + magneticOffsetFrames, 
        track: 'timeline', 
        type: MAGNETIC_TYPES.BORDER,
        color: MAGNETIC_COLORS[MAGNETIC_TYPES.BORDER]
      });
      
      // Add all clip start and end points (RED) with offset
      clips.forEach(clip => {
        if (clip.startFrames !== undefined) {
          const adjustedStart = clip.startFrames + magneticOffsetFrames;
          const startKey = `${adjustedStart}_${clip.track}_${MAGNETIC_TYPES.CLIP_START}`;
          newMap.set(startKey, { 
            frame: adjustedStart, 
            track: clip.track, 
            type: MAGNETIC_TYPES.CLIP_START,
            color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_START]
          });
        }
        
        if (clip.endFrames !== undefined) {
          const adjustedEnd = clip.endFrames + magneticOffsetFrames;
          const endKey = `${adjustedEnd}_${clip.track}_${MAGNETIC_TYPES.CLIP_END}`;
          newMap.set(endKey, { 
            frame: adjustedEnd, 
            track: clip.track, 
            type: MAGNETIC_TYPES.CLIP_END,
            color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_END]
          });
        }
      });
      
      // Debug: Log magnetic points when debug is enabled
      if (showMagneticDebug) {
        console.log('=== MAGNETIC POINTS UPDATE ===');
        console.log('Playhead position:', playheadPosition, 'frames');
        console.log('Timeline boundaries: 0 to', TIMELINE_TOTAL_FRAMES, 'frames');
        console.log('Clips:', clips.length);
        clips.forEach((clip, index) => {
          console.log(`Clip ${index}:`, {
            startFrames: clip.startFrames,
            endFrames: clip.endFrames,
            startPixel: clip.startPixel,
            endPixel: clip.endPixel,
            track: clip.track
          });
        });
        console.log('Total magnetic points:', newMap.size);
        console.log('=== END MAGNETIC POINTS UPDATE ===');
      }
      
      return newMap;
    });
  };

  // Snapshot current magnetic points when dragging starts
  const snapshotCurrentMagneticPoints = () => {
    const snapshot = new Map(magneticPoints);
    setSnapshotMagneticPoints(snapshot);
    currentSnapshotRef.current = snapshot; // Store in ref for immediate use
    return snapshot; // Return the snapshot immediately
  };

  const updatePlayheadMagneticPoint = (newPlayheadPosition) => {
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      
      // Remove ALL old playhead positions (clean up any duplicates)
      for (const [key, value] of newMap.entries()) {
        if (value.type === MAGNETIC_TYPES.PLAYHEAD) {
          newMap.delete(key);
        }
      }
      
      // Add new playhead position (PURPLE) - with drag offset to position correctly
      if (newPlayheadPosition >= 0) {
        const playheadDragOffsetFrames = pixelsToFrames(PLAYHEAD_DRAG_OFFSET);
        const adjustedPlayhead = newPlayheadPosition + playheadDragOffsetFrames;
        const newPlayheadKey = `${adjustedPlayhead}_playhead_${MAGNETIC_TYPES.PLAYHEAD}`;
        newMap.set(newPlayheadKey, { 
          frame: adjustedPlayhead, 
          track: 'playhead', 
          type: MAGNETIC_TYPES.PLAYHEAD,
          color: MAGNETIC_COLORS[MAGNETIC_TYPES.PLAYHEAD]
        });
      }
      
      return newMap;
    });
  };

  // Enhanced magnetism function using universal magnetic points
  const applyMagnetism = (positionFrames, snapThresholdPixels = null, currentTrack = null, clipWidthPixels = 0) => {
    const snapPoints = [];
    
    // Use the global threshold if not specified, otherwise convert pixels to frames
    const frameSnapThreshold = snapThresholdPixels ? pixelsToFrames(snapThresholdPixels) : MAGNETIC_SNAP_THRESHOLD_FRAMES;
    
    // Use snapshot magnetic points when dragging clips, otherwise use live points
    const pointsToUse = isDraggingClip ? snapshotMagneticPoints : magneticPoints;
    pointsToUse.forEach((point, key) => {
      const { frame, track, type } = point;
      
      // Add all points within threshold
      const distance = Math.abs(positionFrames - frame);
      if (distance < frameSnapThreshold) {
        snapPoints.push(frame);
      }
      
      // Cross-track magnetism: snap to points on other tracks
      if (currentTrack && track !== currentTrack && track !== 'playhead') {
        const crossTrackDistance = Math.abs(positionFrames - frame);
        if (crossTrackDistance < frameSnapThreshold) {
          snapPoints.push(frame);
        }
      }
      
      // End-to-start snapping
      if (clipWidthPixels > 0) {
        const clipWidthFrames = pixelsToFrames(clipWidthPixels);
        const ourClipEnd = positionFrames + clipWidthFrames;
        
        // If our clip's end would be near this point
        const endDistance = Math.abs(ourClipEnd - frame);
        if (endDistance < frameSnapThreshold) {
          // Snap so our clip ends exactly at this point
          snapPoints.push(frame - clipWidthFrames);
        }
      }
    });
    
    // Add playhead position as special case (use captured position from drag start)
    const playheadSnapPoint = dragStartPlayheadPosition !== null ? dragStartPlayheadPosition : playheadPosition;
    if (playheadSnapPoint >= 0 && playheadSnapPoint <= TIMELINE_TOTAL_FRAMES) {
      const playheadDistance = Math.abs(positionFrames - playheadSnapPoint);
      if (playheadDistance < frameSnapThreshold) {
        snapPoints.push(playheadSnapPoint);
      }
    }
    
    // Find the closest snap point within threshold
    let closestSnap = null;
    let minDistance = Infinity;
    
    snapPoints.forEach(snapPoint => {
      const distance = Math.abs(positionFrames - snapPoint);
      if (distance < frameSnapThreshold && distance < minDistance) {
        minDistance = distance;
        closestSnap = snapPoint;
      }
    });
    
    return closestSnap !== null ? closestSnap : positionFrames;
  };

  // Simple magnetism function for dragged clips - snap to closest point
  const applyDraggedClipMagnetism = (startFrames, endFrames, snapThresholdPixels = null) => {
    // Use the global threshold if not specified, otherwise convert pixels to frames
    const frameSnapThreshold = snapThresholdPixels ? pixelsToFrames(snapThresholdPixels) : MAGNETIC_SNAP_THRESHOLD_FRAMES;
    const clipDuration = endFrames - startFrames;
    
    // Apply the magnetic offset to the input positions to match the offset magnetic points
    const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
    const adjustedStartFrames = startFrames + magneticOffsetFrames;
    const adjustedEndFrames = endFrames + magneticOffsetFrames;
    
    // Find the closest magnetic point to either start or end
    let closestPoint = null;
    let minDistance = Infinity;
    let snapToStart = true; // Default to snapping start position
    
    // USE THE EXACT SAME POINTS AS THE DEBUG PANEL
    const debugPoints = Array.from(magneticPoints.values());
    console.log('MAGNETISM: Using', debugPoints.length, 'points from debug panel');
    console.log('MAGNETISM: Points are:', debugPoints);
    
    debugPoints.forEach((point) => {
      if (point.type === MAGNETIC_TYPES.DRAGGED_CLIP) {
        return; // Skip dragged clip points
      }
      
      const { frame, type } = point;
      
      // Check distance to start position (using adjusted positions)
      const startDistance = Math.abs(adjustedStartFrames - frame);
      if (startDistance < frameSnapThreshold && startDistance < minDistance) {
        minDistance = startDistance;
        closestPoint = frame;
        snapToStart = true;
        console.log('Found start snap:', { frame, type, distance: startDistance });
      }
      
      // Check distance to end position (using adjusted positions)
      const endDistance = Math.abs(adjustedEndFrames - frame);
      if (endDistance < frameSnapThreshold && endDistance < minDistance) {
        minDistance = endDistance;
        closestPoint = frame;
        snapToStart = false;
        console.log('Found end snap:', { frame, type, distance: endDistance });
      }
    });
    
    // If we found a close point, snap to it
    if (closestPoint !== null) {
      console.log('Snapping to:', { closestPoint, snapToStart });
      if (snapToStart) {
        // Snap start position, adjust end accordingly
        // Remove the magnetic offset from the result since we added it to the input
        return {
          startFrames: closestPoint - magneticOffsetFrames,
          endFrames: (closestPoint - magneticOffsetFrames) + clipDuration
        };
      } else {
        // Snap end position, adjust start accordingly
        // Remove the magnetic offset from the result since we added it to the input
        return {
          startFrames: (closestPoint - magneticOffsetFrames) - clipDuration,
          endFrames: closestPoint - magneticOffsetFrames
        };
      }
    }
    
    // No close point found, return original positions
    return { startFrames, endFrames };
  };

  // Format time with frames (60fps) - works with pixel positions
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

  // Format time directly from frames (60fps)
  const formatTimeFromFrames = (frames) => {
    const totalSeconds = Math.floor(frames / FRAMES_PER_SECOND);
    const remainingFrames = frames % FRAMES_PER_SECOND;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${remainingFrames.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}.${remainingFrames.toString().padStart(2, '0')}`;
    }
  };

  // Initialize magnetic points when clips change OR on mount
  useEffect(() => {
    updateMagneticPointsFromClips(timelineClips);
  }, [timelineClips]); // This will run on mount when timelineClips is []

  // Update playhead magnetic point when playhead moves (but not during clip dragging)
  useEffect(() => {
    // Only update magnetic points if we're not dragging clips
    if (!isDraggingClip) {
      updatePlayheadMagneticPoint(playheadPosition);
    }
  }, [playheadPosition, isDraggingClip]);

  // Update dragged clip magnetic points when drag preview changes
  useEffect(() => {
    updateDraggedClipMagneticPoints(dragPreview, draggedClipActualPosition);
  }, [dragPreview, draggedClipActualPosition]);

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
      // Listen for playhead position requests from ClipList
      const handlePlayheadRequest = () => {
        // Do nothing during clip dragging - keep purple line stable
        // The playhead magnetic point should not change during clip operations
      };
      
      timelineElement.addEventListener('requestPlayheadPosition', handlePlayheadRequest);
      const handleTimelineDropEvent = (e) => {
        const { clip, clientX, clientY, track } = e.detail;
        const timelineRect = timelineElement.getBoundingClientRect();
        const dropX = clientX - timelineRect.left;
        
        
        // Calculate position relative to track content area
        const trackContentStart = 76; // Track title width
        const relativeX = dropX - trackContentStart;
        
        // Allow dropping even if to the left of timeline content (will be constrained to left border)
        if (relativeX >= -1000) { // Allow dropping anywhere within reasonable bounds
          // Use track from drop event, fallback to drag preview, then default to track 1
          const targetTrack = track || (dragPreview ? dragPreview.track : 1);
          
          // Create new clip with duration (convert to frames)
          const baseId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Use the duration that was already loaded in ClipList
          let clipDuration = 5; // Default fallback
          console.log('=== DURATION FROM CLIPLIST IN DROP ===');
          console.log('Clip duration from ClipList:', clip.duration, 'Type:', typeof clip.duration);
          
          // Handle both numeric duration (from ClipList) and MM:SS format
          if (typeof clip.duration === 'number' && clip.duration > 0) {
            // Duration is already in seconds (from ClipList processing)
            clipDuration = clip.duration;
            console.log('Using numeric duration from ClipList:', clipDuration, 'seconds');
          } else if (clip.duration && clip.duration !== "0:00") {
            // Duration is in MM:SS format
            const durationStr = clip.duration.toString();
            console.log('Duration string from ClipList:', durationStr);
            const parts = durationStr.split(':');
            console.log('Split parts:', parts);
            if (parts.length === 2) {
              const minutes = parseInt(parts[0]);
              const seconds = parseInt(parts[1]);
              clipDuration = minutes * 60 + seconds;
              console.log('Parsed MM:SS duration from ClipList:', clipDuration, 'seconds');
            } else {
              console.log('Invalid duration format from ClipList, using fallback');
            }
          } else {
            console.log('Duration from ClipList is "0:00" or falsy, using fallback');
          }
          console.log('=== END DURATION FROM CLIPLIST ===');
          
          const durationInFrames = timeToFrames(clipDuration); // Convert seconds to frames
          
          // Calculate start and end positions in frames
          // If dropping to the left of timeline content, use 0 position (leftmost)
          const constrainedRelativeX = Math.max(relativeX, 0);
          const startFrames = pixelsToFrames(constrainedRelativeX);
          const endFrames = startFrames + durationInFrames;
          
          // Apply magnetism to snap to nearby elements (all in frames)
          const snappedStartFrames = applyMagnetism(startFrames, 10, targetTrack, framesToPixels(durationInFrames));
          const snappedEndFrames = snappedStartFrames + durationInFrames;
          
          // Apply timeline boundary constraints
          const constrainedPosition = applyTimelineBoundaries(snappedStartFrames, snappedEndFrames);
          
          if (constrainedPosition) {
            // Convert to pixels for display
            const startPixel = framesToPixels(constrainedPosition.startFrames);
            const endPixel = framesToPixels(constrainedPosition.endFrames);
            const widthPixel = endPixel - startPixel;
            
            // Convert pixel position to time
            const startTime = pixelToTime(startPixel);
            
            const newClip = {
              id: baseId,
              // Don't spread clip to avoid overriding calculated properties
              character: clip.character,
              filename: clip.filename,
              startTime: startTime,
              duration: clipDuration,
              track: targetTrack,
              startPixel: startPixel,
              endPixel: endPixel,
              widthPixel: widthPixel,
              startFrames: constrainedPosition.startFrames,
              endFrames: constrainedPosition.endFrames,
              durationFrames: durationInFrames
            };
            
            setTimelineClips(prev => {
              const updatedClips = [...prev, newClip];
              // Update magnetic points whenever clips change
              updateMagneticPointsFromClips(updatedClips);
              return updatedClips;
            });
            
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
        }
        
        // Clear drag preview and reset playhead capture
        setDragPreview(null);
        setDragStartPlayheadPosition(null);
      };
      
      const handleTimelineDragOver = (e) => {
        e.preventDefault();
        
        // Set clip dragging state
        setIsDraggingClip(true);
        
        // No need to snapshot - using live magnetic points
        
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
            
            // Handle both numeric duration (from ClipList) and MM:SS format
            let duration = 5; // Default fallback
            if (typeof clipData.duration === 'number' && clipData.duration > 0) {
              duration = clipData.duration;
            } else if (clipData.duration && clipData.duration !== "0:00") {
              const durationStr = clipData.duration.toString();
              const parts = durationStr.split(':');
              if (parts.length === 2) {
                duration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
              }
            }
            
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
            
            // Apply magnetism to snap to nearby elements (all in frames)
            // Handle both numeric duration (from ClipList) and MM:SS format
            let durationInSeconds = 5; // Default fallback
            if (typeof duration === 'number' && duration > 0) {
              durationInSeconds = duration;
            } else if (duration && duration !== "0:00") {
              const durationStr = duration.toString();
              const parts = durationStr.split(':');
              if (parts.length === 2) {
                const minutes = parseInt(parts[0]);
                const seconds = parseInt(parts[1]);
                durationInSeconds = minutes * 60 + seconds;
              }
            }
            
            const durationInFrames = timeToFrames(durationInSeconds); // Convert seconds to frames
            const positionFrames = pixelsToFrames(relativeX);
            const initialEndFrames = positionFrames + durationInFrames;
            
            // Apply special dragged clip magnetism that prioritizes left border
            const snappedPosition = applyDraggedClipMagnetism(positionFrames, initialEndFrames);
            
            // Apply timeline boundary constraints
            const constrainedPosition = applyTimelineBoundaries(snappedPosition.startFrames, snappedPosition.endFrames);
            
            if (constrainedPosition) {
              // Convert to pixels for display
              const startPixel = framesToPixels(constrainedPosition.startFrames);
              const endPixel = framesToPixels(constrainedPosition.endFrames);
              const widthPixel = endPixel - startPixel;
              
              // Create actual position (where mouse is) for blue bars
              const actualStartPixel = framesToPixels(positionFrames);
              const actualEndPixel = framesToPixels(initialEndFrames);
              const actualWidthPixel = actualEndPixel - actualStartPixel;
              
              const dragPreviewData = {
                startPixel: startPixel,
                endPixel: endPixel,
                widthPixel: widthPixel,
                character: clipData.character || 'Clip',
                duration: duration,
                track: targetTrack
              };
              
              const actualPositionData = {
                startPixel: actualStartPixel,
                endPixel: actualEndPixel,
                widthPixel: actualWidthPixel,
                character: clipData.character || 'Clip',
                duration: duration,
                track: targetTrack
              };
              
              setDragPreview(dragPreviewData);
              setDraggedClipActualPosition(actualPositionData);
            } else {
              // Clip would be outside boundaries, don't show preview
              setDragPreview(null);
              setDraggedClipActualPosition(null);
            }
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
              // Handle both numeric duration (from ClipList) and MM:SS format
              let duration = 5; // Default fallback
              if (typeof customDragEvent.clip.duration === 'number' && customDragEvent.clip.duration > 0) {
                duration = customDragEvent.clip.duration;
              } else if (customDragEvent.clip.duration && customDragEvent.clip.duration !== "0:00") {
                const durationStr = customDragEvent.clip.duration.toString();
                const parts = durationStr.split(':');
                if (parts.length === 2) {
                  duration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                }
              }
              
              // Calculate which track the mouse is over
              const trackHeight = 50;
              const trackStartY = 60;
              const trackIndex = Math.floor((mouseY - trackStartY) / trackHeight);
              const targetTrack = Math.max(1, Math.min(trackIndex + 1, 3));
              
              // Apply magnetism to snap to nearby elements (all in frames)
              // Handle both numeric duration (from ClipList) and MM:SS format
              let durationInSeconds = 5; // Default fallback
              if (typeof duration === 'number' && duration > 0) {
                durationInSeconds = duration;
              } else if (duration && duration !== "0:00") {
                const durationStr = duration.toString();
                const parts = durationStr.split(':');
                if (parts.length === 2) {
                  const minutes = parseInt(parts[0]);
                  const seconds = parseInt(parts[1]);
                  durationInSeconds = minutes * 60 + seconds;
                }
              }
              
              const durationInFrames = timeToFrames(durationInSeconds); // Convert seconds to frames
              const positionFrames = pixelsToFrames(relativeX);
              const initialEndFrames = positionFrames + durationInFrames;
              
              // Apply special dragged clip magnetism that prioritizes left border
              const snappedPosition = applyDraggedClipMagnetism(positionFrames, initialEndFrames);
              
              // Apply timeline boundary constraints
              const constrainedPosition = applyTimelineBoundaries(snappedPosition.startFrames, snappedPosition.endFrames);
              
              if (constrainedPosition) {
                // Convert to pixels for display
                const startPixel = framesToPixels(constrainedPosition.startFrames);
                const endPixel = framesToPixels(constrainedPosition.endFrames);
                const widthPixel = endPixel - startPixel;
                
                setDragPreview({
                  startPixel: startPixel,
                  endPixel: endPixel,
                  widthPixel: widthPixel,
                  character: customDragEvent.clip.character || 'Clip',
                  duration: duration,
                  track: targetTrack
                });
              } else {
                // Clip would be outside boundaries, don't show preview
                setDragPreview(null);
              }
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
          setDraggedClipActualPosition(null);
          setIsDraggingClip(false);
          // Clear dragged clip magnetic points
          updateDraggedClipMagneticPoints(null);
        }
      };
      
      const handleTimelineDragOverEvent = (e) => {
        const { clip, clientX, clientY, ctrlKey, metaKey } = e.detail;
        const timelineRect = timelineElement.getBoundingClientRect();
        const mouseX = clientX - timelineRect.left;
        const mouseY = clientY - timelineRect.top;
        const trackContentStart = 76;
        const relativeX = mouseX - trackContentStart;
        
        
        if (mouseY >= 60) {
          // Handle both numeric duration (from ClipList) and MM:SS format
          let duration = 5; // Default fallback
          if (typeof clip.duration === 'number' && clip.duration > 0) {
            duration = clip.duration;
          } else if (clip.duration && clip.duration !== "0:00") {
            const durationStr = clip.duration.toString();
            const parts = durationStr.split(':');
            if (parts.length === 2) {
              duration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
          }
          
          
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
          
          // Apply magnetism to snap to nearby elements (all in frames)
          // Handle both numeric duration (from ClipList) and MM:SS format
          let durationInSeconds = 5; // Default fallback
          if (typeof duration === 'number' && duration > 0) {
            durationInSeconds = duration;
          } else if (duration && duration !== "0:00") {
            const durationStr = duration.toString();
            const parts = durationStr.split(':');
            if (parts.length === 2) {
              const minutes = parseInt(parts[0]);
              const seconds = parseInt(parts[1]);
              durationInSeconds = minutes * 60 + seconds;
            }
          }
          
          const durationInFrames = timeToFrames(durationInSeconds); // Convert seconds to frames
          // If mouse is to the left of timeline content, use 0 position (leftmost)
          const constrainedRelativeX = Math.max(relativeX, 0);
          const positionFrames = pixelsToFrames(constrainedRelativeX);
          const initialEndFrames = positionFrames + durationInFrames;
          
          // Apply special dragged clip magnetism that prioritizes left border
          const snappedPosition = applyDraggedClipMagnetism(positionFrames, initialEndFrames, 10);
          
          // Apply timeline boundary constraints
          const constrainedPosition = applyTimelineBoundaries(snappedPosition.startFrames, snappedPosition.endFrames);
          
          if (constrainedPosition) {
            // Convert to pixels for display
            const startPixel = framesToPixels(constrainedPosition.startFrames);
            const endPixel = framesToPixels(constrainedPosition.endFrames);
            const widthPixel = endPixel - startPixel;
            
            setDragPreview({
              startPixel: startPixel,
              endPixel: endPixel,
              widthPixel: widthPixel,
              character: clip.character || 'Clip',
              duration: duration,
              track: targetTrack,
              multiTrack: isMultiTrack,
              mouseY: mouseY // Add mouse Y for debugging
            });
          } else {
            // Clip would be outside boundaries, don't show preview
            setDragPreview(null);
          }
        } else {
          setDragPreview(null);
        }
      };
      
      const handleTimelineDragLeaveEvent = (e) => {
        setDragPreview(null);
        setDraggedClipActualPosition(null);
        setIsDraggingClip(false);
        // Clear dragged clip magnetic points
        updateDraggedClipMagneticPoints(null);
      };
      
      const handleTimelineDragClear = (e) => {
        setDragPreview(null);
        setDraggedClipActualPosition(null);
        setIsDraggingClip(false);
        // Clear dragged clip magnetic points
        updateDraggedClipMagneticPoints(null);
      };
      
      timelineElement.addEventListener('timelineDrop', handleTimelineDropEvent);
      timelineElement.addEventListener('dragover', handleTimelineDragOver);
      timelineElement.addEventListener('dragleave', handleTimelineDragLeave);
      timelineElement.addEventListener('timelineDragOver', handleTimelineDragOverEvent);
      timelineElement.addEventListener('timelineDragLeave', handleTimelineDragLeaveEvent);
      timelineElement.addEventListener('timelineDragClear', handleTimelineDragClear);
      timelineElement.addEventListener('requestPlayheadPosition', handlePlayheadRequest);
      
      return () => {
        timelineElement.removeEventListener('timelineDrop', handleTimelineDropEvent);
        timelineElement.removeEventListener('dragover', handleTimelineDragOver);
        timelineElement.removeEventListener('dragleave', handleTimelineDragLeave);
        timelineElement.removeEventListener('timelineDragOver', handleTimelineDragOverEvent);
        timelineElement.removeEventListener('timelineDragLeave', handleTimelineDragLeaveEvent);
        timelineElement.removeEventListener('timelineDragClear', handleTimelineDragClear);
        timelineElement.removeEventListener('requestPlayheadPosition', handlePlayheadRequest);
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
            onClick={() => {
              if (tool.id === 'magnetic') {
                setShowMagneticDebug(!showMagneticDebug);
              } else if (tool.active) {
                setActiveTool(tool.id);
              }
            }}
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
             {formatTimeFromFrames(playheadPosition)}
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
            // Use the actual constraint value - 1890 pixels from the beginning
            const actualMaxPosition = 1890; // This is the actual constraint value
            const position = (time / 10) * actualMaxPosition; // Position in pixels
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
             left: `${76 + framesToPixels(playheadPosition)}px`, // Convert frame position to pixels
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
                     title={`${clip.character} - ${clip.filename} (${clip.duration}s, ${clip.widthPixel}px wide)`}
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
               
               {/* Debug Visual for Drag Preview */}
               {dragPreview && dragPreview.track === trackNum && (
                 <div
                   style={{
                     position: "absolute",
                     left: `${dragPreview.startPixel}px`,
                     top: "-50px",
                     background: "rgba(0, 0, 0, 0.9)",
                     color: "white",
                     padding: "6px 8px",
                     borderRadius: "4px",
                     fontSize: "10px",
                     fontFamily: "monospace",
                     whiteSpace: "nowrap",
                     zIndex: 20,
                     pointerEvents: "none",
                     border: "1px solid #333"
                   }}
                 >
                   <div style={{ fontWeight: "bold", marginBottom: "2px" }}>DRAG DEBUG</div>
                   <div>Start: {dragPreview.startPixel.toFixed(1)}px</div>
                   <div>End: {(dragPreview.startPixel + dragPreview.widthPixel).toFixed(1)}px</div>
                   <div>Width: {dragPreview.widthPixel.toFixed(1)}px</div>
                   <div>Duration: {dragPreview.duration}s</div>
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
           left: "75px",
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
           right: "-3px",
           top: "60px", // Start below the top bar (30px) and time ruler (30px)
           bottom: 0,
           width: "40px", // Buffer zone width
           background: "rgba(0,0,0,0.2)",
           zIndex: 5,
           pointerEvents: "none"
         }} />
         
         
       </div>
       
       {/* Magnetic Debug Display */}
       {showMagneticDebug && (
         <div style={{
           position: "fixed",
           top: "10px",
           right: "10px",
           background: "rgba(0, 0, 0, 0.9)",
           color: "white",
           padding: "10px",
           borderRadius: "5px",
           fontSize: "12px",
           fontFamily: "monospace",
           zIndex: 9999,
           maxWidth: "300px",
           border: "2px solid #ff0000"
         }}>
           <div style={{ fontWeight: "bold", marginBottom: "5px", color: "#ff0000" }}>
             MAGNETIC POINTS ({magneticPoints.size})
           </div>
           <div style={{ marginBottom: "10px", padding: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "3px" }}>
             <div style={{ fontSize: "10px", marginBottom: "3px" }}>
               <strong>Magnetic Offset:</strong> {MAGNETIC_OFFSET_PIXELS}px (hardcoded in code)
             </div>
           </div>
           
           {/* Group magnetic points by type for better organization */}
           {Object.values(MAGNETIC_TYPES).map(type => {
             const pointsOfType = Array.from(magneticPoints.values()).filter(point => point.type === type);
             if (pointsOfType.length === 0) return null;
             
             return (
               <div key={type} style={{ marginBottom: "8px" }}>
                 <div style={{ 
                   fontSize: "10px", 
                   fontWeight: "bold", 
                   color: MAGNETIC_COLORS[type],
                   marginBottom: "3px",
                   textTransform: "uppercase"
                 }}>
                   {type} ({pointsOfType.length})
                 </div>
                 {pointsOfType.map((point, index) => (
                   <div key={index} style={{ 
                     fontSize: "9px", 
                     marginBottom: "1px",
                     marginLeft: "8px",
                     color: MAGNETIC_COLORS[type]
                   }}>
                     {point.frame}f @ track {point.track}
                   </div>
                 ))}
               </div>
             );
           })}
           <button 
             onClick={() => setShowMagneticDebug(false)}
             style={{ 
               marginTop: "5px", 
               padding: "2px 6px", 
               fontSize: "10px",
               background: "#ff0000",
               color: "white",
               border: "none",
               borderRadius: "3px",
               cursor: "pointer"
             }}
           >
             Hide
           </button>
         </div>
       )}
       
       {/* Timeline Boundaries - Orange lines for start/end */}
       {showMagneticDebug && (
         <>
           {/* Timeline Start (0 frames + magnetic offset) - Shows where magnetism will occur */}
           <div
             style={{
               position: "absolute",
               left: `${getActualTimelineStart() + framesToPixels(pixelsToFrames(MAGNETIC_OFFSET_PIXELS))}px`,
               top: "60px",
               bottom: "0px",
               width: "1px",
               background: "#ff8800",
               zIndex: 25,
               pointerEvents: "none",
               opacity: 0.9
             }}
             title={`Timeline Start Magnetic Point: ${getActualTimelineStart() + MAGNETIC_OFFSET_PIXELS}px (offset: ${MAGNETIC_OFFSET_PIXELS}px)`}
           />
           {/* Timeline End (36000 frames + magnetic offset) - Shows where magnetism will occur */}
           <div
             style={{
               position: "absolute",
               left: `${getActualTimelineStart() + framesToPixels(TIMELINE_TOTAL_FRAMES) + MAGNETIC_OFFSET_PIXELS}px`,
               top: "60px",
               bottom: "0px",
               width: "1px",
               background: "#ff8800",
               zIndex: 25,
               pointerEvents: "none",
               opacity: 0.9
             }}
             title={`Timeline End Magnetic Point: ${getActualTimelineStart() + framesToPixels(TIMELINE_TOTAL_FRAMES) + MAGNETIC_OFFSET_PIXELS}px (offset: ${MAGNETIC_OFFSET_PIXELS}px)`}
           />
         </>
       )}
       
       {/* Frame Grid Test - Show every 60 frames (1 second) */}
       {showMagneticDebug && Array.from({length: 11}, (_, i) => i * 60).map((frame, index) => (
         <div
           key={`grid-${frame}`}
           style={{
             position: "absolute",
             left: `${76 + framesToPixels(frame)}px`,
             top: "60px",
             bottom: "0px",
             width: "1px",
             background: "#00ff00",
             zIndex: 15,
             pointerEvents: "none",
             opacity: 0.5
           }}
           title={`Grid: ${frame}f (${frame/60}s)`}
         />
       ))}
       
       {/* Magnetic Point Visual Indicators - Color-coded by type */}
       {showMagneticDebug && Array.from(magneticPoints.values()).map((point, index) => (
         <div
           key={index}
           style={{
             position: "absolute",
             left: `${76 + framesToPixels(point.frame)}px`,
             top: "60px",
             bottom: "0px",
             width: "3px",
             background: point.color || "#ff0000",
             zIndex: 20,
             pointerEvents: "none",
             opacity: 0.9,
             boxShadow: `0 0 4px ${point.color || "#ff0000"}`
           }}
           title={`${point.type}: ${point.frame}f @ track ${point.track} (${point.color})`}
         />
       ))}
       
     </div>
   );
 }


