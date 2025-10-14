import React, { useState, useEffect } from 'react';
import ClipList from './components/ClipList';
import ClipPreview from './components/ClipPreview';
import TimelinePreview from './components/TimelinePreview';
import Timeline from './components/Timeline';

function App() {
  const [activeTab, setActiveTab] = useState('editor');

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
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #ddd', 
        background: '#f8f9fa',
        padding: '0 16px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === tab.id ? 'white' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? '#007bff' : '#666',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
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
          position: 'relative'
        }}>
          <div style={{ 
            height: '100%', 
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Clip Preview
            </h3>
                   <div style={{ flex: 1, overflow: 'hidden' }}>
                     <ClipPreview clip={selectedClip} />
                   </div>
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