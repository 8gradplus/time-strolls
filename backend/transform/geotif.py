import rasterio

class AsGeoTif:
    """
    Saves an image as a GeoTIFF using a given affine transform.

    Parameters
    ----------
    image : np.ndarray
        Image array with shape (H, W, C).
    path : str or Path
        Output file path for the GeoTIFF.
    crs : str, optional
        Coordinate reference system (default: 'EPSG:4326').
    """

    def __init__(self, image, path, crs='EPSG:4326'):
        self.image = image
        self.path = path
        self.crs = crs

    def __call__(self, A):
        image = self.image
        height, width, bands = image.shape
        # Bands at first place in gtiff
        image = image.transpose(2, 0, 1)
        config = dict(
            driver='GTiff',
            height=height,
            width=width,
            count=bands,
            dtype=image.dtype,
            crs=self.crs,
            transform=A)
        with rasterio.open(self.path, 'w', **config) as dataset:
            dataset.write(image)
