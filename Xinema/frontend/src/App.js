import React, { useState, useEffect } from 'react';
import ClipList from './components/ClipList';
import ClipPreview from './components/ClipPreview';
import TimelinePreview from './components/TimelinePreview';
import Timeline from './components/Timeline';
import {
  getAllScripts,
  saveScript,
  parseSentences,
  generateId,
} from './utils/scriptStorage';
import { apiEndpoints } from './config/api';

function App() {
  const [activeTab, setActiveTab] = useState('editor');
  const [openMenu, setOpenMenu] = useState(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (
        !e.target.closest('.menu-bar-item') &&
        !e.target.closest('.menu-dropdown')
      ) {
        setOpenMenu(null);
      }
    };
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  // Prevent Alt key browser menu and context menu, set body styles
  useEffect(() => {
    const preventAltKey = e => {
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const preventContextMenu = e => {
      // Allow right-click on specific elements that need context menu access
      if (
        e.target.closest('.timeline-content') ||
        e.target.closest('.clip-list') ||
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('textarea')
      ) {
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
    const preventSelection = e => {
      e.preventDefault();
    };

    document.addEventListener('selectstart', preventSelection, {
      passive: false,
    });
    document.addEventListener('dragstart', preventSelection, {
      passive: false,
    });

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
    {
      id: 'script',
      label: 'Script Input',
      component: () => <ScriptPanel setActiveTab={setActiveTab} />,
    },
    {
      id: 'export',
      label: 'Export',
      component: () => (
        <div style={{ padding: '20px' }}>Export - Coming Soon</div>
      ),
    },
  ];

  // Expose tab switcher for ClipList "Edit" action
  useEffect(() => {
    window.setMainTab = setActiveTab;
    return () => {
      window.setMainTab = undefined;
    };
  }, [setActiveTab]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      {/* Menu Bar */}
      <div
        style={{
          display: 'flex',
          background: '#f0f0f0',
          borderBottom: '1px solid #ddd',
          padding: '4px 8px',
          height: '28px',
          alignItems: 'center',
          fontSize: '14px',
          position: 'relative',
        }}
      >
        <div
          className="menu-bar-item"
          onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
          style={{
            padding: '4px 12px',
            cursor: 'pointer',
            background: openMenu === 'file' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px',
            position: 'relative',
          }}
        >
          File
        </div>
        {openMenu === 'file' && (
          <div
            className="menu-dropdown"
            style={{
              position: 'absolute',
              top: '28px',
              left: '4px',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              minWidth: '180px',
              padding: '4px 0',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                padding: '6px 20px',
                cursor: 'pointer',
                ':hover': { background: '#f0f0f0' },
              }}
              onMouseEnter={e => (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                if (window.newProject) {
                  window.newProject();
                }
                setOpenMenu(null);
              }}
            >
              New Project...
            </div>
            <div
              style={{ padding: '6px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                if (window.openProject) {
                  window.openProject();
                } else {
                  console.warn('Open Project unavailable');
                }
                setOpenMenu(null);
              }}
            >
              Open Project...
            </div>
            <div
              style={{ padding: '6px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                if (window.saveProject) {
                  window.saveProject();
                } else {
                  console.warn('Save Project unavailable');
                }
                setOpenMenu(null);
              }}
            >
              Save Project
            </div>
            <div
              style={{ padding: '6px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                if (window.saveProjectAs) {
                  window.saveProjectAs();
                } else {
                  console.warn('Save As unavailable');
                }
                setOpenMenu(null);
              }}
            >
              Save Project As...
            </div>
            <div
              style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}
            ></div>
            <div
              style={{ padding: '6px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                console.log('Import Media');
                setOpenMenu(null);
              }}
            >
              Import Media...
            </div>
            <div
              style={{ padding: '6px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                console.log('Export Timeline');
                setOpenMenu(null);
              }}
            >
              Export Timeline...
            </div>
            <div
              style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}
            ></div>
            <div
              style={{ padding: '6px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.target.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                console.log('Exit');
                setOpenMenu(null);
              }}
            >
              Exit
            </div>
          </div>
        )}
        {openMenu === 'edit' && (
          <div
            className="menu-dropdown"
            style={{
              position: 'absolute',
              top: '28px',
              left: '48px',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              minWidth: '180px',
              padding: '4px 0',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                padding: '6px 20px',
                cursor: window.canUndo ? 'pointer' : 'not-allowed',
                opacity: window.canUndo ? '1' : '0.5',
              }}
              onMouseEnter={e => {
                if (window.canUndo) e.target.style.background = '#f0f0f0';
              }}
              onMouseLeave={e => (e.target.style.background = 'white')}
              onClick={() => {
                if (window.handleUndo && window.canUndo) {
                  window.handleUndo();
                  setOpenMenu(null);
                }
              }}
            >
              Undo (Ctrl+Z)
            </div>
            <div
              style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }}
            ></div>
            <div
              style={{
                padding: '6px 20px',
                cursor: window.canRedo ? 'pointer' : 'not-allowed',
                opacity: window.canRedo ? '1' : '0.5',
              }}
              onMouseEnter={e => {
                if (window.canRedo) e.target.style.background = '#f0f0f0';
              }}
              onMouseLeave={e => (e.target.style.background = 'white')}
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
            borderRadius: '2px',
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
            borderRadius: '2px',
          }}
        >
          View
        </div>
        <div
          className="menu-bar-item"
          onClick={() =>
            setOpenMenu(openMenu === 'timeline' ? null : 'timeline')
          }
          style={{
            padding: '4px 12px',
            cursor: 'pointer',
            background: openMenu === 'timeline' ? '#e0e0e0' : 'transparent',
            borderRadius: '2px',
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
            borderRadius: '2px',
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
            borderRadius: '2px',
          }}
        >
          Help
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          background: '#f8f9fa',
          padding: '8px 16px 0 16px',
        }}
      >
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
              fontWeight: '600',
              color: activeTab === tab.id ? '#007bff' : '#666',
              transition: 'all 0.2s',
              position: 'relative',
              zIndex: activeTab === tab.id ? 1 : 0,
              boxShadow:
                activeTab === tab.id ? 'inset 0 -2px 0 0 white' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          background: 'white',
          borderTop: '1px solid #ddd',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
          position: 'relative',
        }}
      >
        {tabs.map(tab => {
          const TabComponent = tab.component;
          return (
            <div
              key={tab.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: activeTab === tab.id ? 'flex' : 'none',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <TabComponent />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Editor Layout - Premiere Pro style 3-window setup with resizable panels
function EditorLayout() {
  const [leftWidth, setLeftWidth] = React.useState(1200);

  // Listen for playback control events from Timeline
  React.useEffect(() => {
    const handleTimelineRequestPlay = event => {
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
      window.removeEventListener(
        'timelineRequestPlay',
        handleTimelineRequestPlay
      );
      window.removeEventListener(
        'timelineRequestStop',
        handleTimelineRequestStop
      );
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
  const [importedMedia, setImportedMedia] = React.useState([]); // Imported media files
  const [generateToast, setGenerateToast] = React.useState(null); // Toast for generate video
  const isUndoingRef = React.useRef(false); // Flag to prevent tracking undo operations
  const prevTimelineClipsRef = React.useRef(timelineClips);
  const historyContainerRef = React.useRef(null); // Ref for history scroll container
  // Expose project export functions for Save As
  React.useEffect(() => {
    const buildProjectJson = () => {
      const project = {
        schemaVersion: 1,
        projectId:
          window.currentProjectId ||
          (window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : String(Date.now())),
        name: window.currentProjectName || 'Xinema Project',
        createdAt: window.currentProjectCreatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        frameRate: 60,
        timeline: {
          tracks: [
            { id: 'v1', type: 'video', index: 1 },
            { id: 'v2', type: 'video', index: 2 },
            { id: 'v3', type: 'video', index: 3 },
          ],
          staticClipData: (() => {
            // Collect unique clips and their static data
            const staticMap = new Map();
            (timelineClips || []).filter(Boolean).forEach(c => {
              if (c.character && c.filename) {
                const key = `${c.character}/${c.filename}`;
                if (!staticMap.has(key)) {
                  // Save static data for this clip
                  const duration = Number.isFinite(c.duration)
                    ? c.duration
                    : Number.isFinite(c.originalDurationFrames)
                    ? c.originalDurationFrames / 60
                    : 60;
                  staticMap.set(key, {
                    character: c.character,
                    filename: c.filename,
                    duration: duration,
                    originalStartFrames: c.originalStartFrames ?? 0,
                    originalEndFrames:
                      c.originalEndFrames ?? Math.floor(duration * 60),
                    originalDurationFrames:
                      c.originalDurationFrames ?? Math.floor(duration * 60),
                  });
                }
              }
            });
            // Convert Map to array for JSON serialization
            return Array.from(staticMap.entries()).map(([key, value]) => ({
              key,
              value,
            }));
          })(),
          clips: (timelineClips || []).filter(Boolean).map(c => {
            // Save ALL fields from the clip object - don't cherry-pick
            const saved = {
              id: c.id,
              track: c.track,
              // Visual positions
              startFrames: c.startFrames,
              endFrames: c.endFrames,
              // Crop amounts
              leftCropFrames: c.leftCropFrames ?? 0,
              rightCropFrames: c.rightCropFrames ?? 0,
              // Instance-level original positions (what the clip was before crops)
              originalStart: c.originalStart,
              originalEnd: c.originalEnd,
              // Instance positions (used by timeline math)
              instanceStartFrames: c.instanceStartFrames,
              instanceEndFrames: c.instanceEndFrames,
              // Static data (if present)
              originalStartFrames: c.originalStartFrames,
              originalEndFrames: c.originalEndFrames,
              originalDurationFrames: c.originalDurationFrames,
              durationFrames: c.durationFrames,
              // Pixel positions (for display)
              startPixel: c.startPixel,
              endPixel: c.endPixel,
              widthPixel: c.widthPixel,
              instanceStartPixel: c.instanceStartPixel,
              instanceEndPixel: c.instanceEndPixel,
              instanceWidthPixel: c.instanceWidthPixel,
              // Other properties
              speed: c.speed ?? 1.0,
              character: c.character,
              filename: c.filename,
              duration: c.duration,
              type: c.type, // Save type for imported media
              source: {
                relativeRef:
                  c.character && c.filename
                    ? `${c.character}/${c.filename}`
                    : undefined,
                backendPath:
                  c.character && c.filename
                    ? `/api/video/${c.character}/${c.filename}`
                    : undefined,
                durationSeconds:
                  typeof c.duration === 'number' ? c.duration : undefined,
              },
              metadata: c.metadata || {},
            };
            // For imported media clips, save reference to imported media ID
            if (
              c.type === 'imported' &&
              c.importedMedia &&
              c.importedMedia.id
            ) {
              saved.importedMediaId = c.importedMedia.id;
            }
            // Remove undefined values to keep JSON clean
            Object.keys(saved).forEach(key => {
              if (saved[key] === undefined) delete saved[key];
            });
            return saved;
          }),
        },
        uiState: {
          zoom: timelineZoom,
          playheadPosition: playheadPosition,
          selectedClipIds: selectedClip ? [selectedClip.id] : [],
        },
        importedMedia: (importedMedia || []).map(media => {
          const saved = {
            id: media.id,
            type: media.type || 'video',
            filename: media.filename,
            path: media.path || media.filename, // Save file path for restoration
            size: media.size,
            duration: media.duration,
            width: media.width,
            height: media.height,
            lastModified: media.lastModified,
            // Save waveform thumbnail for audio files (base64 data URL is serializable)
            ...(media.type === 'audio' && media.waveformDataUrl
              ? { waveformDataUrl: media.waveformDataUrl }
              : {}),
            // File objects and object URLs cannot be serialized, but we save the path
            // On restore, we'll attempt to access the file using the saved path
          };

          // Debug logging
          console.log('💾 Saving imported media:', saved.filename, saved);
          return saved;
        }),
      };
      return project;
    };

    // Function to restore imported media files in desktop app (Electron/Tauri)
    const restoreImportedMediaFilesDesktop = async mediaList => {
      if (!mediaList || mediaList.length === 0) {
        return;
      }

      console.log(
        '🖥️ Desktop app: Auto-restoring',
        mediaList.length,
        'files from paths'
      );

      // In Electron, we can use Node.js fs to read files directly
      // Check for Electron API
      if (window.electronAPI && window.electronAPI.readFile) {
        try {
          const restoredMedia = await Promise.all(
            mediaList.map(async media => {
              try {
                const filePath = media.path;
                if (!filePath) {
                  console.warn(`⚠️ No path for file: ${media.filename}`);
                  return { ...media, file: null, url: null, restored: true };
                }

                console.log(`📂 Reading file: ${filePath}`);

                // Read file via Electron API
                const fileData = await window.electronAPI.readFile(filePath);

                // Determine MIME type based on file extension and media type
                const ext = media.filename.toLowerCase().split('.').pop();
                let mimeType = 'video/mp4'; // Default
                if (media.type === 'audio') {
                  if (ext === 'mp3') mimeType = 'audio/mpeg';
                  else if (ext === 'wav') mimeType = 'audio/wav';
                  else if (ext === 'ogg') mimeType = 'audio/ogg';
                  else if (ext === 'aac') mimeType = 'audio/aac';
                  else mimeType = 'audio/mpeg';
                } else {
                  if (ext === 'mp4') mimeType = 'video/mp4';
                  else if (ext === 'mov') mimeType = 'video/quicktime';
                  else if (ext === 'avi') mimeType = 'video/x-msvideo';
                  else if (ext === 'webm') mimeType = 'video/webm';
                }

                // Create File object from buffer
                const file = new File([fileData], media.filename, {
                  type: mimeType,
                  lastModified: media.lastModified || Date.now(),
                });

                // Create object URL and extract metadata
                const url = URL.createObjectURL(file);

                const mediaType = media.type || 'video';

                if (mediaType === 'audio') {
                  // Handle audio files
                  const audio = document.createElement('audio');
                  audio.preload = 'metadata';
                  audio.src = url;

                  return new Promise(resolve => {
                    audio.onloadedmetadata = async () => {
                      console.log(`✅ Restored audio file: ${media.filename}`);

                      // Use saved waveform if available, otherwise generate new one
                      let waveformDataUrl = media.waveformDataUrl;
                      if (!waveformDataUrl) {
                        try {
                          // Import generateAudioWaveform dynamically to avoid issues
                          const { generateAudioWaveform } = await import(
                            './utils/audioWaveform'
                          );
                          waveformDataUrl = await generateAudioWaveform(
                            file,
                            3,
                            1080,
                            720
                          );
                        } catch (error) {
                          console.warn(
                            `⚠️ Could not generate waveform for ${media.filename}:`,
                            error
                          );
                        }
                      }

                      resolve({
                        id: media.id,
                        type: 'audio',
                        filename: media.filename,
                        path: filePath,
                        size: file.size,
                        duration: audio.duration,
                        width: 1080,
                        height: 720,
                        targetWidth: 1080,
                        targetHeight: 720,
                        lastModified: file.lastModified,
                        file: file,
                        url: url,
                        waveformDataUrl: waveformDataUrl,
                        restored: false,
                      });
                    };

                    audio.onerror = () => {
                      console.error(
                        `❌ Error loading metadata for: ${media.filename}`
                      );
                      resolve({
                        ...media,
                        file: file,
                        url: url,
                        waveformDataUrl: media.waveformDataUrl, // Preserve saved waveform if available
                        restored: false,
                        restoreError: 'Failed to load audio metadata',
                      });
                    };

                    audio.load();
                  });
                } else {
                  // Handle video files
                  const video = document.createElement('video');
                  video.preload = 'metadata';
                  video.src = url;

                  return new Promise(resolve => {
                    video.onloadedmetadata = () => {
                      console.log(`✅ Restored file: ${media.filename}`);
                      resolve({
                        id: media.id,
                        type: media.type || 'video',
                        filename: media.filename,
                        path: filePath,
                        size: file.size,
                        duration: video.duration,
                        width: video.videoWidth,
                        height: video.videoHeight,
                        targetWidth: 1080,
                        targetHeight: 720,
                        lastModified: file.lastModified,
                        file: file,
                        url: url,
                        restored: false,
                      });
                    };

                    video.onerror = () => {
                      console.error(
                        `❌ Error loading metadata for: ${media.filename}`
                      );
                      resolve({
                        ...media,
                        file: file,
                        url: url,
                        restored: false,
                        restoreError: 'Failed to load video metadata',
                      });
                    };

                    video.load();
                  });
                }
              } catch (e) {
                console.error(`❌ Error restoring file ${media.filename}:`, e);
                return {
                  ...media,
                  file: null,
                  url: null,
                  restored: true,
                  restoreError: e.message,
                };
              }
            })
          );

          const successCount = restoredMedia.filter(
            m => m.file && m.url
          ).length;
          console.log(
            `✅ Desktop restoration complete: ${successCount}/${mediaList.length} files restored`
          );

          setImportedMedia(restoredMedia);
          return restoredMedia; // Return for linking to clips
        } catch (e) {
          console.error('❌ Desktop file restoration error:', e);
          // Fall back to metadata-only (preserve waveformDataUrl if available)
          setImportedMedia(
            mediaList.map(media => ({
              ...media,
              file: null,
              url: null,
              restored: true,
              // Preserve waveformDataUrl for audio files even when file can't be restored
              ...(media.type === 'audio' && media.waveformDataUrl
                ? { waveformDataUrl: media.waveformDataUrl }
                : {}),
            }))
          );
        }
      } else {
        // No Electron API available, fall back to metadata-only
        console.warn('⚠️ Desktop app detected but Electron API not available');
        setImportedMedia(
          mediaList.map(media => ({
            ...media,
            file: null,
            url: null,
            restored: true,
            // Preserve waveformDataUrl for audio files even when file can't be restored
            ...(media.type === 'audio' && media.waveformDataUrl
              ? { waveformDataUrl: media.waveformDataUrl }
              : {}),
          }))
        );
      }
    };

    const downloadProjectAs = filename => {
      try {
        const project = buildProjectJson();
        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date();
        const pad = n => String(n).padStart(2, '0');
        const defaultName =
          filename ||
          `Xinema_Project_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(
            ts.getDate()
          )}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(
            ts.getSeconds()
          )}.xinema.json`;
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Failed to export project:', e);
      }
    };

    const applyProjectJson = project => {
      try {
        // Prevent history tracking during load
        isUndoingRef.current = true;
        // Restore ALL fields exactly as saved - ensure relationships are correct for cropping
        const clips = (project?.timeline?.clips || [])
          .filter(Boolean)
          .map(c => {
            const restored = {
              ...c, // Spread all saved properties first
              // Ensure required fields have defaults
              id: c.id,
              track: typeof c.track === 'number' ? c.track : 1,
              leftCropFrames: Number.isFinite(c.leftCropFrames)
                ? c.leftCropFrames
                : 0,
              rightCropFrames: Number.isFinite(c.rightCropFrames)
                ? c.rightCropFrames
                : 0,
              speed: Number.isFinite(c.speed) ? c.speed : 1.0,
              character: c.character,
              filename: c.filename,
              type: c.type, // Restore type for imported media
            };

            // For imported media clips, link to imported media object
            if (
              c.type === 'imported' &&
              c.importedMediaId &&
              project?.importedMedia
            ) {
              const importedMediaItem = project.importedMedia.find(
                m => m.id === c.importedMediaId
              );
              if (importedMediaItem) {
                restored.importedMedia = importedMediaItem;
              }
            }

            // CRITICAL: Ensure instance positions are set correctly for trim logic
            // These are the actual clip boundaries (before crops are applied)
            const leftCrop = restored.leftCropFrames;
            const rightCrop = restored.rightCropFrames;

            // If we have originalStart/originalEnd, use those for instance positions
            if (
              Number.isFinite(c.originalStart) &&
              Number.isFinite(c.originalEnd)
            ) {
              restored.originalStart = c.originalStart;
              restored.originalEnd = c.originalEnd;
              restored.instanceStartFrames =
                c.instanceStartFrames ?? c.originalStart;
              restored.instanceEndFrames = c.instanceEndFrames ?? c.originalEnd;
            } else if (
              Number.isFinite(c.instanceStartFrames) &&
              Number.isFinite(c.instanceEndFrames)
            ) {
              // Fallback: use instance positions and derive original from them
              restored.instanceStartFrames = c.instanceStartFrames;
              restored.instanceEndFrames = c.instanceEndFrames;
              restored.originalStart = c.originalStart ?? c.instanceStartFrames;
              restored.originalEnd = c.originalEnd ?? c.instanceEndFrames;
            } else {
              // Last resort: derive from visual positions and crops
              const visualStart = Number.isFinite(c.startFrames)
                ? c.startFrames
                : 0;
              const visualEnd = Number.isFinite(c.endFrames)
                ? c.endFrames
                : visualStart + 60;
              restored.instanceStartFrames = visualStart - leftCrop;
              restored.instanceEndFrames = visualEnd + rightCrop;
              restored.originalStart =
                restored.originalStart ?? restored.instanceStartFrames;
              restored.originalEnd =
                restored.originalEnd ?? restored.instanceEndFrames;
            }

            // Ensure visual positions match: visual = instance + crops
            restored.startFrames = restored.instanceStartFrames + leftCrop;
            restored.endFrames = restored.instanceEndFrames - rightCrop;

            // Restore duration from multiple possible sources
            restored.duration = Number.isFinite(c.duration)
              ? c.duration
              : Number.isFinite(c.source?.durationSeconds)
              ? c.source.durationSeconds
              : Number.isFinite(c.originalDurationFrames)
              ? c.originalDurationFrames / 60
              : undefined;

            return restored;
          });
        setTimelineClips(clips);
        if (
          Array.isArray(project?.uiState?.selectedClipIds) &&
          project.uiState.selectedClipIds.length > 0
        ) {
          const cid = project.uiState.selectedClipIds[0];
          const found = clips.find(c => c.id === cid);
          if (found) setSelectedClip(found);
          else setSelectedClip(null);
        } else {
          setSelectedClip(null);
        }
        if (typeof project?.uiState?.zoom === 'number')
          setTimelineZoom(project.uiState.zoom);
        if (typeof project?.uiState?.playheadPosition === 'number')
          setPlayheadPosition(project.uiState.playheadPosition);
        // Reset histories
        setEditHistory([]);
        setOperationHistory([]);

        // CRITICAL: Initialize static clip data for Timeline component
        // Timeline needs this data for trimming to work
        const staticDataMap = new Map();
        if (
          project?.timeline?.staticClipData &&
          Array.isArray(project.timeline.staticClipData)
        ) {
          // Use saved static data
          project.timeline.staticClipData.forEach(({ key, value }) => {
            staticDataMap.set(key, value);
          });
        } else {
          // Fallback: derive static data from loaded clips
          clips.forEach(c => {
            if (c.character && c.filename) {
              const key = `${c.character}/${c.filename}`;
              if (!staticDataMap.has(key)) {
                const duration = Number.isFinite(c.duration) ? c.duration : 60;
                staticDataMap.set(key, {
                  character: c.character,
                  filename: c.filename,
                  duration: duration,
                  originalStartFrames: c.originalStartFrames ?? 0,
                  originalEndFrames:
                    c.originalEndFrames ?? Math.floor(duration * 60),
                  originalDurationFrames:
                    c.originalDurationFrames ?? Math.floor(duration * 60),
                });
              }
            }
          });
        }
        // Dispatch event to Timeline to initialize static data
        if (staticDataMap.size > 0) {
          window.dispatchEvent(
            new CustomEvent('initializeStaticClipData', {
              detail: { staticDataMap: Object.fromEntries(staticDataMap) },
            })
          );
        }

        // Restore imported media metadata and automatically restore files if in desktop app
        if (
          project?.importedMedia &&
          Array.isArray(project.importedMedia) &&
          project.importedMedia.length > 0
        ) {
          console.log(
            '📦 Restoring imported media:',
            project.importedMedia.length,
            'items'
          );
          console.log(
            '📦 Imported media data:',
            JSON.stringify(project.importedMedia, null, 2)
          );

          // Check if we're in a desktop app (Electron, Tauri, etc.)
          const isDesktopApp =
            window.electronAPI || window.__TAURI__ || window.require;

          // Store imported media in a variable for linking clips
          let restoredImportedMediaList = [];

          if (isDesktopApp) {
            // Desktop app: Automatically restore files using file paths
            console.log(
              '🖥️ Desktop app detected - auto-restoring files from paths'
            );
            // restoreImportedMediaFilesDesktop will set the state, but we need to link clips
            // For now, set metadata first, then restore will happen async
            restoredImportedMediaList = project.importedMedia.map(media => ({
              id: media.id,
              type: media.type || 'video',
              filename: media.filename,
              path: media.path || media.filename,
              size: media.size,
              duration: media.duration,
              width: media.width,
              height: media.height,
              lastModified: media.lastModified,
              file: null,
              url: null,
              restored: true,
            }));
            setImportedMedia(restoredImportedMediaList);
            restoreImportedMediaFilesDesktop(project.importedMedia).then(
              restored => {
                if (restored) {
                  // Update clips with restored imported media
                  setTimelineClips(prev =>
                    prev.map(c => {
                      if (c.type === 'imported' && c.importedMediaId) {
                        const mediaItem = restored.find(
                          m => m.id === c.importedMediaId
                        );
                        if (mediaItem) {
                          return { ...c, importedMedia: mediaItem };
                        }
                      }
                      return c;
                    })
                  );
                }
              }
            );
          } else {
            // Browser: Restore metadata only, files restored on click
            console.log('🌐 Browser detected - metadata-only restoration');
            restoredImportedMediaList = project.importedMedia.map(media => ({
              id: media.id,
              type: media.type || 'video',
              filename: media.filename,
              path: media.path || media.filename,
              size: media.size,
              duration: media.duration,
              width: media.width,
              height: media.height,
              lastModified: media.lastModified,
              file: null,
              url: null,
              restored: true, // Mark as restored so click handler knows to restore
            }));
            setImportedMedia(restoredImportedMediaList);
          }

          // Link imported media to clips after a short delay to ensure state is set
          setTimeout(() => {
            setTimelineClips(prev =>
              prev.map(c => {
                if (c.type === 'imported' && c.importedMediaId) {
                  const mediaItem = restoredImportedMediaList.find(
                    m => m.id === c.importedMediaId
                  );
                  if (mediaItem) {
                    return { ...c, importedMedia: mediaItem };
                  }
                }
                return c;
              })
            );
          }, 50);
        } else {
          console.log('📦 No imported media to restore');
          setImportedMedia([]);
        }
      } finally {
        setTimeout(() => {
          isUndoingRef.current = false;
        }, 50);
      }
    };

    const openProject = async () => {
      try {
        if (window.showOpenFilePicker) {
          const [handle] = await window.showOpenFilePicker({
            types: [
              {
                description: 'Xinema Project',
                accept: { 'application/json': ['.xinema.json', '.json'] },
              },
            ],
            excludeAcceptAllOption: false,
            multiple: false,
          });
          const file = await handle.getFile();
          const text = await file.text();
          const project = JSON.parse(text);
          // Persist handle & identity
          window.currentProjectHandle = handle;
          window.currentProjectName =
            file.name.replace(/\.xinema\.json$/i, '').replace(/\.json$/i, '') ||
            'Xinema Project';
          window.currentProjectId =
            project.projectId ||
            window.currentProjectId ||
            (window.crypto && window.crypto.randomUUID
              ? window.crypto.randomUUID()
              : String(Date.now()));
          window.currentProjectCreatedAt =
            project.createdAt || new Date().toISOString();
          applyProjectJson(project);
        } else {
          // Fallback input element
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xinema.json,.json,application/json';
          input.onchange = async e => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const text = await file.text();
            const project = JSON.parse(text);
            window.currentProjectHandle = undefined; // cannot persist without FS API
            window.currentProjectName =
              file.name
                .replace(/\.xinema\.json$/i, '')
                .replace(/\.json$/i, '') || 'Xinema Project';
            window.currentProjectId =
              project.projectId ||
              window.currentProjectId ||
              (window.crypto && window.crypto.randomUUID
                ? window.crypto.randomUUID()
                : String(Date.now()));
            window.currentProjectCreatedAt =
              project.createdAt || new Date().toISOString();
            applyProjectJson(project);
          };
          input.click();
        }
      } catch (e) {
        console.error('Failed to open project:', e);
      }
    };

    const saveProject = async () => {
      try {
        const project = buildProjectJson();
        const json = JSON.stringify(project, null, 2);

        // If we have a current file handle, save to it (overwrite)
        if (
          window.currentProjectHandle &&
          window.currentProjectHandle.createWritable
        ) {
          const writable = await window.currentProjectHandle.createWritable();
          await writable.write(json);
          await writable.close();
          return; // Successfully saved to current file
        }

        // No current file - prompt for new file (like Save As)
        await saveProjectAs();
      } catch (e) {
        // User cancelled or error - only log if not a user cancellation
        if (e.name !== 'AbortError') {
          console.error('Failed to save project:', e);
        }
      }
    };

    const saveProjectAs = async () => {
      try {
        const project = buildProjectJson();
        const json = JSON.stringify(project, null, 2);

        if (window.showSaveFilePicker) {
          const handle = await window.showSaveFilePicker({
            suggestedName:
              (window.currentProjectName || 'Xinema_Project') + '.xinema.json',
            types: [
              {
                description: 'Xinema Project',
                accept: { 'application/json': ['.xinema.json'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(json);
          await writable.close();
          // Update current project handle and name
          window.currentProjectHandle = handle;
          const file = await handle.getFile();
          window.currentProjectName =
            file.name.replace(/\.xinema\.json$/i, '').replace(/\.json$/i, '') ||
            'Xinema Project';
        } else {
          // Fallback: download
          downloadProjectAs(
            (window.currentProjectName || 'Xinema_Project') + '.xinema.json'
          );
        }
      } catch (e) {
        // User cancelled - don't log as error
        if (e.name !== 'AbortError') {
          console.error('Failed to save project as:', e);
        }
      }
    };

    window.newProject = () => {
      if (timelineClips.length > 0) {
        if (!window.confirm('Clear the timeline and start a new project?'))
          return;
      }
      isUndoingRef.current = true;
      setTimelineClips([]);
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 100);
    };
    window.getProjectJson = buildProjectJson;
    window.downloadProjectAs = downloadProjectAs;
    window.openProject = openProject;
    window.saveProject = saveProject;
    window.saveProjectAs = saveProjectAs;
    return () => {
      window.newProject = undefined;
      window.getProjectJson = undefined;
      window.downloadProjectAs = undefined;
      window.openProject = undefined;
      window.saveProject = undefined;
      window.saveProjectAs = undefined;
    };
  }, [
    timelineClips,
    timelineZoom,
    playheadPosition,
    selectedClip,
    importedMedia,
  ]);

  // Auto-scroll history to bottom when new entries are added
  React.useEffect(() => {
    if (historyContainerRef.current && !isUndoingRef.current) {
      // Scroll to bottom (scrollHeight is the total height, clientHeight is visible height)
      historyContainerRef.current.scrollTop =
        historyContainerRef.current.scrollHeight;
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
      return [
        ...updatedPrev,
        { timestamp, action, details, enabled: true, overwritten: false },
      ];
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
          newClips = prev
            .map(clip => {
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
            })
            .filter(clip => clip != null); // Remove any null/undefined entries
          break;

        case '~clip': // Modify clip (crop)
          newClips = prev.map(clip => {
            if (clip.id === operation.clipId) {
              if (isUndo) {
                // Undo modify = restore old values
                // Filter out undefined values to avoid overwriting with undefined
                const filteredOldValues = Object.fromEntries(
                  Object.entries(operation.oldValues).filter(
                    ([_, value]) => value !== undefined
                  )
                );
                return { ...clip, ...filteredOldValues };
              } else {
                // Apply modify = use new values
                const filteredNewValues = Object.fromEntries(
                  Object.entries(operation.newValues).filter(
                    ([_, value]) => value !== undefined
                  )
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
      if (editHistory[i].enabled !== false) {
        // enabled is true or undefined (default true)
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
    setEditHistory(prev =>
      prev.map((entry, index) =>
        index === lastEnabledIndex ? { ...entry, enabled: false } : entry
      )
    );

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
    setEditHistory(prev =>
      prev.map((entry, index) =>
        index === redoIndex
          ? { ...entry, enabled: true, overwritten: false }
          : entry
      )
    );

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
      canRedo = editHistory.some(
        entry => entry.enabled === false && !entry.overwritten
      );
    } else {
      // Check if there's a disabled entry after the last enabled one
      canRedo = editHistory
        .slice(lastEnabledIndex + 1)
        .some(entry => entry.enabled === false && !entry.overwritten);
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

  // ─── Generate Video from Script ────────────────────────────────────────────
  const generateVideoFromScript = React.useCallback(
    async (script, { force = false } = {}) => {
      // Guard: check timeline state
      const currentClips = timelineClips;
      const isLinked =
        currentClips.length > 0 &&
        currentClips.every(c => c.scriptId === script.id);
      const hasForeignClips = currentClips.length > 0 && !isLinked;

      if (hasForeignClips) {
        alert(
          'The timeline has clips not linked to this script.\nClear the timeline first or save your project before generating.'
        );
        return;
      }
      if (isLinked && !force) {
        if (
          !window.confirm(`Replace existing generation for "${script.name}"?`)
        )
          return;
      }

      try {
        // 1. Fetch all clips from backend
        const clipsRes = await fetch(apiEndpoints.files());
        if (!clipsRes.ok)
          throw new Error('Could not load clips. Is the backend running?');
        const allClips = await clipsRes.json(); // flat array

        // 2. Match sentences to clips via Python matcher
        const matchRes = await fetch(apiEndpoints.matchScript(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentences: script.sentences,
            clips: allClips,
          }),
        });
        if (!matchRes.ok)
          throw new Error('Matching failed. Check the backend console.');
        const { matches } = await matchRes.json();

        // Persist matches to the script so the Scripts tab can display them
        saveScript({
          ...script,
          lastMatches: matches,
          lastMatchedAt: new Date().toISOString(),
        });

        // 3. Fetch durations for matched clips
        const uniqueKeys = [
          ...new Set(
            matches
              .filter(m => !m.noMatch && m.character && m.filename)
              .map(m => `${m.character}/${m.filename}`)
          ),
        ];
        const durationMap = {};
        await Promise.all(
          uniqueKeys.map(async key => {
            const [character, filename] = key.split('/');
            try {
              const r = await fetch(apiEndpoints.duration(character, filename));
              const d = await r.json();
              // duration comes back as "M:SS" string → convert to seconds
              if (d.duration && typeof d.duration === 'string') {
                const [m, s] = d.duration.split(':').map(Number);
                durationMap[key] = m * 60 + s;
              } else if (typeof d.duration === 'number') {
                durationMap[key] = d.duration;
              }
            } catch {
              /* use default */
            }
          })
        );

        // 4. Compute pixel conversion (mirrors Timeline.js framesToPixels)
        const FRAMES_PER_SECOND = 60;
        const TIMELINE_TOTAL_FRAMES = 36000;
        const timelineEl = document.querySelector('.timeline-content');
        const timelineRect = timelineEl?.getBoundingClientRect();
        const trackContentStart = 76;
        const bufferZone = 38;
        const actualWidth = timelineRect
          ? timelineRect.width - trackContentStart - bufferZone
          : 1000;
        const f2p = frames => (frames / TIMELINE_TOTAL_FRAMES) * actualWidth;

        // 5. Build timeline clips
        let cursor = 0;
        const newClips = [];
        matches.forEach((match, idx) => {
          // Zigzag: alternate between bottom two video tracks (1 = bottom, 2 = above)
          const track = idx % 2 === 0 ? 2 : 1;

          // Estimate sentence speaking duration (~150 words/min = 2.5 words/sec, min 1.5s)
          const wordCount = (match.sentence || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean).length;
          const sentenceSec = Math.max(1.5, wordCount / 2.5);
          const sentenceDurationFrames = Math.round(
            sentenceSec * FRAMES_PER_SECOND
          );

          const key = `${match.character}/${match.filename}`;
          const durationSec = durationMap[key] || 5;
          const durationFrames = Math.round(durationSec * FRAMES_PER_SECOND);
          const clipData = allClips.find(
            c =>
              c.character === match.character && c.filename === match.filename
          );

          // Trim clip to sentence duration if longer; use full clip if shorter
          let clipTimelineFrames, rightCropFrames;
          if (durationFrames >= sentenceDurationFrames) {
            clipTimelineFrames = sentenceDurationFrames;
            rightCropFrames = durationFrames - sentenceDurationFrames;
          } else {
            clipTimelineFrames = durationFrames;
            rightCropFrames = 0;
          }

          newClips.push({
            id: `gen-${script.id}-${idx}-${Date.now()}`,
            character: match.character,
            filename: match.filename,
            track,
            startFrames: cursor,
            endFrames: cursor + clipTimelineFrames, // visual (trimmed) end
            startPixel: f2p(cursor),
            endPixel: f2p(cursor + clipTimelineFrames),
            widthPixel: f2p(cursor + clipTimelineFrames) - f2p(cursor),
            instanceStartFrames: cursor,
            instanceEndFrames: cursor + durationFrames, // full clip extent (required for crop math)
            instanceStartPixel: f2p(cursor),
            instanceEndPixel: f2p(cursor + durationFrames),
            instanceWidthPixel: f2p(durationFrames),
            originalStart: cursor,
            originalEnd: cursor + durationFrames,
            originalStartFrames: 0,
            originalEndFrames: durationFrames,
            originalDurationFrames: durationFrames,
            durationFrames,
            leftCropFrames: 0,
            rightCropFrames,
            speed: 1.0,
            duration: durationSec,
            type: 'backend',
            frameRate: 24,
            scriptId: script.id,
            sentenceIndex: idx,
            generatedMatch: true,
            metadata: clipData?.metadata || {},
          });
          cursor += clipTimelineFrames;
        });

        // 6. Place clips (bypass undo history for the bulk replace)
        isUndoingRef.current = true;
        setTimelineClips(newClips);
        setTimeout(() => {
          isUndoingRef.current = false;
        }, 100);

        setGenerateToast(
          `Generated ${
            newClips.filter(c => !c.isPlaceholder).length
          } clips from ${script.sentences.length} sentences`
        );
        setTimeout(() => setGenerateToast(null), 3500);
      } catch (err) {
        alert(`Generate failed: ${err.message}`);
      }
    },
    [timelineClips, setTimelineClips, isUndoingRef, setGenerateToast]
  );

  React.useEffect(() => {
    window.generateVideoFromScript = generateVideoFromScript;
    window.regenerateVideoFromScript = script =>
      generateVideoFromScript(script, { force: true });
    return () => {
      window.generateVideoFromScript = undefined;
      window.regenerateVideoFromScript = undefined;
    };
  }, [generateVideoFromScript]);

  React.useEffect(() => {
    window.saveArrangementToScript = scriptId => {
      const linked = timelineClips.filter(c => c.scriptId === scriptId);
      if (!linked.length) return;
      const script = getAllScripts().find(s => s.id === scriptId);
      if (!script) return;
      saveScript({
        ...script,
        savedArrangement: linked,
        savedArrangementAt: new Date().toISOString(),
      });
      setGenerateToast(`Arrangement saved to "${script.name}"`);
      setTimeout(() => setGenerateToast(null), 2500);
    };
    window.restoreArrangementFromScript = script => {
      if (!script.savedArrangement?.length) return;
      if (
        timelineClips.length > 0 &&
        !window.confirm('Replace timeline with saved arrangement?')
      )
        return;
      isUndoingRef.current = true;
      setTimelineClips(script.savedArrangement);
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 100);
    };
    return () => {
      window.saveArrangementToScript = undefined;
      window.restoreArrangementFromScript = undefined;
    };
  }, [timelineClips, setTimelineClips, isUndoingRef, setGenerateToast]);

  // Keyboard shortcut handler for Ctrl+Z (undo) and Ctrl+Shift+Z (redo)
  React.useEffect(() => {
    const handleKeyDown = e => {
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

    if (
      validPrevClips.length === validCurrentClips.length &&
      validPrevClips.every((prevClip, idx) => {
        const currentClip = validCurrentClips[idx];
        return (
          prevClip &&
          currentClip &&
          prevClip.id === currentClip.id &&
          prevClip.startFrames === currentClip.startFrames &&
          prevClip.endFrames === currentClip.endFrames &&
          prevClip.track === currentClip.track
        );
      })
    ) {
      return;
    }

    // Detect changes and create operations
    // Use filtered arrays to avoid undefined entries
    if (validCurrentClips.length > validPrevClips.length) {
      // Clip added
      const newClip = validCurrentClips.find(
        clip => clip && !validPrevClips.some(p => p && p.id === clip.id)
      );
      if (newClip) {
        const operation = {
          type: '+clip',
          clip: JSON.parse(JSON.stringify(newClip)), // Deep copy
        };
        addHistoryEntry(
          'add',
          {
            clipId: newClip.id,
            clipName: newClip.filename || newClip.character || 'Clip',
            position: newClip.startFrames || 0,
          },
          operation
        );
      }
    } else if (validCurrentClips.length < validPrevClips.length) {
      // Clip deleted
      const deletedClip = validPrevClips.find(
        clip => clip && !validCurrentClips.some(c => c && c.id === clip.id)
      );
      if (deletedClip) {
        const operation = {
          type: '-clip',
          clip: JSON.parse(JSON.stringify(deletedClip)), // Deep copy
        };
        addHistoryEntry(
          'delete',
          {
            clipId: deletedClip.id,
            clipName: deletedClip.filename || deletedClip.character || 'Clip',
          },
          operation
        );
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

        const durationChanged = prevEnd - prevStart !== currEnd - currStart;
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
              oldClip: oldClipState, // Full old clip state
              newClip: newClipState, // Full new clip state (for redo, if needed)
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
                  rightCropFrames: prevClip.rightCropFrames ?? 0,
                },
                newValues: {
                  startFrames: currStart,
                  endFrames: currEnd,
                  track: currTrack,
                  leftCropFrames: currentClip.leftCropFrames ?? 0,
                  rightCropFrames: currentClip.rightCropFrames ?? 0,
                },
              };
              addHistoryEntry(
                'crop',
                {
                  clipId: currentClip.id,
                  clipName:
                    currentClip.filename || currentClip.character || 'Clip',
                  oldDuration: prevEnd - prevStart,
                  newDuration: currEnd - currStart,
                  oldStart: prevStart,
                  newStart: currStart,
                },
                cropOperation
              );
            } else {
              // Just moved (horizontal or vertical)
              addHistoryEntry(
                'move',
                {
                  clipId: currentClip.id,
                  clipName:
                    currentClip.filename || currentClip.character || 'Clip',
                  from: prevStart,
                  to: currStart,
                  fromTrack: prevTrack,
                  toTrack: currTrack,
                  movedHorizontally: positionChanged,
                  movedVertically: trackChanged,
                },
                moveOperation
              );
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
                rightCropFrames: prevClip.rightCropFrames ?? 0,
              },
              newValues: {
                startFrames: currStart,
                endFrames: currEnd,
                leftCropFrames: currentClip.leftCropFrames ?? 0,
                rightCropFrames: currentClip.rightCropFrames ?? 0,
              },
            };
            addHistoryEntry(
              'crop',
              {
                clipId: currentClip.id,
                clipName:
                  currentClip.filename || currentClip.character || 'Clip',
                oldDuration: prevEnd - prevStart,
                newDuration: currEnd - currStart,
              },
              cropOperation
            );
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
        const prerenderTest = await fetch(
          'http://localhost:5000/api/prerender-test'
        );
        if (prerenderTest.ok) {
          const prerenderData = await prerenderTest.json();
          console.log('✅ Prerender endpoint accessible:', prerenderData);
        } else {
          console.error(
            '❌ Prerender endpoint not accessible:',
            prerenderTest.status
          );
        }
      } catch (error) {
        console.error('❌ Backend connection error:', error);
      }
    };

    testBackendConnection();
  }, []);

  // Helper functions for history display
  const getActionColor = action => {
    switch (action) {
      case 'add':
        return '#4ade80'; // Green
      case 'delete':
        return '#f87171'; // Red
      case 'move':
        return '#60a5fa'; // Blue
      case 'crop':
        return '#fbbf24'; // Yellow
      default:
        return '#94a3b8'; // Gray
    }
  };

  const formatHistoryEntry = entry => {
    const { action, details } = entry;
    switch (action) {
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

  const handleMouseDown = type => e => {
    setIsResizing(type);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = e => {
    if (!isResizing) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight - 60; // Account for tab bar

    if (isResizing === 'left') {
      const newWidth = Math.max(200, Math.min(1400, e.clientX));
      setLeftWidth(newWidth);
    } else if (isResizing === 'timeline') {
      const newHeight = Math.max(
        150,
        Math.min(600, containerHeight - e.clientY + 60)
      );
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
      document.body.style.cursor =
        isResizing === 'left'
          ? 'col-resize'
          : isResizing === 'clipPreview'
          ? 'col-resize'
          : 'row-resize';
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
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#ddd',
      }}
    >
      {/* Top Row - Left Panel, Timeline Preview Panel */}
      <div
        style={{
          display: 'flex',
          height: `calc(100% - ${timelineHeight}px)`,
          minHeight: '200px',
        }}
      >
        {/* Left Panel - File Navigator */}
        <div
          style={{
            width: `${leftWidth}px`,
            background: 'white',
            borderRight: '1px solid #ddd',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <ClipList
            onClipSelect={setSelectedClip}
            importedMedia={importedMedia}
            setImportedMedia={setImportedMedia}
          />

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
              zIndex: 10,
            }}
            onMouseDown={handleMouseDown('left')}
          />
        </div>

        {/* Right Panel - Timeline Preview */}
        <div
          style={{
            flex: 1,
            background: 'white',
            borderRight: '1px solid #ddd',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <TimelinePreview timelineClips={timelineClips} />
        </div>
      </div>

      {/* Bottom Row - Clip Preview and Timeline */}
      <div
        style={{
          display: 'flex',
          height: `${timelineHeight}px`,
          borderTop: '1px solid #ddd',
        }}
      >
        {/* Clip Preview Panel */}
        <div
          style={{
            width: `${clipPreviewWidth}px`,
            background: 'white',
            borderRight: '1px solid #ddd',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#e0e0e0',
              paddingTop: '8px',
              paddingLeft: '8px',
              borderBottom: '1px solid #c0c0c0',
            }}
          >
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
                fontWeight: '600',
                color: clipPreviewTab === 'preview' ? '#333' : '#666',
                transition: 'all 0.15s',
                fontSize: '13px',
                position: 'relative',
                zIndex: clipPreviewTab === 'preview' ? 2 : 1,
                boxShadow:
                  clipPreviewTab === 'preview'
                    ? '0 -2px 2px rgba(0,0,0,0.05)'
                    : 'none',
                marginLeft: '-1px',
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
                fontWeight: '600',
                color: clipPreviewTab === 'history' ? '#333' : '#666',
                transition: 'all 0.15s',
                fontSize: '13px',
                position: 'relative',
                zIndex: clipPreviewTab === 'history' ? 2 : 1,
                boxShadow:
                  clipPreviewTab === 'history'
                    ? '0 -2px 2px rgba(0,0,0,0.05)'
                    : 'none',
                marginLeft: '-1px',
              }}
            >
              History
            </button>
          </div>

          {/* Tab Content */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
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
                  gap: '2px',
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
                            border: isCurrent
                              ? '2px solid #007bff'
                              : '1px solid transparent',
                            background: isCurrent
                              ? 'rgba(0, 123, 255, 0.15)'
                              : 'transparent',
                            boxShadow: isCurrent
                              ? '0 0 4px rgba(0, 123, 255, 0.3)'
                              : 'none',
                          }}
                        >
                          <span
                            style={{
                              color: isOverwritten
                                ? '#aa5555'
                                : isDisabled
                                ? '#555'
                                : '#888',
                              fontSize: '10px',
                            }}
                          >
                            {entry.timestamp}
                          </span>
                          <span style={{ fontWeight: 'bold' }}>
                            [{entry.action.toUpperCase()}]
                          </span>
                          <span
                            style={{
                              color: isOverwritten
                                ? '#cc8888'
                                : isDisabled
                                ? '#666'
                                : '#fff',
                            }}
                          >
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
              background:
                isResizing === 'clipPreview' ? '#007bff' : 'transparent',
              cursor: 'col-resize',
              zIndex: 10,
            }}
            onMouseDown={handleMouseDown('clipPreview')}
          />
        </div>

        {/* Timeline Panel */}
        <div
          style={{
            flex: 1,
            background: 'white',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
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
              onPlayheadChange={position => {
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
          zIndex: 10,
        }}
        onMouseDown={handleMouseDown('timeline')}
      />

      {/* Generate Video Toast */}
      {generateToast && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a2e',
            color: '#4ade80',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          ✓ {generateToast}
        </div>
      )}
    </div>
  );
}

// ─── Script Panel ─────────────────────────────────────────────────────────────
function ScriptPanel({ setActiveTab }) {
  const [scriptName, setScriptName] = React.useState('');
  const [scriptContent, setScriptContent] = React.useState('');
  const [editingScriptId, setEditingScriptId] = React.useState(null);
  const [saved, setSaved] = React.useState(false);

  const sentences = React.useMemo(
    () => parseSentences(scriptContent),
    [scriptContent]
  );

  // Expose loadScriptForEdit so ClipList can call it
  React.useEffect(() => {
    window.loadScriptForEdit = script => {
      setScriptName(script.name || '');
      setScriptContent(script.content || '');
      setEditingScriptId(script.id || null);
      setSaved(false);
      if (setActiveTab) setActiveTab('script');
    };
    return () => {
      window.loadScriptForEdit = undefined;
    };
  }, [setActiveTab]);

  const handleSave = () => {
    if (!scriptContent.trim()) return;
    const now = new Date().toISOString();
    const id = editingScriptId || generateId();
    const script = {
      id,
      name: scriptName.trim() || 'Untitled Script',
      content: scriptContent,
      sentences: parseSentences(scriptContent),
      createdAt: editingScriptId ? undefined : now, // preserve original if editing
      updatedAt: now,
    };
    // Preserve createdAt if editing existing script
    if (editingScriptId) {
      const existing = getAllScripts().find(s => s.id === editingScriptId);
      if (existing) script.createdAt = existing.createdAt;
    }
    if (!script.createdAt) script.createdAt = now;
    saveScript(script);
    setEditingScriptId(id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setScriptName('');
    setScriptContent('');
    setEditingScriptId(null);
    setSaved(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2
        style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '700',
          color: '#1a1a1a',
        }}
      >
        Script Input
      </h2>

      {/* Script name */}
      <input
        type="text"
        placeholder="Script name (e.g. My Video Essay)"
        value={scriptName}
        onChange={e => {
          setScriptName(e.target.value);
          setSaved(false);
        }}
        style={{
          padding: '10px 14px',
          fontSize: '15px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          marginBottom: '12px',
          fontWeight: '600',
          outline: 'none',
        }}
      />

      {/* Script body */}
      <textarea
        placeholder="Paste or type your script here. Each sentence will be matched to a video clip."
        value={scriptContent}
        onChange={e => {
          setScriptContent(e.target.value);
          setSaved(false);
        }}
        style={{
          flex: 1,
          padding: '12px 14px',
          fontSize: '14px',
          lineHeight: '1.6',
          border: '1px solid #ddd',
          borderRadius: '6px',
          resize: 'none',
          fontFamily: 'inherit',
          outline: 'none',
          marginBottom: '12px',
          minHeight: '200px',
        }}
      />

      {/* Sentence count */}
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
        {sentences.length} sentence{sentences.length !== 1 ? 's' : ''} detected
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={!scriptContent.trim()}
          style={{
            padding: '10px 20px',
            background: scriptContent.trim() ? '#007bff' : '#b0c4de',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: scriptContent.trim() ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          {editingScriptId ? 'Update Script' : 'Save Script'}
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '10px 20px',
            background: 'white',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Clear
        </button>
        {saved && (
          <span
            style={{ color: '#4ade80', fontSize: '13px', fontWeight: '600' }}
          >
            ✓ Saved
          </span>
        )}
      </div>
    </div>
  );
}

export default App;
