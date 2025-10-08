import React, { useState, useEffect } from 'react';
import ClipList from './components/ClipList';
import Preview from './components/Preview';
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
  const [timelineHeight, setTimelineHeight] = React.useState(400);
  const [clipPreviewWidth, setClipPreviewWidth] = React.useState(400);
  const [isResizing, setIsResizing] = React.useState(null);
  const [selectedClip, setSelectedClip] = React.useState(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [prerenderVideos, setPrerenderVideos] = React.useState([]);
  const [currentPreviewVideo, setCurrentPreviewVideo] = React.useState(null);
  const [currentFrame, setCurrentFrame] = React.useState(null);
  const [frameLoadingState, setFrameLoadingState] = React.useState('idle'); // 'idle', 'loading', 'loaded', 'error'

  // Handle prerender video playback (streaming mode - no file output)
  const handlePrerenderPlayback = (prerenderData) => {
    if (prerenderData && prerenderData.streamingMode) {
      console.log('Prerender ready for streaming mode');
      // No file output in streaming mode - frames are extracted on demand
    }
  };

  // Sync preview video with timeline playback
  React.useEffect(() => {
    const videoElement = document.querySelector('#timeline-preview-video');
    if (videoElement && currentPreviewVideo) {
      if (isPlaying) {
        videoElement.play();
      } else {
        videoElement.pause();
      }
    }
  }, [isPlaying, currentPreviewVideo]);

  // Handle video loading and error states
  const handleVideoLoad = () => {
    console.log('Preview video loaded successfully');
  };

  const handleVideoError = (e) => {
    console.error('Preview video failed to load:', e);
    setCurrentPreviewVideo(null); // Clear failed video
  };

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

  // Listen for prerender completion (streaming mode)
  React.useEffect(() => {
    const handlePrerenderComplete = (event) => {
      const { prerenderId, outputPath, frameCount, streamingMode } = event.detail;
      if (streamingMode) {
        console.log('Prerender ready for streaming mode');
        handlePrerenderPlayback({ streamingMode: true });
      } else {
        setPrerenderVideos(prev => [...prev, { prerenderId, outputPath, frameCount }]);
        handlePrerenderPlayback({ outputPath, frameCount });
      }
    };

    const handleShowFrame = (event) => {
      const { character, filename, frameNumber, timelinePosition, clipStartFrames } = event.detail;
      console.log('📥 Received showFrame event:', { 
        character, 
        filename, 
        frameNumber, 
        timelinePosition, 
        clipStartFrames 
      });
      
      if (character && filename && frameNumber !== null) {
        console.log('✅ Setting current frame with valid data');
        console.log('🔄 Frame loading started:', {
          character,
          filename,
          originalFrameNumber: frameNumber,
          roundedFrameNumber: Math.floor(frameNumber),
          timelinePosition,
          clipStartFrames,
          frameCalculation: {
            timelinePosition: timelinePosition,
            clipStartFrames: clipStartFrames,
            calculatedFrame: timelinePosition - clipStartFrames,
            finalFrame: Math.floor(frameNumber)
          },
          url: `http://localhost:5000/api/frame-direct/${character}/${filename}/${Math.floor(frameNumber)}`
        });
        
        // Test if the frame URL is accessible
        const frameUrl = `http://localhost:5000/api/frame-direct/${character}/${filename}/${Math.floor(frameNumber)}`;
        fetch(frameUrl)
          .then(response => {
            console.log('🔍 Frame URL test response:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              url: response.url
            });
            if (!response.ok) {
              console.error('❌ Frame URL test failed:', response.status, response.statusText);
            }
          })
          .catch(error => {
            console.error('❌ Frame URL test error:', error);
          });
        
        setCurrentFrame({ character, filename, frameNumber: Math.floor(frameNumber), timelinePosition, clipStartFrames });
        setFrameLoadingState('loading');
      } else {
        console.log('⚠️ Setting current frame with null/invalid data');
        setCurrentFrame({ character, filename, frameNumber: Math.floor(frameNumber), timelinePosition, clipStartFrames });
        setFrameLoadingState('idle');
      }
    };

    window.addEventListener('prerenderComplete', handlePrerenderComplete);
    window.addEventListener('showFrame', handleShowFrame);
    return () => {
      window.removeEventListener('prerenderComplete', handlePrerenderComplete);
      window.removeEventListener('showFrame', handleShowFrame);
    };
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
          <div style={{ 
            height: '100%', 
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Timeline Preview
            </h3>
            <div 
              style={{ flex: 1, overflow: 'hidden' }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const clipData = e.dataTransfer.getData("application/json");
                if (clipData) {
                  const clip = JSON.parse(clipData);
                  console.log("Dropped clip in Timeline Preview:", clip);
                  // TODO: Add clip to timeline
                }
              }}
            >
              {/* 16:9 Timeline Preview Screen */}
              <div style={{
                width: '100%',
                aspectRatio: '16/9',
                background: '#000',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '600',
                border: '2px solid #333',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: '16px'
              }}>
                {/* Frame preview or placeholder */}
                {currentFrame && currentFrame.character ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img
                      src={`http://localhost:5000/api/frame-direct/${currentFrame.character}/${currentFrame.filename}/${Math.floor(currentFrame.frameNumber)}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      alt={`Frame from ${currentFrame.character} - ${currentFrame.filename}`}
                      onLoad={(e) => {
                        console.log('✅ Frame loaded successfully:', {
                          src: e.target.src,
                          character: currentFrame.character,
                          filename: currentFrame.filename,
                          frameNumber: currentFrame.frameNumber,
                          naturalWidth: e.target.naturalWidth,
                          naturalHeight: e.target.naturalHeight,
                          complete: e.target.complete,
                          readyState: e.target.readyState
                        });
                        setFrameLoadingState('loaded');
                      }}
                      onError={(e) => {
                        console.error('❌ Frame failed to load:', {
                          src: e.target.src,
                          character: currentFrame.character,
                          filename: currentFrame.filename,
                          frameNumber: currentFrame.frameNumber,
                          error: e,
                          networkState: e.target.networkState,
                          readyState: e.target.readyState,
                          complete: e.target.complete,
                          naturalWidth: e.target.naturalWidth,
                          naturalHeight: e.target.naturalHeight,
                          currentSrc: e.target.currentSrc,
                          crossOrigin: e.target.crossOrigin,
                          loading: e.target.loading,
                          decoding: e.target.decoding
                        });
                        
                        // Test the URL directly to see what the server returns
                        fetch(e.target.src)
                          .then(response => {
                            console.error('🔍 Direct URL test failed:', {
                              status: response.status,
                              statusText: response.statusText,
                              headers: Object.fromEntries(response.headers.entries()),
                              url: response.url,
                              ok: response.ok
                            });
                          })
                          .catch(fetchError => {
                            console.error('🔍 Direct URL fetch error:', fetchError);
                          });
                        
                        setFrameLoadingState('error');
                      }}
                    />
                    {/* Debug overlay */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      background: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      maxWidth: '400px',
                      wordBreak: 'break-all'
                    }}>
                      <div><strong>{currentFrame.character}/{currentFrame.filename}</strong></div>
                      <div>Timeline Pos: {currentFrame.timelinePosition}</div>
                      <div>Clip Start: {currentFrame.clipStartFrames}</div>
                      <div>Raw Frame (60fps): {currentFrame.timelinePosition - currentFrame.clipStartFrames}</div>
                      <div>Converted Frame (24fps): {Math.floor(currentFrame.frameNumber)}</div>
                      <div>Conversion: ({currentFrame.timelinePosition - currentFrame.clipStartFrames} × 24) ÷ 60</div>
                      <div>Status: {frameLoadingState}
                        {frameLoadingState === 'loading' && ' 🔄'}
                        {frameLoadingState === 'loaded' && ' ✅'}
                        {frameLoadingState === 'error' && ' ❌'}
                      </div>
                      {frameLoadingState === 'error' && (
                        <div style={{ marginTop: '4px', color: '#ff6b6b' }}>
                          <div>❌ Frame failed to load</div>
                          <div style={{ fontSize: '10px', marginTop: '2px' }}>
                            Check console for detailed error info
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    color: '#666',
                    textAlign: 'center'
                  }}>
                    {currentFrame ? 'No clip at this position' : 'Timeline Preview'}
                  </div>
                )}
              </div>
              
              {/* Playback Control */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                {/* Play/Stop Toggle Button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '6px',
                    border: '2px solid #333',
                    background: '#f8f9fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#333',
                    transition: 'all 0.2s',
                    padding: 0,
                    margin: 0,
                    lineHeight: 1,
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e9ecef';
                    e.target.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#333';
                  }}
                  title={isPlaying ? "Stop" : "Play"}
                >
                  {isPlaying ? '⏹' : '▶'}
                </button>
              </div>
            </div>
          </div>
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
              <Preview clip={selectedClip} />
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