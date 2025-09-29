import React, { useState } from 'react';
import ClipList from './components/ClipList';
import ClipPreview from './components/ClipPreview';

function App() {
  const [activeTab, setActiveTab] = useState('editor');

  const tabs = [
    { id: 'editor', label: 'Editor', component: EditorLayout },
    { id: 'script', label: 'Script Input', component: () => <div>Script Input - Coming Soon</div> },
    { id: 'export', label: 'Export', component: () => <div>Export - Coming Soon</div> }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || EditorLayout;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
  const [leftWidth, setLeftWidth] = React.useState(800);
  const [rightWidth, setRightWidth] = React.useState(350);
  const [timelineHeight, setTimelineHeight] = React.useState(250);
  const [isResizing, setIsResizing] = React.useState(null);
  const [selectedClip, setSelectedClip] = React.useState(null);

  const handleMouseDown = (type) => (e) => {
    setIsResizing(type);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight - 60; // Account for tab bar

    if (isResizing === 'left') {
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setLeftWidth(newWidth);
    } else if (isResizing === 'right') {
      const newWidth = Math.max(200, Math.min(600, containerWidth - e.clientX));
      setRightWidth(newWidth);
    } else if (isResizing === 'timeline') {
      const newHeight = Math.max(150, Math.min(400, containerHeight - e.clientY + 100));
      setTimelineHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizing === 'left' || isResizing === 'right' ? 'col-resize' : 'row-resize';
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
      {/* Top Row - Left Panel, Preview Panel */}
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

        {/* Right Panel - Preview */}
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
              Preview
            </h3>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ClipPreview clip={selectedClip} />
            </div>
          </div>
          
          {/* Right Resize Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: -2,
              width: '4px',
              height: '100%',
              background: isResizing === 'right' ? '#007bff' : 'transparent',
              cursor: 'col-resize',
              zIndex: 10
            }}
            onMouseDown={handleMouseDown('right')}
          />
        </div>
      </div>

      {/* Bottom Row - Timeline */}
      <div style={{ 
        height: `${timelineHeight}px`,
        background: 'white',
        borderTop: '1px solid #ddd',
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
          <div style={{ 
            flex: 1,
            background: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            Timeline Workspace
          </div>
        </div>
        
        {/* Timeline Resize Handle */}
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: 0,
            right: 0,
            height: '4px',
            background: isResizing === 'timeline' ? '#007bff' : 'transparent',
            cursor: 'row-resize',
            zIndex: 10
          }}
          onMouseDown={handleMouseDown('timeline')}
        />
      </div>
    </div>
  );
}

export default App;