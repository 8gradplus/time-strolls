from pathlib import Path
import shutil
import os
from urllib.parse import urlparse
from urllib.parse import unquote
import requests

def serve_static(img, tile, path):
    """Writes files to directory respecting path structure for tiles"""
    path = Path(path)
    tile_path = path / str(tile.z) / str(tile.x)
    tile_path.mkdir(parents=True, exist_ok=True)
    img.save(tile_path / f"{tile.y}.png")

def copy_file(src, dst):
    """Copy file from `src` path to `dst` path"""
    src = Path(src)
    dst = Path(dst)
    if not src.is_file():
        raise FileNotFoundError(f"Source file not found: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)

def clear_directory(path):
    """Remove all files and subdirectories"""
    for filename in os.listdir(path):
        file_path = os.path.join(path, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)  # Remove file or symbolic link
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)  # Remove directory and all contents
        except Exception as e:
            print(f'Failed to delete {file_path}. Reason: {e}')

def image_id(url):
    parsed = urlparse(url)
    path = unquote(parsed.path)  # Decode any %-encoded characters
    filename = os.path.basename(path)  # file840955.jpg
    id = os.path.splitext(filename)[0]
    return id

class Download:
    def __init__(self, path):
        self.path = path
    def __call__(self, url):
        try:
            print(f"Downloading image")
            img = requests.get(url).content
            with open(f"{self.path}/{image_id(url)}.jpg", 'wb') as f:
                f.write(img)
        except Exception as e:
                print(f"Failed to download full-resolution image: {e}")
