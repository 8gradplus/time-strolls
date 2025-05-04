import shutil
import os
from urllib.parse import urlparse
from urllib.parse import unquote
import requests
from io import BytesIO
from PIL import Image


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

def write_local(stuff: bytes, path: str):
    with open(path, 'wb') as f:
        f.write(stuff)

# Todo: reconcile and cleanup

def save_webp(path, img):
    buffer = Image.open(BytesIO(img))
    webp_io = BytesIO()
    buffer.save(webp_io, format="WEBP", quality=80, method=6)
    webp_bytes = webp_io.getvalue()
    with open(path, 'wb') as f:
        f.write(webp_bytes)

class SaveImage:
    def __init__(self, dir:str, compress:bool=False):
        self.dir = dir
        self.compress = compress

    def __call__(self, img, url):
        id = image_id(url)
        path = f"{self.dir}/{id}"
        print(f'Upload image {id} to {self.dir} from {url}')
        if self.compress:
            save_webp(f'{path}.webp', img)
        with open(f'{path}.jpg', 'wb') as f:
            f.write(img)

def download(url:str):
    try:
        print(f'Downloading: {url}')
        return requests.get(url).content, url
    except Exception as e:
        print(f"Failed to download url: {url}: {e}")
