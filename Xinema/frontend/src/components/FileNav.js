import React, { useEffect, useState } from "react";
import ClipPreview from "../components/ClipPreview";

function FileNavTab() {
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/files")
      .then((res) => res.json())
      .then((data) => setClips(data))
      .catch((err) => console.error("Error fetching clips:", err));
  }, []);

  return (
    <div className="file-nav">
      <h2>File Navigator</h2>

      {/* Quick inline clip list */}
      <ul>
        {clips.map((clip) => (
          <li key={clip.id} onClick={() => setSelectedClip(clip)}>
            {clip.filename} — {clip.character} — {clip.id}
          </li>
        ))}
      </ul>

      {/* Clip preview */}
      {selectedClip && <ClipPreview clip={selectedClip} />}
    </div>
  );
}

export default FileNavTab;
