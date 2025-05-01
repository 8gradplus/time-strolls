from rio_tiler.io import Reader
import morecantile
from PIL import Image
from backend.helpers.fs import serve_static

WEB_MERCATOR_TMS = morecantile.tms.get("WebMercatorQuad")

def to_png(img):
    """Converts georaster image to png. Takes care of different channel convention in geo raster data."""
    return Image.fromarray(img.transpose(1, 2, 0))

def create_tiles(path, zooms, output_dir, tile_size=256):
    """
    Create tiles and write it to file system.

    Parameters
    ----------
    path : str
        A geotiff file
    zooms : Zoom levels
        Part of the file system ('z')
    output_dir : str
        Directory where tiles are written
    tile_size : int
        Tile size
    Returns
    -------

    Notes
    -----
    At a latter point this should go into rasterio memfile or database upon creating an api
    """
    with Reader(path, tms=WEB_MERCATOR_TMS) as src:
        # Requires gps coordinates. oh man!
        bounds = src.get_geographic_bounds('EPSG:4326')
        tiles = list(src.tms.tiles(*bounds, zooms))
        for tile in tiles:
            try:
                img, _ = src.tile(*tile, tilesize=tile_size)
                img = to_png(img)
                serve_static(img, tile, output_dir)
            except Exception as e:
                print(f"Skipping tile {tile.z}/{tile.x}/{tile.y}: {e}")
