from config import config
from .tiles import CreateTiles
from helpers.fs import write_local
from helpers.cdn import write_s3
from swak.funcflow import Map, Pipe
from .ground_control import get_transformation
from .ground_control import gcp_to_rasterio
from .geotif import AsGeoTif

writer = write_s3
output_dir = config.cdn.path.tile

# this is too confusing -> put into main or make its own module!
if not config.cdn.endpoint.startswith('https'):
    writer = write_local
    output_dir= config.cdn.endpoint + config.cdn.path.tile

def create_tiles(year):
    """
     Returns a CreateTiles instance configured for the given year.

     Parameters
     ----------
     year : int
         The year for which to generate map tiles.

     Returns
     -------
     CreateTiles
         Configured tile writer callable.
     """
    return CreateTiles(
        year= year,
        zooms = range(config.tile.zoom.min, config.tile.zoom.max),
        output_dir = output_dir,
        tile_size = config.tile.size,
        format = config.tile.format,
        writer=writer
    )

def create_tif(gcps, image, sink):
    """
    Creates a GeoTIFF from an image and a list of ground control points (GCPs).

    This function transforms GCPs into a raster transformation and writes the image
    to the specified sink path using the computed georeference information.

    Parameters
    ----------
    gcps (Iterable):
        A list or iterable of Ground Control Points to georeference the image.
    image (np.ndarray or PIL.Image):
        The input image data to write as a GeoTIFF.
    sink (str or Path):
        Destination file path where the GeoTIFF will be saved.

    Returns:
    --------
    None
    """
    affine = Pipe(Map(gcp_to_rasterio), get_transformation)(gcps)
    # for some reasons the Pipe cannot handle the Affine transformation
    # So we write pass it extra.
    AsGeoTif(image, sink)(affine)
