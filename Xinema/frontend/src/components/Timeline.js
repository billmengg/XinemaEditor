import React, { useState, useEffect, useRef } from 'react';
import { logOnce } from '../utils/consoleDeduplication';

export default function Timeline({ onClipSelect, selectedClip, isPlaying, onTimelineClick, onTimelineClipsChange, onPlayheadChange }) {
  const [activeTool, setActiveTool] = useState('cursor');
  const [videoTracks, setVideoTracks] = useState([1, 2, 3]);
  const [audioTracks, setAudioTracks] = useState([1]);
  const [contextMenu, setContextMenu] = useState(null);
  const [playheadPosition, setPlayheadPosition] = useState(0); // Frame position
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isManualPlayheadChange, setIsManualPlayheadChange] = useState(false);
  const [dragStartPlayheadPosition, setDragStartPlayheadPosition] = useState(null); // Playhead position when drag starts
  const [timelineClips, setTimelineClips] = useState([]); // Clips placed on timeline
  const [staticClipData, setStaticClipData] = useState(new Map()); // Static clip data store: key = "character/filename", value = original clip data
  const [dragPreview, setDragPreview] = useState(null); // Preview clip during drag
  const [magneticPoints, setMagneticPoints] = useState(new Map()); // Universal magnetic points storage
  const [showMagneticDebug, setShowMagneticDebug] = useState(false); // Show magnetic debug
  const [isDraggingClip, setIsDraggingClip] = useState(false); // Track if we're dragging a clip
  const [draggedClipActualPosition, setDraggedClipActualPosition] = useState(null); // Actual mouse position of dragged clip
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 }); // Mouse position during drag
  const [playheadAnimationFrame, setPlayheadAnimationFrame] = useState(null);
  const [lastThumbnailPosition, setLastThumbnailPosition] = useState(null); // Last thumbnail generation position
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false); // Thumbnail generation status
  const [lastFrameExtractionTime, setLastFrameExtractionTime] = useState(0); // Last frame extraction time for debouncing
  const [isTrimming, setIsTrimming] = useState(false); // Track if we're trimming a clip
  const [trimHandle, setTrimHandle] = useState(null); // Track which handle is being trimmed ('start' or 'end')
  const [trimmingClip, setTrimmingClip] = useState(null); // Track which clip is being trimmed
  const [isMagneticDeleteActive, setIsMagneticDeleteActive] = useState(false); // Track if we're in magnetic delete mode
  
  // Cache for pre-extraction timing
  const preExtractionCache = useRef(new Map());

  // Helper function to get or create static clip data (lazy loading)
  const getOrCreateStaticClipData = (character, filename, duration) => {
    const key = `${character}/${filename}`;
    
    // Return existing static data if it exists
    if (staticClipData.has(key)) {
      return staticClipData.get(key);
    }
    
    // Create new static clip data only when clip is added to timeline
    const staticData = {
      character,
      filename,
      duration,
      originalStartFrames: 0,
      originalEndFrames: Math.floor(duration * 60), // Convert seconds to frames at 60fps
      originalDurationFrames: Math.floor(duration * 60)
    };
    
    // Store the static data for future timeline instances
    setStaticClipData(prev => new Map(prev).set(key, staticData));
    return staticData;
  };

  // Helper function to get static clip data (returns null if not created yet)
  const getStaticClipData = (character, filename) => {
    const key = `${character}/${filename}`;
    return staticClipData.get(key) || null;
  };

  // Notify parent component when timeline clips change
  useEffect(() => {
    if (onTimelineClipsChange && typeof onTimelineClipsChange === 'function') {
      onTimelineClipsChange(timelineClips);
    }
  }, [timelineClips, onTimelineClipsChange]);

  // Notify parent component when playhead position changes
  useEffect(() => {
    if (onPlayheadChange && typeof onPlayheadChange === 'function') {
      onPlayheadChange(playheadPosition);
    }
    
    // Also dispatch event for TimelinePreview to listen to
    const event = new CustomEvent('playheadChange', {
      detail: { 
        playheadPosition,
        isManualChange: isManualPlayheadChange
      }
    });
    window.dispatchEvent(event);
    
    // Reset manual change flag after dispatching
    if (isManualPlayheadChange) {
      setIsManualPlayheadChange(false);
    }
  }, [playheadPosition, onPlayheadChange, isManualPlayheadChange]);

  // Listen for showFrame events from TimelinePreview (during playback)
  useEffect(() => {
    const handleShowFrame = (event) => {
      const { timelinePosition, isDragging } = event.detail;
      
      // Only update playhead if not manually dragging
      if (timelinePosition !== undefined && !isDragging) {
        // Update playhead position from showFrame event (for smooth visual feedback)
        setPlayheadPosition(timelinePosition);
        setSmoothPlayheadPosition(timelinePosition);
      }
    };
    
    window.addEventListener('showFrame', handleShowFrame);
    return () => { window.removeEventListener('showFrame', handleShowFrame); };
  }, []);

  // Listen for playheadChange events from TimelinePreview (during playback)
  useEffect(() => {
    const handlePlayheadChange = (event) => {
      const { playheadPosition } = event.detail;
      
    // Update playhead position
    setPlayheadPosition(playheadPosition);
    setSmoothPlayheadPosition(playheadPosition);
    
    // Only extract frame when there's a meaningful change (at least 1 frame difference)
    const frameThreshold = 1;
    const shouldExtract = !window.lastPlayheadExtractedFrame || 
      Math.abs(playheadPosition - window.lastPlayheadExtractedFrame) >= frameThreshold;
    
    if (shouldExtract) {
    // Automatically extract frame when playhead moves during playback
    // This ensures frame preview works naturally with playback
    extractSingleFrame(playheadPosition);
      window.lastPlayheadExtractedFrame = playheadPosition;
    }
    };
    
    window.addEventListener('playheadChange', handlePlayheadChange);
    return () => { window.removeEventListener('playheadChange', handlePlayheadChange); };
  }, [timelineClips]);

  // Listen for playback control events from TimelinePreview
  useEffect(() => {
    const handleTimelineStartPlayback = (event) => {
      const { startPosition, playbackSpeed = 1 } = event.detail;
      
      
      // Set the playback speed for the animation
      window.playbackSpeed = playbackSpeed;
      
      // Dispatch event to parent component to set isPlaying to true
      const playEvent = new CustomEvent('timelineRequestPlay', {
        detail: { startPosition }
      });
      window.dispatchEvent(playEvent);
      
      // Update playhead position
      if (onPlayheadChange) {
        onPlayheadChange(startPosition);
      }
    };
    
    const handleTimelineStopPlayback = () => {
      
      // Dispatch event to parent component to set isPlaying to false
      const stopEvent = new CustomEvent('timelineRequestStop');
      window.dispatchEvent(stopEvent);
    };
    
    window.addEventListener('timelineStartPlayback', handleTimelineStartPlayback);
    window.addEventListener('timelineStopPlayback', handleTimelineStopPlayback);
    
    return () => {
      window.removeEventListener('timelineStartPlayback', handleTimelineStartPlayback);
      window.removeEventListener('timelineStopPlayback', handleTimelineStopPlayback);
    };
  }, [onPlayheadChange]);
  
  // Clip-based thumbnail generation - Pre-render thumbnails tied to specific clips
  const generateClipThumbnails = async (character, filename, startFrame, endFrame, clipId) => {
    try {
      const response = await fetch('http://localhost:5000/api/clip-thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          character,
          filename,
          startFrame,
          endFrame,
          clipId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Thumbnail generation started successfully
      } else {
        console.error('❌ Clip thumbnail generation failed:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Clip thumbnail generation error:', error);
    }
  };
  const [smoothPlayheadPosition, setSmoothPlayheadPosition] = useState(0); // Smooth visual position
  const [showDebugPanel, setShowDebugPanel] = useState(false); // Debug panel visibility
  // No snapshot needed - use live magnetic points data
  const magneticPointsRef = useRef(new Map()); // Ref to track current magnetic points for event handlers
  const lastLogRef = useRef({}); // Track last logged messages to prevent duplicates
  
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

  // Function to get the actual timeline width (device-independent)
  const getActualTimelineWidth = () => {
    const timelineElement = document.querySelector('.timeline-content');
    if (timelineElement) {
      const timelineRect = timelineElement.getBoundingClientRect();
      return timelineRect.width;
    }
    return TIMELINE_WIDTH_PIXELS; // Fallback to hardcoded value
  };

  const tools = [
    { id: 'cursor', icon: '↖', label: 'Cursor', active: true },
    { id: 'cut', icon: '✂', label: 'Cut', active: false },
    { id: 'zoom', icon: '🔍', label: 'Zoom', active: false },
    { id: 'magnetic', icon: '🧲', label: 'Magnetic Debug', active: showMagneticDebug, onClick: () => setShowMagneticDebug(!showMagneticDebug) },
    { id: 'debug', icon: '🐛', label: 'Play Debug', active: showDebugPanel, onClick: () => setShowDebugPanel(!showDebugPanel) }
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
    // Don't prevent default for right-click context menu
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
    // Only prevent default for left clicks, allow right clicks
    if (e.button === 0) {
      e.preventDefault();
    }
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    
    // Trigger frame generation when playhead drag starts
    setTimeout(() => {
      extractSingleFrame(playheadPosition);
    }, 50);
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
    
    // Don't update playhead if clicking on timeline clips
    if (e.target.closest('[data-clip-id]')) {
      return;
    }
    
    // Only prevent default for left clicks, allow right clicks for context menu
    if (e.button === 0) { // Left mouse button
      e.preventDefault(); // Prevent default selection behavior
    }
    
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
      const framePosition = pixelsToFramesSmooth(relativeX); // Use smooth conversion for playhead
      setIsManualPlayheadChange(true); // Mark as manual change
      setPlayheadPosition(framePosition);
      setSmoothPlayheadPosition(framePosition); // Update smooth position too
      
      // Trigger frame generation for the new playhead position
      setTimeout(() => {
        extractSingleFrame(framePosition);
      }, 50);
      
      // Start dragging mode so the playhead follows the mouse
      setIsDraggingPlayhead(true);
    }
  };

  const handleTimelineClick = (e) => {
    // Only prevent default for left clicks, allow right clicks for context menu
    if (e.button === 0) { // Left mouse button
      e.preventDefault(); // Prevent default behavior, don't start dragging on click
      
      // If currently playing, stop when clicking timeline
      if (isPlaying && onTimelineClick) {
        onTimelineClick();
      }
    }
    
    // Trigger frame generation for timeline clicks
    setTimeout(() => {
      extractSingleFrame(playheadPosition);
    }, 50);
  };

  const handleMouseMove = (e) => {
    // Update drag position for timeline clips
    if (isDraggingClip) {
      setDragPosition({ x: e.clientX, y: e.clientY });
      
      // Update drag preview position with magnetism (same as cliplist)
      const timelineContent = document.querySelector('.timeline-content');
      if (timelineContent && dragPreview) {
        const timelineRect = timelineContent.getBoundingClientRect();
        const mouseX = e.clientX - timelineRect.left;
        const mouseY = e.clientY - timelineRect.top;
        const trackContentStart = 76;
        const relativeX = mouseX - trackContentStart;
        
        // Calculate which track the mouse is over
        let targetTrack = 3; // Default to track 3 (highest)
        if (mouseY >= 100 && mouseY < 150) {
          targetTrack = 3; // Top track
        } else if (mouseY >= 150 && mouseY < 200) {
          targetTrack = 2; // Middle track
        } else if (mouseY >= 200 && mouseY < 250) {
          targetTrack = 1; // Bottom track
        } else if (mouseY < 100) {
          targetTrack = 3; // Above timeline area
        } else {
          targetTrack = 1; // Below timeline area
        }
        
        if (relativeX >= 0 && mouseY >= 60) {
          // Calculate new position with magnetism
          const durationInFrames = dragPreview.endFrames - dragPreview.startFrames;
          const positionFrames = pixelsToFrames(relativeX);
          const initialEndFrames = positionFrames + durationInFrames;
          
          // Apply magnetism
          const snappedPosition = applyDraggedClipMagnetism(positionFrames, initialEndFrames);
          const constrainedPosition = applyTimelineBoundaries(snappedPosition.startFrames, snappedPosition.endFrames);
          
          if (constrainedPosition) {
            const startPixel = framesToPixels(constrainedPosition.startFrames);
            const endPixel = framesToPixels(constrainedPosition.endFrames);
            const widthPixel = endPixel - startPixel;
            
            // Update drag preview with new position
            setDragPreview(prev => ({
              ...prev,
              track: targetTrack,
              startPixel: startPixel,
              endPixel: endPixel,
              widthPixel: widthPixel
            }));
            
            // Update dragged clip magnetic points
            updateDraggedClipMagneticPoints({
              ...dragPreview,
              track: targetTrack,
              startPixel: startPixel,
              endPixel: endPixel,
              widthPixel: widthPixel
            }, null);
          }
        }
      }
    }
    // ONLY update playhead if we're actually dragging the playhead AND not dragging clips
    else if (isDraggingPlayhead && !isDraggingClip) {
      // Only prevent default for left clicks, allow right clicks for context menu
      if (e.button === 0 || e.button === undefined) { // Left mouse button or undefined (mousemove)
        e.preventDefault(); // Prevent default selection behavior during dragging
      }
      
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
        setIsManualPlayheadChange(true); // Mark as manual change
        setPlayheadPosition(0);
        setSmoothPlayheadPosition(0);
        
        // Trigger frame generation for the new playhead position
        setTimeout(() => {
          extractSingleFrame(0);
        }, 50);
      } else if (relativeX > actualMaxPosition) {
        // Mouse is to the right of the timeline - set playhead to maximum time (10:00)
        const maxFramePosition = pixelsToFrames(actualMaxPosition);
        setIsManualPlayheadChange(true); // Mark as manual change
        setPlayheadPosition(maxFramePosition);
        setSmoothPlayheadPosition(maxFramePosition);
        
        // Trigger frame generation for the new playhead position
        setTimeout(() => {
          extractSingleFrame(maxFramePosition);
        }, 50);
      } else {
        // Mouse is within bounds - follow the mouse (convert to frames)
        const framePosition = pixelsToFramesSmooth(relativeX); // Use smooth conversion for playhead
        setIsManualPlayheadChange(true); // Mark as manual change
        setPlayheadPosition(framePosition);
        setSmoothPlayheadPosition(framePosition); // Update smooth position too
        
        // Trigger frame generation for the new playhead position
        setTimeout(() => {
          extractSingleFrame(framePosition);
        }, 50);
      }
    }
  };

  const handleMouseUp = () => {
    // Handle timeline clip drop
    if (isDraggingClip && dragPreview) {
      // Find the original clip to calculate drag offset
      const originalClip = timelineClips.find(clip => clip.id === dragPreview.id);
      if (originalClip) {
        // Calculate the drag offset from visual start position
        const currentVisualStart = originalClip.startFrames;
        const newVisualStart = pixelsToFrames(dragPreview.startPixel);
        const dragOffsetFrames = newVisualStart - currentVisualStart;
        
        // Update the existing clip using proper drag offset logic
        setTimelineClips(prev => prev.map(clip => {
          if (clip.id === dragPreview.id) {
            // Get current values
            const currentOriginalStart = clip.originalStart ?? (clip.instanceStartFrames ?? clip.startFrames);
            const currentOriginalEnd = clip.originalEnd ?? (clip.instanceEndFrames ?? clip.endFrames);
            const leftCropFrames = clip.leftCropFrames ?? 0;
            const rightCropFrames = clip.rightCropFrames ?? 0;
            
            // Apply drag offset to original positions
            const newOriginalStart = currentOriginalStart + dragOffsetFrames;
            const newOriginalEnd = currentOriginalEnd + dragOffsetFrames;
            
            // Calculate visual positions based on original positions + crops
            const visualStartFrames = newOriginalStart + leftCropFrames;
            const visualEndFrames = newOriginalEnd - rightCropFrames;
            const visualWidthFrames = visualEndFrames - visualStartFrames;
            
            return {
              ...clip,
              track: dragPreview.track,
              
              // Instance data (actual clip boundaries - same as original positions)
              instanceStartFrames: newOriginalStart,
              instanceEndFrames: newOriginalEnd,
              instanceStartPixel: framesToPixels(newOriginalStart),
              instanceEndPixel: framesToPixels(newOriginalEnd),
              instanceWidthPixel: framesToPixels(newOriginalEnd) - framesToPixels(newOriginalStart),
              
              // Visual positions (what user sees - original + crops)
              startFrames: visualStartFrames,
              endFrames: visualEndFrames,
              startPixel: framesToPixels(visualStartFrames),
              endPixel: framesToPixels(visualEndFrames),
              widthPixel: framesToPixels(visualWidthFrames),
              
              // Update time
              startTime: visualStartFrames / 60,
              
              // Preserve crop offsets when moving clips
              leftCropFrames: leftCropFrames,
              rightCropFrames: rightCropFrames,
              
              // Update original position references with drag offset
              originalStart: newOriginalStart,
              originalEnd: newOriginalEnd,
              
              // Store drag offset for debug
              lastDragOffset: dragOffsetFrames
            };
          }
          return clip;
        }));
      }
      
      // Clear drag state
      setIsDraggingClip(false);
      setDragPreview(null);
      setDraggedClipActualPosition(null);
      updateDraggedClipMagneticPoints(null);
      
      // Trigger frame generation after clip movement
      setTimeout(() => {
        extractSingleFrame(playheadPosition);
      }, 50);
    }
    // Log playhead position when playhead dragging ends (not during clip dragging)
    else if (isDraggingPlayhead && !isDraggingClip) {
      // No console logging for playhead drag end
      // Update playhead magnetic point with logging when drag ends
      updatePlayheadMagneticPoint(playheadPosition, true);
      
      // Trigger frame generation when playhead drag ends
      setTimeout(() => {
        extractSingleFrame(playheadPosition);
      }, 50);
    }
    setIsDraggingPlayhead(false);
  };

  // Handle drag over timeline
  const handleTimelineDragOver = (e) => {
    // Only prevent default for drag operations, allow right clicks
    if (e.type === 'dragover') {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle drop on timeline
  const handleTimelineDrop = async (e) => {
    // Only prevent default for drop operations, allow right clicks
    if (e.type === 'drop') {
      e.preventDefault();
    }
    
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
        const snappedPosition = applyDraggedClipMagnetism(startFrames, startFrames + durationInFrames);
        const snappedStartFrames = snappedPosition.startFrames;
        const snappedEndFrames = snappedPosition.endFrames;
        
        // Apply timeline boundary constraints
        const constrainedPosition = applyTimelineBoundaries(snappedStartFrames, snappedEndFrames);
        
        if (constrainedPosition) {
          // Convert to pixels for display
          const startPixel = framesToPixels(constrainedPosition.startFrames);
          const endPixel = framesToPixels(constrainedPosition.endFrames);
          const widthPixel = endPixel - startPixel;
          
          // Convert pixel position to time
          const startTime = pixelToTime(startPixel);
          
          // Create clip with default frame rate, will be updated async
          // Get or create static clip data (lazy loading)
          const staticData = getOrCreateStaticClipData(clipData.character, clipData.filename, durationInSeconds);
          
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
            durationFrames: durationInFrames,
            frameRate: 24, // Default frame rate, will be updated async
            // Reference to static clip data
            staticClipKey: `${clipData.character}/${clipData.filename}`,
            // Instance-specific data (these can change during trimming)
            instanceStartFrames: constrainedPosition.startFrames,
            instanceEndFrames: constrainedPosition.endFrames,
            instanceStartPixel: startPixel,
            instanceEndPixel: endPixel,
            instanceWidthPixel: widthPixel,
            // Crop offsets for frame calculation
            leftCropFrames: 0,  // Frames cropped from the left (start later)
            rightCropFrames: 0,  // Frames cropped from the right (end earlier)
            // Original positions for crop calculations
            originalStart: constrainedPosition.startFrames,  // Original timeline start position
            originalEnd: constrainedPosition.endFrames       // Original timeline end position
          };
          
          // Premiere Pro style: No bulk thumbnail generation - frames will be generated on-demand
          
          // Get actual video frame rate and update clip
          getVideoFrameRate(clipData.character, clipData.filename).then(frameRate => {
            setTimelineClips(prev => prev.map(c => 
              c.id === newClip.id ? { ...c, frameRate } : c
            ));
          });
          
          setTimelineClips(prev => {
            const updatedClips = [...prev, newClip];
            // Update magnetic points whenever clips change
            updateMagneticPointsFromClips(updatedClips);
            // No snapshot needed - magnetism uses live data
            return updatedClips;
          });
        }
      }
    } catch (error) {
      console.error('Error handling clip drop:', error);
    } finally {
      // Always reset drag state after drop attempt
      setIsDraggingClip(false);
      setDragPreview(null);
      setDraggedClipActualPosition(null);
      
      // Trigger frame generation after drop attempt
      setTimeout(() => {
        extractSingleFrame(playheadPosition);
      }, 50);
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
    // Use the EXACT same calculation as time markers: (time / 10) * actualMaxPosition
    const timelineElement = document.querySelector('.timeline-content');
    const trackContentStart = 76; // Track title width
    const bufferZone = 38; // Buffer zone width
    const timelineRect = timelineElement?.getBoundingClientRect();
    const actualMaxPosition = timelineRect ? timelineRect.width - trackContentStart - bufferZone : getActualTimelineWidth();
    
    // Convert frames to time in minutes, then use same formula as time markers
    const timeInMinutes = frames / (TIMELINE_TOTAL_FRAMES / 10); // Convert frames to minutes (0-10)
    return (timeInMinutes / 10) * actualMaxPosition; // Same as time markers: (time / 10) * actualMaxPosition
  };

  // INPUT CONVERSION: Pixels to frames (ONLY for mouse input) - FRAME GRID ALIGNED
  const pixelsToFrames = (pixels) => {
    // Use the same width calculation as time markers (usable timeline width)
    const timelineElement = document.querySelector('.timeline-content');
    const trackContentStart = 76; // Track title width
    const bufferZone = 38; // Buffer zone width
    const timelineRect = timelineElement?.getBoundingClientRect();
    const actualWidth = timelineRect ? timelineRect.width - trackContentStart - bufferZone : getActualTimelineWidth();
    
    // Calculate frame position and snap to frame grid
    const framePosition = (pixels / actualWidth) * TIMELINE_TOTAL_FRAMES;
    return Math.round(framePosition); // Always snap to exact frame grid
  };

  // SMOOTH CONVERSION: Pixels to frames (for smooth playhead movement) - FRAME GRID ALIGNED
  const pixelsToFramesSmooth = (pixels) => {
    // Use the same width calculation as time markers (usable timeline width)
    const timelineElement = document.querySelector('.timeline-content');
    const trackContentStart = 76; // Track title width
    const bufferZone = 38; // Buffer zone width
    const timelineRect = timelineElement?.getBoundingClientRect();
    const actualWidth = timelineRect ? timelineRect.width - trackContentStart - bufferZone : getActualTimelineWidth();
    
    // Calculate frame position and snap to frame grid (even for smooth movement)
    const framePosition = (pixels / actualWidth) * TIMELINE_TOTAL_FRAMES;
    return Math.round(framePosition); // Always snap to exact frame grid
  };
  
  // Convert frames to time (seconds)
  const framesToTime = (frames) => {
    return frames / FRAMES_PER_SECOND;
  };
  
  // Convert time (seconds) to frames - ensure exact integer frames
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

  // Get video frame rate from backend
  const getVideoFrameRate = async (character, filename) => {
    try {
      const response = await fetch(`http://localhost:5000/api/video-info/${character}/${filename}`);
      if (response.ok) {
        const data = await response.json();
        return data.frameRate || 24; // Default to 24fps if not found
      }
    } catch (error) {
      console.error('Error getting video frame rate:', error);
    }
    return 24; // Default fallback
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
        // No console logging for snap detection
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
      // IMMUTABLE: Only add new points, never remove existing ones
      const newMap = new Map(prev); // PRESERVE ALL EXISTING POINTS
      
      // Convert pixel offset to frames
      const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
      
      // Purple points are handled by updatePlayheadMagneticPoint - don't create them here
      
      // IMMUTABLE: Add timeline boundaries (ORANGE) - use same logic as time markers
      // Calculate the same way as time markers: (time / 10) * actualMaxPosition
      const timelineElement = document.querySelector('.timeline-content');
      const trackContentStart = 76; // Track title width
      const bufferZone = 38; // Buffer zone width
      const timelineRect = timelineElement?.getBoundingClientRect();
      const actualMaxPosition = timelineRect ? timelineRect.width - trackContentStart - bufferZone : getActualTimelineWidth();
      
      // Timeline start (0 minutes) - same as time marker at 0, but with magnetic offset
      const timelineStartKey = `${magneticOffsetFrames}_timeline_${MAGNETIC_TYPES.BORDER}`;
      if (!newMap.has(timelineStartKey)) {
        newMap.set(timelineStartKey, { 
          frame: magneticOffsetFrames, // 0 minutes + 95px offset
          track: 'timeline', 
          type: MAGNETIC_TYPES.BORDER,
          color: MAGNETIC_COLORS[MAGNETIC_TYPES.BORDER]
        });
      }
      
      // Timeline end (10 minutes) - same as time marker at 10, but with magnetic offset
      const timelineEndKey = `${TIMELINE_TOTAL_FRAMES + magneticOffsetFrames}_timeline_${MAGNETIC_TYPES.BORDER}`;
      if (!newMap.has(timelineEndKey)) {
        newMap.set(timelineEndKey, { 
          frame: TIMELINE_TOTAL_FRAMES + magneticOffsetFrames, // 10 minutes + 95px offset
          track: 'timeline',
          type: MAGNETIC_TYPES.BORDER,
          color: MAGNETIC_COLORS[MAGNETIC_TYPES.BORDER]
        });
      }
      
      // Add all clip start and end points (RED) with offset
      // IMMUTABLE: Add all clip start and end points (RED) with offset - never remove existing ones
      clips.forEach(clip => {
        if (clip.startFrames !== undefined) {
          const adjustedStart = clip.startFrames + magneticOffsetFrames;
          const startKey = `${adjustedStart}_${clip.track}_${MAGNETIC_TYPES.CLIP_START}_${clip.id}`;
          // Only add if it doesn't already exist
          if (!newMap.has(startKey)) {
            newMap.set(startKey, { 
              frame: adjustedStart, 
              track: clip.track, 
              type: MAGNETIC_TYPES.CLIP_START,
              color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_START],
              clipId: clip.id
            });
          }
        }
        
        if (clip.endFrames !== undefined) {
          const adjustedEnd = clip.endFrames + magneticOffsetFrames;
          const endKey = `${adjustedEnd}_${clip.track}_${MAGNETIC_TYPES.CLIP_END}_${clip.id}`;
          // Only add if it doesn't already exist
          if (!newMap.has(endKey)) {
            newMap.set(endKey, { 
              frame: adjustedEnd, 
              track: clip.track, 
              type: MAGNETIC_TYPES.CLIP_END,
              color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_END],
              clipId: clip.id
            });
          }
        }
      });
      
      // Debug: Log magnetic points when debug is enabled
      if (showMagneticDebug) {
        // No console logging for magnetic points update
      }
      
      // No console logging for magnetic points
      
      return newMap;
    });
  };

  // Remove magnetic points for a specific clip by ID
  const removeMagneticPointsForClip = (clipId) => {
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      
      // Remove magnetic points that contain this clip ID
      for (const [key, value] of newMap.entries()) {
        if (value.clipId === clipId) {
          newMap.delete(key);
        }
      }
      
      return newMap;
    });
  };

  // Add magnetic points for a specific clip by ID
  const addMagneticPointsForClip = (clipId, startFrames, endFrames, track) => {
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
      
      const adjustedStart = startFrames + magneticOffsetFrames;
      const adjustedEnd = endFrames + magneticOffsetFrames;
      
      // Add start point with clip ID
      const startKey = `${adjustedStart}_${track}_${MAGNETIC_TYPES.CLIP_START}_${clipId}`;
      newMap.set(startKey, { 
        frame: adjustedStart, 
        track: track, 
        type: MAGNETIC_TYPES.CLIP_START,
        color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_START],
        clipId: clipId
      });
      
      // Add end point with clip ID
      const endKey = `${adjustedEnd}_${track}_${MAGNETIC_TYPES.CLIP_END}_${clipId}`;
      newMap.set(endKey, { 
        frame: adjustedEnd, 
        track: track, 
        type: MAGNETIC_TYPES.CLIP_END,
        color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_END],
        clipId: clipId
      });
      
      return newMap;
    });
  };

  // Update magnetic points for a specific trimmed clip (removes old points and adds new ones)
  const updateMagneticPointsForTrimmedClip = (clipId, newStartFrames, newEndFrames, track) => {
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
      
      // Remove ALL clip magnetic points for this track (both start and end)
      for (const [key, value] of newMap.entries()) {
        if (value.track === track && 
            (value.type === MAGNETIC_TYPES.CLIP_START || value.type === MAGNETIC_TYPES.CLIP_END)) {
          newMap.delete(key);
        }
      }
      
      // Recalculate magnetic points for all clips on this track
      const trackClips = timelineClips.filter(clip => clip.track === track);
      trackClips.forEach(clip => {
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
      
      return newMap;
    });
  };

  // Update magnetic points for a specific clip during trimming (more targeted approach)
  const updateMagneticPointsForSingleClip = (clipId, newStartFrames, newEndFrames, track) => {
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
      
      // Find and remove only the magnetic points for this specific clip
      // We'll identify them by looking for points that match the current clip's position
      const currentClip = timelineClips.find(c => c.id === clipId);
      if (currentClip) {
        const oldAdjustedStart = currentClip.startFrames + magneticOffsetFrames;
        const oldAdjustedEnd = currentClip.endFrames + magneticOffsetFrames;
        
        // Remove old points for this specific clip
        const oldStartKey = `${oldAdjustedStart}_${track}_${MAGNETIC_TYPES.CLIP_START}`;
        const oldEndKey = `${oldAdjustedEnd}_${track}_${MAGNETIC_TYPES.CLIP_END}`;
        newMap.delete(oldStartKey);
        newMap.delete(oldEndKey);
      }
      
      // Add new magnetic points for the trimmed clip
      const adjustedStart = newStartFrames + magneticOffsetFrames;
      const adjustedEnd = newEndFrames + magneticOffsetFrames;
      
      const startKey = `${adjustedStart}_${track}_${MAGNETIC_TYPES.CLIP_START}`;
      newMap.set(startKey, { 
        frame: adjustedStart, 
        track: track, 
        type: MAGNETIC_TYPES.CLIP_START,
        color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_START]
      });
      
      const endKey = `${adjustedEnd}_${track}_${MAGNETIC_TYPES.CLIP_END}`;
      newMap.set(endKey, { 
        frame: adjustedEnd, 
        track: track, 
        type: MAGNETIC_TYPES.CLIP_END,
        color: MAGNETIC_COLORS[MAGNETIC_TYPES.CLIP_END]
      });
      
      return newMap;
    });
  };

  // No snapshot needed - use live magnetic points data directly

  // Helper function to list all magnetic points (only show when 3+ points)
  const listAllMagneticPoints = (points, label = 'MAGNETIC POINTS') => {
    const pointsArray = Array.from(points.values());
    
    // Magnetic points generated successfully
  };

  const updatePlayheadMagneticPoint = (newPlayheadPosition, logUpdate = false) => {
    // Only log when explicitly requested (like when drag ends)
    
    // Prevent spam by only updating if position changed significantly (every 100 frames)
    const roundedPosition = Math.floor(newPlayheadPosition / 100) * 100;
    const lastPosition = lastLogRef.current.lastPlayheadPosition || 0;
    if (Math.abs(roundedPosition - lastPosition) < 100 && !logUpdate) {
      return; // Skip update if position hasn't changed significantly
    }
    lastLogRef.current.lastPlayheadPosition = roundedPosition;
    
    setMagneticPoints(prev => {
      const newMap = new Map(prev);
      
      // IMMUTABLE: Remove only old playhead positions, keep all other points
      // Keep only the most recent playhead position
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
        // Only log when explicitly requested (like when drag ends)
        newMap.set(newPlayheadKey, {
          frame: adjustedPlayhead, 
          track: 'playhead', 
          type: MAGNETIC_TYPES.PLAYHEAD,
          color: MAGNETIC_COLORS[MAGNETIC_TYPES.PLAYHEAD]
        });
      }
      
      // List all points after update if logging is enabled
      if (logUpdate) {
        // No console logging for playhead update
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
    const pointsToUse = magneticPoints; // Always use live data
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

  // Magnetic function for cropping - snap crop position to nearby magnetic points (excluding playhead)
  const applyCropMagnetism = (cropPositionFrames, snapThresholdPixels = null) => {
    // Use the global threshold if not specified, otherwise convert pixels to frames
    const frameSnapThreshold = snapThresholdPixels ? pixelsToFrames(snapThresholdPixels) : MAGNETIC_SNAP_THRESHOLD_FRAMES;
    
    // Apply the magnetic offset to the crop position to match the offset magnetic points
    const magneticOffsetFrames = pixelsToFrames(MAGNETIC_OFFSET_PIXELS);
    const adjustedCropPosition = cropPositionFrames + magneticOffsetFrames;
    
    // Find the closest magnetic point to the adjusted crop position
    let closestPoint = null;
    let minDistance = Infinity;
    
    // USE LIVE MAGNETIC POINTS (no snapshot needed)
    const debugPoints = Array.from(magneticPointsRef.current.values());
    
    debugPoints.forEach((point) => {
      // Skip dragged clip points and playhead points
      if (point.type === MAGNETIC_TYPES.DRAGGED_CLIP || point.type === MAGNETIC_TYPES.PLAYHEAD) {
        return;
      }
      
      const { frame } = point;
      
      // Check distance to adjusted crop position
      const distance = Math.abs(adjustedCropPosition - frame);
      if (distance < frameSnapThreshold && distance < minDistance) {
        minDistance = distance;
        closestPoint = frame;
      }
    });
    
    // If we found a magnetic point, subtract the offset to get the actual crop position
    const result = closestPoint !== null ? closestPoint - magneticOffsetFrames : cropPositionFrames;
    
    // Only log when snapping actually occurs
    if (result !== cropPositionFrames) {
      // Crop snapped to magnetic point
    }
    
    // Return the snapped position or original if no snap found
    return result;
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
    
    // USE LIVE MAGNETIC POINTS (no snapshot needed)
    const debugPoints = Array.from(magneticPointsRef.current.values());
    
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
        // No console logging for start snap
      }
      
      // Check distance to end position (using adjusted positions)
      const endDistance = Math.abs(adjustedEndFrames - frame);
      if (endDistance < frameSnapThreshold && endDistance < minDistance) {
        minDistance = endDistance;
        closestPoint = frame;
        snapToStart = false;
        // No console logging for end snap
      }
    });
    
    // If we found a close point, snap to it
    if (closestPoint !== null) {
      // No console logging for snapping
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

  // Format time directly from frames (60fps) - display minutes:seconds.frames
  const formatTimeFromFrames = (frames) => {
    const totalSeconds = Math.floor(frames / FRAMES_PER_SECOND);
    const remainingFrames = Math.floor(frames) % FRAMES_PER_SECOND;
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

  // Prerender logic - calculate areas with clips for yellow lines (in frames)
  const calculatePrerenderAreas = () => {
    if (timelineClips.length === 0) return [];
    
    // Convert clips to frame ranges
    const frameRanges = timelineClips.map(clip => {
      return {
        startFrames: clip.startFrames,
        endFrames: clip.endFrames,
        track: clip.track
      };
    });
    
    // Sort by start frames
    frameRanges.sort((a, b) => a.startFrames - b.startFrames);
    
    // Merge overlapping ranges
    const mergedRanges = [];
    let currentRange = null;
    
    frameRanges.forEach(range => {
      if (!currentRange) {
        currentRange = { ...range };
      } else if (range.startFrames <= currentRange.endFrames) {
        // Overlapping or adjacent ranges - merge them
        currentRange.endFrames = Math.max(currentRange.endFrames, range.endFrames);
      } else {
        // Non-overlapping range - save current and start new
        mergedRanges.push(currentRange);
        currentRange = { ...range };
      }
    });
    
    if (currentRange) {
      mergedRanges.push(currentRange);
    }
    
    return mergedRanges;
  };

  const prerenderAreas = calculatePrerenderAreas();

  // Function to get prerender frame ranges for external use
  const getPrerenderFrameRanges = () => {
    return prerenderAreas.map(area => ({
      startFrame: area.startFrames,
      endFrame: area.endFrames,
      durationFrames: area.endFrames - area.startFrames
    }));
  };

  // Prerender system - analyze clips and generate frame composites
  const generatePrerenderFrames = async (prerenderArea) => {
    const { startFrames, endFrames } = prerenderArea;
    const durationFrames = endFrames - startFrames;
    
    // Get all clips that overlap with this prerender area
    const overlappingClips = timelineClips.filter(clip => {
      return !(clip.endFrames <= startFrames || clip.startFrames >= endFrames);
    });
    
    if (overlappingClips.length === 0) {
      return null; // No clips to prerender
    }
    
    // Sort clips by track (highest track number first for compositing)
    const sortedClips = overlappingClips.sort((a, b) => b.track - a.track);
    
    // Calculate frame ranges for each clip within the prerender area
    const clipFrameRanges = sortedClips.map(clip => {
      const clipStartInArea = Math.max(clip.startFrames, startFrames);
      const clipEndInArea = Math.min(clip.endFrames, endFrames);
      const clipStartOffset = clipStartInArea - startFrames;
      const clipEndOffset = clipEndInArea - startFrames;
      
      return {
        clip,
        startFrame: clipStartInArea,
        endFrame: clipEndInArea,
        startOffset: clipStartOffset,
        endOffset: clipEndOffset,
        duration: clipEndOffset - clipStartOffset
      };
    });
    
    // Generate frame data for backend processing
    const prerenderData = {
      startFrame: startFrames,
      endFrame: endFrames,
      durationFrames: durationFrames,
      clips: clipFrameRanges.map(range => ({
        character: range.clip.character,
        filename: range.clip.filename,
        startFrame: range.startFrame,
        endFrame: range.endFrame,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        track: range.clip.track,
        duration: range.duration
      }))
    };
    
    return prerenderData;
  };

  // Process all prerender areas and generate frames
  const processPrerenderAreas = async () => {
    if (prerenderAreas.length === 0 || isDraggingClip) return;
    
    
    for (const area of prerenderAreas) {
      const prerenderData = await generatePrerenderFrames(area);
      if (prerenderData) {
        
        // Send to backend for frame extraction and compositing
        try {
          const response = await fetch('http://localhost:5000/api/prerender', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(prerenderData)
          });
          
          if (response.ok) {
            const result = await response.json();
            
            // Dispatch prerender completion event
            const event = new CustomEvent('prerenderComplete', {
              detail: {
                prerenderId: result.prerenderId,
                outputPath: result.outputPath,
                frameCount: result.frameCount,
                streamingMode: result.streamingMode
              }
            });
            window.dispatchEvent(event);
          } else {
            console.error('Prerender failed:', response.statusText);
          }
        } catch (error) {
          console.error('Prerender error:', error);
        }
      }
    }
  };

  // 60-fps playhead animation system with frame-accurate backend positioning
  const startPlayheadAnimation = () => {
    if (playheadAnimationFrame) return; // Already animating
    
    const startTime = Date.now();
    const startFrame = playheadPosition;
    const targetFPS = 60; // 60 frames per second for smooth visual movement
    const frameInterval = 1000 / targetFPS; // ~16.67ms per frame
    
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      
      // Get playback speed from TimelinePreview (default to 1x)
      const playbackSpeed = window.playbackSpeed || 1;
      
      // Calculate frame-accurate position with speed multiplier
      const framesElapsed = Math.floor((elapsed / frameInterval) * playbackSpeed);
      const newFramePosition = startFrame + framesElapsed;
      
      // Check if we've reached the end of timeline (10 minutes = 36,000 frames)
      if (newFramePosition >= TIMELINE_TOTAL_FRAMES) {
        setPlayheadPosition(TIMELINE_TOTAL_FRAMES);
        setSmoothPlayheadPosition(TIMELINE_TOTAL_FRAMES);
        stopPlayheadAnimation();
        return;
      }
      
      // Update frame-based position (discrete - backend priority)
      setPlayheadPosition(newFramePosition);
      
      // Calculate smooth visual position for 60fps movement with speed
      const smoothFrames = startFrame + ((elapsed / frameInterval) * playbackSpeed);
      setSmoothPlayheadPosition(Math.min(smoothFrames, TIMELINE_TOTAL_FRAMES));
      
      // Continue animation at 60fps
      const frameId = requestAnimationFrame(animate);
      setPlayheadAnimationFrame(frameId);
    };
    
    animate();
  };

  const stopPlayheadAnimation = () => {
    if (playheadAnimationFrame) {
      cancelAnimationFrame(playheadAnimationFrame);
      setPlayheadAnimationFrame(null);
    }
  };

  // Start/stop animation based on isPlaying state
  useEffect(() => {
    if (isPlaying) {
      startPlayheadAnimation();
    } else {
      stopPlayheadAnimation();
    }
    
    return () => {
      stopPlayheadAnimation();
    };
  }, [isPlaying]);

  // Extract frame when playhead moves (but only when clips are placed, not during drag operations)
  // During playback, reduce frame extraction frequency to prevent conflicts with video seeking
  useEffect(() => {
    if (!isDraggingClip && !isDraggingPlayhead && timelineClips.length > 0) {
      // During playback, only extract frames every few positions to reduce jitter
      if (isPlaying) {
        // Only extract frame every 4 frames during playback to reduce conflicts
        if (Math.floor(smoothPlayheadPosition) % 4 === 0) {
      extractSingleFrame(smoothPlayheadPosition);
    }
      } else {
        // Only extract frame when there's a meaningful change (at least 1 frame difference)
        // This prevents continuous extraction when playhead position changes slightly due to floating point precision
        const frameThreshold = 1; // Only extract if playhead moved at least 1 frame
        const shouldExtract = !window.lastExtractedFrame || 
          Math.abs(smoothPlayheadPosition - window.lastExtractedFrame) >= frameThreshold;
        
        if (shouldExtract) {
          extractSingleFrame(smoothPlayheadPosition);
          window.lastExtractedFrame = smoothPlayheadPosition;
        }
      }
    }
  }, [smoothPlayheadPosition, isDraggingClip, isDraggingPlayhead, timelineClips.length, isPlaying]);

  // Automatic thumbnail generation during playhead dragging
  useEffect(() => {
    if (isDraggingPlayhead && timelineClips.length > 0) {
      // Generate thumbnails as user drags playhead through clips
      // Find all clips at this position and select the one on the highest track
      const overlappingClips = timelineClips.filter(clip => 
        smoothPlayheadPosition >= clip.startFrames && smoothPlayheadPosition <= clip.endFrames
      );
      const activeClip = overlappingClips.length > 0 
        ? overlappingClips.sort((a, b) => b.track - a.track)[0]
        : null;
      
      if (activeClip) {
        // Generate thumbnail based on playhead position (optimized for performance)
        const frameThreshold = 2; // Generate thumbnail every 2 frames (balanced performance)
        const shouldGenerate = !lastThumbnailPosition || 
          Math.abs(smoothPlayheadPosition - lastThumbnailPosition) >= frameThreshold;
        
        if (shouldGenerate) {
          // Generate thumbnail immediately for current playhead position (no delays)
          setIsGeneratingThumbnail(true);
          extractSingleFrame(smoothPlayheadPosition);
          setLastThumbnailPosition(smoothPlayheadPosition);
          // Reset status immediately
          setIsGeneratingThumbnail(false);
        }
      }
    }
  }, [smoothPlayheadPosition, isDraggingPlayhead, timelineClips, lastThumbnailPosition]);

  // Extract frame when playhead drag is released
  useEffect(() => {
    if (!isDraggingPlayhead && !isDraggingClip && timelineClips.length > 0) {
      // Only extract if there's a meaningful change (at least 1 frame difference)
      const frameThreshold = 1;
      const shouldExtract = !window.lastDragExtractedFrame || 
        Math.abs(smoothPlayheadPosition - window.lastDragExtractedFrame) >= frameThreshold;
      
      if (shouldExtract) {
      // Small delay to ensure playhead position is settled
      const timeoutId = setTimeout(() => {
        extractSingleFrame(smoothPlayheadPosition);
          window.lastDragExtractedFrame = smoothPlayheadPosition;
      }, 50);
      
      return () => clearTimeout(timeoutId);
      }
    }
  }, [isDraggingPlayhead, isDraggingClip, smoothPlayheadPosition, timelineClips.length]);

  // Keyboard controls - Global across entire app
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only skip if user is actively typing in a text input or textarea
      if (event.target.tagName === 'INPUT' && event.target.type !== 'range') {
        return;
      }
      if (event.target.tagName === 'TEXTAREA') {
        return;
      }
      if (event.target.contentEditable === 'true') {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          // Toggle play/pause
          if (onTimelineClick) {
            onTimelineClick();
          }
          break;
        
        case 'ArrowLeft':
          event.preventDefault();
          // Move playhead left by one frame
          {
            const newLeftPosition = Math.max(0, playheadPosition - 1);
            setPlayheadPosition(newLeftPosition);
            setIsManualPlayheadChange(true);
          }
          break;
        
        case 'ArrowRight':
          event.preventDefault();
          // Move playhead right by one frame
          {
            const newRightPosition = playheadPosition + 1;
            setPlayheadPosition(newRightPosition);
            setIsManualPlayheadChange(true);
          }
          break;
        
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [playheadPosition, onTimelineClick]);

  // Check if playhead is in a prerender area and trigger prerendering if needed
  const checkAndTriggerPrerender = (framePosition) => {
    // Don't trigger prerender during drag operations
    if (isDraggingClip) {
      return;
    }
    
    const isInPrerenderArea = prerenderAreas.some(area => 
      framePosition >= area.startFrames && framePosition <= area.endFrames
    );
    
    if (isInPrerenderArea && prerenderAreas.length > 0) {
      processPrerenderAreas();
    }
  };

  // Handle trim handle mouse down
  const handleTrimHandleMouseDown = (e, clip, handle) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsTrimming(true);
    setTrimHandle(handle);
    
    // Get the current clip data from timelineClips to ensure we have the latest state
    const currentClip = timelineClips.find(c => c.id === clip.id);
    if (!currentClip) return;
    
    // Start trim operation
    
    // Get the static clip data for constraints
    const staticData = getStaticClipData(currentClip.character, currentClip.filename);
    if (!staticData) return;
    
    // Store the current data for trimming
    // Always use current visual position (which includes crops) as the starting point
    const trimmingData = {
      ...currentClip,
      startFrames: currentClip.startFrames, // Always use current visual position
      endFrames: currentClip.endFrames,     // Always use current visual position
      originalStartFrames: staticData.originalStartFrames,
      originalEndFrames: staticData.originalEndFrames,
      // Preserve the current crop values
      leftCropFrames: currentClip.leftCropFrames ?? 0,
      rightCropFrames: currentClip.rightCropFrames ?? 0,
      // Preserve the original position references
      originalStart: currentClip.originalStart ?? (currentClip.instanceStartFrames ?? currentClip.startFrames),
      originalEnd: currentClip.originalEnd ?? (currentClip.instanceEndFrames ?? currentClip.endFrames)
    };
    setTrimmingClip(trimmingData);
    
    // Remove magnetic points for this specific clip when trimming starts
    removeMagneticPointsForClip(clip.id);
    
    // Trigger frame generation to show the current state before trimming
    setTimeout(() => {
      extractSingleFrame(playheadPosition);
    }, 50);
  };

  // Handle trim handle mouse move
  const handleTrimHandleMouseMove = (e) => {
    if (!isTrimming || !trimmingClip) return;
    
    const timelineElement = document.querySelector('.timeline-content');
    if (!timelineElement) return;
    
    const timelineRect = timelineElement.getBoundingClientRect();
    const mouseX = e.clientX - timelineRect.left;
    const trackContentStart = 76;
    const relativeX = mouseX - trackContentStart;
    
    // Convert mouse position to frames using the same logic as clip placement
    const newFramePosition = pixelsToFrames(relativeX);
    
    // Debug logging for mouse position (only when cropping)
    if (trimmingClip && trimmingClip.trimHandle) {
      // Crop drag in progress
    }
    
    
    // Get the current clip data from timelineClips to ensure we have the latest state
    const currentClip = timelineClips.find(clip => clip.id === trimmingClip.id);
    if (!currentClip) return;
    
    // Get the static clip data for constraints
    const staticData = getStaticClipData(currentClip.character, currentClip.filename);
    if (!staticData) return;
    
    // Calculate crop offsets based on how much we moved the trim handles from their current position
    const currentLeftCrop = currentClip.leftCropFrames ?? 0;
    const currentRightCrop = currentClip.rightCropFrames ?? 0;
    let leftCropFrames = currentLeftCrop;
    let rightCropFrames = currentRightCrop;
    
    // Apply magnetism to the mouse position first (for both crop calculation and visual preview)
    const snappedFramePosition = applyCropMagnetism(newFramePosition);
    
    // Debug logging for magnetic snapping
    if (Math.abs(snappedFramePosition - newFramePosition) > 1) {
      // Crop magnetic snap applied
    }
    
    if (trimHandle === 'start') {
      // For left crop, use instanceStart as the base position
      // Mouse to the left = less crop (decrop), mouse to the right = more crop
      const instanceStart = currentClip.instanceStartFrames ?? currentClip.startFrames;
      const instanceEnd = currentClip.instanceEndFrames ?? currentClip.endFrames;
      // Use the original instance duration for crop limits (before any crops)
      const originalStart = currentClip.originalStart ?? instanceStart;
      const originalEnd = currentClip.originalEnd ?? instanceEnd;
      const originalInstanceDuration = originalEnd - originalStart;
      const maxCropFrames = originalInstanceDuration - 1;
      
      // Calculate how far the snapped position is from the instance start position
      const mouseOffset = snappedFramePosition - instanceStart;
      
      // If mouse is very close to current visual position, maintain current crop
      const currentVisualStart = currentClip.startFrames;
      const mouseAtCurrentPosition = Math.abs(snappedFramePosition - currentVisualStart) < 5; // 5 frame tolerance
      
      if (mouseAtCurrentPosition) {
        // Keep current crop amount when clicking without moving
        leftCropFrames = currentLeftCrop;
      } else {
        // Direct mapping: snapped mouse offset = crop amount
        // Negative offset = decrop, positive offset = crop
        leftCropFrames = Math.max(0, Math.min(mouseOffset, maxCropFrames));
      }
    }
    
    if (trimHandle === 'end') {
      // For right crop, use instanceEnd as the base position
      // Mouse to the left = less crop (decrop), mouse to the right = more crop
      const instanceEnd = currentClip.instanceEndFrames ?? currentClip.endFrames;
      const instanceStart = currentClip.instanceStartFrames ?? currentClip.startFrames;
      // Use the original instance duration for crop limits (before any crops)
      const originalStart = currentClip.originalStart ?? instanceStart;
      const originalEnd = currentClip.originalEnd ?? instanceEnd;
      const originalInstanceDuration = originalEnd - originalStart;
      const maxCropFrames = originalInstanceDuration - 1;
      
      // Calculate how far the snapped position is from the instance end position
      const mouseOffset = snappedFramePosition - instanceEnd;
      
      // If mouse is very close to current visual position, maintain current crop
      const currentVisualEnd = currentClip.endFrames;
      const mouseAtCurrentPosition = Math.abs(snappedFramePosition - currentVisualEnd) < 5; // 5 frame tolerance
      
      if (mouseAtCurrentPosition) {
        // Keep current crop amount when clicking without moving
        rightCropFrames = currentRightCrop;
      } else {
        // Direct mapping: negative snapped mouse offset = crop amount (mouse left of original = more crop)
        // Negative offset = more crop, positive offset = less crop (decrop)
        rightCropFrames = Math.max(0, Math.min(-mouseOffset, maxCropFrames));
      }
    }
    
    // Calculate visual display properties - use snapped position but respect crop limits
    let newStartFrames = currentClip.instanceStartFrames ?? currentClip.startFrames;
    let newEndFrames = currentClip.instanceEndFrames ?? currentClip.endFrames;
    
    // Calculate preview width for magnetic delete detection
    let previewWidth = currentClip.endFrames - currentClip.startFrames;
    
    if (trimHandle === 'start') {
      // For left crop, visual position should snap to magnetic points but respect crop limits
      const instanceStart = currentClip.instanceStartFrames ?? currentClip.startFrames;
      const originalStart = currentClip.originalStart ?? instanceStart;
      const originalEnd = currentClip.originalEnd ?? (currentClip.instanceEndFrames ?? currentClip.endFrames);
      
      // Constrain snapped position to valid crop range
      const minValidPosition = originalStart; // Can't crop before original start
      const maxValidPosition = originalEnd; // Can't crop beyond original end
      const constrainedSnappedPosition = Math.max(minValidPosition, Math.min(snappedFramePosition, maxValidPosition));
      
      // Debug logging for visual preview
      if (constrainedSnappedPosition !== snappedFramePosition) {
        // Crop position constrained
      }
      
      newStartFrames = constrainedSnappedPosition;
      // For end frames, maintain right crop: instanceEnd - rightCropFrames
      const instanceEnd = currentClip.instanceEndFrames ?? currentClip.endFrames;
      newEndFrames = instanceEnd - rightCropFrames;
      
      // Calculate preview width for delete detection
      previewWidth = newEndFrames - newStartFrames;
    }
    
    if (trimHandle === 'end') {
      // For right crop, visual position should snap to magnetic points but respect crop limits
      const instanceEnd = currentClip.instanceEndFrames ?? currentClip.endFrames;
      const originalStart = currentClip.originalStart ?? (currentClip.instanceStartFrames ?? currentClip.startFrames);
      const originalEnd = currentClip.originalEnd ?? instanceEnd;
      
      // Constrain snapped position to valid crop range
      const minValidPosition = originalStart; // Can't crop before original start
      const maxValidPosition = originalEnd; // Can't crop beyond original end
      const constrainedSnappedPosition = Math.max(minValidPosition, Math.min(snappedFramePosition, maxValidPosition));
      
      // Debug logging for visual preview
      if (constrainedSnappedPosition !== snappedFramePosition) {
        // Crop position constrained
      }
      
      newEndFrames = constrainedSnappedPosition;
      // For start frames, maintain left crop: instanceStart + leftCropFrames
      const instanceStart = currentClip.instanceStartFrames ?? currentClip.startFrames;
      newStartFrames = instanceStart + leftCropFrames;
      
      // Calculate preview width for delete detection
      previewWidth = newEndFrames - newStartFrames;
    }
    
    // Magnetic delete detection - check if the clip width is getting too small
    const MAGNETIC_DELETE_THRESHOLD = 120; // frames (2 seconds at 60fps)
    const MAGNETIC_DELETE_TRIGGER = MAGNETIC_DELETE_THRESHOLD / 2; // 60 frames
    const shouldDelete = previewWidth < MAGNETIC_DELETE_TRIGGER;
    
    // Update magnetic delete state
    setIsMagneticDeleteActive(shouldDelete);
    
    // Update the trimming clip - keep the original timeline position but store crop info
    setTrimmingClip(prev => {
      const updated = {
        ...prev,
        startFrames: newStartFrames,
        endFrames: newEndFrames,
        leftCropFrames: leftCropFrames,
        rightCropFrames: rightCropFrames,
        // Calculate visual properties based on the new frame positions
        startPixel: framesToPixels(newStartFrames),
        endPixel: framesToPixels(newEndFrames),
        widthPixel: framesToPixels(newEndFrames) - framesToPixels(newStartFrames)
      };
      
      // Debug logging for crop operations
      if (trimHandle === 'start') {
        const originalStart = currentClip.originalStart ?? (currentClip.instanceStartFrames ?? currentClip.startFrames);
        // Only log significant crop changes (every 50 frames)
        if (Math.abs(leftCropFrames - (currentClip.leftCropFrames || 0)) > 50) {
          // Left crop updated
        }
      } else if (trimHandle === 'end') {
        // Only log significant crop changes (every 50 frames)
        if (Math.abs(rightCropFrames - (currentClip.rightCropFrames || 0)) > 50) {
          // Right crop updated
        }
      }
      
      return updated;
    });
    
    // Don't update magnetic points during trimming drag - only at the end like clip dragging
  };

  // Handle trim handle mouse up
  const handleTrimHandleMouseUp = () => {
    if (!isTrimming || !trimmingClip) return;
    
    // If in magnetic delete mode, delete the clip instead of trimming
    if (isMagneticDeleteActive) {
      setTimelineClips(prev => prev.filter(clip => clip.id !== trimmingClip.id));
      
      // Clean up trim state
      setIsTrimming(false);
      setTrimHandle(null);
      setTrimmingClip(null);
      setIsMagneticDeleteActive(false);
      return;
    }
    
    // Apply trim changes
    
    // Update the actual clip in timelineClips
    setTimelineClips(prev => {
      const newClips = [...prev];
      const clipIndex = newClips.findIndex(clip => clip.id === trimmingClip.id);
      
      if (clipIndex !== -1) {
        // Get the current clip data to ensure we have the latest state
        const currentClip = newClips[clipIndex];
        
        // Calculate the visual boundaries based on the cropped portion
        // For left crop, calculate visual position based on crop amount
        // For right crop, don't change visual display - only update crop values
        let visualStartFrames = currentClip.startFrames;
        let visualEndFrames = currentClip.endFrames;
        
        if (trimHandle === 'start') {
          // For left crop, visual position = instanceStart + leftCropFrames
          const leftCropFrames = trimmingClip.leftCropFrames ?? 0;
          const instanceStart = currentClip.instanceStartFrames ?? currentClip.startFrames;
          visualStartFrames = instanceStart + leftCropFrames;
          // For end frames, maintain right crop: instanceEnd - rightCropFrames
          const rightCropFrames = trimmingClip.rightCropFrames ?? 0;
          const instanceEnd = currentClip.instanceEndFrames ?? currentClip.endFrames;
          visualEndFrames = instanceEnd - rightCropFrames;
        }
        
        if (trimHandle === 'end') {
          // For right crop, visual position = instanceEnd - rightCropFrames
          const rightCropFrames = trimmingClip.rightCropFrames ?? 0;
          const instanceEnd = currentClip.instanceEndFrames ?? currentClip.endFrames;
          visualEndFrames = instanceEnd - rightCropFrames;
          // For start frames, maintain left crop: instanceStart + leftCropFrames
          const leftCropFrames = trimmingClip.leftCropFrames ?? 0;
          const instanceStart = currentClip.instanceStartFrames ?? currentClip.startFrames;
          visualStartFrames = instanceStart + leftCropFrames;
        }
        
        const visualStartPixel = framesToPixels(visualStartFrames);
        const visualEndPixel = framesToPixels(visualEndFrames);
        const visualWidthPixel = visualEndPixel - visualStartPixel;
        
        const updatedClip = {
          ...currentClip,
          // Update crop offsets
          leftCropFrames: trimmingClip.leftCropFrames ?? 0,
          rightCropFrames: trimmingClip.rightCropFrames ?? 0,
          // Update visual display properties
          startFrames: visualStartFrames,
          endFrames: visualEndFrames,
          startPixel: visualStartPixel,
          endPixel: visualEndPixel,
          widthPixel: visualWidthPixel,
          // Preserve original positions for future crop operations
          originalStart: currentClip.originalStart ?? (currentClip.instanceStartFrames ?? currentClip.startFrames),
          originalEnd: currentClip.originalEnd ?? (currentClip.instanceEndFrames ?? currentClip.endFrames),
          // Keep instance data as original positions (don't update them)
          // instanceStartFrames and instanceEndFrames remain unchanged
          // Only update pixel values for visual display
          instanceStartPixel: framesToPixels(currentClip.instanceStartFrames ?? currentClip.startFrames),
          instanceEndPixel: framesToPixels(currentClip.instanceEndFrames ?? currentClip.endFrames),
          instanceWidthPixel: framesToPixels(currentClip.instanceEndFrames ?? currentClip.endFrames) - framesToPixels(currentClip.instanceStartFrames ?? currentClip.startFrames)
        };
        
        newClips[clipIndex] = updatedClip;
        
        // Add new magnetic points for the trimmed clip using the new visual boundaries
        addMagneticPointsForClip(trimmingClip.id, visualStartFrames, visualEndFrames, updatedClip.track);
        
        // Update subsequent clips on the same track
        const trackClips = newClips.filter(clip => clip.track === updatedClip.track);
        trackClips.sort((a, b) => a.startFrames - b.startFrames);
        
        const currentClipIndex = trackClips.findIndex(clip => clip.id === updatedClip.id);
        
        // Move subsequent clips if they overlap with the trimmed clip
        for (let i = currentClipIndex + 1; i < trackClips.length; i++) {
          const subsequentClip = trackClips[i];
          if (subsequentClip.startFrames < updatedClip.endFrames) {
            const overlap = updatedClip.endFrames - subsequentClip.startFrames;
            const newStartFrames = subsequentClip.startFrames + overlap;
            const newEndFrames = subsequentClip.endFrames + overlap;
            
            // Find and update the subsequent clip in newClips
            const subsequentIndex = newClips.findIndex(clip => clip.id === subsequentClip.id);
            if (subsequentIndex !== -1) {
              newClips[subsequentIndex] = {
                ...newClips[subsequentIndex],
                startFrames: newStartFrames,
                endFrames: newEndFrames,
                startPixel: framesToPixels(newStartFrames),
                endPixel: framesToPixels(newEndFrames),
                widthPixel: framesToPixels(newEndFrames) - framesToPixels(newStartFrames),
                // Preserve original properties for future trimming
                originalStartFrames: newClips[subsequentIndex].originalStartFrames,
                originalEndFrames: newClips[subsequentIndex].originalEndFrames,
                originalStartPixel: newClips[subsequentIndex].originalStartPixel,
                originalEndPixel: newClips[subsequentIndex].originalEndPixel,
                originalWidthPixel: newClips[subsequentIndex].originalWidthPixel
              };
            }
          }
        }
        
        // Update magnetic points for subsequent clips that were moved
        trackClips.forEach(clip => {
          if (clip.id !== updatedClip.id) {
            addMagneticPointsForClip(clip.id, clip.startFrames, clip.endFrames, clip.track);
          }
        });
        
        // Refresh frame preview after moving subsequent clips
        // This ensures the preview shows the correct clip if overlapping changed
        // Use a longer timeout to ensure state updates are complete
        setTimeout(() => {
          extractSingleFrame(playheadPosition);
        }, 50);
      }
      
      return newClips;
    });
    
    // Reset trimming state
    setIsTrimming(false);
    setTrimHandle(null);
    setTrimmingClip(null);
    setIsMagneticDeleteActive(false);
    
    // Refresh frame preview to show correct clip after trimming
    // This ensures the preview updates to show the clip on the highest track
    // Use a longer timeout to ensure state updates are complete
    setTimeout(() => {
      extractSingleFrame(playheadPosition);
    }, 50);
  };

  // Add global mouse event listeners for trimming
  useEffect(() => {
    if (isTrimming) {
      const handleGlobalMouseMove = (e) => handleTrimHandleMouseMove(e);
      const handleGlobalMouseUp = () => handleTrimHandleMouseUp();
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isTrimming, trimmingClip, trimHandle]);

  // Extract single frame for immediate preview (optimized for smooth playhead movement)
  const extractSingleFrame = async (framePosition) => {
    // Only process if there are clips on the timeline
    if (timelineClips.length === 0) {
      return;
    }
    
    // During playback, debounce frame extraction to prevent conflicts with video seeking
    if (isPlaying) {
      const now = Date.now();
      const timeSinceLastExtraction = now - lastFrameExtractionTime;
      const minExtractionInterval = 50; // 50ms minimum between extractions during playback
      
      if (timeSinceLastExtraction < minExtractionInterval) {
        return; // Skip this extraction to prevent jitter
      }
      
      setLastFrameExtractionTime(now);
    }
    
    // Ensure frame position is on frame grid
    const gridAlignedPosition = Math.round(framePosition);
    
    // Find all clips at this frame position and select the one on the highest track
    // Use visual boundaries (adjusted by crops) instead of instance boundaries
    const overlappingClips = timelineClips.filter(clip => {
      const leftCropFrames = clip.leftCropFrames ?? 0;
      const rightCropFrames = clip.rightCropFrames ?? 0;
      const visualStartFrames = (clip.instanceStartFrames ?? clip.startFrames) + leftCropFrames;
      const visualEndFrames = (clip.instanceEndFrames ?? clip.endFrames) - rightCropFrames;
      
      return gridAlignedPosition >= visualStartFrames && 
             gridAlignedPosition <= visualEndFrames;
    });
    
    // Debug logging for track priority
    if (overlappingClips.length > 1) {
      // Multiple overlapping clips detected
    }
    
    // Sort by track (highest track number first) and take the first one
    const activeClip = overlappingClips.length > 0 
      ? overlappingClips.sort((a, b) => b.track - a.track)[0]
      : null;
    
    if (activeClip && overlappingClips.length > 1) {
      // Selected clip from multiple overlapping clips
    }
    
    if (activeClip) {
      // Calculate the frame position within the timeline clip using the instance boundaries
      const clipStartFrames = activeClip.instanceStartFrames ?? activeClip.startFrames; // Use instance start (actual clip boundary)
      const relativePosition = gridAlignedPosition - clipStartFrames;
      
      // Apply crop logic to determine which frame to serve from the original clip
      const leftCropFrames = activeClip.leftCropFrames ?? 0;
      const rightCropFrames = activeClip.rightCropFrames ?? 0;
      const staticData = getStaticClipData(activeClip.character, activeClip.filename);
      
      let clipFrame;
      if (staticData) {
        // Calculate which frame to serve from the original clip
        // The relative position within the timeline clip maps to the original clip
        // by adding the left crop offset (which represents the starting frame in the original)
        clipFrame = Math.floor(relativePosition + leftCropFrames);
        
        // Debug logging
        // Frame calculation completed
        
        // REMOVED: Frame constraints - allow frames to go beyond original duration when cropped
        // The frame calculation should be: relativePosition + leftCropFrames
        // This allows serving frames from anywhere in the original video based on crop
        
        // Final frame calculated
      } else {
        // Fallback to original calculation
        clipFrame = Math.floor(relativePosition);
        // No static data, using fallback calculation
      }
      
      // Found active clip (no logging to reduce spam)
      
      // Calculate 24fps frame for preview - convert the same frame value shown in Play Debug Panel
      const displayedFrame = clipFrame - leftCropFrames;
      const servedFrame24fps = Math.floor(displayedFrame * 24 / 60);
      
      // Convert crop frames from 60fps to 24fps for preview
      const leftCropFrames24fps = Math.floor(leftCropFrames * 24 / 60);
      const rightCropFrames24fps = Math.floor(rightCropFrames * 24 / 60);
      
      // Dispatch playhead update with served frame
      const playheadEvent = new CustomEvent('playheadUpdate', {
        detail: {
          playhead: {
            position: gridAlignedPosition,
            servedFrame: servedFrame24fps,
            activeClip: {
          character: activeClip.character,
              filename: activeClip.filename
            },
            leftCropFrames: leftCropFrames24fps,
            rightCropFrames: rightCropFrames24fps
          }
        }
      });
      window.dispatchEvent(playheadEvent);
    } else {
      // Debug logging for cropped clip endings
      // No active clip at current frame
      // Dispatch event to show black frame or placeholder
      const event = new CustomEvent('showFrame', {
        detail: {
          character: null,
          filename: null,
          frameNumber: null,
          timelinePosition: gridAlignedPosition, // Use grid-aligned position
          isDragging: isDraggingPlayhead
        }
      });
      window.dispatchEvent(event);
      
      // Dispatch playhead update with no active clip
      const playheadEvent = new CustomEvent('playheadUpdate', {
        detail: {
          playhead: {
            position: gridAlignedPosition,
            servedFrame: 0, // No frame when no active clip
            activeClip: null,
            leftCropFrames: 0,
            rightCropFrames: 0
          }
        }
      });
      window.dispatchEvent(playheadEvent);
    }
  };

  // Debug: Log prerender frame ranges when they change
  useEffect(() => {
    if (prerenderAreas.length > 0 && !isDraggingClip && timelineClips.length > 0) {
      // Only log when clips are actually placed, not during drag operations
      // Process prerender areas when clips change (but not during drag operations)
      processPrerenderAreas();
    }
  }, [timelineClips.length, isDraggingClip]); // Watch timelineClips.length instead of prerenderAreas

  // Keep magneticPointsRef in sync with magneticPoints state
  useEffect(() => {
    magneticPointsRef.current = magneticPoints;
  }, [magneticPoints]);

  // Initialize playhead magnetic point on mount
  useEffect(() => {
    updatePlayheadMagneticPoint(playheadPosition, true); // Log initial creation
    setSmoothPlayheadPosition(playheadPosition); // Initialize smooth position
  }, []); // Run once on mount

  // Update playhead magnetic point when playhead moves (but not during clip dragging)
  useEffect(() => {
    // Only update magnetic points if we're not dragging clips
    if (!isDraggingClip) {
      updatePlayheadMagneticPoint(smoothPlayheadPosition, false); // Don't log during drag
    }
  }, [smoothPlayheadPosition, isDraggingClip]);

  // Update dragged clip magnetic points when drag preview changes
  // Note: This is now called directly from the drag handlers to avoid infinite loops

  // Handle document-level mouse events for dragging
  useEffect(() => {
    if (isDraggingPlayhead || isDraggingClip) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, isDraggingClip]);

  // Handle keyboard events for clip removal
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle backspace when a clip is selected and we're not in a drag operation
      if (e.key === 'Backspace' && selectedClip && !isDraggingClip && !isDraggingPlayhead) {
        e.preventDefault();
        
        // Remove the selected clip from timeline
        setTimelineClips(prev => {
          const updatedClips = prev.filter(clip => clip.id !== selectedClip.id);
          // Update magnetic points when clips change
          updateMagneticPointsFromClips(updatedClips);
          return updatedClips;
        });
        
        // Also remove magnetic points for the deleted clip specifically
        setMagneticPoints(prev => {
          const newMap = new Map(prev);
          // Remove magnetic points for the deleted clip
          for (const [key, value] of newMap.entries()) {
            if (value.track === selectedClip.track && 
                (value.frame === selectedClip.startFrames + pixelsToFrames(MAGNETIC_OFFSET_PIXELS) ||
                 value.frame === selectedClip.endFrames + pixelsToFrames(MAGNETIC_OFFSET_PIXELS))) {
              newMap.delete(key);
            }
          }
          return newMap;
        });
        
        // Clear selection
        if (onClipSelect && typeof onClipSelect === 'function') {
          onClipSelect(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedClip, isDraggingClip, isDraggingPlayhead, onClipSelect]);

  // Handle custom timeline drop events from ClipList
  useEffect(() => {
    const timelineElement = document.querySelector('.timeline-content');
    if (timelineElement) {
      // Listen for playhead position requests from ClipList
      const handlePlayheadRequest = () => {
        // Do nothing during clip dragging - keep purple line stable
        // The playhead magnetic point should not change during clip operations
      };
      
      // No snapshot needed - magnetism uses live data
      
      timelineElement.addEventListener('requestPlayheadPosition', handlePlayheadRequest);
      // No snapshot event listener needed
      
      
      const handleTimelineDropEvent = (e) => {
        console.log('📍 CLIP PLACEMENT STARTED:', e.detail.clip?.id, 'at', new Date().toLocaleTimeString());
        
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
          
          // Check if this is a timeline clip being moved (not a new clip from ClipList)
          const isTimelineClip = clip.id && timelineClips.some(timelineClip => timelineClip.id === clip.id);
          
          if (isTimelineClip) {
            // Moving existing timeline clip
            // Moving timeline clip
            
            // Calculate new position
            const constrainedRelativeX = Math.max(relativeX, 0);
            const startFrames = pixelsToFrames(constrainedRelativeX);
            const durationInFrames = clip.endFrames - clip.startFrames;
            const endFrames = startFrames + durationInFrames;
            
            // Apply magnetism to snap to nearby elements
            const snappedPosition = applyDraggedClipMagnetism(startFrames, endFrames);
            const snappedStartFrames = snappedPosition.startFrames;
            const snappedEndFrames = snappedPosition.endFrames;
            
            // Apply timeline boundary constraints
            const constrainedPosition = applyTimelineBoundaries(snappedStartFrames, snappedEndFrames);
            
            if (constrainedPosition) {
              // Calculate the drag offset from visual start position
              const currentVisualStart = clip.startFrames;
              const dragOffsetFrames = constrainedPosition.startFrames - currentVisualStart;
              
              // Update the existing clip by adjusting instance data based on crops
              setTimelineClips(prev => prev.map(timelineClip => {
                if (timelineClip.id === clip.id) {
                  // Get current values
                  const currentOriginalStart = timelineClip.originalStart ?? (timelineClip.instanceStartFrames ?? timelineClip.startFrames);
                  const currentOriginalEnd = timelineClip.originalEnd ?? (timelineClip.instanceEndFrames ?? timelineClip.endFrames);
                  const leftCropFrames = timelineClip.leftCropFrames ?? 0;
                  const rightCropFrames = timelineClip.rightCropFrames ?? 0;
                  
                  // Apply drag offset to original positions
                  const newOriginalStart = currentOriginalStart + dragOffsetFrames;
                  const newOriginalEnd = currentOriginalEnd + dragOffsetFrames;
                  
                  // Calculate visual positions based on original positions + crops
                  const visualStartFrames = newOriginalStart + leftCropFrames;
                  const visualEndFrames = newOriginalEnd - rightCropFrames;
                  const visualWidthFrames = visualEndFrames - visualStartFrames;
                  
                  return {
                      ...timelineClip,
                      track: targetTrack,
                    
                    // Instance data (actual clip boundaries - same as original positions)
                    instanceStartFrames: newOriginalStart,
                    instanceEndFrames: newOriginalEnd,
                    instanceStartPixel: framesToPixels(newOriginalStart),
                    instanceEndPixel: framesToPixels(newOriginalEnd),
                    instanceWidthPixel: framesToPixels(newOriginalEnd) - framesToPixels(newOriginalStart),
                    
                    // Visual positions (what user sees - original + crops)
                    startFrames: visualStartFrames,
                    endFrames: visualEndFrames,
                    startPixel: framesToPixels(visualStartFrames),
                    endPixel: framesToPixels(visualEndFrames),
                    widthPixel: framesToPixels(visualWidthFrames),
                    
                    // Update time
                    startTime: visualStartFrames / 60,
                    
                    // Preserve crop offsets when moving clips
                    leftCropFrames: leftCropFrames,
                    rightCropFrames: rightCropFrames,
                    
                    // Update original position references with drag offset
                    originalStart: newOriginalStart,
                    originalEnd: newOriginalEnd
                  };
                }
                return timelineClip;
              }));
              
              // Clip updated with drag offset
            }
          } else {
            // Creating new clip from ClipList
            const baseId = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Use the duration that was already loaded in ClipList
          let clipDuration = 5; // Default fallback
          // No console logging for duration parsing
          
          // Handle both numeric duration (from ClipList) and MM:SS format
          if (typeof clip.duration === 'number' && clip.duration > 0) {
            // Duration is already in seconds (from ClipList processing)
            clipDuration = clip.duration;
            // No console logging
          } else if (clip.duration && clip.duration !== "0:00") {
            // Duration is in MM:SS format
            const durationStr = clip.duration.toString();
            // No console logging
            const parts = durationStr.split(':');
            if (parts.length === 2) {
              const minutes = parseInt(parts[0]);
              const seconds = parseInt(parts[1]);
              clipDuration = minutes * 60 + seconds;
              // No console logging
            } else {
              // No console logging
            }
          } else {
            // No console logging
          }
          // No console logging for duration parsing
          
          const durationInFrames = timeToFrames(clipDuration); // Convert seconds to frames
          
          // Calculate start and end positions in frames
          // If dropping to the left of timeline content, use 0 position (leftmost)
          const constrainedRelativeX = Math.max(relativeX, 0);
          const startFrames = pixelsToFrames(constrainedRelativeX);
          const endFrames = startFrames + durationInFrames;
          
          // Apply magnetism to snap to nearby elements (all in frames)
          const snappedPosition = applyDraggedClipMagnetism(startFrames, startFrames + durationInFrames);
          const snappedStartFrames = snappedPosition.startFrames;
          const snappedEndFrames = snappedPosition.endFrames;
          
          // Apply timeline boundary constraints
          const constrainedPosition = applyTimelineBoundaries(snappedStartFrames, snappedEndFrames);
          
          if (constrainedPosition) {
            // Convert to pixels for display
            const startPixel = framesToPixels(constrainedPosition.startFrames);
            const endPixel = framesToPixels(constrainedPosition.endFrames);
            const widthPixel = endPixel - startPixel;
            
            // Convert pixel position to time
            const startTime = pixelToTime(startPixel);
            
            // Create clip with default frame rate, will be updated async
            // Get or create static clip data (lazy loading)
            const staticData = getOrCreateStaticClipData(clip.character, clip.filename, clipDuration);
            
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
              durationFrames: durationInFrames,
              frameRate: 24, // Default frame rate, will be updated async
              // Reference to static clip data
              staticClipKey: `${clip.character}/${clip.filename}`,
              // Instance-specific data (these can change during trimming)
              instanceStartFrames: constrainedPosition.startFrames,
              instanceEndFrames: constrainedPosition.endFrames,
              instanceStartPixel: startPixel,
              instanceEndPixel: endPixel,
              instanceWidthPixel: widthPixel,
              // Crop offsets for frame calculation
              leftCropFrames: 0,  // Frames cropped from the left (start later)
              rightCropFrames: 0,  // Frames cropped from the right (end earlier)
              // Original positions for crop calculations
              originalStart: constrainedPosition.startFrames,  // Original timeline start position
              originalEnd: constrainedPosition.endFrames       // Original timeline end position
            };
            
            // Premiere Pro style: No bulk thumbnail generation - frames will be generated on-demand
            
            // Get actual video frame rate and update clip
            getVideoFrameRate(clip.character, clip.filename).then(frameRate => {
              setTimelineClips(prev => prev.map(c => 
                c.id === newClip.id ? { ...c, frameRate } : c
              ));
            });
            
            // Adding clip to timeline (event handler)
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
            
            // Dispatch success event to ClipList to confirm clip placement
            const successEvent = new CustomEvent('clipPlacementSuccess', {
              detail: { clip: newClip }
            });
            window.dispatchEvent(successEvent);
            
            // Refresh frame preview after clip placement/movement
            // This ensures the preview shows the correct clip if overlapping changed
            // Use a longer timeout to ensure state updates are complete
            setTimeout(() => {
              extractSingleFrame(playheadPosition);
            }, 50);
          }
          }
        }
        
        // Clear drag preview and reset playhead capture
        setDragPreview(null);
        setDragStartPlayheadPosition(null);
        setIsDraggingClip(false);
        setDraggedClipActualPosition(null);
        
        // Trigger frame generation when drag is cleared
        setTimeout(() => {
          extractSingleFrame(playheadPosition);
        }, 50);
      };
      
      const handleTimelineDragOver = (e) => {
        // Only prevent default for drag operations, allow right clicks
        if (e.type === 'dragover') {
          e.preventDefault();
        }
        
        // Set clip dragging state
        setIsDraggingClip(true);
        
        // Trigger frame generation when clip drag starts
        setTimeout(() => {
          extractSingleFrame(playheadPosition);
        }, 50);
        
        // Take snapshot of magnetic points when dragging starts
        // No snapshot needed - magnetism uses live data
        
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
            // Simple track assignment based on Y position
            let targetTrack = 3; // Default to track 3 (highest) when dragging above timeline
            
            if (mouseY >= 100 && mouseY < 150) {
              targetTrack = 3; // Top track (100-150px from timeline top)
            } else if (mouseY >= 150 && mouseY < 200) {
              targetTrack = 2; // Middle track (150-200px from timeline top)
            } else if (mouseY >= 200 && mouseY < 250) {
              targetTrack = 1; // Bottom track (200-250px from timeline top)
            } else if (mouseY < 100) {
              targetTrack = 3; // Above timeline area - default to highest track
            } else {
              targetTrack = 1; // Below timeline area - default to lowest track
            }
            
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
              // Update dragged clip magnetic points for yellow lines
              updateDraggedClipMagneticPoints(dragPreviewData, actualPositionData);
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
                
                const dragPreviewData = {
                  startPixel: startPixel,
                  endPixel: endPixel,
                  widthPixel: widthPixel,
                  character: customDragEvent.clip.character || 'Clip',
                  duration: duration,
                  track: targetTrack
                };
                setDragPreview(dragPreviewData);
                // Update dragged clip magnetic points for yellow lines
                updateDraggedClipMagneticPoints(dragPreviewData, null);
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
          
          // Trigger frame generation when drag leaves timeline
          setTimeout(() => {
            extractSingleFrame(playheadPosition);
          }, 50);
        }
      };
      
      const handleTimelineDragOverEvent = (e) => {
        const { clip, clientX, clientY, ctrlKey, metaKey } = e.detail;
        const timelineRect = timelineElement.getBoundingClientRect();
        const mouseX = clientX - timelineRect.left;
        const mouseY = clientY - timelineRect.top;
        const trackContentStart = 76;
        const relativeX = mouseX - trackContentStart;
        
        // Check if this is a timeline clip being dragged (has id and exists in timelineClips)
        const isTimelineClip = clip.id && timelineClips.some(timelineClip => timelineClip.id === clip.id);
        
        // If it's a timeline clip, remove old magnetic points for this clip
        if (isTimelineClip) {
          setMagneticPoints(prev => {
            const newMap = new Map(prev);
            // Remove old magnetic points for this clip
            for (const [key, value] of newMap.entries()) {
              if (value.track === clip.track && 
                  (value.frame === clip.startFrames + pixelsToFrames(MAGNETIC_OFFSET_PIXELS) ||
                   value.frame === clip.endFrames + pixelsToFrames(MAGNETIC_OFFSET_PIXELS))) {
                newMap.delete(key);
              }
            }
            return newMap;
          });
        }
        
        
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
          let targetTrack = 3; // Default to track 3 (highest) when dragging above timeline
          
          if (mouseY >= 100 && mouseY < 150) {
            targetTrack = 3; // Top track (100-150px from timeline top)
          } else if (mouseY >= 150 && mouseY < 200) {
            targetTrack = 2; // Middle track (150-200px from timeline top)
          } else if (mouseY >= 200 && mouseY < 250) {
            targetTrack = 1; // Bottom track (200-250px from timeline top)
          } else if (mouseY < 100) {
            targetTrack = 3; // Above timeline area - default to highest track
          } else {
            targetTrack = 1; // Below timeline area - default to lowest track
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
            
            const dragPreviewData = {
              startPixel: startPixel,
              endPixel: endPixel,
              widthPixel: widthPixel,
              character: clip.character || 'Clip',
              duration: duration,
              track: targetTrack,
              multiTrack: isMultiTrack,
              mouseY: mouseY // Add mouse Y for debugging
            };
            setDragPreview(dragPreviewData);
            // Update dragged clip magnetic points for yellow lines
            updateDraggedClipMagneticPoints(dragPreviewData, null);
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
        
        // Trigger frame generation when drag leaves timeline
        setTimeout(() => {
          extractSingleFrame(playheadPosition);
        }, 50);
      };
      
      const handleTimelineDragClear = (e) => {
        setDragPreview(null);
        setDraggedClipActualPosition(null);
        setIsDraggingClip(false);
        // Clear dragged clip magnetic points
        updateDraggedClipMagneticPoints(null);
        
        // Trigger frame generation when drag is cleared
        setTimeout(() => {
          extractSingleFrame(playheadPosition);
        }, 50);
      };
      
      timelineElement.addEventListener('timelineDrop', handleTimelineDropEvent);
      timelineElement.addEventListener('dragover', handleTimelineDragOver);
      timelineElement.addEventListener('dragleave', handleTimelineDragLeave);
      timelineElement.addEventListener('timelineDragOver', handleTimelineDragOverEvent);
      timelineElement.addEventListener('timelineDragLeave', handleTimelineDragLeaveEvent);
      timelineElement.addEventListener('timelineDragClear', handleTimelineDragClear);
      timelineElement.addEventListener('requestPlayheadPosition', handlePlayheadRequest);
      // No snapshot event listener needed
      
      // Track mouse movement during timeline clip drag (EXACT same as ClipList)
      const handleTimelineClipMouseMove = (e) => {
        if (isDraggingClip && dragPreview) {
          // Check if over timeline (same logic as ClipList)
          const timelineRect = timelineElement.getBoundingClientRect();
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          
          // Check if mouse is over timeline area
          const isOver = mouseX >= timelineRect.left && mouseX <= timelineRect.right &&
                        mouseY >= timelineRect.top && mouseY <= timelineRect.bottom;
          
          // Dispatch custom drag over event to timeline (EXACT same as ClipList)
          if (isOver) {
            const dragOverEvent = new CustomEvent('timelineDragOver', {
              detail: {
                clip: dragPreview,
                clientX: mouseX,
                clientY: mouseY,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
              }
            });
            timelineElement.dispatchEvent(dragOverEvent);
          } else {
            // Dispatch drag leave event when not over timeline (same as ClipList)
            const dragLeaveEvent = new CustomEvent('timelineDragLeave', {
              detail: {
                clip: dragPreview,
                clientX: mouseX,
                clientY: mouseY
              }
            });
            timelineElement.dispatchEvent(dragLeaveEvent);
          }
        }
      };
      
      document.addEventListener('mousemove', handleTimelineClipMouseMove);
      
      // Handle mouse up for timeline clips (EXACT same as ClipList)
      const handleTimelineClipMouseUp = (e) => {
        if (isDraggingClip && dragPreview) {
          // Check if dropping over timeline
          const timelineRect = timelineElement.getBoundingClientRect();
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          
          // Check if mouse is over timeline area
          if (mouseX >= timelineRect.left && mouseX <= timelineRect.right &&
              mouseY >= timelineRect.top && mouseY <= timelineRect.bottom) {
            
            // Calculate track based on mouse position (same as ClipList)
            const relativeY = mouseY - timelineRect.top;
            let targetTrack = 3; // Default to track 3 (highest)
            
            // Use the same track boundaries as ClipList
            if (relativeY >= 100 && relativeY < 150) {
              targetTrack = 3; // Top track
            } else if (relativeY >= 150 && relativeY < 200) {
              targetTrack = 2; // Middle track
            } else if (relativeY >= 200 && relativeY < 250) {
              targetTrack = 1; // Bottom track
            }
            
            // Create a synthetic drop event (same as ClipList)
            const dropEvent = new CustomEvent('timelineDrop', {
              detail: {
                clip: dragPreview,
                clientX: mouseX,
                clientY: mouseY,
                track: targetTrack
              }
            });
            timelineElement.dispatchEvent(dropEvent);
          }
          
          // Reset drag state (same as ClipList)
          setIsDraggingClip(false);
          setDragPreview(null);
          setDraggedClipActualPosition(null);
          updateDraggedClipMagneticPoints(null);
          
          // Trigger frame generation when timeline clip drag ends
          setTimeout(() => {
            extractSingleFrame(playheadPosition);
          }, 50);
        }
      };
      
      document.addEventListener('mouseup', handleTimelineClipMouseUp);
      
      // Track mouse movement to distinguish between click and drag
      let mouseDownX = null;
      let mouseDownY = null;
      let mouseMoved = false;
      const MOVE_THRESHOLD = 3; // pixels of movement before considering it a drag
      
      // Add global click listeners to detect left click press and release
      const handleGlobalClick = (e) => {
        if (e.button === 0) {
          const moved = mouseMoved || 
                        (mouseDownX !== null && mouseDownY !== null &&
                         (Math.abs(e.clientX - mouseDownX) > MOVE_THRESHOLD || 
                          Math.abs(e.clientY - mouseDownY) > MOVE_THRESHOLD));
          console.log(moved ? '🖱️ CLICK RELEASE (was dragging)' : '🖱️ NORMAL CLICK', 'at', new Date().toLocaleTimeString());
          
          // Reset
          mouseDownX = null;
          mouseDownY = null;
          mouseMoved = false;
        }
      };
      
      const handleGlobalMouseDown = (e) => {
        // Only log if this is a left mouse button press (button 0)
        if (e.button === 0) {
          
          // Track initial position
          mouseDownX = e.clientX;
          mouseDownY = e.clientY;
          mouseMoved = false;
        }
      };
      
      const handleGlobalMouseMove = (e) => {
        // Check if mouse has moved significantly since mousedown
        if (mouseDownX !== null && mouseDownY !== null) {
          const moved = Math.abs(e.clientX - mouseDownX) > MOVE_THRESHOLD || 
                       Math.abs(e.clientY - mouseDownY) > MOVE_THRESHOLD;
          if (moved && !mouseMoved) {
            mouseMoved = true;
          }
        }
      };
      
      document.addEventListener('click', handleGlobalClick);
      document.addEventListener('mousedown', handleGlobalMouseDown);
      document.addEventListener('mousemove', handleGlobalMouseMove);
      
      return () => {
        timelineElement.removeEventListener('timelineDrop', handleTimelineDropEvent);
        timelineElement.removeEventListener('dragover', handleTimelineDragOver);
        timelineElement.removeEventListener('dragleave', handleTimelineDragLeave);
        timelineElement.removeEventListener('timelineDragOver', handleTimelineDragOverEvent);
        timelineElement.removeEventListener('timelineDragLeave', handleTimelineDragLeaveEvent);
        timelineElement.removeEventListener('timelineDragClear', handleTimelineDragClear);
        timelineElement.removeEventListener('requestPlayheadPosition', handlePlayheadRequest);
        document.removeEventListener('mousemove', handleTimelineClipMouseMove);
        document.removeEventListener('mouseup', handleTimelineClipMouseUp);
        document.removeEventListener('click', handleGlobalClick);
        document.removeEventListener('mousedown', handleGlobalMouseDown);
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        // No snapshot event listener to remove
        
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
              } else if (tool.id === 'debug') {
                setShowDebugPanel(!showDebugPanel);
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

         {/* Debug Panel */}
         {showDebugPanel && (
           <div style={{
             position: "absolute",
             top: "10px",
             right: "10px",
             background: "rgba(0, 0, 0, 0.9)",
             color: "#fff",
             padding: "12px",
             borderRadius: "6px",
             fontSize: "12px",
             fontFamily: "monospace",
             zIndex: 1000,
             minWidth: "300px",
             border: "1px solid #333"
           }}>
             <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#00ff00" }}>
               🐛 Play Debug Panel
             </div>
             
             {/* Playhead Position */}
             <div style={{ marginBottom: "6px" }}>
               <div style={{ color: "#ffff00" }}>Playhead Position:</div>
               <div>Frames: {Math.floor(smoothPlayheadPosition)}</div>
               <div>Time: {formatTimeFromFrames(smoothPlayheadPosition)}</div>
             </div>
             
             {/* Active Clip Info */}
             {(() => {
               // Find all clips at this position and select the one on the highest track
               // Use visual boundaries (adjusted by crops) like extractSingleFrame
               const overlappingClips = timelineClips.filter(clip => {
                 const leftCropFrames = clip.leftCropFrames ?? 0;
                 const rightCropFrames = clip.rightCropFrames ?? 0;
                 const visualStartFrames = (clip.instanceStartFrames ?? clip.startFrames) + leftCropFrames;
                 const visualEndFrames = (clip.instanceEndFrames ?? clip.endFrames) - rightCropFrames;
                 
                 return smoothPlayheadPosition >= visualStartFrames && 
                        smoothPlayheadPosition <= visualEndFrames;
               });
               const activeClip = overlappingClips.length > 0 
                 ? overlappingClips.sort((a, b) => b.track - a.track)[0]
                 : null;
               
               if (activeClip) {
                 const clipStartFrames = activeClip.instanceStartFrames ?? activeClip.startFrames; // Use instance start (same as extractSingleFrame)
                 const relativePosition = smoothPlayheadPosition - clipStartFrames;
                 const leftCropFrames = activeClip.leftCropFrames ?? 0;
                 const rightCropFrames = activeClip.rightCropFrames ?? 0;
                 const staticData = getStaticClipData(activeClip.character, activeClip.filename);
                 
                 let clipFrame;
                 if (staticData) {
                  clipFrame = Math.floor(relativePosition + leftCropFrames);
                  const instanceDuration = activeClip.instanceEndFrames - activeClip.instanceStartFrames;
                  const maxServedFrame = instanceDuration - rightCropFrames;
                   clipFrame = Math.min(clipFrame, maxServedFrame);
                   clipFrame = Math.max(clipFrame, leftCropFrames);
                 } else {
                   clipFrame = Math.floor(relativePosition);
                 }
                 
                 return (
                   <div style={{ marginBottom: "6px" }}>
                     <div style={{ color: "#00ffff" }}>Active Clip:</div>
                     <div>Character: {activeClip.character}</div>
                     <div>File: {activeClip.filename}</div>
                     <div>Track: {activeClip.track}</div>
                     <div style={{ color: "#ffff00" }}>Clip Start:</div>
                     <div>Frames: {clipStartFrames}</div>
                     <div>Time: {formatTimeFromFrames(clipStartFrames)}</div>
                     <div style={{ color: "#ff8800" }}>Clip Frame:</div>
                     <div>Frame: {clipFrame - leftCropFrames}</div>
                     <div>24fps: {Math.floor((clipFrame - leftCropFrames) * 24 / 60)}</div>
                     <div>Time: {formatTimeFromFrames(clipFrame)}</div>
                     {leftCropFrames > 0 && <div style={{ color: "#ffaa00" }}>Left Crop: {leftCropFrames} frames</div>}
                     {rightCropFrames > 0 && <div style={{ color: "#ffaa00" }}>Right Crop: {rightCropFrames} frames</div>}
                   </div>
                 );
               } else {
                 return (
                   <div style={{ marginBottom: "6px" }}>
                     <div style={{ color: "#ff0000" }}>No Active Clip</div>
                   </div>
                 );
               }
             })()}
             
             {/* Timeline Clips Count */}
             <div style={{ marginBottom: "6px" }}>
               <div style={{ color: "#888" }}>Timeline Clips: {timelineClips.length}</div>
             </div>
             
             {/* Close Button */}
             <button
               onClick={() => setShowDebugPanel(false)}
               style={{
                 position: "absolute",
                 top: "8px",
                 right: "8px",
                 background: "transparent",
                 border: "none",
                 color: "#fff",
                 cursor: "pointer",
                 fontSize: "16px"
               }}
             >
               ×
             </button>
           </div>
         )}

         {/* Clip Debug Window */}
         {selectedClip && (
           <div style={{
             position: "fixed",
             top: "10px",
             left: "10px",
             background: "rgba(0, 0, 0, 0.9)",
             color: "#fff",
             padding: "12px",
             borderRadius: "6px",
             fontSize: "12px",
             fontFamily: "monospace",
             zIndex: 1001,
             minWidth: "350px",
             maxWidth: "400px",
             border: "1px solid #333",
             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)"
           }}>
             <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#00ff00" }}>
               🎬 Clip Debug Window
             </div>
             
             {/* Selected Clip Info */}
             {(() => {
               // Get the current clip data from timelineClips to ensure we have the latest state
               const clip = timelineClips.find(c => c.id === selectedClip.id) || selectedClip;
               const staticData = getStaticClipData(clip.character, clip.filename);
               const leftCropFrames = clip.leftCropFrames ?? 0;
               const rightCropFrames = clip.rightCropFrames ?? 0;
               
               return (
                 <div>
                   {/* Clip Instance Properties */}
                   <div style={{ marginBottom: "12px" }}>
                     <div style={{ color: "#ffff00", fontWeight: "bold", marginBottom: "4px" }}>
                       📍 Instance Properties
                     </div>
                     <div>id: {clip.id}</div>
                     <div>character: {clip.character}</div>
                     <div>filename: {clip.filename}</div>
                     <div>track: {clip.track}</div>
                     <div>durationFrames: {clip.durationFrames} ({formatTimeFromFrames(clip.durationFrames)})</div>
                   </div>
                   
                   {/* Visual Position Details (what user sees on timeline) */}
                   <div style={{ marginBottom: "12px" }}>
                     <div style={{ color: "#ffff00", fontWeight: "bold", marginBottom: "4px" }}>
                       📐 Visual Position Details (clip.startFrames/endFrames)
                     </div>
                     <div>startFrames: {clip.startFrames} ({formatTimeFromFrames(clip.startFrames)}) 
                       {(clip.leftCropFrames ?? 0) > 0 && ` (orig: ${(clip.originalStart ?? (clip.instanceStartFrames ?? clip.startFrames))} + ${clip.leftCropFrames ?? 0})`}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{clip.lastDragOffset})</span>}
                     </div>
                     <div>endFrames: {clip.endFrames} ({formatTimeFromFrames(clip.endFrames)}) 
                       {(clip.rightCropFrames ?? 0) > 0 && ` (orig: ${(clip.originalEnd ?? (clip.instanceEndFrames ?? clip.endFrames))} - ${clip.rightCropFrames ?? 0})`}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{clip.lastDragOffset})</span>}
                     </div>
                     <div>Duration Frames: {clip.endFrames - clip.startFrames}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+0)</span>}
                     </div>
                     <div>startPixel: {clip.startPixel}px
                       {(clip.leftCropFrames ?? 0) > 0 && ` (orig: ${framesToPixels(clip.originalStart ?? (clip.instanceStartFrames ?? clip.startFrames))} + ${framesToPixels(clip.leftCropFrames ?? 0)})`}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{framesToPixels(clip.lastDragOffset)})</span>}
                     </div>
                     <div>endPixel: {clip.endPixel}px
                       {(clip.rightCropFrames ?? 0) > 0 && ` (orig: ${framesToPixels(clip.originalEnd ?? (clip.instanceEndFrames ?? clip.endFrames))} - ${framesToPixels(clip.rightCropFrames ?? 0)})`}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{framesToPixels(clip.lastDragOffset)})</span>}
                     </div>
                     <div>widthPixel: {clip.widthPixel}px
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+0)</span>}
                     </div>
                   </div>
                   
                   {/* Instance Data (backend clip boundaries) */}
                   <div style={{ marginBottom: "12px" }}>
                     <div style={{ color: "#ffff00", fontWeight: "bold", marginBottom: "4px" }}>
                       🔧 Instance Data (clip.instanceStartFrames/instanceEndFrames)
                     </div>
                     <div>instanceStartFrames: {clip.instanceStartFrames ?? clip.startFrames}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{clip.lastDragOffset})</span>}
                     </div>
                     <div>instanceEndFrames: {clip.instanceEndFrames ?? clip.endFrames}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{clip.lastDragOffset})</span>}
                     </div>
                     <div>instanceStartPixel: {clip.instanceStartPixel ?? clip.startPixel}px
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{framesToPixels(clip.lastDragOffset)})</span>}
                     </div>
                     <div>instanceEndPixel: {clip.instanceEndPixel ?? clip.endPixel}px
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{framesToPixels(clip.lastDragOffset)})</span>}
                     </div>
                     <div>instanceWidthPixel: {clip.instanceWidthPixel ?? clip.widthPixel}px
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+0)</span>}
                     </div>
                   </div>
                   
                   {/* Original Position References */}
                   <div style={{ marginBottom: "12px" }}>
                     <div style={{ color: "#ffff00", fontWeight: "bold", marginBottom: "4px" }}>
                       📍 Original Position References (clip.originalStart/originalEnd)
                     </div>
                     <div>originalStart: {clip.originalStart ?? (clip.instanceStartFrames ?? clip.startFrames)}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{clip.lastDragOffset})</span>}
                     </div>
                     <div>originalEnd: {clip.originalEnd ?? (clip.instanceEndFrames ?? clip.endFrames)}
                       {clip.lastDragOffset && <span style={{ color: "#00ff00" }}>(+{clip.lastDragOffset})</span>}
                     </div>
                   </div>
                   
                   {/* Crop Information */}
                   <div style={{ marginBottom: "12px" }}>
                     <div style={{ color: "#ffff00", fontWeight: "bold", marginBottom: "4px" }}>
                       ✂️ Crop Information
                     </div>
                     <div style={{ color: (clip.leftCropFrames ?? 0) > 0 ? "#ffaa00" : "#888" }}>
                       leftCropFrames: {clip.leftCropFrames ?? 0} frames ({formatTimeFromFrames(clip.leftCropFrames ?? 0)})
                     </div>
                     <div style={{ color: (clip.rightCropFrames ?? 0) > 0 ? "#ffaa00" : "#888" }}>
                       rightCropFrames: {clip.rightCropFrames ?? 0} frames ({formatTimeFromFrames(clip.rightCropFrames ?? 0)})
                     </div>
                     <div>Total Cropped: {(clip.leftCropFrames ?? 0) + (clip.rightCropFrames ?? 0)} frames</div>
                   </div>
                   
                   {/* Original Clip Properties (in light grey) */}
                   {staticData && (
                     <div style={{ marginBottom: "12px" }}>
                       <div style={{ color: "#888", fontWeight: "bold", marginBottom: "4px" }}>
                         📦 Original Clip Properties
                       </div>
                       <div style={{ color: "#888" }}>Original Start: {staticData.originalStartFrames} ({formatTimeFromFrames(staticData.originalStartFrames)})</div>
                       <div style={{ color: "#888" }}>Original End: {staticData.originalEndFrames} ({formatTimeFromFrames(staticData.originalEndFrames)})</div>
                       <div style={{ color: "#888" }}>Original Duration: {staticData.originalDurationFrames} ({formatTimeFromFrames(staticData.originalDurationFrames)})</div>
                       <div style={{ color: "#888" }}>Original Duration (Time): {formatTimeFromFrames(staticData.durationFrames)}</div>
                     </div>
                   )}
                   
                   {/* Crop Status */}
                   <div style={{ marginBottom: "12px" }}>
                     <div style={{ color: "#ffff00", fontWeight: "bold", marginBottom: "4px" }}>
                       📊 Crop Status
                     </div>
                     <div style={{ color: (clip.leftCropFrames ?? 0) > 0 ? "#ffaa00" : "#00ff00" }}>
                       Left: {(clip.leftCropFrames ?? 0) > 0 ? `Cropped ${clip.leftCropFrames ?? 0} frames` : "Not cropped"}
                     </div>
                     <div style={{ color: (clip.rightCropFrames ?? 0) > 0 ? "#ffaa00" : "#00ff00" }}>
                       Right: {(clip.rightCropFrames ?? 0) > 0 ? `Cropped ${clip.rightCropFrames ?? 0} frames` : "Not cropped"}
                     </div>
                     <div style={{ color: ((clip.leftCropFrames ?? 0) > 0 || (clip.rightCropFrames ?? 0) > 0) ? "#ffaa00" : "#00ff00" }}>
                       Overall: {((clip.leftCropFrames ?? 0) > 0 || (clip.rightCropFrames ?? 0) > 0) ? "Modified" : "Original"}
                     </div>
                   </div>
                 </div>
               );
             })()}
             
             {/* Close Button */}
             <button
               onClick={() => onClipSelect(null)}
               style={{
                 position: "absolute",
                 top: "8px",
                 right: "8px",
                 background: "transparent",
                 border: "none",
                 color: "#fff",
                 cursor: "pointer",
                 fontSize: "16px"
               }}
             >
               ×
             </button>
           </div>
         )}

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
           onClick={handleTimelineClick}
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
             {formatTimeFromFrames(smoothPlayheadPosition)}
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
          {/* Prerender Areas - Yellow horizontal lines for areas with clips */}
          {prerenderAreas.map((area, index) => {
            const timelineElement = document.querySelector('.timeline-content');
            const trackContentStart = 76; // Track title width
            const bufferZone = 38; // Buffer zone width
            const timelineRect = timelineElement?.getBoundingClientRect();
            const actualMaxPosition = timelineRect ? timelineRect.width - trackContentStart - bufferZone : getActualTimelineWidth();
            
            // Convert frame positions to pixel positions
            const startPosition = framesToPixels(area.startFrames);
            const endPosition = framesToPixels(area.endFrames);
            const width = endPosition - startPosition;
            
            // Convert frames to time for tooltip display
            const startTime = framesToTime(area.startFrames);
            const endTime = framesToTime(area.endFrames);
            const startMinutes = startTime / 60;
            const endMinutes = endTime / 60;
            
            return (
              <div
                key={`prerender-${index}`}
                style={{
                  position: "absolute",
                  left: `${startPosition}px`,
                  top: "25px", // Position just above the bottom border
                  height: "2px",
                  width: `${width}px`,
                  background: "#ffd700", // Yellow color
                  zIndex: 10,
                  borderRadius: "1px",
                  boxShadow: "0 1px 2px rgba(255, 215, 0, 0.3)"
                }}
                title={`Prerender frames: ${area.startFrames}-${area.endFrames} (${startMinutes.toFixed(1)}m - ${endMinutes.toFixed(1)}m)`}
              />
            );
          })}
          
          {/* Time Markers */}
          {Array.from({ length: 11 }, (_, i) => {
            const time = i; // 0, 1, 2, ..., 10 minutes
            // Calculate position in pixels within available area (excluding buffer zone)
            // Use the actual usable timeline width (excluding track title and buffer)
            const timelineElement = document.querySelector('.timeline-content');
            const trackContentStart = 76; // Track title width
            const bufferZone = 38; // Buffer zone width
            const timelineRect = timelineElement?.getBoundingClientRect();
            const actualMaxPosition = timelineRect ? timelineRect.width - trackContentStart - bufferZone : getActualTimelineWidth();
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
             left: `${76 + framesToPixels(smoothPlayheadPosition)}px`, // Use smooth position for visual display
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
             <div              style={{
               flex: 1,
               background: "#f8f9fa",
               position: "relative"
             }}
>
               {/* Render clips on this track */}
               {timelineClips
                 .filter(clip => clip.track === trackNum)
                 .map(clip => {
                   // Use trimming clip data if this clip is being trimmed, otherwise use visual data
                   const displayClip = trimmingClip && trimmingClip.id === clip.id ? trimmingClip : {
                     ...clip,
                     startFrames: clip.startFrames,  // Use visual startFrames (originalStart + leftCropFrames)
                     endFrames: clip.endFrames       // Use visual endFrames
                   };
                   
                   // Debug logging for right crop
                   if (trimmingClip && trimmingClip.id === clip.id && trimHandle === 'end') {
                     // Display clip for right crop
                   }
                   
                   
                   return (
                   <div
                     key={clip.id}
                     data-clip-id={clip.id}
                     onClick={(e) => {
                       e.stopPropagation(); // Prevent timeline click
                         // Timeline clip clicked
                       // Pass clip data to parent component for preview
                       if (onClipSelect && typeof onClipSelect === 'function') {
                         onClipSelect(clip);
                       }
                         
                         // Trigger frame generation for the selected clip at current playhead position
                         setTimeout(() => {
                           extractSingleFrame(playheadPosition);
                         }, 50);
                     }}
                     onMouseDown={(e) => {
                       e.stopPropagation(); // Prevent timeline click
                         // Timeline clip mouse down
                       
                       // Start drag operation (same as ClipList)
                       setIsDraggingClip(true);
                         
                         // Trigger frame generation when timeline clip drag starts
                         setTimeout(() => {
                           extractSingleFrame(playheadPosition);
                         }, 50);
                         
                       setDragPreview({
                         ...clip,
                         track: clip.track,
                         startPixel: clip.startPixel,
                         endPixel: clip.endPixel,
                         widthPixel: clip.widthPixel
                       });
                       
                       // Remove old magnetic points for this clip (EXACT same as cliplist)
                       setMagneticPoints(prev => {
                         const newMap = new Map(prev);
                         // Remove old magnetic points for this clip
                         for (const [key, value] of newMap.entries()) {
                           if (value.track === clip.track && 
                               (value.frame === clip.startFrames + pixelsToFrames(MAGNETIC_OFFSET_PIXELS) ||
                                value.frame === clip.endFrames + pixelsToFrames(MAGNETIC_OFFSET_PIXELS))) {
                             newMap.delete(key);
                           }
                         }
                         return newMap;
                       });
                     }}
                     onMouseEnter={(e) => {
                       e.target.style.background = "#0056b3"; // Darker blue on hover
                       e.target.style.transform = "scale(1.02)"; // Slight scale up
                       // Keep black border if selected
                       if (selectedClip?.id === clip.id) {
                         e.target.style.border = "2px solid #000000";
                       }
                     }}
                     onMouseLeave={(e) => {
                       e.target.style.background = "#007bff"; // Back to original blue
                       e.target.style.transform = "scale(1)"; // Back to original size
                       // Restore proper border based on selection state
                       if (selectedClip?.id === clip.id) {
                         e.target.style.border = "2px solid #000000";
                       } else {
                         e.target.style.border = "1px solid #0056b3";
                       }
                     }}
                     style={{
                       position: "absolute",
                         left: `${framesToPixels(displayClip.startFrames)}px`,
                       top: "5px",
                       bottom: "5px",
                         width: `${framesToPixels(displayClip.endFrames) - framesToPixels(displayClip.startFrames)}px`,
                       background: "#007bff",
                       border: selectedClip?.id === clip.id ? "2px solid #000000" : "1px solid #0056b3",
                       borderRadius: "3px",
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "center",
                       color: "white",
                       fontSize: "10px",
                       fontWeight: "600",
                       cursor: "pointer",
                       userSelect: "none",
                       transition: "all 0.2s ease"
                     }}
                     title={`${clip.character} - ${clip.filename} (${clip.duration}s, ${clip.widthPixel}px wide) - Click to preview`}
                   >
                     {clip.character}
                       
                       {/* Start Trim Handle - Left Bracket */}
                       <div
                         style={{
                           position: "absolute",
                           left: "0px",
                           top: "2px",
                           bottom: "2px",
                           width: "3px",
                           borderLeft: selectedClip?.id === clip.id ? "2px solid #ff6b6b" : "2px solid #ff9999",
                           borderTop: selectedClip?.id === clip.id ? "2px solid #ff6b6b" : "2px solid #ff9999",
                           borderBottom: selectedClip?.id === clip.id ? "2px solid #ff6b6b" : "2px solid #ff9999",
                           borderRight: "none",
                           cursor: "ew-resize",
                           opacity: isMagneticDeleteActive && trimHandle === 'start' && (trimmingClip?.id === clip.id) ? 0 : 1,
                           transition: "opacity 0.2s ease",
                           zIndex: 10
                         }}
                         onMouseDown={(e) => handleTrimHandleMouseDown(e, clip, 'start')}
                         onMouseEnter={(e) => {
                           e.target.style.borderLeftColor = "#ff5252";
                           e.target.style.borderTopColor = "#ff5252";
                           e.target.style.borderBottomColor = "#ff5252";
                         }}
                         onMouseLeave={(e) => {
                           const color = selectedClip?.id === clip.id ? "#ff6b6b" : "#ff9999";
                           e.target.style.borderLeftColor = color;
                           e.target.style.borderTopColor = color;
                           e.target.style.borderBottomColor = color;
                         }}
                       />
                       
                       {/* End Trim Handle - Right Bracket */}
                       <div
                         style={{
                           position: "absolute",
                           right: "0px",
                           top: "2px",
                           bottom: "2px",
                           width: "3px",
                           borderLeft: "none",
                           borderRight: selectedClip?.id === clip.id ? "2px solid #ff6b6b" : "2px solid #ff9999",
                           borderTop: selectedClip?.id === clip.id ? "2px solid #ff6b6b" : "2px solid #ff9999",
                           borderBottom: selectedClip?.id === clip.id ? "2px solid #ff6b6b" : "2px solid #ff9999",
                           cursor: "ew-resize",
                           opacity: isMagneticDeleteActive && trimHandle === 'end' && (trimmingClip?.id === clip.id) ? 0 : 1,
                           transition: "opacity 0.2s ease",
                           zIndex: 10
                         }}
                         onMouseDown={(e) => {
                           // Right trim handle clicked
                           handleTrimHandleMouseDown(e, clip, 'end');
                         }}
                         onMouseEnter={(e) => {
                           e.target.style.borderRightColor = "#ff5252";
                           e.target.style.borderTopColor = "#ff5252";
                           e.target.style.borderBottomColor = "#ff5252";
                         }}
                         onMouseLeave={(e) => {
                           const color = selectedClip?.id === clip.id ? "#ff6b6b" : "#ff9999";
                           e.target.style.borderRightColor = color;
                           e.target.style.borderTopColor = color;
                           e.target.style.borderBottomColor = color;
                         }}
                       />
                       
                       {/* Magnetic Delete Indicator - thick red line at opposite edge */}
                       {isMagneticDeleteActive && trimHandle && (trimmingClip?.id === clip.id) && (
                         <div
                           style={(() => {
                             const baseStyle = {
                               position: "absolute",
                               top: "0",
                               bottom: "0",
                               width: "4px",
                               background: "#ff0000",
                               zIndex: 20,
                               boxShadow: "0 0 10px #ff0000"
                             };
                             if (trimHandle === 'start') {
                               baseStyle.right = "-2px";
                             } else {
                               baseStyle.left = "-2px";
                             }
                             return baseStyle;
                           })()}
                         />
                       )}
                       
                   </div>
                   );
                 })}
               
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
           {/* Timeline boundaries are now shown as dynamic magnetic points above */}
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
       {showMagneticDebug && Array.from(magneticPoints.values()).map((point, index) => {
         // Find the timeline start offset (first orange border) to normalize display
         const timelineStartPoint = Array.from(magneticPoints.values()).find(p => 
           p.type === MAGNETIC_TYPES.BORDER && p.track === 'timeline'
         );
         const timelineOffset = timelineStartPoint ? timelineStartPoint.frame : 0;
         
         // Subtract offset for display only (don't change backend logic)
         const displayFrame = point.frame - timelineOffset;
         const frameInSeconds = displayFrame / 60;
         const timeString = `${Math.floor(frameInSeconds / 60)}:${(frameInSeconds % 60).toFixed(2).padStart(5, '0')}`;
         const typeDescription = {
           [MAGNETIC_TYPES.BORDER]: 'Timeline Border',
           [MAGNETIC_TYPES.CLIP_START]: 'Clip Start',
           [MAGNETIC_TYPES.CLIP_END]: 'Clip End',
           [MAGNETIC_TYPES.PLAYHEAD]: 'Playhead',
           [MAGNETIC_TYPES.DRAGGED_CLIP]: 'Dragged Clip',
           [MAGNETIC_TYPES.DRAGGED_LOCATION]: 'Dragged Location'
         }[point.type] || point.type;
         
         return (
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
               pointerEvents: "auto",
             opacity: 0.9,
               boxShadow: `0 0 4px ${point.color || "#ff0000"}`,
               cursor: "pointer"
             }}
             onMouseEnter={(e) => {
               // Create detailed debug tooltip
               const tooltip = document.createElement('div');
               tooltip.id = 'magnetic-debug-tooltip';
               tooltip.style.cssText = `
                 position: fixed;
                 top: ${e.clientY - 10}px;
                 left: ${e.clientX + 10}px;
                 background: rgba(0, 0, 0, 0.95);
                 color: white;
                 padding: 8px 12px;
                 border-radius: 4px;
                 font-family: monospace;
                 font-size: 11px;
                 z-index: 10000;
                 border: 1px solid ${point.color || "#ff0000"};
                 box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                 white-space: pre-line;
                 pointer-events: none;
               `;
               tooltip.textContent = `${typeDescription}
Frame: ${displayFrame}f (60fps)
Time: ${timeString}
Track: ${point.track}
Type: ${point.type}
Color: ${point.color}${point.clipId ? `
Clip ID: ${point.clipId}` : ''}`;
               document.body.appendChild(tooltip);
             }}
             onMouseMove={(e) => {
               const tooltip = document.getElementById('magnetic-debug-tooltip');
               if (tooltip) {
                 tooltip.style.top = `${e.clientY - 10}px`;
                 tooltip.style.left = `${e.clientX + 10}px`;
               }
             }}
             onMouseLeave={() => {
               const tooltip = document.getElementById('magnetic-debug-tooltip');
               if (tooltip) {
                 tooltip.remove();
               }
             }}
           />
         );
       })}
       
     </div>
   );
 }


