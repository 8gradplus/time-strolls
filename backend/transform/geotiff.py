from rasterio import Affine
import cv2
from rasterio import MemoryFile

def geotiff(image, A,  crs='EPSG:3857'):
    """
    Create a GeoTIFF file from an RGB image and an affine transformation.

    Parameters
    ----------
    image : numpy.ndarray
        A 3D NumPy array of shape (H, W, channel) representing an RGB image.
    A : numpy.ndarray
        Affine transformation mapping pixel coordinates to spatial coordinates.
    crs : str
        Coordinate Reference System in a format understood by rasterio, e.g., "EPSG:3857".
    path : str, optional
        If provided, the GeoTIFF will be written to this file path. If None, a MemoryFile is returned.

    Returns
    -------
    rasterio.io.MemoryFile

    Notes
    -----
    EPSG:3857 (Web Mercator) is commonly used for web-based mapping applications.
    """

    height, width, bands = image.shape
    # Bands at first place in gtiff
    image = image.transpose(2, 0, 1)

    config = dict(driver='GTiff',
        height=height,
        width=width,
        count=bands,
        dtype=image.dtype,
        crs=crs,
        transform=Affine(*A.flatten())
        )
    # Use MemoryFile to create in-memory GeoTIFF
    memfile = MemoryFile()
    with memfile.open(**config) as dataset:
        dataset.write(image)
    return memfile
