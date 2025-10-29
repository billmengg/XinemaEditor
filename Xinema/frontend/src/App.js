import React, { useState, useEffect } from 'react';
import ClipList from './components/ClipList';
import ClipPreview from './components/ClipPreview';
import TimelinePreview from './components/TimelinePreview';
import Timeline from './components/Timeline';

function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [openMenu, setOpenMenu] = useState(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.menu-bar-item') && !e.target.closest('.menu-dropdown')) {
        setOpenMenu(null);
      }
    };
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  // Prevent Alt key browser menu and context menu, set body styles
  useEffect(() => {
    const preventAltKey = (e) => {
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventContextMenu = (e) => {
      // Allow right-click on specific elements that need context menu access
      if (e.target.closest('.timeline-content') || 
          e.target.closest('.clip-list') ||
          e.target.closest('button') ||
          e.target.closest('input') ||
          e.target.closest('textarea')) {
        return; // Allow context menu on these elements
      }
      e.preventDefault();
      e.stopPropagation();
    };

    // Set body styles to prevent scrolling
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    document.body.style.width = '100vw';
    document.body.style.userSelect = 'none'; // Disable text selection globally

    // Prevent Alt key from triggering browser menu
    document.addEventListener('keydown', preventAltKey, { passive: false });
    document.addEventListener('keyup', preventAltKey, { passive: false });
    
    // Prevent context menu - TEMPORARILY DISABLED FOR DEBUGGING
    // document.addEventListener('contextmenu', preventContextMenu, { passive: false });
    
    // Prevent text selection events
    const preventSelection = (e) => {
      e.preventDefault();
    };
    
    document.addEventListener('selectstart', preventSelection, { passive: false });
    document.addEventListener('dragstart', preventSelection, { passive: false });

    return () => {
      document.removeEventListener('keydown', preventAltKey);
      document.removeEventListener('keyup', preventAltKey);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventSelection);
    };
  }, []);

  const tabs = [
    { id: 'editor', label: 'Editor', component: EditorLayout },
    { id: 'script', label: 'Script Input', component: () => <div>Script Input - Coming Soon</div> },
    { id: 'export', label: 'Export', component: () => <div>Export - Coming Soon</div> }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || EditorLayout;

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Menu Bar */}
      <div style={{
        display: 'flex',
        background: '#f0f0f0',
        borderBottom: '1px solid #ddd',
        padding: '4px 8px',
        height: '28px',
        alignItems: 'center',
        fontSize: '14px',
        position: 'relative'
      }}>
        <div 
          className="menu-bar-item"
          onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
          style={{ 
            padding: '4px 12px', 
            cursor: 'pointer',
            background: openMenu === 'file' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px',
            position: 'relative'
          }}
        >
          File
        </div>
        {openMenu === 'file' && (
          <div className="menu-dropdown" style={{
            position: 'absolute',
            top: '28px',
            left: '4px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            minWidth: '180px',
            padding: '4px 0',
            zIndex: 1000
          }}>
            <div style={{ padding: '6px 20px', cursor: 'pointer', ':hover': { background: '#f0f0f0' } }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('New Project'); setOpenMenu(null); }}>New Project...</div>
            <div style={{ padding: '6px 20px', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('Open Project'); setOpenMenu(null); }}>Open Project...</div>
            <div style={{ padding: '6px 20px', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('Save Project'); setOpenMenu(null); }}>Save Project</div>
            <div style={{ padding: '6px 20px', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('Save Project As'); setOpenMenu(null); }}>Save Project As...</div>
            <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}></div>
            <div style={{ padding: '6px 20px', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('Import Media'); setOpenMenu(null); }}>Import Media...</div>
            <div style={{ padding: '6px 20px', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('Export Timeline'); setOpenMenu(null); }}>Export Timeline...</div>
            <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}></div>
            <div style={{ padding: '6px 20px', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('Exit'); setOpenMenu(null); }}>Exit</div>
          </div>
        )}
        {openMenu === 'edit' && (
          <div className="menu-dropdown" style={{
            position: 'absolute',
            top: '28px',
            left: '48px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            minWidth: '180px',
            padding: '4px 0',
            zIndex: 1000
          }}>
            <div 
              style={{ 
                padding: '6px 20px', 
                cursor: window.canUndo ? 'pointer' : 'not-allowed',
                opacity: window.canUndo ? '1' : '0.5'
              }} 
              onMouseEnter={(e) => { if (window.canUndo) e.target.style.background = '#f0f0f0' }} 
              onMouseLeave={(e) => e.target.style.background = 'white'} 
              onClick={() => { 
                if (window.handleUndo && window.canUndo) {
                  window.handleUndo(); 
                  setOpenMenu(null); 
                }
              }}
            >
              Undo (Ctrl+Z)
            </div>
            <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}></div>
            <div 
              style={{ 
                padding: '6px 20px', 
                cursor: window.canRedo ? 'pointer' : 'not-allowed',
                opacity: window.canRedo ? '1' : '0.5'
              }} 
              onMouseEnter={(e) => { if (window.canRedo) e.target.style.background = '#f0f0f0' }} 
              onMouseLeave={(e) => e.target.style.background = 'white'} 
              onClick={() => { 
                if (window.handleRedo && window.canRedo) {
                  window.handleRedo(); 
                  setOpenMenu(null); 
                }
              }}
            >
              Redo (Ctrl+Shift+Z)
            </div>
          </div>
        )}
        <div 
          className="menu-bar-item"
          onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
          style={{ 
            padding: '4px 12px', 
            cursor: 'pointer',
            background: openMenu === 'edit' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px'
          }}
        >
          Edit
        </div>
        <div 
          className="menu-bar-item"
          onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
          style={{ 
            padding: '4px 12px', 
            cursor: 'pointer',
            background: openMenu === 'view' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px'
          }}
        >
          View
        </div>
        <div 
          className="menu-bar-item"
          onClick={() => setOpenMenu(openMenu === 'timeline' ? null : 'timeline')}
          style={{ 
            padding: '4px 12px', 
            cursor: 'pointer',
            background: openMenu === 'timeline' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px'
          }}
        >
          Timeline
        </div>
        <div 
          className="menu-bar-item"
          onClick={() => setOpenMenu(openMenu === 'window' ? null : 'window')}
          style={{ 
            padding: '4px 12px', 
            cursor: 'pointer',
            background: openMenu === 'window' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px'
          }}
        >
          Window
        </div>
        <div 
          className="menu-bar-item"
          onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
          style={{ 
            padding: '4px 12px', 
            cursor: 'pointer',
            background: openMenu === 'help' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px'
          }}
        >
          Help
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        background: '#f8f9fa',
        padding: '8px 16px 0 16px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: '1px solid #ddd',
              borderBottom: 'none',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              background: activeTab === tab.id ? 'white' : '#f0f0f0',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? '#007bff' : '#666',
              transition: 'all 0.2s',
              position: 'relative',
              zIndex: activeTab === tab.id ? 1 : 0,
              boxShadow: activeTab === tab.id ? 'inset 0 -2px 0 0 white' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        background: 'white',
        borderTop: '1px solid #ddd',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
      }}>
        <ActiveComponent />
      </div>
    </div>
  );
}

