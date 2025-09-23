import os
import pandas as pd

# -----------------------------
# CONFIG
# -----------------------------
csv_path = "data/video_clips.csv"
base_folder = "C:/Users/William/Documents/YouTube/Video/Arcane Footage/Video Footage 2"

# -----------------------------
# LOAD CSV
# -----------------------------
df = pd.read_csv(csv_path)

# -----------------------------
# HELPER: safe rename
# -----------------------------
def safe_rename(old_path, new_path):
    """Rename a file, if target exists, append .1, .2, etc."""
    base, ext = os.path.splitext(new_path)
    counter = 1
    unique_path = new_path
    while os.path.exists(unique_path):
        unique_path = f"{base}.{counter}{ext}"
        counter += 1
    os.rename(old_path, unique_path)
    return unique_path

# -----------------------------
# RENAME FILES
# -----------------------------
for _, row in df.iterrows():
    character = row['character']
    old_filename = row['filename']
    new_id = row['id']

    char_folder = os.path.join(base_folder, character).replace("\\", "/")
    if not os.path.exists(char_folder):
        print(f"⚠️ Character folder not found: {char_folder}")
        continue

    old_path = os.path.join(char_folder, old_filename).replace("\\", "/")
    if not os.path.exists(old_path):
        print(f"⚠️ File not found: {old_path}")
        continue

    # Construct new filename: replace old id (everything before first space) with new id
    description = " ".join(old_filename.split(" ")[1:])  # everything after first space
    new_filename = f"{new_id} {description}"
    new_path = os.path.join(char_folder, new_filename).replace("\\", "/")

    final_path = safe_rename(old_path, new_path)
    print(f"✅ Renamed: {old_path} → {final_path}")
