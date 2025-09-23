import os
import re
import pandas as pd

# -----------------------------
# CONFIG
# -----------------------------
csv_path = "data/video_clips.csv"
base_folder = "C:/Users/William/Documents/YouTube/Video/Arcane Footage/Video Footage 2"
output_csv = "data/video_clips_cleaned.csv"

# -----------------------------
# LOAD CSV
# -----------------------------
df = pd.read_csv(csv_path)

# -----------------------------
# CLEAN FILENAMES IN CSV
# -----------------------------
def clean_filename(filename, new_id):
    # Split into id + description
    parts = filename.split(" ", 1)
    if len(parts) == 2:
        _, description = parts
    else:
        description = ""

    # Replace commas in description with semicolons
    description = description.replace(",", ";")

    # Remove .1 or _1 just before file extension
    description = re.sub(r'(\.1|_1)(?=\.[^.]+$)', '', description)

    # Build new filename with standardized id
    return f"{new_id} {description}".strip()

df['filename'] = [
    clean_filename(row['filename'], row['id']) for _, row in df.iterrows()
]

# -----------------------------
# RENAME FILES ON DISK
# -----------------------------
def safe_rename(old_path, new_path):
    """Rename a file, ensuring no overwrite by appending .1, .2, etc."""
    base, ext = os.path.splitext(new_path)
    counter = 1
    unique_path = new_path
    while os.path.exists(unique_path):
        unique_path = f"{base}.{counter}{ext}"
        counter += 1
    os.rename(old_path, unique_path)
    return unique_path

for _, row in df.iterrows():
    character = row['character']
    new_filename = row['filename']

    char_folder = os.path.join(base_folder, character).replace("\\", "/")
    if not os.path.exists(char_folder):
        print(f"⚠️ Character folder not found: {char_folder}")
        continue

    # Try to find any file in the folder that matches by ignoring .1/_1
    all_files = os.listdir(char_folder)
    for f in all_files:
        normalized_f = re.sub(r'(\.1|_1)(?=\.[^.]+$)', '', f.replace(",", ";"))
        if normalized_f == new_filename:
            old_path = os.path.join(char_folder, f).replace("\\", "/")
            new_path = os.path.join(char_folder, new_filename).replace("\\", "/")
            if old_path != new_path:
                final_path = safe_rename(old_path, new_path)
                print(f"✅ Renamed: {old_path} → {final_path}")
            break
    else:
        print(f"⚠️ No match found for: {new_filename}")

# -----------------------------
# SAVE CLEANED CSV
# -----------------------------
df.to_csv(output_csv, index=False)
print(f"✅ Cleaned CSV saved to {output_csv}")
