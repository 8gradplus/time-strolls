from rio_tiler.io import Reader
import mercantile
import morecantile
from PIL import Image
from pathlib import Path



WEB_MERCATOR_TMS = morecantile.tms.get("WebMercatorQuad")

def to_png(img):
    """Converts georaster image to png. Takes care of different channel convention in geo raster data."""
    return Image.fromarray(img.transpose(1, 2, 0))

def serve_static(img, tile, path):
    """Writes files to directory respecting path structure for tiles"""
    path = Path(path)
    tile_path = path / str(tile.z) / str(tile.x)
    tile_path.mkdir(parents=True, exist_ok=True)
    img.save(tile_path / f"{tile.y}.png")

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
    output_dir = Path(output_dir)
    with Reader(path, tms=WEB_MERCATOR_TMS) as src:
        # mercantile requires gps coordinates. oh man!
        bounds = src.get_geographic_bounds('EPSG:4326')
        tiles = list(src.tms.tiles(*bounds, zooms))
        for tile in tiles:
            try:
                img, _ = src.tile(*tile, tilesize=tile_size)
                img = to_png(img)
                serve_static(img, tile, output_dir)
            except Exception as e:
                print(f"Skipping tile {tile.z}/{tile.x}/{tile.y}: {e}")