// Editor Layout - Premiere Pro style 3-window setup with resizable panels
function EditorLayout() {
  const [leftWidth, setLeftWidth] = React.useState(1200);
  
  // Listen for playback control events from Timeline
  React.useEffect(() => {
    const handleTimelineRequestPlay = (event) => {
      const { startPosition } = event.detail;
      console.log('🎬 App received timeline request play:', startPosition);
      setIsPlaying(true);
    };
    
    const handleTimelineRequestStop = () => {
      console.log('🎬 App received timeline request stop');
      setIsPlaying(false);
    };
    
    window.addEventListener('timelineRequestPlay', handleTimelineRequestPlay);
    window.addEventListener('timelineRequestStop', handleTimelineRequestStop);
    
    return () => {
      window.removeEventListener('timelineRequestPlay', handleTimelineRequestPlay);
      window.removeEventListener('timelineRequestStop', handleTimelineRequestStop);
    };
  }, []);
  const [timelineHeight, setTimelineHeight] = React.useState(400);
  const [clipPreviewWidth, setClipPreviewWidth] = React.useState(400);
  const [isResizing, setIsResizing] = React.useState(null);
         const [selectedClip, setSelectedClip] = React.useState(null);
         const [isPlaying, setIsPlaying] = React.useState(false);
         const [timelineClips, setTimelineClips] = React.useState([]); // Clips on timeline
         const [timelineZoom, setTimelineZoom] = React.useState(1.0); // Timeline zoom level
         const [playheadPosition, setPlayheadPosition] = React.useState(0); // Playhead position in frames
         const [clipPreviewTab, setClipPreviewTab] = React.useState('preview'); // Clip preview tab
         const [editHistory, setEditHistory] = React.useState([]); // Edit history log for display (each entry has enabled flag)
         const [operationHistory, setOperationHistory] = React.useState([]); // Operation history for undo
         const isUndoingRef = React.useRef(false); // Flag to prevent tracking undo operations
         const prevTimelineClipsRef = React.useRef(timelineClips);
         const historyContainerRef = React.useRef(null); // Ref for history scroll container

  // Auto-scroll history to bottom when new entries are added
  React.useEffect(() => {
    if (historyContainerRef.current && !isUndoingRef.current) {
      // Scroll to bottom (scrollHeight is the total height, clientHeight is visible height)
      historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
    }
  }, [editHistory.length]);

  // Helper function to add history entry and operation
  const addHistoryEntry = (action, details, operation) => {
    const timestamp = new Date().toLocaleTimeString();
    // Check if there are any disabled entries before adding new one
    // If so, mark them as overwritten (greyish-red instead of grey)
    setEditHistory(prev => {
      const hasDisabledEntries = prev.some(entry => entry.enabled === false);
      // Mark disabled entries as overwritten if this is a new edit
      const updatedPrev = prev.map(entry => 
        entry.enabled === false ? { ...entry, overwritten: true } : entry
      );
      return [...updatedPrev, { timestamp, action, details, enabled: true, overwritten: false }];
    });
    // Store operation for undo (operational transform style)
    if (operation) {
      setOperationHistory(prev => [...prev, operation]);
    }
  };

  // Apply an operation to the timeline clips
  const applyOperation = React.useCallback((operation, isUndo = false) => {
    setTimelineClips(prev => {
      let newClips;
      
      switch (operation.type) {
        case '+clip': // Add clip
          if (isUndo) {
            // Undo add = remove
            newClips = prev.filter(clip => clip.id !== operation.clip.id);
          } else {
            // Apply add = add clip
            newClips = [...prev, operation.clip];
          }
          break;
          
        case '-clip': // Remove clip
          if (isUndo) {
            // Undo remove = add back
            newClips = [...prev, operation.clip];
          } else {
            // Apply remove = remove clip
            newClips = prev.filter(clip => clip.id !== operation.clip.id);
          }
          break;
          
        case 'move': // Move clip - restore full clip state
          newClips = prev.map(clip => {
            if (clip && clip.id === operation.clipId) {
              if (isUndo) {
                // Undo move = restore the complete old clip state
                // This includes all pixel values, instance positions, etc.
                // Safety check: ensure oldClip exists and has id
                if (operation.oldClip && operation.oldClip.id) {
                  return operation.oldClip;
                }
                // Fallback: return original clip if oldClip is invalid
                return clip;
              } else {
                // Apply move = restore the new clip state (for redo)
                if (operation.newClip && operation.newClip.id) {
                  return operation.newClip;
                }
                // Fallback: return original clip if newClip is invalid
                return clip;
              }
            }
            return clip;
          }).filter(clip => clip != null); // Remove any null/undefined entries
          break;
          
        case '~clip': // Modify clip (crop)
          newClips = prev.map(clip => {
            if (clip.id === operation.clipId) {
              if (isUndo) {
                // Undo modify = restore old values
                // Filter out undefined values to avoid overwriting with undefined
                const filteredOldValues = Object.fromEntries(
                  Object.entries(operation.oldValues).filter(([_, value]) => value !== undefined)
                );
                return { ...clip, ...filteredOldValues };
              } else {
                // Apply modify = use new values
                const filteredNewValues = Object.fromEntries(
                  Object.entries(operation.newValues).filter(([_, value]) => value !== undefined)
                );
                return { ...clip, ...filteredNewValues };
              }
            }
            return clip;
          });
          break;
          
        default:
          newClips = prev;
      }
      
      // Update ref with new state
      prevTimelineClipsRef.current = newClips;
      return newClips;
    });
  }, []);

  // Undo function - finds last enabled entry, disables it, and reverses the operation
  const handleUndo = React.useCallback(() => {
    if (operationHistory.length === 0 || editHistory.length === 0) return;
    
    // Find the last enabled entry (from the end)
    let lastEnabledIndex = -1;
    for (let i = editHistory.length - 1; i >= 0; i--) {
      if (editHistory[i].enabled !== false) { // enabled is true or undefined (default true)
        lastEnabledIndex = i;
        break;
      }
    }
    
    // If no enabled entry found, can't undo
    if (lastEnabledIndex < 0) return;
    
    // Set flag to prevent this undo from being tracked as a new change
    isUndoingRef.current = true;
    
    // Get the operation at the same index
    const operation = operationHistory[lastEnabledIndex];
    
    // Apply undo of the operation - this will update the clips
    applyOperation(operation, true);
    
    // Disable the history entry (but don't mark as overwritten - that's only for new edits)
    setEditHistory(prev => prev.map((entry, index) => 
      index === lastEnabledIndex ? { ...entry, enabled: false } : entry
    ));
    
    // Reset flag after a brief delay to allow state updates
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 50);
  }, [operationHistory, editHistory, applyOperation]);

  // Redo function - finds last disabled entry (before first enabled from end), re-enables it
  const handleRedo = React.useCallback(() => {
    if (operationHistory.length === 0 || editHistory.length === 0) return;
    
    // Find the last disabled entry that is NOT overwritten (from the end, before any enabled entries)
    // We can only redo entries that come after the current position (the last enabled entry)
    let lastEnabledIndex = -1;
    for (let i = editHistory.length - 1; i >= 0; i--) {
      if (editHistory[i].enabled !== false) {
        lastEnabledIndex = i;
        break;
      }
    }
    
    // Find the first disabled entry after the last enabled one
    let redoIndex = -1;
    if (lastEnabledIndex === -1) {
      // All entries are disabled, can redo the last one
      for (let i = editHistory.length - 1; i >= 0; i--) {
        if (editHistory[i].enabled === false && !editHistory[i].overwritten) {
          redoIndex = i;
          break;
        }
      }
    } else {
      // Find first disabled entry after last enabled entry
      for (let i = lastEnabledIndex + 1; i < editHistory.length; i++) {
        if (editHistory[i].enabled === false && !editHistory[i].overwritten) {
          redoIndex = i;
          break;
        }
      }
    }
    
    // If no valid redo entry found, can't redo
    if (redoIndex < 0) return;
    
    // Set flag to prevent this redo from being tracked as a new change
    isUndoingRef.current = true;
    
    // Get the operation at the same index
    const operation = operationHistory[redoIndex];
    
    // Apply the operation forward (not as undo)
    applyOperation(operation, false);
    
    // Re-enable the history entry and clear overwritten flag
    setEditHistory(prev => prev.map((entry, index) => 
      index === redoIndex ? { ...entry, enabled: true, overwritten: false } : entry
    ));
    
    // Reset flag after a brief delay to allow state updates
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 50);
  }, [operationHistory, editHistory, applyOperation]);

  // Expose handleUndo, handleRedo and setTimelineClips on window object for menu access
  React.useEffect(() => {
    // Check if there's any enabled entry to undo
    const hasEnabledEntry = editHistory.some(entry => entry.enabled !== false);
    const canUndo = editHistory.length > 0 && hasEnabledEntry;
    
    // Check if there's any disabled entry that can be redone (not overwritten, after current position)
    let lastEnabledIndex = -1;
    for (let i = editHistory.length - 1; i >= 0; i--) {
      if (editHistory[i].enabled !== false) {
        lastEnabledIndex = i;
        break;
      }
    }
    
    let canRedo = false;
    if (lastEnabledIndex === -1) {
      // All entries disabled, check if any non-overwritten disabled entry exists
      canRedo = editHistory.some(entry => entry.enabled === false && !entry.overwritten);
    } else {
      // Check if there's a disabled entry after the last enabled one
      canRedo = editHistory.slice(lastEnabledIndex + 1).some(entry => entry.enabled === false && !entry.overwritten);
    }
    
    window.handleUndo = handleUndo;
    window.handleRedo = handleRedo;
    window.editHistoryLength = editHistory.length;
    window.canUndo = canUndo;
    window.canRedo = canRedo;
    window.setTimelineClipsUndo = setTimelineClips;
    return () => {
      window.handleUndo = undefined;
      window.handleRedo = undefined;
      window.editHistoryLength = undefined;
      window.canUndo = undefined;
      window.canRedo = undefined;
      window.setTimelineClipsUndo = undefined;
    };
  }, [handleUndo, handleRedo, editHistory, setTimelineClips]);

  // Keyboard shortcut handler for Ctrl+Z (undo) and Ctrl+Shift+Z (redo)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle both lowercase 'z' and uppercase 'Z' (when Shift is pressed)
      if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if Shift is pressed to determine redo vs undo
        if (e.shiftKey) {
          // Ctrl+Shift+Z = Redo
          handleRedo();
        } else {
          // Ctrl+Z = Undo
          handleUndo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleUndo, handleRedo]);

  // Track timeline changes
  React.useEffect(() => {
    const prevClips = prevTimelineClipsRef.current;
    const currentClips = timelineClips;

    // Skip if we're in the middle of an undo operation
    if (isUndoingRef.current) {
      // Store filtered clips to avoid undefined entries
      const filteredClips = currentClips.filter(clip => clip != null);
      prevTimelineClipsRef.current = filteredClips;
      return;
    }

    // Skip tracking if no changes in clip count and clips are identical
    // Filter out any null/undefined entries first
    const validPrevClips = prevClips.filter(clip => clip != null);
    const validCurrentClips = currentClips.filter(clip => clip != null);
    
    if (validPrevClips.length === validCurrentClips.length && 
        validPrevClips.every((prevClip, idx) => {
          const currentClip = validCurrentClips[idx];
          return prevClip && currentClip &&
                 prevClip.id === currentClip.id &&
                 prevClip.startFrames === currentClip.startFrames &&
                 prevClip.endFrames === currentClip.endFrames &&
                 prevClip.track === currentClip.track;
        })) {
      return;
    }

    // Detect changes and create operations
    // Use filtered arrays to avoid undefined entries
    if (validCurrentClips.length > validPrevClips.length) {
      // Clip added
      const newClip = validCurrentClips.find(clip => clip && !validPrevClips.some(p => p && p.id === clip.id));
      if (newClip) {
        const operation = {
          type: '+clip',
          clip: JSON.parse(JSON.stringify(newClip)) // Deep copy
        };
        addHistoryEntry('add', {
          clipId: newClip.id,
          clipName: newClip.filename || newClip.character || 'Clip',
          position: newClip.startFrames || 0
        }, operation);
      }
    } else if (validCurrentClips.length < validPrevClips.length) {
      // Clip deleted
      const deletedClip = validPrevClips.find(clip => clip && !validCurrentClips.some(c => c && c.id === clip.id));
      if (deletedClip) {
        const operation = {
          type: '-clip',
          clip: JSON.parse(JSON.stringify(deletedClip)) // Deep copy
        };
        addHistoryEntry('delete', {
          clipId: deletedClip.id,
          clipName: deletedClip.filename || deletedClip.character || 'Clip'
        }, operation);
      }
    } else {
      // Check for moved or cropped clips
      validCurrentClips.forEach(currentClip => {
        if (!currentClip) return;
        const prevClip = validPrevClips.find(p => p && p.id === currentClip.id);
        if (!prevClip) return;

        const prevStart = prevClip.startFrames;
        const currStart = currentClip.startFrames;
        const prevEnd = prevClip.endFrames;
        const currEnd = currentClip.endFrames;
        const prevTrack = prevClip.track;
        const currTrack = currentClip.track;
        
        const durationChanged = (prevEnd - prevStart) !== (currEnd - currStart);
        const positionChanged = prevStart !== currStart;
        const trackChanged = prevTrack !== currTrack;
        
        if (durationChanged || positionChanged || trackChanged) {
          if (positionChanged || trackChanged) {
            // MOVE OPERATION - store full old and new clip states
            // Store complete clip state for proper undo restoration
            const oldClipState = JSON.parse(JSON.stringify(prevClip));
            const newClipState = JSON.parse(JSON.stringify(currentClip));
            
            const moveOperation = {
              type: 'move',
              clipId: currentClip.id,
              oldClip: oldClipState,  // Full old clip state
              newClip: newClipState   // Full new clip state (for redo, if needed)
            };
            
            if (durationChanged) {
              // Both moved and cropped - track as crop with move info
              const cropOperation = {
                type: '~clip',
                clipId: currentClip.id,
                oldValues: {
                  startFrames: prevStart,
                  endFrames: prevEnd,
                  track: prevTrack,
                  leftCropFrames: prevClip.leftCropFrames ?? 0,
                  rightCropFrames: prevClip.rightCropFrames ?? 0
                },
                newValues: {
                  startFrames: currStart,
                  endFrames: currEnd,
                  track: currTrack,
                  leftCropFrames: currentClip.leftCropFrames ?? 0,
                  rightCropFrames: currentClip.rightCropFrames ?? 0
                }
              };
              addHistoryEntry('crop', {
                clipId: currentClip.id,
                clipName: currentClip.filename || currentClip.character || 'Clip',
                oldDuration: prevEnd - prevStart,
                newDuration: currEnd - currStart,
                oldStart: prevStart,
                newStart: currStart
              }, cropOperation);
            } else {
              // Just moved (horizontal or vertical)
              addHistoryEntry('move', {
                clipId: currentClip.id,
                clipName: currentClip.filename || currentClip.character || 'Clip',
                from: prevStart,
                to: currStart,
                fromTrack: prevTrack,
                toTrack: currTrack,
                movedHorizontally: positionChanged,
                movedVertically: trackChanged
              }, moveOperation);
            }
          } else if (durationChanged) {
            // CROP OPERATION - no move, just crop
            const cropOperation = {
              type: '~clip',
              clipId: currentClip.id,
              oldValues: {
                startFrames: prevStart,
                endFrames: prevEnd,
                leftCropFrames: prevClip.leftCropFrames ?? 0,
                rightCropFrames: prevClip.rightCropFrames ?? 0
              },
              newValues: {
                startFrames: currStart,
                endFrames: currEnd,
                leftCropFrames: currentClip.leftCropFrames ?? 0,
                rightCropFrames: currentClip.rightCropFrames ?? 0
              }
            };
            addHistoryEntry('crop', {
              clipId: currentClip.id,
              clipName: currentClip.filename || currentClip.character || 'Clip',
              oldDuration: prevEnd - prevStart,
              newDuration: currEnd - currStart
            }, cropOperation);
          }
        }
      });
    }

    // Store filtered clips to avoid undefined entries
    prevTimelineClipsRef.current = validCurrentClips;
  }, [timelineClips]);

  // Test backend connection on mount
  React.useEffect(() => {
    const testBackendConnection = async () => {
      try {
        // Test basic connection
        const response = await fetch('http://localhost:5000/api/test');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Backend connection successful:', data);
        } else {
          console.error('❌ Backend connection failed:', response.status);
        }
        
        // Test prerender endpoint
        const prerenderTest = await fetch('http://localhost:5000/api/prerender-test');
        if (prerenderTest.ok) {
          const prerenderData = await prerenderTest.json();
          console.log('✅ Prerender endpoint accessible:', prerenderData);
        } else {
          console.error('❌ Prerender endpoint not accessible:', prerenderTest.status);
        }
      } catch (error) {
        console.error('❌ Backend connection error:', error);
      }
    };
    
    testBackendConnection();
  }, []);


  // Helper functions for history display
  const getActionColor = (action) => {
    switch(action) {
      case 'add': return '#4ade80'; // Green
      case 'delete': return '#f87171'; // Red
      case 'move': return '#60a5fa'; // Blue
      case 'crop': return '#fbbf24'; // Yellow
      default: return '#94a3b8'; // Gray
    }
  };

  const formatHistoryEntry = (entry) => {
    const { action, details } = entry;
    switch(action) {
      case 'add':
        return `Added "${details.clipName}" at position ${details.position}`;
      case 'delete':
        return `Deleted "${details.clipName}"`;
      case 'move': {
        let msg = `Moved "${details.clipName}" `;
        if (details.movedHorizontally && details.movedVertically) {
          msg += `horizontally ${details.from} -> ${details.to} frames, vertically track ${details.fromTrack} -> ${details.toTrack}`;
        } else if (details.movedHorizontally) {
          msg += `horizontally ${details.from} -> ${details.to} frames`;
        } else if (details.movedVertically) {
          msg += `vertically to track ${details.toTrack}`;
        }
        return msg;
      }
      case 'crop': {
        let msg = `Cropped "${details.clipName}" ${details.oldDuration} -> ${details.newDuration}`;
        if (details.oldStart !== undefined && details.newStart !== undefined) {
          msg += ` | moved ${details.oldStart} -> ${details.newStart}`;
        }
        return msg;
      }
      default:
        return JSON.stringify(details);
    }
  };

  const handleMouseDown = (type) => (e) => {
    setIsResizing(type);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight - 60; // Account for tab bar

    if (isResizing === 'left') {
      const newWidth = Math.max(200, Math.min(1400, e.clientX));
      setLeftWidth(newWidth);
    } else if (isResizing === 'timeline') {
      const newHeight = Math.max(150, Math.min(600, containerHeight - e.clientY + 60));
      setTimelineHeight(newHeight);
    } else if (isResizing === 'clipPreview') {
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setClipPreviewWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizing === 'left' ? 'col-resize' : 
                                  isResizing === 'clipPreview' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#ddd'
    }}>
      {/* Top Row - Left Panel, Timeline Preview Panel */}
      <div style={{ 
        display: 'flex', 
        height: `calc(100% - ${timelineHeight}px)`,
        minHeight: '200px'
      }}>
        {/* Left Panel - File Navigator */}
        <div style={{ 
          width: `${leftWidth}px`,
          background: 'white',
          borderRight: '1px solid #ddd',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <ClipList onClipSelect={setSelectedClip} />
          
          {/* Left Resize Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: -2,
              width: '4px',
              height: '100%',
              background: isResizing === 'left' ? '#007bff' : 'transparent',
              cursor: 'col-resize',
              zIndex: 10
            }}
            onMouseDown={handleMouseDown('left')}
          />
        </div>

               {/* Right Panel - Timeline Preview */}
               <div style={{ 
                 flex: 1,
                 background: 'white',
                 borderRight: '1px solid #ddd',
                 overflow: 'hidden',
                 position: 'relative'
               }}>
                <TimelinePreview 
                  timelineClips={timelineClips}
                />
               </div>
      </div>

      {/* Bottom Row - Clip Preview and Timeline */}
      <div style={{ 
        display: 'flex',
        height: `${timelineHeight}px`,
        borderTop: '1px solid #ddd'
      }}>
        {/* Clip Preview Panel */}
        <div style={{ 
          width: `${clipPreviewWidth}px`,
          background: 'white',
          borderRight: '1px solid #ddd',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            background: '#e0e0e0',
            paddingTop: '8px',
            paddingLeft: '8px',
            borderBottom: '1px solid #c0c0c0'
          }}>
            <button
              onClick={() => setClipPreviewTab('preview')}
              style={{
                padding: '8px 16px',
                border: '1px solid #c0c0c0',
                borderBottom: 'none',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                background: clipPreviewTab === 'preview' ? 'white' : '#e8e8e8',
                cursor: 'pointer',
                fontWeight: clipPreviewTab === 'preview' ? '600' : '400',
                color: clipPreviewTab === 'preview' ? '#333' : '#666',
                transition: 'all 0.15s',
                fontSize: '13px',
                position: 'relative',
                zIndex: clipPreviewTab === 'preview' ? 2 : 1,
                boxShadow: clipPreviewTab === 'preview' ? '0 -2px 2px rgba(0,0,0,0.05)' : 'none',
                marginLeft: '-1px'
              }}
            >
              Clip Preview
            </button>
            <button
              onClick={() => setClipPreviewTab('history')}
              style={{
                padding: '8px 16px',
                border: '1px solid #c0c0c0',
                borderBottom: 'none',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                background: clipPreviewTab === 'history' ? 'white' : '#e8e8e8',
                cursor: 'pointer',
                fontWeight: clipPreviewTab === 'history' ? '600' : '400',
                color: clipPreviewTab === 'history' ? '#333' : '#666',
                transition: 'all 0.15s',
                fontSize: '13px',
                position: 'relative',
                zIndex: clipPreviewTab === 'history' ? 2 : 1,
                boxShadow: clipPreviewTab === 'history' ? '0 -2px 2px rgba(0,0,0,0.05)' : 'none',
                marginLeft: '-1px'
              }}
            >
              History
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ 
            flex: 1, 
            overflow: 'hidden',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {clipPreviewTab === 'preview' ? (
                   <div style={{ flex: 1, overflow: 'hidden' }}>
                     <ClipPreview clip={selectedClip} />
                   </div>
            ) : (
              <div 
                ref={historyContainerRef}
                style={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  background: '#1e1e1e',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {editHistory.length === 0 ? (
                  <div style={{ color: '#666', padding: '8px' }}>
                    No edit history yet
                  </div>
                ) : (
                  (() => {
                    // Find the current position (last enabled entry)
                    let currentPositionIndex = -1;
                    for (let i = editHistory.length - 1; i >= 0; i--) {
                      if (editHistory[i].enabled !== false) {
                        currentPositionIndex = i;
                        break;
                      }
                    }
                    
                    return editHistory.map((entry, index) => {
                      // Entry states
                      const isDisabled = entry.enabled === false;
                      const isOverwritten = entry.overwritten === true;
                      const isCurrent = index === currentPositionIndex;
                      
                      // Color logic: overwritten = greyish-red, disabled = grey, enabled = normal color
                      let entryColor;
                      let opacity;
                      if (isOverwritten) {
                        entryColor = '#cc6666'; // Greyish-red
                        opacity = 0.5;
                      } else if (isDisabled) {
                        entryColor = '#999'; // Grey
                        opacity = 0.4;
                      } else {
                        entryColor = getActionColor(entry.action);
                        opacity = 1;
                      }
                      
                      return (
                        <div 
                          key={index}
                          style={{
                            color: entryColor,
                            padding: '4px 8px',
                            borderRadius: '2px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'baseline',
                            opacity: opacity,
                            border: isCurrent ? '2px solid #007bff' : '1px solid transparent',
                            background: isCurrent ? 'rgba(0, 123, 255, 0.15)' : 'transparent',
                            boxShadow: isCurrent ? '0 0 4px rgba(0, 123, 255, 0.3)' : 'none'
                          }}
                        >
                          <span style={{ 
                            color: isOverwritten ? '#aa5555' : (isDisabled ? '#555' : '#888'), 
                            fontSize: '10px' 
                          }}>
                            {entry.timestamp}
                          </span>
                          <span style={{ fontWeight: 'bold' }}>[{entry.action.toUpperCase()}]</span>
                          <span style={{ 
                            color: isOverwritten ? '#cc8888' : (isDisabled ? '#666' : '#fff') 
                          }}>
                            {formatHistoryEntry(entry)}
                          </span>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            )}
          </div>
          
          {/* Clip Preview Resize Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: -2,
              width: '4px',
              height: '100%',
              background: isResizing === 'clipPreview' ? '#007bff' : 'transparent',
              cursor: 'col-resize',
              zIndex: 10
            }}
            onMouseDown={handleMouseDown('clipPreview')}
          />
        </div>

        {/* Timeline Panel */}
        <div style={{ 
          flex: 1,
          background: 'white',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{ 
            height: '100%', 
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Timeline
            </h3>
            <Timeline 
              onClipSelect={setSelectedClip} 
              selectedClip={selectedClip}
              isPlaying={isPlaying}
              onTimelineClick={() => {
                if (isPlaying) {
                  setIsPlaying(false);
                }
              }}
              onTimelineClipsChange={setTimelineClips}
              onPlayheadChange={(position) => {
                // Update playhead position for preview
                setPlayheadPosition(position);
              }}
              zoomLevel={timelineZoom}
              externalTimelineClips={timelineClips}
            />
          </div>
        </div>
      </div>
      
      {/* Timeline Resize Handle - positioned exactly at the edge */}
      <div
        style={{
          position: 'absolute',
          top: `calc(100% - ${timelineHeight}px + 5px)`,
          left: 0,
          right: 0,
          height: '3px',
          background: isResizing === 'timeline' ? '#007bff' : 'transparent',
          cursor: 'row-resize',
          zIndex: 10
        }}
        onMouseDown={handleMouseDown('timeline')}
      />
    </div>
  );
}

export default App;