import React, { useEffect, useState } from "react";

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

export default function ClipList() {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState("order");
  const [sortDir, setSortDir] = useState("asc");
  const [search, setSearch] = useState("");
  const [selectedClip, setSelectedClip] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
  const [selectedCharacter, setSelectedCharacter] = useState("all");
  const [selectedSeason, setSelectedSeason] = useState("all");
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    async function fetchClips() {
      const resp = await fetch("http://localhost:5000/api/files");
      const data = await resp.json();
      setClips(data);
      setLoading(false);
    }
    fetchClips();
  }, []);

  // Get unique characters and seasons for navigation
  const characters = [...new Set(clips.map(clip => clip.character).filter(Boolean))].sort();
  const seasons = [...new Set(clips.map(clip => clip.season).filter(Boolean))].sort();

  // Sorting logic
  const sortedClips = [...filterClips(clips, search, selectedCharacter, selectedSeason)].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleClipClick = (clip) => {
    setSelectedClip(clip);
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

  const handleDragStart = (e, clip) => {
    e.dataTransfer.setData("application/json", JSON.stringify(clip));
    e.dataTransfer.effectAllowed = "move";
  };

  if (loading) return <div style={{padding:24}}>Loading media library</div>;

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }}>
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
      {/* Left Panel - Folder Navigation */}
      <div style={{ 
        width: "250px", 
        padding: "16px", 
        borderRight: "1px solid #eee", 
        background: "#f8f9fa",
        overflow: "auto"
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

      {/* Center Panel - Clip Browser */}
      <div style={{ flex: "1", padding: "16px", borderRight: "1px solid #eee", overflow: "auto" }}>
        <div style={{ marginBottom: "16px" }}>
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

          {/* Table View */}
          {viewMode === "table" && (
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f6f6f6" }}>
                  {["filename","id","character","season","episode","order","duration","description"].map((field) => (
                    <th
                      key={field}
                      onClick={() => {
                        if (sortField === field) { setSortDir(sortDir === "asc" ? "desc" : "asc"); }
                        else { setSortField(field); setSortDir("asc"); }
                      }}
                      style={{ 
                        border: "1px solid #eee", 
                        cursor: "pointer", 
                        padding: "8px", 
                        fontWeight: "600", 
                        userSelect: "none",
                        textAlign: "left"
                      }}
                    >
                      {field.toUpperCase()} {sortField === field ? (sortDir === "asc" ? "" : "") : ""}
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, clip)}
                    style={{ 
                      background: selectedClip?.id === clip.id ? "#e3f2fd" : (i%2 ? "#fff" : "#f9f9f9"),
                      cursor: "pointer",
                      transition: "background 0.2s",
                      borderBottom: "1px solid #eee"
                    }}
                  >
                    <td style={{ border: "1px solid #eee", padding: "8px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {clip.filename}
                    </td>
                    <td style={{ border: "1px solid #eee", padding: "8px" }}>{clip.id}</td>
                    <td style={{ border: "1px solid #eee", padding: "8px" }}>{clip.character}</td>
                    <td style={{ border: "1px solid #eee", padding: "8px" }}>{clip.season}</td>
                    <td style={{ border: "1px solid #eee", padding: "8px" }}>{clip.episode}</td>
                    <td style={{ border: "1px solid #eee", padding: "8px" }}>{clip.order}</td>
                    <td style={{ border: "1px solid #eee", padding: "8px" }}>{clip.duration}</td>
                    <td style={{ border: "1px solid #eee", padding: "8px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {clip.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Grid View */}
          {viewMode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {sortedClips.map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => handleClipClick(clip)}
                  onContextMenu={(e) => handleContextMenu(e, clip)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, clip)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "12px",
                    cursor: "pointer",
                    background: selectedClip?.id === clip.id ? "#e3f2fd" : "white",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ 
                    width: "100%", 
                    height: "80px", 
                    background: "#e0e0e0", 
                    borderRadius: "4px",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px"
                  }}>
                    {clip.thumbnail ? (
                      <img 
                        src={clip.thumbnail} 
                        alt="Thumbnail" 
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "4px" }}
                      />
                    ) : (
                      <span>🎬</span>
                    )}
                  </div>
                  
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

      {/* Right Panel - Clip Preview */}
      <div style={{ flex: "0 0 300px", padding: "16px", background: "#fafafa" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>Clip Preview</h3>
        {selectedClip ? (
          <div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Filename:</strong> {selectedClip.filename}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>ID:</strong> {selectedClip.id}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Character:</strong> {selectedClip.character}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Season:</strong> {selectedClip.season}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Episode:</strong> {selectedClip.episode}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Order:</strong> {selectedClip.order}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Description:</strong> {selectedClip.description}
            </div>
            <div style={{ 
              width: "100%", 
              height: "120px", 
              background: "#e0e0e0", 
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              fontSize: "14px"
            }}>
              Video Preview Placeholder
            </div>
          </div>
        ) : (
          <div style={{ color: "#666", textAlign: "center", padding: "20px" }}>
          Select a clip to preview
          </div>
        )}
      </div>
    </div>
  );
}
