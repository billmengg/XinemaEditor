import React, { useEffect, useState, useRef, useCallback } from "react";
import { logOnce } from '../utils/consoleDeduplication';

// Lazy loading duration component
const LazyDuration = ({ clip }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [duration, setDuration] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const durationRef = useRef(null);

  const observerRef = useRef(null);

  useEffect(() => {
    if (durationRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current.disconnect();
          }
        },
        { 
          rootMargin: '10px',
          threshold: 0.1 
        }
      );
      observerRef.current.observe(durationRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && !duration && !isLoading && !hasError) {
      setIsLoading(true);
      
      // Fetch actual duration from backend
      fetch(`http://localhost:5000/api/duration/${clip.character}/${clip.filename}`)
        .then(response => response.json())
        .then(data => {
          setDuration(data.duration);
          setIsLoading(false);
        })
        .catch(error => {
          // Error fetching duration
          setHasError(true);
          setIsLoading(false);
        });
    }
  }, [isVisible, duration, isLoading, hasError, clip.character, clip.filename]);

  return (
    <div 
      ref={durationRef}
      style={{ 
        minHeight: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start"
      }}
    >
      {isVisible && (
        <>
          {isLoading && (
            <div style={{ fontSize: "10px", color: "#999" }}>
              Loading...
            </div>
          )}
          {duration && !isLoading && (
            <div style={{ fontSize: "11px", color: "#888" }}>
              {duration}
            </div>
          )}
          {hasError && (
            <div style={{ fontSize: "10px", color: "#f00" }}>
              Error
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Lazy loading thumbnail component
const LazyThumbnail = ({ clip, onError }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  const observerRef = useRef(null);

  useEffect(() => {
    if (imgRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current.disconnect();
          }
        },
        { 
          rootMargin: '10px',
          threshold: 0.1 
        }
      );
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleError = useCallback((e) => {
    setHasError(true);
    setIsLoaded(false);
    if (onError) onError();
  }, [onError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  return (
    <div 
      ref={imgRef}
      style={{ 
        width: "100%", 
        height: "80px", 
        background: "#e0e0e0", 
        borderRadius: "4px",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {isVisible && !hasError && (
        <video 
          src={`http://localhost:5000/api/video/${clip.character}/${clip.filename}`}
          style={{ 
            width: "100%", 
            height: "100%", 
            objectFit: "cover", 
            borderRadius: "4px",
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.3s ease"
          }}
          muted
          preload="metadata"
          onError={handleError}
          onLoadedMetadata={handleLoad}
        />
      )}
      {(!isVisible || hasError) && (
        <div style={{ 
          display: "flex", 
          width: "100%", 
          height: "100%", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <span>🎬</span>
        </div>
      )}
      {isVisible && !isLoaded && !hasError && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "12px",
          color: "#666"
        }}>
          Loading...
        </div>
      )}
    </div>
  );
};

// Utility for filtering/searching the clips
function filterClips(clips, search, selectedCharacter, selectedSeason) {
  let filtered = clips;
  
  // Apply character filter
  if (selectedCharacter !== "all") {
    filtered = filtered.filter(clip => clip.character === selectedCharacter);
  }
  
  // Apply season filter
  if (selectedSeason !== "all") {
    filtered = filtered.filter(clip => clip.season === selectedSeason);
  }
  
  // Apply search filter
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (clip) =>
        clip.filename.toLowerCase().includes(s) ||
        clip.id.toLowerCase().includes(s) ||
        (clip.character && clip.character.toLowerCase().includes(s)) ||
        (clip.season && clip.season.toLowerCase().includes(s)) ||
        (clip.episode && clip.episode.toLowerCase().includes(s))
    );
  }
  
  return filtered;
}

export default function ClipList({ onClipSelect, importedMedia: externalImportedMedia, setImportedMedia: setExternalImportedMedia }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [importedSearch, setImportedSearch] = useState(""); // Search for imported media
  const [selectedClip, setSelectedClip] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "table" or "grid"
  const [selectedCharacter, setSelectedCharacter] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [contextMenu, setContextMenu] = useState(null);
  const [columnsExpanded, setColumnsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("arcane"); // "arcane" or "imported"
  // Use external state if provided, otherwise use internal state
  const [internalImportedMedia, setInternalImportedMedia] = useState([]);
  const importedMedia = externalImportedMedia !== undefined ? externalImportedMedia : internalImportedMedia;
  const setImportedMedia = setExternalImportedMedia || setInternalImportedMedia;
  const [selectedImportedMedia, setSelectedImportedMedia] = useState(null); // Selected imported media item
  const [isDraggingOver, setIsDraggingOver] = useState(false); // Track if dragging files over drop zone
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isOverTimeline, setIsOverTimeline] = useState(false);
  const [dragEndTime, setDragEndTime] = useState(0); // Track when drag ended
  
  const [isDragDebounced, setIsDragDebounced] = useState(false); // Prevent rapid drag operations
  const isDraggingRef = useRef(false); // Track actual drag state
  const dragLockRef = useRef(false); // Prevent concurrent drag starts

  // Function to convert duration string to seconds
  const parseDurationToSeconds = (durationStr) => {
    if (!durationStr || durationStr === "0:00") return 5; // Default 5 seconds
    
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      return minutes * 60 + seconds;
    }
    
    return 5; // Default fallback
  };

  useEffect(() => {
    async function fetchClips() {
      const resp = await fetch("http://localhost:5000/api/files");
      const data = await resp.json();
      setClips(data);
      setLoading(false);
    }
    fetchClips();
  }, []);

  // Cleanup effect to reset drag state on unmount
  useEffect(() => {
    return () => {
      // Reset drag state when component unmounts
      isDraggingRef.current = false;
      dragLockRef.current = false;
      setDraggedClip(null);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setDragPosition({ x: 0, y: 0 });
      setIsOverTimeline(false);
      setIsDragDebounced(false);
    };
  }, []);

  // Additional cleanup on window blur to prevent stuck drag states
  useEffect(() => {
    const handleWindowBlur = () => {
      if (isDragging) {
        isDraggingRef.current = false;
        dragLockRef.current = false;
        setDraggedClip(null);
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setDragPosition({ x: 0, y: 0 });
        setIsOverTimeline(false);
        setIsDragDebounced(false);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [isDragging]);

  // Listen for successful clip placement to immediately reset drag state
  useEffect(() => {
    const handleClipPlacementSuccess = () => {
      console.log('✅ CLIP PLACED on timeline at', new Date().toLocaleTimeString());
      // Immediately reset all drag state when clip is successfully placed
      isDraggingRef.current = false;
      dragLockRef.current = false; // Release the lock
      setDraggedClip(null);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setDragPosition({ x: 0, y: 0 });
      setIsOverTimeline(false);
      setIsDragDebounced(false);
    };

    window.addEventListener('clipPlacementSuccess', handleClipPlacementSuccess);
    return () => window.removeEventListener('clipPlacementSuccess', handleClipPlacementSuccess);
  }, []);

  // Track mouse movement during drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setDragPosition({ x: e.clientX, y: e.clientY });
        
        // Check if over timeline
        const timelineElement = document.querySelector('.timeline-content');
        if (timelineElement) {
          const timelineRect = timelineElement.getBoundingClientRect();
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          
          // Check if mouse is over timeline area
          const isOver = mouseX >= timelineRect.left && mouseX <= timelineRect.right &&
                        mouseY >= timelineRect.top && mouseY <= timelineRect.bottom;
          setIsOverTimeline(isOver);
          
          // Dispatch custom drag over event to timeline
          if (isOver) {
            const dragOverEvent = new CustomEvent('timelineDragOver', {
              detail: {
                clip: draggedClip,
                clientX: mouseX,
                clientY: mouseY,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey
              }
            });
            timelineElement.dispatchEvent(dragOverEvent);
          } else {
            // Dispatch drag leave event when not over timeline
            const dragLeaveEvent = new CustomEvent('timelineDragLeave', {
              detail: {
                clip: draggedClip,
                clientX: mouseX,
                clientY: mouseY
              }
            });
            timelineElement.dispatchEvent(dragLeaveEvent);
          }
        }
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging && draggedClip) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // CRITICAL: Check if mouse is CURRENTLY over ClipList - if so, don't place the clip
        const clipListContainer = document.querySelector('.clip-list-container');
        const clipListRect = clipListContainer?.getBoundingClientRect();
        const isCurrentlyOverClipList = clipListRect && 
          mouseX >= clipListRect.left && 
          mouseX <= clipListRect.right &&
          mouseY >= clipListRect.top && 
          mouseY <= clipListRect.bottom;
        
        if (isCurrentlyOverClipList) {
          console.log('⚠️ Mouse is over ClipList - not placing clip');
          // Just reset drag state, don't place the clip
          isDraggingRef.current = false;
          dragLockRef.current = false;
          setDraggedClip(null);
          setIsDragging(false);
          setDragOffset({ x: 0, y: 0 });
          setDragPosition({ x: 0, y: 0 });
          setIsOverTimeline(false);
          setDragEndTime(Date.now());
          
          // Clear any existing drag preview on timeline
          const timelineElement2 = document.querySelector('.timeline-content');
          if (timelineElement2) {
            const clearEvent = new CustomEvent('timelineDragClear');
            timelineElement2.dispatchEvent(clearEvent);
          }
          return;
        }
        
        // Check if dropping over timeline
        const timelineElement = document.querySelector('.timeline-content');
        if (timelineElement) {
          const timelineRect = timelineElement.getBoundingClientRect();
          
          // Check if mouse is over timeline area
          if (mouseX >= timelineRect.left && mouseX <= timelineRect.right &&
              mouseY >= timelineRect.top && mouseY <= timelineRect.bottom) {
            
            // Calculate track based on mouse position
            // Use the same coordinate system as Timeline component
            const relativeY = mouseY - timelineRect.top;
            let targetTrack = 3; // Default to track 3 (highest)
            
            // Use the same track boundaries as Timeline component
            if (relativeY >= 100 && relativeY < 150) {
              targetTrack = 3; // Top track
            } else if (relativeY >= 150 && relativeY < 200) {
              targetTrack = 2; // Middle track
            } else if (relativeY >= 200 && relativeY < 250) {
              targetTrack = 1; // Bottom track
            }
            
            // Create a synthetic drop event
            const dropEvent = new CustomEvent('timelineDrop', {
              detail: {
                clip: draggedClip,
                clientX: mouseX,
                clientY: mouseY,
                track: targetTrack
              }
            });
            
            // Dispatch the event to the timeline
            timelineElement.dispatchEvent(dropEvent);
          }
          // If not over timeline, don't place the clip - just cancel the drag
        }
        
        // ALWAYS clear drag state regardless of where mouse is
        // Clear any existing drag preview on timeline
        const timelineElement2 = document.querySelector('.timeline-content');
        if (timelineElement2) {
          const clearEvent = new CustomEvent('timelineDragClear');
          timelineElement2.dispatchEvent(clearEvent);
        }
        
        // Reset all drag state
        console.log('⏹️ DRAG ENDED:', draggedClip?.id, 'at', new Date().toLocaleTimeString());
        isDraggingRef.current = false;
        dragLockRef.current = false; // Release the lock
        setDraggedClip(null);
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setDragPosition({ x: 0, y: 0 });
        setIsOverTimeline(false);
        setDragEndTime(Date.now()); // Record when drag ended
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Get unique characters and seasons for navigation
  const characters = [...new Set(clips.map(clip => clip.character).filter(Boolean))].sort();
  const seasons = [...new Set(clips.map(clip => clip.season).filter(Boolean))].sort();

  // Filter imported media based on search
  const filteredImportedMedia = importedMedia.filter(media => {
    if (!importedSearch) return true;
    const searchLower = importedSearch.toLowerCase();
    return media.filename.toLowerCase().includes(searchLower) ||
           (media.path && media.path.toLowerCase().includes(searchLower));
  });

  // Sorting logic
  const sortedClips = [...filterClips(clips, search, selectedCharacter, selectedSeason)].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    
    // Special handling for ID field - extract numerical part
    if (sortField === "id") {
      // Remove character prefix and convert to number for proper numerical sorting
      valA = parseInt(valA.replace(/^[A-Za-z]+/, '')) || 0;
      valB = parseInt(valB.replace(/^[A-Za-z]+/, '')) || 0;
    } else {
      // Handle other fields as strings
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
    }
    
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleClipClick = (clip, e) => {
    try {
      // Prevent click if we just finished dragging (within 100ms)
      if (isDragging || (Date.now() - dragEndTime) < 100) {
        return;
      }
      
      setSelectedClip(clip);
      if (onClipSelect && typeof onClipSelect === 'function') {
        onClipSelect(clip);
      }
    } catch (error) {
      // Error in handleClipClick
    }
  };

  // Convert imported media to clip format for timeline
  const convertImportedMediaToClip = (media) => {
    return {
      id: media.id,
      character: 'Imported', // Use 'Imported' as character for imported media
      filename: media.filename,
      duration: media.duration || 5, // Use actual duration or default
      description: `Imported media: ${media.filename}`,
      // Add metadata for timeline
      type: 'imported',
      importedMedia: media, // Keep reference to original media object
      // Timeline will use character and filename to create staticClipKey
    };
  };

  const handleMouseDown = (e, clip, isImportedMedia = false) => {
    // Check if currentTarget exists
    if (!e.currentTarget) {
      // currentTarget is null in handleMouseDown
      return;
    }
    
    // Prevent starting new drag if one is already in progress
    if (isDragging || isDraggingRef.current || dragLockRef.current) {
      return;
    }
    
    // Prevent rapid drag operations (debounce)
    const now = Date.now();
    if (now - dragEndTime < 100) { // 100ms debounce
      return;
    }
    
    // Convert imported media to clip format if needed
    const clipToDrag = isImportedMedia ? convertImportedMediaToClip(clip) : clip;
    
    // Store initial mouse position for drag detection
    const startX = e.clientX;
    const startY = e.clientY;
    
    const handleMouseMove = async (moveEvent) => {
      // Early return if already dragging - prevents duplicate drag starts
      if (isDraggingRef.current || dragLockRef.current) {
        return;
      }
      
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - startY);
      
      // If mouse moved more than 5 pixels, start drag operation
      if (deltaX > 5 || deltaY > 5) {
        e.preventDefault(); // Only prevent default when actually dragging
        
        // SET THE LOCK IMMEDIATELY to prevent concurrent drag starts
        dragLockRef.current = true;
        isDraggingRef.current = true;
        
        // Verify mousedown was inside ClipList container (prevent accidental drags from other UI)
        const clipListContainer = document.querySelector('.clip-list-container');
        const clipListRect = clipListContainer?.getBoundingClientRect();
        const isInsideClipList = clipListRect && 
          e.clientX >= clipListRect.left && 
          e.clientX <= clipListRect.right &&
          e.clientY >= clipListRect.top && 
          e.clientY <= clipListRect.bottom;
        
        if (!isInsideClipList) {
          console.log('⚠️ Mousedown outside ClipList - not starting drag');
          return;
        }
        
        // Clear any existing drag preview on timeline and capture playhead position
        const timelineElement = document.querySelector('.timeline-content');
        if (timelineElement) {
          const clearEvent = new CustomEvent('timelineDragClear');
          timelineElement.dispatchEvent(clearEvent);
          
          // Request current playhead position for magnetism
          const playheadRequestEvent = new CustomEvent('requestPlayheadPosition');
          timelineElement.dispatchEvent(playheadRequestEvent);
        }
        
        // Fetch actual duration only when drag initiates (clip should be lazy loaded)
        let durationInSeconds = 5; // Default fallback
        
        if (isImportedMedia) {
          // For imported media, use the duration from the media object (already in seconds)
          durationInSeconds = clipToDrag.duration || 5;
        } else {
          // For Arcane clips, parse duration string or fetch from backend
          durationInSeconds = parseDurationToSeconds(clipToDrag.duration);
          
          // If duration is still placeholder, fetch the real duration
          if (clipToDrag.duration === "0:00" || !clipToDrag.duration) {
            try {
              const response = await fetch(`http://localhost:5000/api/duration/${clipToDrag.character}/${clipToDrag.filename}`);
              const data = await response.json();
              
              if (data.duration && data.duration !== "0:00") {
                durationInSeconds = parseDurationToSeconds(data.duration);
              }
            } catch (error) {
              // Error fetching duration
            }
          }
        }
        
        // Create clip with actual duration
        const clipWithDuration = {
          ...clipToDrag,
          duration: durationInSeconds,
          durationString: clipToDrag.duration
        };
        
        setDraggedClip(clipWithDuration);
        console.log('▶️ DRAG STARTED:', clipWithDuration.id, 'at', new Date().toLocaleTimeString());
        // isDraggingRef and dragLockRef already set above
        setIsDragging(true);
        
        // Request timeline to take snapshot of magnetic points
        if (timelineElement) {
          const snapshotEvent = new CustomEvent('requestMagneticSnapshot');
          timelineElement.dispatchEvent(snapshotEvent);
        }
        
        try {
          if (e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            setDragOffset({
              x: moveEvent.clientX - rect.left,
              y: moveEvent.clientY - rect.top
            });
          } else {
            // Fallback to using clientX/Y directly
            setDragOffset({
              x: 0,
              y: 0
            });
          }
        } catch (error) {
          // Fallback to using clientX/Y directly
          setDragOffset({
            x: 0,
            y: 0
          });
        }
        
        setDragPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
        
        // Remove the temporary mouse move listener
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
    
    const handleMouseUp = () => {
      // Remove listeners if mouse is released without dragging
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Always reset drag state to prevent stuck states
      if (isDragging || isDraggingRef.current) {
        isDraggingRef.current = false;
        dragLockRef.current = false;
        setDraggedClip(null);
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setDragPosition({ x: 0, y: 0 });
        setIsOverTimeline(false);
        setDragEndTime(Date.now());
      }
    };
    
    // Add temporary listeners to detect if this becomes a drag
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };


  const toggleColumns = () => {
    setColumnsExpanded(!columnsExpanded);
  };

  const handleContextMenu = (e, clip) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      clip: clip
    });
  };

  const handleContextMenuAction = (action, clip) => {
    // Action for clip
    setContextMenu(null);
    // TODO: Implement actual actions
  };

  // Handle file drop for imported media
  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter(file => {
      const ext = file.name.toLowerCase().split('.').pop();
      return ['mp4', 'mov', 'avi', 'webm'].includes(ext);
    });

    if (videoFiles.length === 0) {
      alert('Please drop MP4, MOV, AVI, or WebM video files');
      return;
    }

    // Process each file
    for (const file of videoFiles) {
      // Get file path - in Electron/desktop apps, file.path has full path
      // In browsers, we only have the filename
      // Check if we're in a desktop app context
      const isDesktopApp = window.electronAPI || window.__TAURI__ || window.require;
      const filePath = isDesktopApp && file.path ? file.path : file.name;
      
      // Create video element to extract metadata
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.preload = 'metadata';
      video.src = url;
      
      video.onloadedmetadata = async () => {
        const mediaItem = {
          id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'video',
          filename: file.name,
          path: filePath,
          size: file.size,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          lastModified: file.lastModified,
          file: file, // Store file object for potential future use
          url: url // Store object URL for preview (will be revoked after metadata load)
        };
        
        setImportedMedia(prev => [...prev, mediaItem]);
        // Note: URL.revokeObjectURL will be called after we're done with metadata
        // We keep the file object so we can recreate the URL if needed
      };
      
      video.onerror = () => {
        console.error('Error loading video metadata:', file.name);
        URL.revokeObjectURL(url);
      };
      
      // Load metadata
      video.load();
    }
  };

  const handleFileDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleFileDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleFileDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingOver(false);
    }
  };

  // Handle clicking on imported media
  const handleImportedMediaClick = async (media) => {
    setSelectedImportedMedia(media);
    setSelectedClip(null); // Clear Arcane clip selection
    if (onClipSelect) {
      // Use stored URL or create one from file if needed
      let previewUrl = media.url || (media.file ? URL.createObjectURL(media.file) : null);
      let file = media.file;
      
      // If this is restored media without a file, automatically restore it when clicked
      if (!file && !previewUrl && media.restored && window.showOpenFilePicker) {
        try {
          console.log(`🔄 Auto-restoring file: "${media.filename}"`);
          
          // Open file picker to restore this specific file (user gesture from click)
          const fileHandles = await window.showOpenFilePicker({
            suggestedName: media.filename,
            types: [{ 
              description: 'Video Files', 
              accept: { 
                'video/*': ['.mp4', '.mov', '.avi', '.webm'] 
              } 
            }],
            excludeAcceptAllOption: false,
            multiple: false
          });
          
          if (fileHandles && fileHandles.length > 0) {
            file = await fileHandles[0].getFile();
            
            // Verify it's the right file (check filename and size)
            const filenameMatch = file.name === media.filename || file.name.toLowerCase() === media.filename.toLowerCase();
            const sizeMatch = !media.size || Math.abs(file.size - media.size) < 1000;
            
            if (filenameMatch || sizeMatch) {
              // Extract metadata and create object URL
              const video = document.createElement('video');
              previewUrl = URL.createObjectURL(file);
              video.preload = 'metadata';
              video.src = previewUrl;
              
              await new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                  // Update the media item with restored file and actual metadata
                  const updatedMedia = {
                    ...media,
                    file: file,
                    url: previewUrl,
                    duration: video.duration, // Use actual duration
                    width: video.videoWidth,  // Use actual dimensions
                    height: video.videoHeight,
                    restored: false
                  };
                  
                  setImportedMedia(prev => prev.map(m => 
                    m.id === media.id ? updatedMedia : m
                  ));
                  
                  console.log(`✅ Auto-restored file: "${file.name}"`);
                  resolve();
                };
                video.onerror = () => {
                  // Still use the file even if metadata extraction fails
                  const updatedMedia = {
                    ...media,
                    file: file,
                    url: previewUrl,
                    restored: false
                  };
                  setImportedMedia(prev => prev.map(m => 
                    m.id === media.id ? updatedMedia : m
                  ));
                  resolve();
                };
                video.load();
              });
            } else {
              alert(`Selected file doesn't match "${media.filename}". Please select the correct file.`);
              return;
            }
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error('Error restoring file:', e);
            alert(`Could not restore file: ${e.message || 'Unknown error'}`);
          }
        }
      }
      
      // Show preview if we have a file/URL, or just metadata if not
      if (previewUrl || file) {
        onClipSelect({
          id: media.id,
          filename: media.filename,
          character: 'Imported',
          duration: media.duration,
          path: media.path,
          type: 'imported',
          file: file,
          url: previewUrl,
          width: media.width,
          height: media.height
        });
      } else {
        // Show metadata even without file access
        onClipSelect({
          id: media.id,
          filename: media.filename,
          character: 'Imported',
          duration: media.duration,
          path: media.path,
          type: 'imported',
          file: null,
          url: null,
          width: media.width,
          height: media.height
        });
      }
    }
  };

  if (loading) return <div style={{padding:24}}>Loading media library</div>;

  return (
    <div 
      className="clip-list-container"
      style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative", width: "100%" }}
    >
      {/* Media Library Header */}
      <div style={{ 
        padding: "12px 16px", 
        borderBottom: "1px solid #ddd", 
        background: "white",
        flexShrink: 0
      }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#333" }}>
          Media Library
        </h2>
      </div>
      
      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* Drag Preview */}
      {isDragging && draggedClip && !isOverTimeline && (
        <div
          className="clip-drag-preview"
          data-clip={JSON.stringify(draggedClip)}
          style={{
            position: "fixed",
            left: dragPosition.x - 100, // Center horizontally (half of 200px width)
            top: dragPosition.y - 50,   // Center vertically (half of ~100px height)
            zIndex: 1000,
            pointerEvents: "none",
            opacity: 0.9,
            border: "2px solid #007bff",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            background: "white",
            padding: "12px",
            width: "200px",
            transform: "scale(1.05)",
            transition: "none" // Disable transitions for immediate positioning
          }}
        >
          {/* Lazy Loading Thumbnail */}
          <LazyThumbnail 
            clip={draggedClip}
          />
          
          {/* Filename */}
          <div style={{ 
            marginTop: "8px", 
            fontSize: "12px", 
            fontWeight: "600",
            color: "#333",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
            {draggedClip.filename}
          </div>
        </div>
      )}

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
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderBottom: "1px solid #eee"
            }}
            onClick={() => handleContextMenuAction("preview", contextMenu.clip)}
          >
            Preview
          </div>
          <div
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderBottom: "1px solid #eee"
            }}
            onClick={() => handleContextMenuAction("rename", contextMenu.clip)}
          >
            Rename
          </div>
          <div
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderBottom: "1px solid #eee"
            }}
            onClick={() => handleContextMenuAction("view_metadata", contextMenu.clip)}
          >
            View Metadata
          </div>
          <div
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              color: "#dc3545"
            }}
            onClick={() => handleContextMenuAction("delete", contextMenu.clip)}
          >
            Delete
          </div>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setContextMenu(null)}
        />
      )}
      
      {/* Clip Browser - Now on the LEFT */}
      <div style={{ flex: "1", borderRight: activeTab === "arcane" ? "1px solid #eee" : "none", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Fixed Header with Tabs */}
      <div style={{ 
          padding: "16px 16px 0 16px", 
          borderBottom: "1px solid #eee", 
          background: "white",
          minHeight: "124px" // Fixed height to prevent layout shifts
        }}>
          {/* Tabs */}
          <div style={{ 
            display: "flex", 
            gap: "0", 
            marginBottom: "16px", 
            borderBottom: "1px solid #e0e0e0",
            background: "white"
          }}>
            <button
              onClick={() => setActiveTab("arcane")}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: activeTab === "arcane" ? "2px solid #007bff" : "2px solid transparent",
                background: "transparent",
                color: activeTab === "arcane" ? "#007bff" : "#666",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "-1px",
                transition: "all 0.15s ease",
                outline: "none",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "arcane") {
                  e.target.style.color = "#007bff";
                  e.target.style.background = "#f8f9fa";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "arcane") {
                  e.target.style.color = "#666";
                  e.target.style.background = "transparent";
                }
              }}
            >
              Arcane Clips
            </button>
                <button
              onClick={() => setActiveTab("imported")}
                  style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: activeTab === "imported" ? "2px solid #007bff" : "2px solid transparent",
                background: "transparent",
                color: activeTab === "imported" ? "#007bff" : "#666",
                    cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "-1px",
                transition: "all 0.15s ease",
                outline: "none",
                position: "relative"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "imported") {
                  e.target.style.color = "#007bff";
                  e.target.style.background = "#f8f9fa";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "imported") {
                  e.target.style.color = "#666";
                  e.target.style.background = "transparent";
                }
              }}
            >
              Imported Media
                </button>
      </div>

          {/* Search and Controls - Always rendered to maintain layout */}
          <div style={{ 
            paddingBottom: "16px",
            opacity: activeTab === "arcane" ? 1 : 0,
            visibility: activeTab === "arcane" ? "visible" : "hidden",
            height: activeTab === "arcane" ? "auto" : "0",
            overflow: "hidden",
            transition: "opacity 0.15s ease, visibility 0.15s ease"
          }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Search clips by filename, character, id, season, episode"
              value={search}
              onChange={e => setSearch(e.target.value)}
                disabled={activeTab !== "arcane"}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                  fontSize: "14px",
                  transition: "border-color 0.15s ease"
              }}
            />
            <button
              onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
                disabled={activeTab !== "arcane"}
              style={{
                  padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "white",
                  cursor: activeTab === "arcane" ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.15s ease",
                  minWidth: "80px"
              }}
            >
              {viewMode === "table" ? "Grid" : "Table"}
            </button>
          </div>

          {/* Table Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "24px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                {activeTab === "arcane" ? `${sortedClips.length} clips found` : ""}
              </div>
            </div>
          </div>
          
          {/* Imported Media Search */}
          <div style={{ 
            paddingBottom: "16px",
            opacity: activeTab === "imported" ? 1 : 0,
            visibility: activeTab === "imported" ? "visible" : "hidden",
            height: activeTab === "imported" ? "auto" : "0",
            overflow: "hidden",
            transition: "opacity 0.15s ease, visibility 0.15s ease"
          }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                placeholder="Search imported media by filename"
                value={importedSearch}
                onChange={e => setImportedSearch(e.target.value)}
                disabled={activeTab !== "imported"}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  transition: "border-color 0.15s ease"
                }}
              />
            </div>

            {/* Imported Media Count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "24px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                {activeTab === "imported" ? `${filteredImportedMedia.length} media file${filteredImportedMedia.length !== 1 ? 's' : ''} found` : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px", minWidth: 0 }}>
          {/* Show content based on active tab */}
          {activeTab === "arcane" ? (
            <>
          {/* Table View */}
          {viewMode === "table" && (
            <div style={{ position: "relative" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px", minWidth: columnsExpanded ? "800px" : "400px" }}>
              <thead>
                <tr style={{ background: "#f6f6f6" }}>
                  {/* Filename column - always visible */}
                  <th
                    onClick={() => {
                      if (sortField === "filename") { setSortDir(sortDir === "asc" ? "desc" : "asc"); }
                      else { setSortField("filename"); setSortDir("asc"); }
                    }}
                    style={{ 
                      border: "1px solid #eee", 
                      cursor: "pointer", 
                      padding: "8px", 
                      fontWeight: "600", 
                      userSelect: "none",
                      textAlign: "left",
                      width: "400px",
                      minWidth: "400px"
                    }}
                  >
                    FILENAME {sortField === "filename" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  
                  {/* Thumbnail column - always visible */}
                  <th
                    style={{ 
                      border: "1px solid #eee", 
                      padding: "1px", 
                      fontWeight: "600", 
                      textAlign: "center",
                      width: "50px",
                      minWidth: "50px",
                      background: "#f6f6f6"
                    }}
                  >
                    THUMBNAIL
                  </th>
                  
                  {/* Expand/Collapse column - only visible when collapsed */}
                  {!columnsExpanded && (
                    <th
                      onClick={toggleColumns}
                      style={{ 
                        border: "1px solid #eee", 
                        cursor: "pointer", 
                        padding: "8px 2px", 
                        fontWeight: "600", 
                        userSelect: "none",
                        textAlign: "center",
                        width: "20px",
                        minWidth: "20px",
                        background: "#f6f6f6"
                      }}
                      title="Expand columns"
                    >
                      ...
                    </th>
                  )}
                  
                  {/* Additional columns - only visible when expanded */}
                  {columnsExpanded && [
                    { field: "id", width: "120px" },
                    { field: "character", width: "100px" },
                    { field: "season", width: "80px" },
                    { field: "episode", width: "80px" },
                    { field: "order", width: "80px" },
                    { field: "duration", width: "80px" },
                    { field: "description", width: "200px" }
                  ].map(({ field, width }) => (
                    <th
                      key={field}
                      onClick={() => {
                        if (field === "description") {
                          toggleColumns(); // Collapse when clicking description header
                        } else {
                          if (sortField === field) { setSortDir(sortDir === "asc" ? "desc" : "asc"); }
                          else { setSortField(field); setSortDir("asc"); }
                        }
                      }}
                      style={{ 
                        border: "1px solid #eee", 
                        cursor: "pointer", 
                        padding: "8px", 
                        fontWeight: "600", 
                        userSelect: "none",
                        textAlign: "left",
                        width: width,
                        minWidth: width,
                        background: field === "description" ? "#e3f2fd" : "#f6f6f6",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>
                          {field.toUpperCase()} {sortField === field ? (sortDir === "asc" ? "↑" : "↓") : ""}
                        </span>
                        {field === "description" && (
                          <span 
                            style={{ 
                              fontSize: "16px", 
                              fontWeight: "bold", 
                              color: "#007bff",
                              marginLeft: "8px"
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Triangle clicked
                              toggleColumns();
                            }}
                          >◀</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedClips.map((clip, i) => (
        <tr 
          key={clip.id + "-" + i} 
          onClick={(e) => handleClipClick(clip, e)}
          onContextMenu={(e) => handleContextMenu(e, clip)}
          onMouseDown={(e) => handleMouseDown(e, clip)}
                    style={{ 
                      background: selectedClip?.id === clip.id ? "#e3f2fd" : (i%2 ? "#fff" : "#f9f9f9"),
                      cursor: isDragging && draggedClip?.id === clip.id ? "grabbing" : "grab",
                      transition: "all 0.2s",
                      borderBottom: "1px solid #eee",
                      border: draggedClip?.id === clip.id ? "2px solid #007bff" : "none",
                      boxShadow: draggedClip?.id === clip.id ? "0 2px 8px rgba(0,123,255,0.3)" : "none",
                      transform: draggedClip?.id === clip.id ? "scale(1.01)" : "scale(1)",
                      opacity: isDragging && draggedClip?.id !== clip.id ? "0.6" : "1"
                    }}
                  >
                    {/* Filename column - always visible */}
                    <td style={{ border: "1px solid #eee", padding: "8px", width: "400px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {clip.filename}
                    </td>
                    
                    {/* Thumbnail column - always visible */}
                    <td style={{ 
                      border: "1px solid #eee", 
                      padding: "0px", 
                      width: "50px", 
                      textAlign: "center",
                      background: "#f6f6f6"
                    }}>
                      <div style={{ 
                        width: "120px", 
                        height: "90px", 
                        background: "#e0e0e0", 
                        borderRadius: "6px",
                        overflow: "hidden",
                        margin: "0 auto",
                        position: "relative"
                      }}>
                        <video 
                          src={`http://localhost:5000/api/video/${clip.character}/${clip.filename}`}
                          style={{ 
                            width: "100%", 
                            height: "100%", 
                            objectFit: "cover"
                          }}
                          muted
                          preload="metadata"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                        <div style={{ 
                          display: "none", 
                          width: "100%", 
                          height: "100%", 
                          alignItems: "center", 
                          justifyContent: "center",
                          fontSize: "20px"
                        }}>
                          🎬
                        </div>
                      </div>
                    </td>
                    
                    {/* Expand/Collapse column - only visible when collapsed */}
                    {!columnsExpanded && (
                      <td style={{ 
                        border: "1px solid #eee", 
                        padding: "8px 2px", 
                        width: "20px", 
                        textAlign: "center",
                        background: "#f6f6f6"
                      }}>
                        ...
                      </td>
                    )}
                    
                    {/* Additional columns - only visible when expanded */}
                    {columnsExpanded && (
                      <>
                        <td style={{ border: "1px solid #eee", padding: "8px", width: "120px" }}>{clip.id}</td>
                        <td style={{ border: "1px solid #eee", padding: "8px", width: "100px" }}>{clip.character}</td>
                        <td style={{ border: "1px solid #eee", padding: "8px", width: "80px" }}>{clip.season}</td>
                        <td style={{ border: "1px solid #eee", padding: "8px", width: "80px" }}>{clip.episode}</td>
                        <td style={{ border: "1px solid #eee", padding: "8px", width: "80px" }}>{clip.order}</td>
                        <td style={{ border: "1px solid #eee", padding: "8px", width: "80px" }}>
                          <LazyDuration clip={clip} />
                        </td>
                        <td style={{ 
                          border: "1px solid #eee", 
                          padding: "8px", 
                          width: "200px", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis"
                        }}>
                          {clip.description}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
              
            </div>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
              {sortedClips.map((clip) => (
        <div
          key={clip.id}
          onClick={(e) => handleClipClick(clip, e)}
          onContextMenu={(e) => handleContextMenu(e, clip)}
          onMouseDown={(e) => handleMouseDown(e, clip)}
                  style={{
                    border: draggedClip?.id === clip.id ? "2px solid #007bff" : "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "8px",
                    cursor: isDragging && draggedClip?.id === clip.id ? "grabbing" : "grab",
                    background: selectedClip?.id === clip.id ? "#e3f2fd" : "white",
                    transition: "all 0.2s",
                    boxShadow: draggedClip?.id === clip.id ? "0 4px 12px rgba(0,123,255,0.3)" : "0 1px 3px rgba(0,0,0,0.1)",
                    transform: draggedClip?.id === clip.id ? "scale(1.02)" : "scale(1)",
                    opacity: isDragging && draggedClip?.id !== clip.id ? "0.6" : "1"
                  }}
                >
                  {/* Lazy Loading Thumbnail */}
                  <LazyThumbnail 
                    clip={clip}
                  />
                  
                  <div style={{ 
                    fontWeight: "600", 
                    marginBottom: "4px", 
                    fontSize: "13px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: "1.2"
                  }}>
                    {clip.filename}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                    {clip.character}  {clip.season}  {clip.episode}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                    Duration: <LazyDuration clip={clip} />
                  </div>
                  <div style={{ 
                    fontSize: "11px", 
                    color: "#888",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {clip.description}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sortedClips.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
              No clips found matching your search.
            </div>
          )}
            </>
          ) : (
            /* Imported Media Tab */
            <div 
              style={{ 
                flex: 1, 
                overflow: "auto", 
                padding: "16px",
                minHeight: "200px",
                position: "relative"
              }}
              onDrop={handleFileDrop}
              onDragOver={handleFileDragOver}
              onDragEnter={handleFileDragEnter}
              onDragLeave={handleFileDragLeave}
            >
              {importedMedia.length === 0 ? (
                <div style={{ 
                  padding: "48px", 
                  textAlign: "center", 
                  color: isDraggingOver ? "#007bff" : "#999",
                  border: isDraggingOver ? "2px dashed #007bff" : "2px dashed #ddd",
                  borderRadius: "8px",
                  backgroundColor: isDraggingOver ? "#e3f2fd" : "#fafafa",
                  transition: "all 0.2s ease"
                }}>
                  <div style={{ fontSize: "16px", marginBottom: "8px", fontWeight: "600" }}>
                    {isDraggingOver ? "Drop files here" : "No imported media"}
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "16px" }}>
                    Drag and drop MP4, MOV, AVI, or WebM files here
                  </div>
                  <div style={{ fontSize: "12px", color: "#aaa" }}>
                    Or use File {'>'} Import Media...
                  </div>
                </div>
              ) : filteredImportedMedia.length === 0 ? (
                <div style={{ 
                  padding: "48px", 
                  textAlign: "center", 
                  color: "#999",
                  fontSize: "16px",
                  fontWeight: "600"
                }}>
                  No imported media found matching &quot;{importedSearch}&quot;
                </div>
              ) : (
                <>
                  {isDraggingOver && (
                    <div style={{
                      position: "absolute",
                      top: "16px",
                      left: "16px",
                      right: "16px",
                      bottom: "16px",
                      border: "2px dashed #007bff",
                      borderRadius: "8px",
                      backgroundColor: "rgba(0, 123, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 100,
                      pointerEvents: "none"
                    }}>
                      <div style={{ fontSize: "18px", fontWeight: "600", color: "#007bff" }}>
                        Drop files here to import
                      </div>
                    </div>
                  )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
                  {filteredImportedMedia.map((media) => {
                    // Use stored URL or create one from file if needed
                    const thumbnailUrl = media.url || (media.file ? URL.createObjectURL(media.file) : null);
                    
                    return (
                      <div
                        key={media.id}
                        onClick={(e) => {
                          // Prevent click if we just finished dragging
                          if (isDragging || (Date.now() - dragEndTime) < 100) {
                            return;
                          }
                          e.stopPropagation();
                          handleImportedMediaClick(media);
                        }}
                        onMouseDown={(e) => handleMouseDown(e, media, true)}
                        style={{
                          border: selectedImportedMedia?.id === media.id ? "2px solid #007bff" : "1px solid #ddd",
                          borderRadius: "6px",
                          padding: "8px",
                          cursor: isDragging && draggedClip?.id === media.id ? "grabbing" : "grab",
                          background: selectedImportedMedia?.id === media.id ? "#e3f2fd" : "white",
                          transition: "all 0.2s",
                          boxShadow: isDragging && draggedClip?.id === media.id ? "0 4px 12px rgba(0,123,255,0.3)" : "0 1px 3px rgba(0,0,0,0.1)",
                          transform: isDragging && draggedClip?.id === media.id ? "scale(1.02)" : "scale(1)",
                          opacity: isDragging && draggedClip?.id !== media.id ? "0.6" : "1"
                        }}
                        onMouseEnter={(e) => {
                          if (selectedImportedMedia?.id !== media.id && !isDragging) {
                            e.currentTarget.style.backgroundColor = "#f8f9fa";
                            e.currentTarget.style.borderColor = "#007bff";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedImportedMedia?.id !== media.id && !isDragging) {
                            e.currentTarget.style.backgroundColor = "white";
                            e.currentTarget.style.borderColor = "#ddd";
                          }
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{
                          width: "100%",
                          aspectRatio: "16/9",
                          background: "#000",
                          borderRadius: "4px",
                          marginBottom: "8px",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative"
                        }}>
                          {thumbnailUrl ? (
                            <video
                              src={thumbnailUrl}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                              }}
                              muted
                              preload="metadata"
                              onLoadedMetadata={(e) => {
                                // Seek to first frame for thumbnail
                                e.target.currentTime = 0.1;
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div style={{ 
                            display: thumbnailUrl ? "none" : "flex", 
                            width: "100%", 
                            height: "100%", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: "20px",
                            color: "#fff"
                          }}>
                            🎬
        </div>
      </div>
      
                        {/* Filename */}
                        <div style={{ 
                          fontWeight: "600", 
                          marginBottom: "4px", 
                          fontSize: "13px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: "1.2"
                        }}>
                          {media.filename}
                        </div>
                        
                        {/* Duration */}
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                          Duration: {media.duration ? `${media.duration.toFixed(2)}s` : 'Unknown'}
                        </div>
                        
                        {/* Resolution */}
                        <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                          {media.width && media.height ? `${media.width}x${media.height}` : 'Unknown resolution'}
                        </div>
                        
                        {/* File size */}
                        <div style={{ 
                          fontSize: "11px", 
                          color: "#888",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {media.size ? `${(media.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
      
      {/* Folder Navigation - Now on the RIGHT, only visible for Arcane Clips */}
      {activeTab === "arcane" && (
        <div style={{ 
          width: "250px", 
          minWidth: "250px",
          maxWidth: "250px",
          padding: "16px", 
          borderLeft: "1px solid #eee", 
          background: "#f8f9fa",
          overflow: "auto",
          flexShrink: 0
        }}>
          
          {/* Character Filter */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#666" }}>Characters</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                onClick={() => setSelectedCharacter("all")}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #ddd",
                  background: selectedCharacter === "all" ? "#007bff" : "white",
                  color: selectedCharacter === "all" ? "white" : "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  textAlign: "left"
                }}
              >
                All Characters ({clips.length})
              </button>
              {characters.map(char => {
                const count = clips.filter(clip => clip.character === char).length;
                return (
                  <button
                    key={char}
                    onClick={() => setSelectedCharacter(char)}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #ddd",
                      background: selectedCharacter === char ? "#007bff" : "white",
                      color: selectedCharacter === char ? "white" : "#333",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                      textAlign: "left"
                    }}
                  >
                    {char} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season Filter */}
          <div style={{ marginBottom: "20px" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#666" }}>Seasons</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                onClick={() => setSelectedSeason("all")}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #ddd",
                  background: selectedSeason === "all" ? "#28a745" : "white",
                  color: selectedSeason === "all" ? "white" : "#333",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  textAlign: "left"
                }}
              >
                All Seasons
              </button>
              {seasons.map(season => {
                const count = clips.filter(clip => clip.season === season).length;
                return (
                  <button
                    key={season}
                    onClick={() => setSelectedSeason(season)}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #ddd",
                      background: selectedSeason === season ? "#28a745" : "white",
                      color: selectedSeason === season ? "white" : "#333",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "13px",
                      textAlign: "left"
                    }}
                  >
                    {season} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      </div> {/* End Main Content Area */}
    </div>
  );
}















