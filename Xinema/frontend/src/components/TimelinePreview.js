import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

// Professional Timeline Preview Component
// Dark 16:9 screen that displays frames based on playhead position
// Implements 60fps timeline to 24fps video conversion with caching
const TimelinePreview = ({ 
  clips = [], 
  playheadPosition = 0,
  isPlaying = false,
  timelineClips = []
}) => {
  const [currentFrame, setCurrentFrame] = useState(null);
  const [frameLoadingState, setFrameLoadingState] = useState('idle');
  const [frameUrl, setFrameUrl] = useState(null);
  const [performanceStats, setPerformanceStats] = useState({});
  
  // Refs for performance tracking
  const frameLoadStartTime = useRef(null);
  const lastFrameRequest = useRef(null);

  // Enhanced frame conversion: 60fps timeline to 24fps video
  const convertTimelineFrameToVideoFrame = (timelineFrame, clipStartFrames, videoFrameRate = 24) => {
    const timelineFrameRate = 60; // Timeline is always 60fps
    const relativeFrame = timelineFrame - clipStartFrames;
    
    // Convert timeline frames to video frames: (timelineFrame * videoFPS) / timelineFPS
    const videoFrame = Math.round((relativeFrame * videoFrameRate) / timelineFrameRate);
    
    return Math.max(0, videoFrame); // Ensure non-negative frame numbers
  };

  // Direct frame loading - Pure on-demand generation (no caching)
  const loadFrameDirect = async (character, filename, videoFrame, timelinePosition, clipStartFrames, rawClipFrame) => {
    frameLoadStartTime.current = performance.now();
    
    // eslint-disable-next-line no-console
    console.log('🎬 Pure on-demand frame generation:', {
      character,
      filename,
      rawClipFrame,
      videoFrame,
      timelinePosition,
      clipStartFrames,
      timestamp: new Date().toISOString()
    });

    // Skip all caching - go straight to API call
    setFrameLoadingState('loading');
    const frameUrl = `http://localhost:5000/api/frame-direct/${character}/${filename}/${videoFrame}`;
    
    // eslint-disable-next-line no-console
    console.log('🔄 Direct API call (no cache):', frameUrl);
    
    try {
      const response = await fetch(frameUrl);
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        
        // No caching - pure on-demand generation
        setFrameUrl(imageUrl);
        setFrameLoadingState('loaded');
        
        const loadTime = performance.now() - frameLoadStartTime.current;
        setPerformanceStats(prev => ({
          ...prev,
          lastLoadTime: loadTime,
          realTimeExtractions: (prev.realTimeExtractions || 0) + 1,
          totalRequests: (prev.totalRequests || 0) + 1
        }));
        
        // eslint-disable-next-line no-console
        console.log('✅ Frame loaded in real-time:', loadTime.toFixed(1) + 'ms');
        
        return {
          character,
          filename,
          timelineFrame: timelinePosition,
          rawClipFrame,
          videoFrame,
          clipStartFrames,
          relativeFrame: timelinePosition - clipStartFrames,
          isRealTime: true,
          loadTime
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Frame loading failed:', error);
      setFrameLoadingState('error');
      
      setPerformanceStats(prev => ({
        ...prev,
        errors: (prev.errors || 0) + 1,
        totalRequests: (prev.totalRequests || 0) + 1
      }));
      
      return null;
    }
  };

  // Listen for showFrame events from Timeline component
  useEffect(() => {
    const handleShowFrame = (event) => {
      const { character, filename, frameNumber, timelinePosition, clipStartFrames } = event.detail;
      
      // Prevent duplicate requests
      const requestKey = `${character}/${filename}/${frameNumber}`;
      if (lastFrameRequest.current === requestKey) {
        return;
      }
      lastFrameRequest.current = requestKey;
      
      // eslint-disable-next-line no-console
      console.log('📥 TimelinePreview received showFrame event:', { 
        character, 
        filename, 
        frameNumber, // This is already converted to video frame rate
        timelinePosition, 
        clipStartFrames,
        timestamp: new Date().toISOString()
      });
      
      if (character && filename && frameNumber !== null) {
        // The timeline sends raw clip frame (60fps), need to convert to video frame rate for API
        const activeClip = timelineClips.find(clip => 
          clip.character === character && clip.filename === filename
        );
        
        const videoFrameRate = activeClip?.frameRate || 24; // Default to 24fps
        // Convert the raw clip frame (frameNumber) to video frame rate
        const videoFrame = Math.round((frameNumber * videoFrameRate) / 60);
        
        // eslint-disable-next-line no-console
        console.log('🔄 Converting raw clip frame to video frame:', {
          rawClipFrame: frameNumber,
          timelinePosition,
          clipStartFrames,
          videoFrameRate,
          videoFrame,
          conversion: `${frameNumber} × ${videoFrameRate} ÷ 60 = ${videoFrame}`,
          calculation: `Math.round(${frameNumber} * ${videoFrameRate} / 60) = ${videoFrame}`
        });
        
        loadFrameDirect(character, filename, videoFrame, timelinePosition, clipStartFrames, frameNumber)
          .then(frameData => {
            if (frameData) {
              setCurrentFrame(frameData);
            }
          });
      } else {
        // No clip at this position
        setCurrentFrame(null);
        setFrameUrl(null);
        setFrameLoadingState('idle');
      }
    };

    window.addEventListener('showFrame', handleShowFrame);
    return () => {
      window.removeEventListener('showFrame', handleShowFrame);
    };
  }, [timelineClips]);

  // Listen for clip placement events to trigger prerendering
  useEffect(() => {
    const handleClipPlacement = (event) => {
      const { clip } = event.detail;
      
      if (clip) {
        // eslint-disable-next-line no-console
        console.log('🎬 Clip placed on timeline - pure on-demand generation enabled');
        
        // Premiere Pro approach: NO prerendering - generate frames only when scrubbing
        // eslint-disable-next-line no-console
        console.log('✅ Pure on-demand mode - frames will be generated only when scrubbing');
      }
    };

    window.addEventListener('clipPlacementSuccess', handleClipPlacement);
    return () => {
      window.removeEventListener('clipPlacementSuccess', handleClipPlacement);
    };
  }, []);

  // Performance monitoring (simplified - no cache stats)
  useEffect(() => {
    const updatePerformanceStats = () => {
      setPerformanceStats(prev => ({
        ...prev,
        averageLoadTime: prev.lastLoadTime || 0
      }));
    };

    updatePerformanceStats();
    const interval = setInterval(updatePerformanceStats, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#000'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        background: '#111'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#fff'
        }}>
          Timeline Preview
        </h3>
      </div>

      {/* 16:9 Preview Screen */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          aspectRatio: '16/9',
          background: '#000',
          borderRadius: '8px',
          border: '2px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {frameUrl && currentFrame ? (
            <img
              src={frameUrl}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              alt={`Frame ${currentFrame.videoFrame} from ${currentFrame.character}/${currentFrame.filename}`}
              onLoad={() => {
                // eslint-disable-next-line no-console
              console.log('✅ Timeline preview frame loaded:', currentFrame);
              }}
              onError={(e) => {
                // eslint-disable-next-line no-console
              console.error('❌ Timeline preview frame failed to load:', {
                  src: e.target.src,
                  frame: currentFrame,
                  error: e
                });
                setFrameLoadingState('error');
              }}
            />
          ) : (
            <div style={{
              color: '#666',
              fontSize: '18px',
              textAlign: 'center'
            }}>
              {frameLoadingState === 'loading' ? '🔄 Loading...' : 'Timeline Preview'}
            </div>
          )}

          {/* Enhanced Frame Info Overlay */}
          {currentFrame && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              maxWidth: '350px',
              border: '1px solid #333'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#4ade80' }}>
                {currentFrame.character}/{currentFrame.filename}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '8px' }}>
                <div>Timeline: {currentFrame.timelineFrame}</div>
                <div>Clip Start: {currentFrame.clipStartFrames}</div>
                <div>Relative: {currentFrame.relativeFrame}</div>
                <div>Video Frame: {currentFrame.videoFrame}</div>
              </div>
              
              <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '8px' }}>
                Raw Clip Frame: {currentFrame.rawClipFrame} → Video Frame: {currentFrame.videoFrame} (60fps→24fps)
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ 
                  color: frameLoadingState === 'loaded' ? '#4ade80' : 
                         frameLoadingState === 'loading' ? '#fbbf24' : '#ef4444'
                }}>
                  {frameLoadingState === 'loaded' ? '✅ Loaded' : 
                   frameLoadingState === 'loading' ? '🔄 Loading' : '❌ Error'}
                </div>
                
                <div style={{ 
                  color: currentFrame.isCached ? '#4ade80' : 
                         currentFrame.isPrerendered ? '#60a5fa' : 
                         currentFrame.isOnDemand ? '#a855f7' : '#fbbf24',
                  fontSize: '10px'
                }}>
                  {currentFrame.isCached ? '⚡ Cached' : 
                   currentFrame.isPrerendered ? '🎬 Prerendered' : 
                   currentFrame.isOnDemand ? '⚡ On-demand' : '🔄 Real-time'}
                </div>
              </div>
              
              {currentFrame.loadTime && (
                <div style={{ fontSize: '10px', color: '#a3a3a3', marginTop: '4px' }}>
                  Load Time: {currentFrame.loadTime.toFixed(1)}ms
                </div>
              )}
            </div>
          )}

          {/* Performance Dashboard Overlay */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            minWidth: '250px',
            border: '1px solid #333'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#60a5fa' }}>
              Performance Dashboard
            </div>
            
            {/* Cache Statistics */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px' }}>Cache Stats</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div>Hit Rate: {Math.round((performanceStats.cacheHitRate || 0) * 100)}%</div>
                <div>Memory: {Math.round(performanceStats.memoryUsageMB || 0)}MB</div>
                <div>Requests: {performanceStats.totalRequests || 0}</div>
                <div>Errors: {performanceStats.errors || 0}</div>
              </div>
            </div>
            
            {/* Load Performance */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px' }}>Load Performance</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div>Last Load: {performanceStats.lastLoadTime?.toFixed(1) || '0'}ms</div>
                <div>Real-time: {performanceStats.realTimeExtractions || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// PropTypes validation
TimelinePreview.propTypes = {
  clips: PropTypes.array,
  playheadPosition: PropTypes.number,
  isPlaying: PropTypes.bool,
  timelineClips: PropTypes.array.isRequired
};

export default TimelinePreview;
