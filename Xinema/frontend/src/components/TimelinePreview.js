import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  TARGET_WIDTH,
  TARGET_HEIGHT,
  TARGET_ASPECT_RATIO_CSS,
} from '../utils/constants';
import {
  extractAudioFrame,
  audioBufferToBlobUrl,
} from '../utils/audioFrameExtractor';

// INSTANT PREVIEW HACK - Uses actual MP4 video instead of individual frames
// Timeline controls video currentTime for instant scrubbing
const TimelinePreview = ({ timelineClips = [] }) => {
  const [currentClip, setCurrentClip] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoTime, setVideoTime] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayheadPosition, setCurrentPlayheadPosition] = useState(0);
  const [currentCropInfo, setCurrentCropInfo] = useState({
    leftCropFrames: 0,
    rightCropFrames: 0,
  });
  const [currentFrameNumber, setCurrentFrameNumber] = useState(0);

  // Cache for last shown frame per clip (clip address -> frame position)
  const clipFrameCache = useRef(new Map()); // key: "character/filename", value: lastFramePosition

  // Refs that mirror state — used inside event handlers to avoid stale closures
  // without requiring the listener to re-register on every state change
  const currentClipRef = useRef(null);
  const isVideoLoadedRef = useRef(false);

  // Refs for video control
  const videoRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const lastSeekTimeRef = useRef(0);
  const isPlayingRef = useRef(false);

  // Refs for audio control (frame-based during dragging)
  const audioElementsRef = useRef(new Map()); // Map of clipId -> HTMLAudioElement
  const lastAudioSeekTimeRef = useRef(0);
  const activeAudioClipsRef = useRef(new Set()); // Track which audio clips are currently playing
  const lastPlayheadPositionRef = useRef(0); // Track last playhead position to detect when it stops moving
  const audioPauseTimeoutRef = useRef(null); // Timeout to pause audio when position stabilizes
  const lastPositionUpdateTimeRef = useRef(0); // Track when position was last updated
  const audioFrameUrlsRef = useRef(new Map()); // Map of "clipId/frame" -> blob URL (for cleanup)
  const loadingAudioFramesRef = useRef(new Set()); // Track frames currently being loaded
  const frameAudioStopTimeoutRef = useRef(new Map()); // Map of clipId -> timeout to stop frame audio

  // Keep refs in sync with state so event handlers always have fresh values
  // without needing to be in the effect dependency array
  useEffect(() => {
    currentClipRef.current = currentClip;
  }, [currentClip]);
  useEffect(() => {
    isVideoLoadedRef.current = isVideoLoaded;
  }, [isVideoLoaded]);

  // Debug timeline clips - only log when clips change
  if (
    timelineClips.length > 0 &&
    timelineClips.length !== (window.lastClipCount || 0)
  ) {
    // Timeline clips updated
    window.lastClipCount = timelineClips.length;
  }

  // Debounced seek function for smooth scrubbing
  const debouncedSeek = useCallback(
    (timelinePosition, isDragging = false, frameNumber = null) => {
      // Clear any pending seek
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }

      // If dragging, use shorter debounce for responsiveness
      const debounceTime = isDragging ? 50 : 100;

      // Debounced seek request

      seekTimeoutRef.current = setTimeout(() => {
        // Executing debounced seek
        // REMOVED: updateVideoTime call - let playheadUpdate handle all video seeking
      }, debounceTime);
    },
    []
  );

  // Play/pause functionality - SIMPLIFIED: Just dispatch play/pause events to Timeline
  const togglePlayPause = () => {
    // Play button pressed

    if (isPlaying) {
      // Stop playing - dispatch event to Timeline
      setIsPlaying(false);
      isPlayingRef.current = false;

      // Pause video element
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }

      // Pause all audio elements (Premiere Pro style)
      audioElementsRef.current.forEach(audioElement => {
        if (!audioElement.paused) {
          audioElement.pause();
        }
      });

      // No local animation to clean up - Timeline handles everything

      // Dispatch stop event to Timeline
      const stopEvent = new CustomEvent('timelineStopPlayback');
      window.dispatchEvent(stopEvent);

      // Playback stopped
    } else {
      // Start playing - dispatch event to Timeline
      setIsPlaying(true);
      isPlayingRef.current = true;

      // Play all active audio elements (Premiere Pro style)
      audioElementsRef.current.forEach(audioElement => {
        if (audioElement.readyState >= 2 && audioElement.paused) {
          audioElement.play().catch(err => {
            // Audio play failed (might be autoplay restrictions)
          });
        }
      });

      // Dispatch start event to Timeline - let it handle all the animation
      const startEvent = new CustomEvent('timelineStartPlayback', {
        detail: {
          startPosition: currentPlayheadPosition,
          playbackSpeed: 1.5, // 1.5x speed for smoother playback
        },
      });
      window.dispatchEvent(startEvent);

      // Playback started - Timeline will handle animation
    }
  };

  // Convert timeline position to video time (INSTANT PREVIEW HACK)
  const convertTimelineToVideoTime = (
    timelinePosition,
    clipStartFrames,
    clipEndFrames,
    videoDuration,
    activeClip
  ) => {
    const timelineFrameRate = 60; // Timeline is always 60fps

    // Use clip duration if available, otherwise use provided videoDuration
    const actualVideoDuration =
      activeClip && activeClip.duration ? activeClip.duration : videoDuration;

    // Only log conversion debug if we haven't already logged for this position recently
    const lastConversionLog = window.lastConversionLog || 0;
    const shouldLog = Math.abs(timelinePosition - lastConversionLog) >= 1; // Only log if position changed by at least 1 frame

    if (shouldLog) {
      // Conversion debug
      window.lastConversionLog = timelinePosition;
    }

    // DEBUG: Will check conversion result later

    // Check if playhead is within this clip
    if (
      timelinePosition < clipStartFrames ||
      timelinePosition > clipEndFrames
    ) {
      // Outside clip range
      return null; // Not in this clip
    }

    // Convert timeline frames to seconds
    const relativeFrames = timelinePosition - clipStartFrames;
    const relativeTime = relativeFrames / timelineFrameRate;

    // Ensure we don't exceed video duration
    const finalTime = Math.min(Math.max(relativeTime, 0), actualVideoDuration);

    // Only log success if we haven't already logged for this position recently
    if (shouldLog) {
      // Conversion success
    }

    // DEBUG: Check if the conversion makes sense
    if (finalTime < 0 || finalTime > actualVideoDuration) {
      // Conversion result seems wrong
    }

    return finalTime;
  };

  // INSTANT PREVIEW HACK - Control video currentTime instead of loading frames
  const updateVideoTime = useCallback(
    (timelinePosition, isDragging = false, frameNumber = null) => {
      if (!videoRef.current || !currentClip) {
        return;
      }

      // Rate limiting - don't seek too frequently, but allow faster seeking during playback
      const now = Date.now();
      const timeSinceLastSeek = now - lastSeekTimeRef.current;
      const isDuringPlayback = isPlayingRef.current;
      const minSeekInterval = isDuringPlayback ? 16 : isDragging ? 50 : 100; // 16ms during playback (60fps), 50ms when dragging, 100ms otherwise

      if (timeSinceLastSeek < minSeekInterval) {
        // Rate limited
        return;
      }

      lastSeekTimeRef.current = now;

      // Check if video is ready for seeking - be more lenient during playback

      // Add comprehensive null checks
      if (!videoRef.current) {
        // Video ref is null, cannot seek
        return;
      }

      // Find all clips at this timeline position and select the one on the highest track
      const overlappingClips = timelineClips.filter(
        clip =>
          timelinePosition >= (clip.instanceStartFrames ?? clip.startFrames) &&
          timelinePosition <= (clip.instanceEndFrames ?? clip.endFrames)
      );
      const activeClip =
        overlappingClips.length > 0
          ? overlappingClips.sort((a, b) => b.track - a.track)[0]
          : null;

      // Use clip duration from timeline instead of video element duration
      const clipDuration = activeClip
        ? activeClip.duration || 60 // Use clip's stored duration
        : videoRef.current?.duration || 60; // Fallback to video element or 60 seconds
      const videoDuration = clipDuration;
      const videoReadyState = videoRef.current?.readyState;

      // During playback, be more aggressive about seeking even if video isn't fully loaded
      if (!isDuringPlayback && (!videoDuration || videoReadyState < 2)) {
        // Video not ready
        return;
      }

      // During playback, try to seek anyway even if video isn't fully loaded
      if (isDuringPlayback && (!videoDuration || videoReadyState < 2)) {
        // eslint-disable-next-line no-console
        // Video not ready but trying anyway during playback

        // If video is not ready, try again in a short while
        // REMOVED: updateVideoTime call - let playheadUpdate handle all video seeking
        // eslint-disable-next-line no-console
        // Update video time completed
        return;
      }

      // During playback, be more aggressive about seeking even if video isn't fully loaded
      if (!isVideoLoaded && isDuringPlayback) {
        // Video not loaded yet, but trying anyway during playback
        // Don't return - try to seek anyway during playback
      }

      // Active clip found

      // Clip matching

      if (
        activeClip &&
        activeClip.character === currentClip.character &&
        activeClip.filename === currentClip.filename
      ) {
        // Debug logging
        // Preview frame calculation debug

        // Use frameNumber from Timeline if available (includes crop offset), otherwise convert timeline position
        let videoTime;
        if (frameNumber !== null && frameNumber !== undefined) {
          // Use the frame number calculated by Timeline (includes crop offset)
          videoTime = frameNumber / 24; // Convert frame number to video time (24fps video)
          // Using frameNumber from Timeline
        } else {
          // Fallback: Convert timeline position to video time
          videoTime = convertTimelineToVideoTime(
            timelinePosition,
            activeClip.startFrames,
            activeClip.endFrames,
            videoDuration, // Use clip duration from timeline
            activeClip
          );
          // Using fallback calculation
        }

        if (videoTime !== null && videoRef.current) {
          const currentVideoTime = videoRef.current.currentTime || 0;
          const timeDifference = Math.abs(videoTime - currentVideoTime);

          // Attempting video seek

          // Seek if difference is significant or video is ready
          // During playback, be more aggressive about seeking to reduce jitter
          const seekThreshold = isDuringPlayback ? 0.02 : 0.05; // 20ms during playback, 50ms otherwise

          // Additional check: only seek if we haven't already sought to this position recently
          const lastSeekPosition = window.lastSeekPosition || 0;
          const lastSeekTime = window.lastSeekTime || 0;
          const positionThreshold = 1; // Only seek if timeline position changed by at least 1 frame
          const timeThreshold = 100; // Only seek if at least 100ms have passed since last seek

          const shouldSeek =
            (timeDifference > seekThreshold ||
              (videoRef.current.readyState >= 2 &&
                Math.abs(timelinePosition - lastSeekPosition) >=
                  positionThreshold)) &&
            now - lastSeekTime >= timeThreshold;

          if (shouldSeek) {
            // Update the last seek position and time
            window.lastSeekPosition = timelinePosition;
            window.lastSeekTime = now;
            if (videoRef.current) {
              const oldTime = videoRef.current.currentTime;
              videoRef.current.currentTime = videoTime;
              // Don't update setVideoTime here - only playheadUpdate should update it

              // Check if the seek actually worked (reduced timeout for smoother playback)
              setTimeout(
                () => {
                  const newTime = videoRef.current?.currentTime || 0;
                  // Seek verification

                  // During playback, skip the play/pause trick to reduce jitter
                  if (
                    !isDuringPlayback &&
                    videoRef.current &&
                    Math.abs(newTime - videoTime) < 0.1
                  ) {
                    // eslint-disable-next-line no-console
                    // Forcing video display update
                    videoRef.current
                      .play()
                      .then(() => {
                        videoRef.current.pause();
                        // eslint-disable-next-line no-console
                        // Video display should now be updated
                      })
                      .catch(err => {
                        // eslint-disable-next-line no-console
                        // Play/pause failed
                      });
                  }
                },
                isDuringPlayback ? 1 : 10
              ); // Much faster timeout during playback

              // eslint-disable-next-line no-console
              // Video seek command sent
            }
          } else {
            // eslint-disable-next-line no-console
            // Skipping seek - time difference too small
          }
        }
      } else {
        // No active clip found or clips don't match - try fallback approach using stored event data
        // eslint-disable-next-line no-console
        // Using fallback approach

        if (window.lastShowFrameEvent && currentClip) {
          // eslint-disable-next-line no-console
          // No active clip found, trying fallback seek

          // Check if timeline position is within the actual clip boundaries
          const isWithinClip =
            timelinePosition >= window.lastShowFrameEvent.clipStartFrames &&
            timelinePosition <= window.lastShowFrameEvent.clipEndFrames;

          if (!isWithinClip) {
            // Timeline position outside clip boundaries, not seeking
            return;
          }

          // Use stored clip data for seeking
          const videoTime = convertTimelineToVideoTime(
            timelinePosition,
            window.lastShowFrameEvent.clipStartFrames || 0,
            window.lastShowFrameEvent.clipEndFrames || 1000,
            videoDuration,
            null // No activeClip for fallback
          );

          // FALLBACK CALCULATION

          if (
            videoTime !== null &&
            videoRef.current &&
            Math.abs(videoTime - videoRef.current.currentTime) > 0.1
          ) {
            // FALLBACK SEEK

            videoRef.current.currentTime = videoTime;
            // Don't update setVideoTime here - only playheadUpdate should update it
          } else {
            // eslint-disable-next-line no-console
            // FALLBACK SEEK SKIPPED
          }
        } else {
          // No active clip - pause video or show black
          if (videoRef.current && !videoRef.current.paused) {
            // eslint-disable-next-line no-console
            // No active clip, pausing video
            videoRef.current.pause();
          }
        }
      }

      // Close the debug group
      // eslint-disable-next-line no-console
      // Update video time completed
    },
    [timelineClips, currentClip, isVideoLoaded, isPlayingRef]
  );

  // Helper function to check if a clip is audio (MP3)
  const isAudioClip = clip => {
    if (!clip) return false;
    const filename = clip.filename || clip.importedMedia?.filename || '';
    return filename.toLowerCase().endsWith('.mp3');
  };

  // Update audio playback based on playhead position (Premiere Pro style)
  const updateAudioPlayback = useCallback(
    (timelinePosition, isDragging = false) => {
      const isDuringPlayback = isPlayingRef.current;

      // Track playhead position changes to detect when scrubbing stops
      const positionChanged =
        timelinePosition !== lastPlayheadPositionRef.current;
      const now = Date.now();

      // If position changed, update timestamp
      if (positionChanged) {
        lastPlayheadPositionRef.current = timelinePosition;
        lastPositionUpdateTimeRef.current = now;

        // Clear any existing pause timeout since position is changing
        if (audioPauseTimeoutRef.current) {
          clearTimeout(audioPauseTimeoutRef.current);
          audioPauseTimeoutRef.current = null;
        }
      }

      // During smooth playback (not scrubbing), don't seek audio - let it play naturally
      if (isDuringPlayback && !isDragging) {
        // During smooth playback, only check if clips need to start/stop
        // Don't seek - let audio play naturally and continuously

        // Find all audio clips at this timeline position
        const activeAudioClips = timelineClips.filter(clip => {
          if (!isAudioClip(clip)) return false;

          const clipStart = clip.instanceStartFrames ?? clip.startFrames;
          const clipEnd = clip.instanceEndFrames ?? clip.endFrames;

          return timelinePosition >= clipStart && timelinePosition <= clipEnd;
        });

        // Update active audio clips set
        const currentActiveIds = new Set(activeAudioClips.map(clip => clip.id));

        // Start audio for newly active clips
        activeAudioClips.forEach(clip => {
          const clipId = clip.id;
          let audioElement = audioElementsRef.current.get(clipId);

          if (!audioElement) {
            // New clip just became active - create and start it
            const clipStart = clip.instanceStartFrames ?? clip.startFrames;
            const timelineFrameRate = 60;
            const relativeFrames = timelinePosition - clipStart;
            const relativeTime = relativeFrames / timelineFrameRate;

            audioElement = document.createElement('audio');
            audioElement.preload = 'auto';
            audioElement.volume = 1.0;

            let audioUrl;
            if (
              clip.type === 'imported' &&
              clip.importedMedia &&
              clip.importedMedia.url
            ) {
              audioUrl = clip.importedMedia.url;
            } else if (
              clip.type === 'imported' &&
              clip.importedMedia &&
              clip.importedMedia.file
            ) {
              audioUrl = URL.createObjectURL(clip.importedMedia.file);
            } else {
              return; // Skip non-imported audio clips
            }

            audioElement.src = audioUrl;
            audioElementsRef.current.set(clipId, audioElement);

            // Wait for metadata, then start at correct position
            const startAudio = () => {
              const maxAudioTime = audioElement.duration || 0;
              const constrainedTime = Math.min(
                Math.max(relativeTime, 0),
                maxAudioTime
              );
              audioElement.currentTime = constrainedTime;

              // Always play during playback - don't pause
              audioElement.play().catch(err => {
                // Audio play failed
              });
            };

            if (audioElement.readyState >= 2) {
              startAudio();
            } else {
              audioElement.addEventListener('loadedmetadata', startAudio, {
                once: true,
              });
            }
          } else {
            // Clip already exists - ensure it's playing continuously
            // Don't seek during playback - let it play naturally
            if (audioElement.paused && audioElement.readyState >= 2) {
              audioElement.play().catch(err => {
                // Audio play failed
              });
            }
          }
        });

        // Stop audio for clips that are no longer active
        audioElementsRef.current.forEach((audioElement, clipId) => {
          if (!currentActiveIds.has(clipId)) {
            audioElement.pause();
            audioElement.src = '';
            audioElement.load();
            audioElementsRef.current.delete(clipId);
          }
        });

        activeAudioClipsRef.current = currentActiveIds;
        return; // Don't seek during smooth playback - let it play continuously
      }

      // When dragging, use continuous seeking (only if play button is NOT pressed)
      if (isDragging && !isDuringPlayback) {
        // Scrubbing mode during dragging - seek to match playhead position
        const timeSinceLastUpdate = now - lastPositionUpdateTimeRef.current;
        const isPlayheadMoving = timeSinceLastUpdate < 200; // Consider moving if updated within last 200ms

        // Rate limit seeks during dragging to prevent glitches
        const timeSinceLastSeek = now - lastAudioSeekTimeRef.current;
        const minSeekInterval = 16; // 16ms for dragging (~60fps)

        if (timeSinceLastSeek < minSeekInterval) {
          return; // Rate limited
        }

        lastAudioSeekTimeRef.current = now;

        // If playhead has stopped moving, pause all audio immediately and clear timeouts
        if (!isPlayheadMoving) {
          audioElementsRef.current.forEach((audioElement, clipId) => {
            // Clear any pending stop timeout
            if (frameAudioStopTimeoutRef.current.has(clipId)) {
              clearTimeout(frameAudioStopTimeoutRef.current.get(clipId));
              frameAudioStopTimeoutRef.current.delete(clipId);
            }

            if (!audioElement.paused) {
              audioElement.pause();
            }
          });
          return; // Don't update audio when playhead has stopped moving
        }

        // Clear any existing pause timeout since playhead is moving
        if (audioPauseTimeoutRef.current) {
          clearTimeout(audioPauseTimeoutRef.current);
          audioPauseTimeoutRef.current = null;
        }

        // Find all audio clips at this timeline position
        const activeAudioClips = timelineClips.filter(clip => {
          if (!isAudioClip(clip)) return false;

          const clipStart = clip.instanceStartFrames ?? clip.startFrames;
          const clipEnd = clip.instanceEndFrames ?? clip.endFrames;

          return timelinePosition >= clipStart && timelinePosition <= clipEnd;
        });

        // Update active audio clips set
        const currentActiveIds = new Set(activeAudioClips.map(clip => clip.id));
        activeAudioClipsRef.current = currentActiveIds;

        // Stop and remove audio elements for clips that are no longer active
        audioElementsRef.current.forEach((audioElement, clipId) => {
          if (!currentActiveIds.has(clipId)) {
            audioElement.pause();
            audioElement.src = '';
            audioElement.load();
            audioElementsRef.current.delete(clipId);
          }
        });

        // Update or create audio elements for active clips
        // During dragging, limit each preview to 1 frame duration
        activeAudioClips.forEach(clip => {
          const clipId = clip.id;
          const clipStart = clip.instanceStartFrames ?? clip.startFrames;

          // Calculate audio time within the clip
          const timelineFrameRate = 60;
          const relativeFrames = timelinePosition - clipStart;
          const relativeTime = relativeFrames / timelineFrameRate;
          const frameDuration = 1 / timelineFrameRate; // 1 frame = ~16.67ms at 60fps

          // Get or create audio element
          let audioElement = audioElementsRef.current.get(clipId);

          if (!audioElement) {
            // Create new audio element
            audioElement = document.createElement('audio');
            audioElement.preload = 'auto';
            audioElement.volume = 1.0;

            let audioUrl;
            if (
              clip.type === 'imported' &&
              clip.importedMedia &&
              clip.importedMedia.url
            ) {
              audioUrl = clip.importedMedia.url;
            } else if (
              clip.type === 'imported' &&
              clip.importedMedia &&
              clip.importedMedia.file
            ) {
              audioUrl = URL.createObjectURL(clip.importedMedia.file);
            } else {
              return; // Skip non-imported audio clips
            }

            audioElement.src = audioUrl;
            audioElementsRef.current.set(clipId, audioElement);

            // Wait for audio to load before setting position
            audioElement.addEventListener(
              'loadedmetadata',
              () => {
                const maxAudioTime = audioElement.duration || 0;
                const constrainedTime = Math.min(
                  Math.max(relativeTime, 0),
                  maxAudioTime
                );
                audioElement.currentTime = constrainedTime;

                // Always play when dragging (playhead is moving since we're in this branch)
                audioElement.play().catch(err => {
                  // Audio play failed
                });

                // Stop after 1 frame duration - this ensures it stops when dragging stops
                const stopTimeout = setTimeout(() => {
                  if (audioElement && !audioElement.paused) {
                    audioElement.pause();
                  }
                  if (frameAudioStopTimeoutRef.current.has(clipId)) {
                    frameAudioStopTimeoutRef.current.delete(clipId);
                  }
                }, frameDuration * 1000 + 5); // 1 frame + 5ms buffer

                frameAudioStopTimeoutRef.current.set(clipId, stopTimeout);
              },
              { once: true }
            );

            // If already loaded, set time immediately
            if (audioElement.readyState >= 2) {
              const maxAudioTime = audioElement.duration || 0;
              const constrainedTime = Math.min(
                Math.max(relativeTime, 0),
                maxAudioTime
              );
              audioElement.currentTime = constrainedTime;

              // Always play when dragging (playhead is moving since we're in this branch)
              audioElement.play().catch(err => {
                // Audio play failed
              });

              // Stop after 1 frame duration
              const stopTimeout = setTimeout(() => {
                if (audioElement && !audioElement.paused) {
                  audioElement.pause();
                }
                if (frameAudioStopTimeoutRef.current.has(clipId)) {
                  frameAudioStopTimeoutRef.current.delete(clipId);
                }
              }, frameDuration * 1000 + 5); // 1 frame + 5ms buffer

              frameAudioStopTimeoutRef.current.set(clipId, stopTimeout);
            }
          } else {
            // Update existing audio element position (when dragging/scrubbing)
            if (audioElement.readyState >= 2) {
              const maxAudioTime = audioElement.duration || 0;
              const constrainedTime = Math.min(
                Math.max(relativeTime, 0),
                maxAudioTime
              );
              const currentTime = audioElement.currentTime || 0;
              const timeDifference = Math.abs(constrainedTime - currentTime);

              // Always seek during dragging to match playhead position
              // Clear any existing stop timeout before starting new playback
              if (frameAudioStopTimeoutRef.current.has(clipId)) {
                clearTimeout(frameAudioStopTimeoutRef.current.get(clipId));
                frameAudioStopTimeoutRef.current.delete(clipId);
              }

              // Seek to new position if difference is significant
              if (timeDifference > 0.005) {
                // 5ms threshold
                audioElement.currentTime = constrainedTime;
              }

              // Always play when dragging (playhead is moving since we passed the early return check)
              // But limit playback to 1 frame duration
              if (audioElement.paused) {
                audioElement.play().catch(err => {
                  // Audio play failed
                });

                // Stop after 1 frame duration - this ensures it stops when dragging stops
                const stopTimeout = setTimeout(() => {
                  if (audioElement && !audioElement.paused) {
                    audioElement.pause();
                  }
                  if (frameAudioStopTimeoutRef.current.has(clipId)) {
                    frameAudioStopTimeoutRef.current.delete(clipId);
                  }
                }, frameDuration * 1000 + 5); // 1 frame + 5ms buffer

                frameAudioStopTimeoutRef.current.set(clipId, stopTimeout);
              } else {
                // Audio is already playing - restart the 1-frame timeout
                const stopTimeout = setTimeout(() => {
                  if (audioElement && !audioElement.paused) {
                    audioElement.pause();
                  }
                  if (frameAudioStopTimeoutRef.current.has(clipId)) {
                    frameAudioStopTimeoutRef.current.delete(clipId);
                  }
                }, frameDuration * 1000 + 5); // 1 frame + 5ms buffer

                frameAudioStopTimeoutRef.current.set(clipId, stopTimeout);
              }
            }
          }
        });

        return; // Don't continue with normal scrubbing logic during dragging
      }

      // When scrubbing (not dragging, frame-by-frame), use normal seeking
      // Rate limit seeks to prevent glitches
      const timeSinceLastSeek = now - lastAudioSeekTimeRef.current;
      const minSeekInterval = 33; // 33ms for frame-by-frame (~30fps)

      if (timeSinceLastSeek < minSeekInterval) {
        return; // Rate limited
      }

      lastAudioSeekTimeRef.current = now;

      // Find all audio clips at this timeline position
      const activeAudioClips = timelineClips.filter(clip => {
        if (!isAudioClip(clip)) return false;

        const clipStart = clip.instanceStartFrames ?? clip.startFrames;
        const clipEnd = clip.instanceEndFrames ?? clip.endFrames;

        return timelinePosition >= clipStart && timelinePosition <= clipEnd;
      });

      // Update active audio clips set
      const currentActiveIds = new Set(activeAudioClips.map(clip => clip.id));
      activeAudioClipsRef.current = currentActiveIds;

      // Stop and remove audio elements for clips that are no longer active
      audioElementsRef.current.forEach((audioElement, clipId) => {
        if (!currentActiveIds.has(clipId)) {
          audioElement.pause();
          audioElement.src = '';
          audioElement.load();
          audioElementsRef.current.delete(clipId);
        }
      });

      // Update or create audio elements for active clips
      activeAudioClips.forEach(clip => {
        const clipId = clip.id;
        const clipStart = clip.instanceStartFrames ?? clip.startFrames;

        // Calculate audio time within the clip
        const timelineFrameRate = 60;
        const relativeFrames = timelinePosition - clipStart;
        const relativeTime = relativeFrames / timelineFrameRate;

        // Get or create audio element
        let audioElement = audioElementsRef.current.get(clipId);

        if (!audioElement) {
          // Create new audio element
          audioElement = document.createElement('audio');
          audioElement.preload = 'auto';
          audioElement.volume = 1.0;

          let audioUrl;
          if (
            clip.type === 'imported' &&
            clip.importedMedia &&
            clip.importedMedia.url
          ) {
            audioUrl = clip.importedMedia.url;
          } else if (
            clip.type === 'imported' &&
            clip.importedMedia &&
            clip.importedMedia.file
          ) {
            audioUrl = URL.createObjectURL(clip.importedMedia.file);
          } else {
            return; // Skip non-imported audio clips
          }

          audioElement.src = audioUrl;
          audioElementsRef.current.set(clipId, audioElement);

          // Wait for audio to load before setting position
          audioElement.addEventListener(
            'loadedmetadata',
            () => {
              const maxAudioTime = audioElement.duration || 0;
              const constrainedTime = Math.min(
                Math.max(relativeTime, 0),
                maxAudioTime
              );
              audioElement.currentTime = constrainedTime;

              // Play when scrubbing (frame-by-frame, not during playback)
              if (!isDuringPlayback && positionChanged) {
                audioElement.play().catch(err => {
                  // Audio play failed
                });
              }
            },
            { once: true }
          );

          // If already loaded, set time immediately
          if (audioElement.readyState >= 2) {
            const maxAudioTime = audioElement.duration || 0;
            const constrainedTime = Math.min(
              Math.max(relativeTime, 0),
              maxAudioTime
            );
            audioElement.currentTime = constrainedTime;

            // Play when scrubbing (frame-by-frame, not during playback)
            if (!isDuringPlayback && positionChanged) {
              audioElement.play().catch(err => {
                // Audio play failed
              });
            }
          }
        } else {
          // Update existing audio element position (when scrubbing)
          if (audioElement.readyState >= 2) {
            const maxAudioTime = audioElement.duration || 0;
            const constrainedTime = Math.min(
              Math.max(relativeTime, 0),
              maxAudioTime
            );
            const currentTime = audioElement.currentTime || 0;
            const timeDifference = Math.abs(constrainedTime - currentTime);

            // For frame-by-frame scrubbing, seek when difference is significant
            const seekThreshold = 0.01; // 10ms threshold for frame-by-frame

            if (timeDifference > seekThreshold) {
              audioElement.currentTime = constrainedTime;

              // Play audio when position changed (frame-by-frame scrubbing)
              if (!isDuringPlayback && positionChanged) {
                if (audioElement.paused) {
                  audioElement.play().catch(err => {
                    // Audio play failed
                  });
                }
              } else if (!isDuringPlayback && !positionChanged) {
                // Position hasn't changed - pause audio
                if (!audioElement.paused) {
                  audioElement.pause();
                }
              }
            } else if (!isDuringPlayback && !positionChanged) {
              // Time difference is small and position hasn't changed - pause audio
              if (!audioElement.paused) {
                audioElement.pause();
              }
            }
          }
        }
      });
    },
    [timelineClips]
  );

  // Continuous audio check while dragging (even when position doesn't change)
  useEffect(() => {
    let audioCheckInterval = null;

    const checkAudioWhileDragging = () => {
      // Check if still dragging by reading from window (updated by Timeline component)
      if (
        window.isDraggingPlayhead &&
        lastPlayheadPositionRef.current !== undefined
      ) {
        // Continuously check audio even when position hasn't changed
        // This ensures we catch when playhead stops moving but mouse is still down
        updateAudioPlayback(lastPlayheadPositionRef.current, true);
      } else {
        // No longer dragging - clear interval
        if (audioCheckInterval) {
          clearInterval(audioCheckInterval);
          audioCheckInterval = null;
        }
      }
    };

    // Start continuous checking - check every 50ms while dragging
    audioCheckInterval = setInterval(checkAudioWhileDragging, 50);

    return () => {
      if (audioCheckInterval) {
        clearInterval(audioCheckInterval);
      }
    };
  }, [updateAudioPlayback]);

  // INSTANT PREVIEW HACK - Listen for playhead updates
  useEffect(() => {
    const handlePlayheadUpdate = event => {
      const { playhead } = event.detail;

      // Received playhead update

      // Update frame number from playhead
      setCurrentFrameNumber(playhead.servedFrame);
      // Setting currentFrameNumber
      setCurrentCropInfo({
        leftCropFrames: playhead.leftCropFrames || 0,
        rightCropFrames: playhead.rightCropFrames || 0,
      });

      // Update audio playback (Premiere Pro style)
      // Use position (60fps timeline frames) from playhead event
      const timelinePosition = playhead.position || 0;
      // Check if we're dragging by checking if playhead is being manually moved
      // We can detect this by checking if there's a recent playhead change
      const isDragging = window.isDraggingPlayhead || false;
      updateAudioPlayback(timelinePosition, isDragging);

      if (playhead.activeClip) {
        const { character, filename } = playhead.activeClip;
        const activeClip = playhead.activeClip;
        const clipData = { character, filename };

        // Determine video URL
        let videoUrl;
        if (
          activeClip.type === 'imported' &&
          activeClip.importedMedia &&
          activeClip.importedMedia.url
        ) {
          videoUrl = activeClip.importedMedia.url;
        } else if (
          activeClip.type === 'imported' &&
          activeClip.importedMedia &&
          activeClip.importedMedia.file
        ) {
          videoUrl = URL.createObjectURL(activeClip.importedMedia.file);
        } else {
          videoUrl = `http://localhost:5000/api/video/${character}/${filename}`;
        }

        // Use ref so this check is never stale regardless of when the listener was registered
        const isNewClip =
          !currentClipRef.current ||
          currentClipRef.current.character !== character ||
          currentClipRef.current.filename !== filename;

        if (isNewClip) {
          // Hide video immediately to prevent frame-0 flash on new clip load
          if (videoRef.current) {
            videoRef.current.style.opacity = '0';
          }
          setCurrentClip(clipData);
          setVideoUrl(videoUrl);
        }

        // Calculate video time from served frame (24fps frame → video time)
        const videoTime = playhead.servedFrame / 24;
        setVideoTime(videoTime);

        // Cache the current frame position for this clip
        const clipKey = `${character}/${filename}`;
        clipFrameCache.current.set(clipKey, playhead.servedFrame);

        // Seek video — use isVideoLoadedRef so this is never stale
        if (
          videoRef.current &&
          isVideoLoadedRef.current &&
          videoRef.current.duration
        ) {
          const maxVideoTime = videoRef.current.duration;
          const constrainedVideoTime = Math.min(videoTime, maxVideoTime);
          const timeDifference = Math.abs(
            constrainedVideoTime - videoRef.current.currentTime
          );
          if (timeDifference > 0.05) {
            videoRef.current.currentTime = constrainedVideoTime;
          }
        }
      } else {
        setCurrentClip(null);
        setVideoUrl(null);
        setVideoTime(0);
      }
    };

    window.addEventListener('playheadUpdate', handlePlayheadUpdate);
    return () => {
      window.removeEventListener('playheadUpdate', handlePlayheadUpdate);
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
    // Only re-register when clips change — currentClip/isVideoLoaded are accessed via refs
  }, [timelineClips, updateAudioPlayback]);

  // Update video time when video loads or timeline position changes
  useEffect(() => {
    if (isVideoLoaded && currentClip) {
      // REMOVED: updateVideoTime call - let playheadUpdate handle all video seeking
      // const lastEvent = window.lastShowFrameEvent;
      // if (lastEvent) {
      //   updateVideoTime(lastEvent.timelinePosition);
      // }
    }
  }, [isVideoLoaded, currentClip]);

  // Listen for playhead position changes from Timeline component
  useEffect(() => {
    const handlePlayheadChange = event => {
      const { playheadPosition, isManualChange } = event.detail;

      // Only log manual changes to reduce spam
      if (isManualChange) {
        // eslint-disable-next-line no-console
        // Manual playhead change
      }

      // If this is a manual change (user clicked) and we're playing, stop playback
      if (isManualChange && isPlaying) {
        // eslint-disable-next-line no-console
        // Manual playhead change detected - stopping playback
        setIsPlaying(false);
        isPlayingRef.current = false;
        // No local animation refs to clean up - Timeline handles everything
      }

      // Always update our current playhead position
      setCurrentPlayheadPosition(playheadPosition);

      // REMOVED: updateVideoTime call - let playheadUpdate handle all video seeking
      // if (!isPlaying && videoRef.current && currentClip) {
      //   updateVideoTime(playheadPosition);
      // }
    };

    window.addEventListener('playheadChange', handlePlayheadChange);
    return () => {
      window.removeEventListener('playheadChange', handlePlayheadChange);
    };
  }, [isPlaying, currentClip]);

  // Cleanup: Cancel any pending requests when component unmounts
  useEffect(() => {
    return () => {
      // Clear audio pause timeout
      if (audioPauseTimeoutRef.current) {
        clearTimeout(audioPauseTimeoutRef.current);
      }

      // Clear all frame audio stop timeouts
      frameAudioStopTimeoutRef.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      frameAudioStopTimeoutRef.current.clear();

      // Cleanup audio elements (frame-based)
      audioElementsRef.current.forEach(audioElement => {
        audioElement.pause();
        audioElement.src = '';
        audioElement.load();
        // Revoke object URLs if they were created
        if (audioElement.src && audioElement.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioElement.src);
        }
      });
      audioElementsRef.current.clear();
      activeAudioClipsRef.current.clear();

      // Cleanup audio frame blob URLs
      audioFrameUrlsRef.current.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      audioFrameUrlsRef.current.clear();
      loadingAudioFramesRef.current.clear();
    };
  }, []);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#000',
      }}
    >
      {/* Header */}
      {/* Preview Screen */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: TARGET_ASPECT_RATIO_CSS, // 1080x720 (1.5:1)
            background: '#000',
            borderRadius: '8px',
            border: '2px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
            }}
          >
            <div
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {videoUrl && currentClip ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain', // Changed from 'cover' to 'contain' to fit within 1080x720
                  }}
                  muted
                  preload="auto"
                  onLoadStart={() => {
                    // Hide video while new src loads to prevent showing wrong frame
                    if (videoRef.current) {
                      videoRef.current.style.opacity = '0';
                    }
                  }}
                  onLoadedMetadata={() => {
                    // Video loaded successfully
                    setIsVideoLoaded(true);

                    // Immediately seek to cached frame position for this clip to prevent flash
                    if (currentClip && videoRef.current) {
                      const clipKey = `${currentClip.character}/${currentClip.filename}`;
                      const cachedFrame = clipFrameCache.current.get(clipKey);

                      if (cachedFrame !== undefined) {
                        const cachedVideoTime = cachedFrame / 24;
                        const maxVideoTime = videoRef.current.duration || 0;
                        const constrainedTime = Math.min(
                          cachedVideoTime,
                          maxVideoTime
                        );
                        // Seek to the frame we were on when this clip was first detected.
                        // onSeeked will set opacity back to 1.
                        videoRef.current.currentTime = constrainedTime;
                      } else {
                        // No cached frame — show from beginning; reveal immediately
                        videoRef.current.style.opacity = '1';
                      }
                    }
                  }}
                  onError={e => {
                    // Video failed to load
                  }}
                  onTimeUpdate={() => {
                    // Don't update videoTime from video element - only use playhead data
                    // setVideoTime is only updated by playheadUpdate events
                  }}
                  onSeeked={() => {
                    // Show video now that it has seeked to the correct frame
                    if (videoRef.current) {
                      videoRef.current.style.opacity = '1';
                    }
                  }}
                  onCanPlay={() => {
                    // Video can play
                    // Don't auto-seek on canPlay during playback - let the playback logic handle seeking
                    if (!isPlayingRef.current && window.lastShowFrameEvent) {
                      // Only seek if we haven't already sought to this position recently
                      const lastCanPlaySeek = window.lastCanPlaySeek || 0;
                      const positionThreshold = 1; // Only seek if timeline position changed by at least 1 frame
                      const shouldSeek =
                        Math.abs(
                          window.lastShowFrameEvent.timelinePosition -
                            lastCanPlaySeek
                        ) >= positionThreshold;

                      if (shouldSeek) {
                        const videoTime = convertTimelineToVideoTime(
                          window.lastShowFrameEvent.timelinePosition,
                          window.lastShowFrameEvent.clipStartFrames || 0,
                          window.lastShowFrameEvent.clipEndFrames || 1000,
                          videoRef.current?.duration || 60
                        );

                        if (videoTime !== null && videoRef.current) {
                          // eslint-disable-next-line no-console
                          // CAN PLAY SEEK (manual)
                          videoRef.current.currentTime = videoTime;
                          // Don't update setVideoTime here - only playheadUpdate should update it
                          window.lastCanPlaySeek =
                            window.lastShowFrameEvent.timelinePosition;
                        }
                      }
                    } else if (isPlayingRef.current) {
                      // eslint-disable-next-line no-console
                      // Video can play during playback - skipping auto-seek
                    }
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '16px',
                  }}
                >
                  {currentClip
                    ? '🔄 Loading video...'
                    : 'Select a clip to preview'}
                </div>
              )}
            </div>

            {/* Simple Play/Pause Button - Always Visible */}
            <div
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={togglePlayPause}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.1s ease',
                }}
                onMouseEnter={e => {
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={e => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                {isPlaying ? (
                  // Simple white square
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      background: 'white',
                      borderRadius: '2px',
                    }}
                  />
                ) : (
                  // Simple white triangle
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '14px solid white',
                      borderTop: '8px solid transparent',
                      borderBottom: '8px solid transparent',
                      marginLeft: '2px',
                    }}
                  />
                )}
              </button>
            </div>
          </div>

          {/* INSTANT Preview Info Overlay */}
          {currentClip && (
            <div
              style={{
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
                border: '1px solid #333',
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#4ade80',
                }}
              >
                🚀 INSTANT Preview
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px',
                  marginBottom: '8px',
                }}
              >
                <div>Character: {currentClip.character}</div>
                <div>File: {currentClip.filename}</div>
                <div>Video Time: {videoTime.toFixed(2)}s</div>
                <div>Frame Served: {currentFrameNumber}</div>
                <div>Loaded: {isVideoLoaded ? '✅' : '⏳'}</div>
                <div>Playing: {isPlaying ? '▶️' : '⏸️'}</div>
              </div>

              <div
                style={{ fontSize: '10px', color: '#ccc', marginBottom: '8px' }}
              >
                MP4 Direct Stream - No Frame Processing
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ color: '#4ade80' }}>⚡ INSTANT</div>

                <div style={{ color: '#4ade80', fontSize: '10px' }}>
                  🚀 MP4 Hack
                </div>
              </div>

              <div
                style={{ fontSize: '10px', color: '#4ade80', marginTop: '4px' }}
              >
                Load Time: ~0ms
              </div>
            </div>
          )}

          {/* Performance Dashboard Overlay */}
          <div
            style={{
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
              border: '1px solid #333',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#60a5fa',
              }}
            >
              📊 INSTANT Performance
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div
                style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px' }}
              >
                INSTANT Stats
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px',
                }}
              >
                <div>Load Time: ~0ms</div>
                <div>Method: MP4 Stream</div>
                <div>Scrubbing: Instant</div>
                <div>Processing: None</div>
              </div>
            </div>

            <div
              style={{ fontSize: '10px', color: '#4ade80', marginTop: '8px' }}
            >
              🚀 PREMIERE PRO SPEED
            </div>

            {/* Load Performance */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{ fontSize: '10px', color: '#ccc', marginBottom: '4px' }}
              >
                Load Performance
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '4px',
                }}
              >
                <div>Last Load: ~0ms</div>
                <div>Method: Direct Stream</div>
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
  timelineClips: PropTypes.array.isRequired,
};

export default TimelinePreview;
