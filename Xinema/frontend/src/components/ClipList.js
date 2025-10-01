import React, { useEffect, useState, useRef, useCallback } from "react";

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
          rootMargin: '50px',
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

export default function ClipList({ onClipSelect }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [selectedClip, setSelectedClip] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "table" or "grid"
  const [selectedCharacter, setSelectedCharacter] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [contextMenu, setContextMenu] = useState(null);
  const [columnsExpanded, setColumnsExpanded] = useState(false);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });


  useEffect(() => {
    async function fetchClips() {
      const resp = await fetch("http://localhost:5000/api/files");
      const data = await resp.json();
      setClips(data);
      setLoading(false);
    }
    fetchClips();
  }, []);

  // Track mouse movement during drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setDraggedClip(null);
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setDragPosition({ x: 0, y: 0 });
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

  const handleClipClick = (clip) => {
    setSelectedClip(clip);
    if (onClipSelect) {
      onClipSelect(clip);
    }
  };

  const handleMouseDown = (e, clip) => {
    e.preventDefault();
    setDraggedClip(clip);
    setIsDragging(true);
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setDragPosition({ x: e.clientX, y: e.clientY });
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
    console.log(`${action} for clip:`, clip);
    setContextMenu(null);
    // TODO: Implement actual actions
  };


  if (loading) return <div style={{padding:24}}>Loading media library</div>;

  return (
    <div 
      style={{ height: "100%", display: "flex", position: "relative", width: "100%" }}
    >
      {/* Drag Preview */}
      {isDragging && draggedClip && (
        <div
          style={{
            position: "fixed",
            left: dragPosition.x - 100, // Center horizontally (half of 200px width)
            top: dragPosition.y - 50,   // Center vertically (half of ~100px height)
            zIndex: 1000,
            pointerEvents: "none",
            opacity: 0.8,
            border: "2px solid #007bff",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            background: "white",
            padding: "12px",
            width: "200px",
            transform: "scale(1.05)"
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
      {/* Folder Navigation */}
      <div style={{ 
        width: "250px", 
        minWidth: "250px",
        maxWidth: "250px",
        padding: "16px", 
        borderRight: "1px solid #eee", 
        background: "#f8f9fa",
        overflow: "auto",
        flexShrink: 0
      }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600" }}>Navigation</h3>
        
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

      {/* Clip Browser */}
      <div style={{ flex: "1", borderRight: "1px solid #eee", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Fixed Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #eee", background: "white" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600" }}>Media Library</h2>
          
          {/* Search and Controls */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Search clips by filename, character, id, season, episode"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px"
              }}
            />
            <button
              onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
              style={{
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "white",
                cursor: "pointer"
              }}
            >
              {viewMode === "table" ? "Grid" : "Table"}
            </button>
          </div>

          {/* Table Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>
              {sortedClips.length} clips found
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px", minWidth: 0 }}>

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
                              console.log("Triangle clicked!");
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
          onClick={() => handleClipClick(clip)}
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
                        <td style={{ border: "1px solid #eee", padding: "8px", width: "80px" }}>{clip.duration}</td>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {sortedClips.map((clip) => (
        <div
          key={clip.id}
          onClick={() => handleClipClick(clip)}
          onContextMenu={(e) => handleContextMenu(e, clip)}
          onMouseDown={(e) => handleMouseDown(e, clip)}
                  style={{
                    border: draggedClip?.id === clip.id ? "2px solid #007bff" : "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "12px",
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
                  
                  <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "13px" }}>
                    {clip.filename}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                    {clip.character}  {clip.season}  {clip.episode}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                    Duration: {clip.duration}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>
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

        </div>
      </div>

    </div>
  );
}















