import os

# -----------------------------
# CONFIG
# -----------------------------
fix_folder = r"C:\Users\William\Documents\YouTube\Video\Arcane Footage\Video Footage 2\Vi\Fix"

# -----------------------------
# PREPEND 1. TO EVERY FILE REGARDLESS
# -----------------------------
for f in os.listdir(fix_folder):
    if not f.lower().endswith(".mp4"):
        continue

    old_path = os.path.join(fix_folder, f)

    # Prepend 1. always
    new_filename = f"1.{f}"
    new_path = os.path.join(fix_folder, new_filename)

    # Ensure no overwriting
    counter = 1
    base, ext = os.path.splitext(new_filename)
    while os.path.exists(new_path):
        new_path = os.path.join(fix_folder, f"{base}_{counter}{ext}")
        counter += 1

    os.rename(old_path, new_path)
    print(f"✅ Renamed: {old_path} → {new_path}")
