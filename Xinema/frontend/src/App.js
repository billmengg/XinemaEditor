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
                cursor: (window.editHistoryLength > 0) ? 'pointer' : 'not-allowed',
                opacity: (window.editHistoryLength > 0) ? '1' : '0.5'
              }} 
              onMouseEnter={(e) => { if (window.editHistoryLength > 0) e.target.style.background = '#f0f0f0' }} 
              onMouseLeave={(e) => e.target.style.background = 'white'} 
              onClick={() => { 
                if (window.handleUndo && window.editHistoryLength > 0) {
                  window.handleUndo(); 
                  setOpenMenu(null); 
                }
              }}
            >
              Undo (Ctrl+Z)
            </div>
            <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}></div>
            <div style={{ padding: '6px 20px', cursor: 'pointer' }} onMouseEnter={(e) => e.target.style.background = '#f0f0f0'} onMouseLeave={(e) => e.target.style.background = 'white'} onClick={() => { console.log('Redo'); setOpenMenu(null); }}>Redo</div>
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
         const [editHistory, setEditHistory] = React.useState([]); // Edit history log
         const [clipHistory, setClipHistory] = React.useState([]); // Store clip states for undo
         const isUndoingRef = React.useRef(false); // Flag to prevent tracking undo operations
         const prevTimelineClipsRef = React.useRef(timelineClips);

  // Helper function to add history entry
  const addHistoryEntry = (action, details, clipState) => {
    const timestamp = new Date().toLocaleTimeString();
    setEditHistory(prev => [...prev, { timestamp, action, details }]);
    // Store the clip state before this change for undo - deep copy to preserve nested objects
    if (clipState) {
      const deepCopiedClips = JSON.parse(JSON.stringify(clipState));
      setClipHistory(prev => [...prev, { timestamp, clips: deepCopiedClips }]);
    }
  };

  // Undo function - wrapped in useCallback to avoid recreation
  const handleUndo = React.useCallback(() => {
    if (clipHistory.length === 0 || editHistory.length === 0) return;
    
    // Set flag to prevent this undo from being tracked as a new change
    isUndoingRef.current = true;
    
    // Get the last history entry
    const lastClipState = clipHistory[clipHistory.length - 1];
    
    // Restore the clip state
    if (lastClipState) {
      const previousClips = lastClipState.clips;
      setTimelineClips(previousClips);
      // Update the ref so the next change tracking works correctly
      prevTimelineClipsRef.current = previousClips;
    }
    
    // Remove from history
    setEditHistory(prev => prev.slice(0, -1));
    setClipHistory(prev => prev.slice(0, -1));
    
    // Reset flag after a brief delay to allow state updates
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
  }, [editHistory, clipHistory]);

  // Expose handleUndo and setTimelineClips on window object for menu access
  React.useEffect(() => {
    window.handleUndo = handleUndo;
    window.editHistoryLength = editHistory.length;
    window.setTimelineClipsUndo = setTimelineClips;
    return () => {
      window.handleUndo = undefined;
      window.editHistoryLength = undefined;
      window.setTimelineClipsUndo = undefined;
    };
  }, [handleUndo, editHistory.length, setTimelineClips]);

  // Keyboard shortcut handler for Ctrl+Z
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Track timeline changes
  React.useEffect(() => {
    const prevClips = prevTimelineClipsRef.current;
    const currentClips = timelineClips;

    // Skip if we're in the middle of an undo operation
    if (isUndoingRef.current) {
      prevTimelineClipsRef.current = currentClips;
      return;
    }

    // Skip tracking if no changes in clip count and clips are identical
    if (prevClips.length === currentClips.length && 
        prevClips.every((prevClip, idx) => 
          prevClip.id === currentClips[idx].id &&
          prevClip.startFrames === currentClips[idx].startFrames &&
          prevClip.endFrames === currentClips[idx].endFrames &&
          prevClip.track === currentClips[idx].track
        )) {
      return;
    }

    // Detect changes
    if (currentClips.length > prevClips.length) {
      // Clip added
      const newClip = currentClips.find(clip => !prevClips.some(p => p.id === clip.id));
      if (newClip) {
        addHistoryEntry('add', {
          clipId: newClip.id,
          clipName: newClip.filename || newClip.character || 'Clip',
          position: newClip.startFrames || 0
        }, prevClips);
      }
    } else if (currentClips.length < prevClips.length) {
      // Clip deleted
      const deletedClip = prevClips.find(clip => !currentClips.some(c => c.id === clip.id));
      if (deletedClip) {
        addHistoryEntry('delete', {
          clipId: deletedClip.id,
          clipName: deletedClip.filename || deletedClip.character || 'Clip'
        }, prevClips);
      }
    } else {
      // Check for moved or cropped clips
      let hasChanges = false;
      currentClips.forEach(currentClip => {
        const prevClip = prevClips.find(p => p.id === currentClip.id);
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
          hasChanges = true;
          if (durationChanged && positionChanged) {
            // Both moved and cropped
            addHistoryEntry('crop', {
              clipId: currentClip.id,
              clipName: currentClip.filename || currentClip.character || 'Clip',
              oldDuration: prevEnd - prevStart,
              newDuration: currEnd - currStart,
              oldStart: prevStart,
              newStart: currStart
            }, prevClips);
          } else if (durationChanged) {
            // Just cropped
            addHistoryEntry('crop', {
              clipId: currentClip.id,
              clipName: currentClip.filename || currentClip.character || 'Clip',
              oldDuration: prevEnd - prevStart,
              newDuration: currEnd - currStart
            }, prevClips);
          } else if (positionChanged || trackChanged) {
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
            }, prevClips);
          }
        }
      });
    }

    prevTimelineClipsRef.current = currentClips;
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
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                background: '#1e1e1e',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                {editHistory.length === 0 ? (
                  <div style={{ color: '#666', padding: '8px' }}>
                    No edit history yet
                  </div>
                ) : (
                  editHistory.slice().reverse().map((entry, index) => (
                    <div 
                      key={index}
                      style={{
                        color: getActionColor(entry.action),
                        padding: '4px 8px',
                        borderRadius: '2px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'baseline'
                      }}
                    >
                      <span style={{ color: '#888', fontSize: '10px' }}>{entry.timestamp}</span>
                      <span style={{ fontWeight: 'bold' }}>[{entry.action.toUpperCase()}]</span>
                      <span style={{ color: '#fff' }}>{formatHistoryEntry(entry)}</span>
                    </div>
                  ))
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